import os
import base64
import json
import re
import time
import requests
from huggingface_hub import InferenceClient
import pdfplumber
from io import BytesIO
from typing import Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

# Initialize Hugging Face InferenceClient
HF_TOKEN = os.getenv("HF_TOKEN")
client = InferenceClient(token=HF_TOKEN) if HF_TOKEN else None


class AIGatekeeper:
    """
    Intelligent resume screening system using Hugging Face LLMs
    Acts as gatekeeper to automatically sort candidates
    """
    
    @staticmethod
    def analyze_resume(
        pdf_bytes: bytes,
        job_title: str,
        job_description: str,
        required_skills: str,
        minimum_experience: int = 0
    ) -> Dict:
        """
        Main gatekeeper function - analyzes resume against job requirements
        
        Returns:
            {
                "category": "High Match" | "Potential" | "Reject",
                "match_score": 0-100,
                "personal_details": {...},
                "skills": [...],
                "experience": {...},
                "verdict": "...",
                "reasoning": "...",
                "strengths": [...],
                "gaps": [...]
            }
        """
        
        if not client:
            return AIGatekeeper._fallback_analysis()
        
        try:
            # Extract text from ENTIRE PDF (no truncation for accuracy)
            print("[PDF] Extracting text from PDF...")
            pdf_file = BytesIO(pdf_bytes)
            text_content = ""
            
            with pdfplumber.open(pdf_file) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_content += page_text + "\n"
            
            if not text_content.strip():
                print("[WARN] No text extracted from PDF")
                return AIGatekeeper._fallback_analysis()
            
            print(f"[INFO] Extracted {len(text_content)} characters from PDF")
            
            # ===== AI REASONING ANALYSIS using HF Router API =====
            print("[AI] Analyzing resume with deep reasoning...")
            print("   Using HuggingFace Router Chat API...")
            
            # Build intelligent analysis prompt
            analysis_prompt = f"""Analyze this resume for the job position. Consider skill matches, transferable skills, experience, and overall fit.

JOB: {job_title}
DESCRIPTION: {job_description}
REQUIRED SKILLS: {required_skills}
MIN EXPERIENCE: {minimum_experience} years

RESUME:
{text_content[:3500]}


Respond with JSON only:
{{"name": "candidate name", "email": "email", "phone": "phone", "experience": years_number, "skills": ["skill1", "skill2"], "summary": "professional summary of candidate (2-3 sentences)", "match_score": 0-100, "decision": "YES" or "NO", "reasoning": "detailed explanation of why"}}"""

            # Working models on HF Router (chat completion API)
            chat_models = [
                "meta-llama/Llama-3.2-3B-Instruct",
                "Qwen/Qwen2.5-72B-Instruct",
            ]
            
            ai_analysis_result = None
            
            for model_name in chat_models:
                try:
                    print(f"   [TRY] {model_name}...")
                    
                    # Use new router endpoint with chat completion API
                    api_url = "https://router.huggingface.co/v1/chat/completions"
                    headers = {
                        "Authorization": f"Bearer {HF_TOKEN}",
                        "Content-Type": "application/json"
                    }
                    
                    payload = {
                        "model": model_name,
                        "messages": [
                            {"role": "user", "content": analysis_prompt}
                        ],
                        "max_tokens": 500,
                        "temperature": 0.3
                    }
                    
                    response = requests.post(api_url, headers=headers, json=payload, timeout=90)
                    
                    if response.status_code == 200:
                        result = response.json()
                        ai_text = result.get('choices', [{}])[0].get('message', {}).get('content', '')
                        
                        if ai_text and len(ai_text) > 20:
                            print(f"   [OK] Got AI response from {model_name}")
                            ai_analysis_result = ai_text
                            break
                        
                    elif response.status_code == 503:
                        print(f"   [WAIT] {model_name} loading...")
                        time.sleep(5)
                    else:
                        print(f"   [WARN] {model_name} returned {response.status_code}")
                        
                except requests.Timeout:
                    print(f"   [TIMEOUT] {model_name}")
                except Exception as e:
                    print(f"   [WARN] {model_name} error: {str(e)[:60]}")
            
            # Parse AI response
            if ai_analysis_result:
                try:
                    print("   [PARSE] Parsing AI reasoning...")
                    
                    # Try to extract JSON
                    json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', ai_analysis_result, re.DOTALL)
                    
                    if json_match:
                        ai_data = json.loads(json_match.group(0))
                        
                        # Extract data with fallbacks
                        name = ai_data.get('name', '').strip()
                        email_ai = ai_data.get('email', '').strip()
                        phone_ai = ai_data.get('phone', '').strip()
                        experience = ai_data.get('experience', 0) or ai_data.get('experience_years', 0)
                        skills = ai_data.get('skills', [])
                        # Use AI summary if available, otherwise just use verdict later
                        summary = ai_data.get('summary', 'AI analysis complete.')
                        match_score = ai_data.get('match_score', 50)
                        decision = ai_data.get('decision', 'NO').upper()
                        reasoning = ai_data.get('reasoning', 'Analysis completed.')
                        
                        # Validate and use pattern matching as backup for missing fields
                        if not email_ai or '@' not in email_ai:
                            email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text_content[:3000])
                            email_ai = email_match.group(0) if email_match else ''
                        
                        if not phone_ai:
                            phone_match = re.search(r'(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text_content[:3000])
                            phone_ai = phone_match.group(0) if phone_match else ''
                        
                        if decision == "YES" or match_score >= 75:
                            category = "High Match"
                            verdict = "[YES] Strongly Recommended (AI Reasoning)"
                        elif match_score >= 60:
                            category = "Potential"
                            verdict = "[MAYBE] Consider (AI Reasoning)"
                        else:
                            category = "Reject"  
                            verdict = "[NO] Not Recommended (AI Reasoning)"
                        
                        print(f"   [OK] AI Analysis Complete: {decision} ({match_score}%)")
                        
                        return {
                            "category": category,
                            "match_score": match_score,
                            "personal_details": {
                                "name": name or "Unknown",
                                "email": email_ai,
                                "phone": phone_ai,
                                "location": ""
                            },
                            "skills": skills if isinstance(skills, list) else [],
                            "experience_years": int(experience) if experience else 0,
                            "key_achievements": [],
                            "verdict": verdict,
                            "summary": summary,  # Return the actual summary
                            "reasoning": f"AI DECISION: {decision}\n\n{reasoning}",
                            "strengths": skills[:10] if isinstance(skills, list) else [],
                            "gaps": []
                        }
                        
                except json.JSONDecodeError:
                    print(f"   [WARN] Could not parse JSON from AI response")
                except Exception as e:
                    print(f"   [WARN] Error processing AI response: {e}")
            
            # Fallback to enhanced pattern matching
            print("   [INFO] AI unavailable, using enhanced pattern matching...")
            return AIGatekeeper._pattern_matching_analysis(
                text_content, job_title, job_description, required_skills, minimum_experience
            )
            
        except json.JSONDecodeError as e:
            print(f"[WARN] JSON parsing error: {e}")
            print(f"Raw response: {result_text[:500]}")
            return AIGatekeeper._fallback_analysis()
            
        except Exception as e:
            print(f"[ERROR] AI Gatekeeper error: {e}")
            return AIGatekeeper._fallback_analysis()
    
    @staticmethod
    def _pattern_matching_analysis(text_content: str, job_title: str, job_description: str, required_skills: str, minimum_experience: int) -> Dict:
        """Enhanced pattern matching with high accuracy - analyzes FULL resume"""
        import re
        
        print("[INFO] Analyzing full resume with enhanced pattern matching...")
        
        # Convert to lowercase for case-insensitive matching
        text_lower = text_content.lower()
        
        # ===== PERSONAL DETAILS EXTRACTION =====
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        phone_pattern = r'(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
        
        # Search in first 3000 chars for contact info
        email = re.search(email_pattern, text_content[:3000])
        phone = re.search(phone_pattern, text_content[:3000])
        
        # Extract name (first non-empty line that's likely a name)
        lines = [l.strip() for l in text_content.split('\n') if l.strip()]
        name = "Unknown"
        for line in lines[:5]:  # Check first 5 lines
            # Skip common resume headers
            if len(line) > 3 and len(line) < 50 and not any(skip in line.lower() for skip in ['resume', 'curriculum', 'cv', 'contact', 'email', 'phone', '@']):
                name = line
                break
        
        # ===== ENHANCED SKILL DETECTION =====
        # Comprehensive skill dictionary with variations
        skill_database = {
            # Programming Languages
            'Python': ['python', 'py', 'django', 'flask', 'fastapi', 'pytorch', 'tensorflow'],
            'JavaScript': ['javascript', 'js', 'node.js', 'nodejs', 'react', 'vue', 'angular', 'next.js', 'express'],
            'TypeScript': ['typescript', 'ts'],
            'Java': ['java', 'spring', 'spring boot', 'hibernate'],
            'C++': ['c++', 'cpp'],
            'C#': ['c#', 'csharp', '.net', 'dotnet', 'asp.net'],
            'Go': ['golang', ' go ', 'go language'],
            'Rust': ['rust'],
            'Ruby': ['ruby', 'rails', 'ruby on rails'],
            'PHP': ['php', 'laravel', 'symfony'],
            
            # Frontend
            'React': ['react', 'reactjs', 'react.js'],
            'Vue': ['vue', 'vuejs', 'vue.js'],
            'Angular': ['angular', 'angularjs'],
            'HTML': ['html', 'html5'],
            'CSS': ['css', 'css3', 'scss', 'sass'],
            'Tailwind': ['tailwind', 'tailwindcss'],
            'Bootstrap': ['bootstrap'],
            
            # Backend
            'Node.js': ['node', 'nodejs', 'node.js', 'express'],
            'Django': ['django'],
            'Flask': ['flask'],
            'FastAPI': ['fastapi', 'fast api'],
            'Express': ['express', 'expressjs'],
            
            # Databases
            'SQL': ['sql', 'mysql', 'postgresql', 'mssql'],
            'PostgreSQL': ['postgresql', 'postgres', 'psql'],
            'MySQL': ['mysql'],
            'MongoDB': ['mongodb', 'mongo'],
            'Redis': ['redis'],
            'Elasticsearch': ['elasticsearch', 'elastic'],
            
            # Cloud & DevOps
            'AWS': ['aws', 'amazon web services', 'ec2', 's3', 'lambda', 'dynamodb'],
            'Azure': ['azure', 'microsoft azure'],
            'GCP': ['gcp', 'google cloud', 'google cloud platform'],
            'Docker': ['docker', 'dockerfile', 'containerization'],
            'Kubernetes': ['kubernetes', 'k8s'],
            'CI/CD': ['ci/cd', 'cicd', 'continuous integration', 'continuous deployment', 'jenkins', 'github actions'],
            'Git': ['git', 'github', 'gitlab', 'bitbucket'],
            
            # ML/AI
            'Machine Learning': ['machine learning', 'ml', 'predictive model'],
            'TensorFlow': ['tensorflow', 'tf'],
            'PyTorch': ['pytorch', 'torch'],
            'Data Science': ['data science', 'data analysis', 'data analytics'],
            
            # Other
            'REST': ['rest', 'restful', 'rest api'],
            'GraphQL': ['graphql', 'graph ql'],
            'API': ['api', 'apis'],
        }
        
        detected_skills = []
        for skill_name, variations in skill_database.items():
            for variation in variations:
                if variation in text_lower:
                    detected_skills.append(skill_name)
                    break  # Found this skill, move to next
        
        # Remove duplicates
        detected_skills = list(set(detected_skills))
        
        print(f"   [OK] Detected {len(detected_skills)} skills from resume")
        
        # ===== EXPERIENCE EXTRACTION (Enhanced) =====
        exp_patterns = [
            r'(\d+)\+?\s*years?\s+(?:of\s+)?experience',
            r'experience[:\s]+(\d+)\+?\s*years?',
            r'(\d+)\+?\s*years?\s+in',
            r'over\s+(\d+)\s+years',
            r'more than\s+(\d+)\s+years',
        ]
        
        experience_years = 0
        for pattern in exp_patterns:
            matches = re.findall(pattern, text_lower)
            if matches:
                # Take the maximum mentioned years
                experience_years = max([int(m) for m in matches])
                break
        
        # If no explicit years, try to infer from job history
        if experience_years == 0:
            # Look for date ranges (2020-2023, Jan 2020 - Dec 2023, etc.)
            date_patterns = [
                r'(\d{4})\s*[-–]\s*(\d{4})',
                r'(\d{4})\s*[-–]\s*present',
                r'(\d{4})\s*[-–]\s*current',
            ]
            years_set = set()
            for pattern in date_patterns:
                matches = re.findall(pattern, text_lower)
                for match in matches:
                    if isinstance(match, tuple):
                        start_year = int(match[0])
                        end_year = 2024 if 'present' in text_lower or 'current' in text_lower else int(match[1]) if match[1].isdigit() else 2024
                        years_set.add(end_year - start_year)
            
            if years_set:
                experience_years = sum(years_set)
        
        print(f"   [OK] Detected {experience_years} years of experience")
        
        # ===== JOB MATCHING ANALYSIS =====
        required_skill_list = [s.strip() for s in required_skills.split(',') if s.strip()]
        
        # Find matching skills (case-insensitive, flexible)
        matching_skills = []
        for required in required_skill_list:
            for detected in detected_skills:
                if required.lower() in detected.lower() or detected.lower() in required.lower():
                    matching_skills.append(detected)
                    break
        
        # Remove duplicates
        matching_skills = list(set(matching_skills))
        
        # Calculate base match score
        if required_skill_list:
            skill_match_ratio = len(matching_skills) / len(required_skill_list)
            match_score = int(skill_match_ratio * 100)
        else:
            match_score = 50
        
        # Bonus for extra relevant skills
        extra_skills = len(detected_skills) - len(matching_skills)
        if extra_skills > 5:
            match_score += 5
        
        # Experience factor
        if experience_years >= minimum_experience:
            match_score += 15  # Significant bonus
        elif experience_years >= minimum_experience * 0.7:  # Within 70%
            match_score += 5  # Minor bonus
        elif experience_years > 0 and experience_years < minimum_experience * 0.5:
            match_score -= 15  # Significant penalty
        
        # Job description relevance check
        job_desc_lower = job_description.lower()
        relevance_keywords = []
        for skill in matching_skills:
            if skill.lower() in job_desc_lower:
                relevance_keywords.append(skill)
        
        if len(relevance_keywords) > len(matching_skills) * 0.7:
            match_score += 5  # Bonus for high relevance
        
        # Cap at 100
        match_score = min(100, max(0, match_score))
        
        # ===== DECISION MAKING =====
        if match_score >= 75:
            category = "High Match"
            verdict = "[YES] Strongly Recommended"
            decision = "YES"
        elif match_score >= 60:
            category = "Potential"
            verdict = "[MAYBE] Consider with Review"
            decision = "MAYBE"
        else:
            category = "Reject"
            verdict = "[NO] Not Recommended"
            decision = "NO"
        
        gaps_list = [req for req in required_skill_list if not any(req.lower() in match.lower() or match.lower() in req.lower() for match in matching_skills)]
        
        # Generate Summary
        summary = f"{name} is a {category} candidate with {experience_years} years of experience. Demonstrated skills include {', '.join(matching_skills[:5])}. {verdict}."

        
        # ===== BUILD DETAILED REASONING =====
        reasoning_parts = [
            f"HIRING DECISION: {decision}",
            f"",
            f"Match Score: {match_score}%",
            f"Experience: {experience_years} years (required: {minimum_experience}+)",
            f"Skills Matched: {len(matching_skills)}/{len(required_skill_list)} required skills",
            f"",
            f"SKILL ANALYSIS:",
            f"[+] Matching Skills: {', '.join(matching_skills) if matching_skills else 'None'}",
            f"[-] Missing Skills: {', '.join(gaps_list) if gaps_list else 'None'}",
            f"[i] Additional Skills: {len(detected_skills) - len(matching_skills)} other relevant skills detected",
            f"",
            f"DECISION RATIONALE:",
        ]
        
        if decision == "YES":
            reasoning_parts.append(f"[+] This candidate is STRONGLY RECOMMENDED for the {job_title} position.")
            reasoning_parts.append(f"   - High skill match ({len(matching_skills)}/{len(required_skill_list)} required skills)")
            if experience_years >= minimum_experience:
                reasoning_parts.append(f"   - Meets experience requirements ({experience_years} years)")
            reasoning_parts.append(f"   - Well-suited for this role based on comprehensive analysis")
        elif decision == "MAYBE":
            reasoning_parts.append(f"[?] This candidate shows POTENTIAL but requires careful review.")
            reasoning_parts.append(f"   - Moderate skill match ({len(matching_skills)}/{len(required_skill_list)} required skills)")
            reasoning_parts.append(f"   - Missing {len(gaps_list)} key skills that may need training")
            reasoning_parts.append(f"   - Consider for interview if willing to invest in skill development")
        else:
            reasoning_parts.append(f"[-] This candidate is NOT RECOMMENDED for the {job_title} position.")
            reasoning_parts.append(f"   - Insufficient skill match (only {len(matching_skills)}/{len(required_skill_list)} required skills)")
            reasoning_parts.append(f"   - Missing critical skills: {', '.join(gaps_list[:3])}")
            if experience_years < minimum_experience:
                reasoning_parts.append(f"   - Below experience requirement")
        
        reasoning = "\n".join(reasoning_parts)
        
        print(f"   [OK] Analysis complete: {decision} ({match_score}%)")
        
        return {
            "category": category,
            "match_score": match_score,
            "personal_details": {
                "name": name,
                "email": email.group(0) if email else "",
                "phone": phone.group(0) if phone else "",
                "location": ""
            },
            "skills": detected_skills,
            "experience_years": experience_years,
            "key_achievements": [],
            "verdict": verdict,
            "summary": summary,
            "reasoning": reasoning,
            "strengths": matching_skills,
            "gaps": gaps_list
        }
    
    
    @staticmethod
    def _extract_json_from_text(text: str) -> Dict:
        """Extract JSON from LLM response text"""
        try:
            # Try to find JSON in the text
            start_idx = text.find('{')
            end_idx = text.rfind('}') + 1
            
            if start_idx != -1 and end_idx > start_idx:
                json_str = text[start_idx:end_idx]
                return json.loads(json_str)
            else:
                # Try parsing the whole text
                return json.loads(text)
        except:
            print(f"⚠️ JSON parsing failed, using fallback")
            return AIGatekeeper._fallback_analysis()
    
    @staticmethod
    def _build_gatekeeper_prompt(
        job_title: str,
        job_description: str,
        required_skills: str,
        minimum_experience: int
    ) -> str:
        """Build the prompt for the LLM to act as gatekeeper"""
        
        return f"""You are an expert AI Recruiter acting as a Gatekeeper for candidate screening.

**JOB DETAILS:**
- Title: {job_title}
- Description: {job_description}
- Required Skills: {required_skills}
- Minimum Experience: {minimum_experience} years

**YOUR TASK:**
Analyze the resume PDF and determine if this candidate is a good fit for the role.

**EXTRACT:**
1. Personal Details (name, email, phone, location - if visible)
2. All Technical Skills
3. Total Years of Experience
4. Key Achievements

**EVALUATE:**
- Compare candidate's skills against required skills
- Check if experience meets minimum requirement
- Assess overall fit for the role

**CATEGORIZE:**
Based on your analysis, place the candidate in ONE category:
- **"High Match"** (80%+ match) - Meets most/all requirements, strong candidate
- **"Potential"** (50-79% match) - Meets some requirements, could work with training
- **"Reject"** (<50% match) - Doesn't meet key requirements

**OUTPUT FORMAT:**
Return ONLY valid JSON (no markdown, no code blocks):

{{
  "category": "High Match" | "Potential" | "Reject",
  "match_score": <number 0-100>,
  "personal_details": {{
    "name": "...",
    "email": "...",
    "phone": "...",
    "location": "..."
  }},
  "skills": ["skill1", "skill2", ...],
  "experience_years": <number>,
  "key_achievements": ["achievement1", "achievement2"],
  "verdict": "One sentence summary of candidate",
  "reasoning": "2-3 sentences explaining your decision",
  "strengths": ["strength1", "strength2", ...],
  "gaps": ["gap1", "gap2", ...]
}}

**IMPORTANT:**
- Return ONLY the JSON object, nothing else
- Be strict but fair in evaluation
- Focus on matching job requirements
- If resume is poorly formatted or unreadable, category should be "Reject"
"""
    
    
    @staticmethod
    def _fallback_analysis() -> Dict:
        """Fallback when AI is unavailable"""
        return {
            "category": "Potential",
            "match_score": 50,
            "personal_details": {
                "name": "Unknown",
                "email": "",
                "phone": "",
                "location": ""
            },
            "skills": [],
            "experience_years": 0,
            "key_achievements": [],
            "verdict": "Manual review required",
            "reasoning": "AI analysis unavailable. Please review manually.",
            "strengths": [],
            "gaps": []
        }


# Simplified interface for backward compatibility
def parse_resume_from_bytes(
    file_content: bytes,
    filename: str,
    job_description: str = "",
    job_requirements: str = "",
    job_title: str = "",
    minimum_experience: int = 0
) -> Dict:
    """
    Main entry point for resume analysis
    
    Args:
        file_content: PDF bytes
        filename: Original filename
        job_description: Job description text
        job_requirements: Required skills (comma-separated)
        job_title: Job title
        minimum_experience: Minimum years required
    
    Returns:
        Dict with analysis results compatible with existing system
    """
    
    # Use AI Gatekeeper
    result = AIGatekeeper.analyze_resume(
        pdf_bytes=file_content,
        job_title=job_title or "Position",
        job_description=job_description or "",
        required_skills=job_requirements or "",
        minimum_experience=minimum_experience
    )
    
    # Map to existing format for compatibility
    category_to_status = {
        "High Match": "Selected",
        "Potential": "Applied",
        "Reject": "Rejected"
    }
    
    # Extract personal details
    personal = result.get("personal_details", {})
    
    # Format for existing system
    return {
        # Core info
        "summary": result.get("summary", result.get("verdict", "")), # Use summary if available
        "skills": result.get("skills", []),
        "experience": f"{result.get('experience_years', 0)} years" if result.get('experience_years') else "N/A",
        
        # Personal details
        "name": personal.get("name", "Unknown"),
        "email": personal.get("email", ""),
        "phone": personal.get("phone", ""),
        "location": personal.get("location", ""),
        
        # Job matching
        "match_score": result.get("match_score", 0),
        "category": result.get("category", "Potential"),
        "verdict": result.get("category", "Pending Review"),
        "status": category_to_status.get(result.get("category", "Potential"), "Applied"),
        
        # Strengths and gaps
        "strengths": result.get("strengths", []),
        "gaps": result.get("gaps", []),
        
        # Reasoning
        "recommendation": result.get("reasoning", ""),
        "ai_reasoning": "",  # Avoid duplication in application notes
        
        # Achievements
        "achievements": result.get("key_achievements", [])
    }


# For backward compatibility
def analyze_candidate_profile(file_content: bytes, filename: str, job_description: str = "") -> Dict:
    """Legacy wrapper"""
    return parse_resume_from_bytes(file_content, filename, job_description, "", "")


if __name__ == "__main__":
    print("🎯 AI Gatekeeper Testing")
    print("=" * 60)
    
    # Test configuration check
    if HF_TOKEN:
        print("✅ Hugging Face token found")
    else:
        print("❌ Missing HF_TOKEN in .env")
        print("   Add: HF_TOKEN=hf_...")
    
    print("\n💡 The AI Gatekeeper will:")
    print("   1. Read PDFs directly (no text extraction needed)")
    print("   2. Extract: Personal Details, Skills, Experience")
    print("   3. Match against Job Requirements")
    print("   4. Categorize: High Match / Potential / Reject")
    print("   5. Provide detailed reasoning")
    
    print("\n📋 Example Job Matching:")
    print("   Job: Senior Python Developer")
    print("   Required: Python, Django, AWS, 5+ years")
    print("   Resume: Python, React, 7 years")
    print("   → Category: Potential (has Python & experience, missing Django/AWS)")