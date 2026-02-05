import os
import json
import re
import time
import requests
import pdfplumber
from io import BytesIO
from typing import Dict, List, Set
from dotenv import load_dotenv

load_dotenv()

# Initialize Hugging Face token
HF_TOKEN = os.getenv("HF_TOKEN")


class AIGatekeeper:
    """
    Production-ready resume screening system.
    Uses AI to analyze resumes against job requirements and make hiring decisions.
    """
    
    # ===== MASTER SKILL DATABASE =====
    # Only real technical skills - no random text detection
    TECHNICAL_SKILLS = {
        # Programming Languages
        "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "C", "Go", "Golang",
        "Rust", "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R", "MATLAB", "Perl",
        "Objective-C", "Dart", "Lua", "Haskell", "Elixir", "Clojure", "F#",
        
        # Web Frontend
        "React", "React.js", "ReactJS", "Vue", "Vue.js", "VueJS", "Angular", "AngularJS",
        "Next.js", "NextJS", "Nuxt.js", "Svelte", "HTML", "HTML5", "CSS", "CSS3",
        "SCSS", "SASS", "Less", "Tailwind", "TailwindCSS", "Bootstrap", "Material UI",
        "jQuery", "Redux", "Zustand", "MobX", "Webpack", "Vite", "Babel",
        
        # Web Backend
        "Node.js", "NodeJS", "Express", "Express.js", "Django", "Flask", "FastAPI",
        "Spring", "Spring Boot", "ASP.NET", ".NET", ".NET Core", "Ruby on Rails",
        "Rails", "Laravel", "Symfony", "NestJS", "Koa", "Hapi", "Gin", "Echo",
        
        # Databases
        "SQL", "MySQL", "PostgreSQL", "Postgres", "MongoDB", "Redis", "Elasticsearch",
        "SQLite", "Oracle", "SQL Server", "MSSQL", "MariaDB", "Cassandra", "DynamoDB",
        "Firebase", "Firestore", "Supabase", "Neo4j", "CouchDB", "InfluxDB",
        
        # Cloud & DevOps
        "AWS", "Amazon Web Services", "Azure", "Microsoft Azure", "GCP", "Google Cloud",
        "Docker", "Kubernetes", "K8s", "Jenkins", "CI/CD", "GitHub Actions", "GitLab CI",
        "Terraform", "Ansible", "Chef", "Puppet", "CloudFormation", "Helm",
        "Linux", "Ubuntu", "CentOS", "Nginx", "Apache", "Heroku", "Vercel", "Netlify",
        
        # Data Science & ML
        "Machine Learning", "ML", "Deep Learning", "TensorFlow", "PyTorch", "Keras",
        "Scikit-learn", "Pandas", "NumPy", "Matplotlib", "Seaborn", "Jupyter",
        "Data Science", "Data Analysis", "Data Analytics", "Big Data", "Spark",
        "Hadoop", "NLP", "Computer Vision", "OpenCV", "AI", "Artificial Intelligence",
        
        # Mobile
        "Android", "iOS", "React Native", "Flutter", "Xamarin", "Ionic", "SwiftUI",
        "Jetpack Compose", "Mobile Development",
        
        # APIs & Protocols
        "REST", "RESTful", "REST API", "GraphQL", "gRPC", "WebSocket", "WebSockets",
        "SOAP", "API Development", "Microservices",
        
        # Version Control & Tools
        "Git", "GitHub", "GitLab", "Bitbucket", "SVN", "Mercurial",
        "JIRA", "Confluence", "Trello", "Agile", "Scrum", "Kanban",
        
        # Testing
        "Unit Testing", "Jest", "Mocha", "Chai", "Pytest", "JUnit", "Selenium",
        "Cypress", "Playwright", "TestNG", "TDD", "BDD", "QA", "Quality Assurance",
        
        # Other Technologies
        "Blockchain", "Ethereum", "Solidity", "Web3", "Smart Contracts",
        "RabbitMQ", "Kafka", "Apache Kafka", "Message Queue", "Celery",
        "OAuth", "JWT", "Authentication", "Authorization", "Security",
        "System Design", "Software Architecture", "Design Patterns",
    }
    
    @staticmethod
    def analyze_resume(
        pdf_bytes: bytes,
        job_title: str,
        job_description: str,
        required_skills: str,
        minimum_experience: int = 0
    ) -> Dict:
        """
        Main entry point - Analyzes resume against job requirements.
        
        Flow:
        1. Extract text from PDF
        2. Detect ONLY valid technical skills
        3. Match against required skills
        4. Calculate deterministic score
        5. Use AI for reasoning (optional enhancement)
        6. Return structured result
        """
        
        try:
            # ===== STEP 1: EXTRACT PDF TEXT =====
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
            text_lower = text_content.lower()
            
            # ===== STEP 2: EXTRACT PERSONAL DETAILS =====
            personal = AIGatekeeper._extract_personal_details(text_content)
            print(f"[INFO] Extracted: {personal['name']}, {personal['email']}")
            
            # ===== STEP 3: DETECT SKILLS (Only valid technical skills) =====
            detected_skills = AIGatekeeper._detect_technical_skills(text_lower)
            print(f"[SKILLS] Detected {len(detected_skills)} valid skills: {detected_skills[:10]}...")
            
            # ===== STEP 4: EXTRACT EXPERIENCE YEARS =====
            experience_years = AIGatekeeper._extract_experience(text_lower)
            print(f"[EXP] Detected {experience_years} years of experience")
            
            # ===== STEP 5: MATCH SKILLS AGAINST REQUIREMENTS =====
            required_list = [s.strip() for s in required_skills.split(',') if s.strip()]
            matching_skills, missing_skills = AIGatekeeper._match_skills(
                text_lower, required_list, detected_skills
            )
            
            print(f"[MATCH] Matched: {matching_skills}")
            print(f"[MATCH] Missing: {missing_skills}")
            
            # ===== STEP 6: CALCULATE DETERMINISTIC SCORE =====
            match_score, category, decision = AIGatekeeper._calculate_score(
                matching_skills=matching_skills,
                required_skills=required_list,
                experience_years=experience_years,
                minimum_experience=minimum_experience
            )
            
            print(f"[SCORE] {match_score}% → {category} ({decision})")
            
            # ===== STEP 7: GENERATE REASONING =====
            reasoning = AIGatekeeper._generate_reasoning(
                name=personal['name'],
                job_title=job_title,
                matching_skills=matching_skills,
                missing_skills=missing_skills,
                required_skills=required_list,
                experience_years=experience_years,
                minimum_experience=minimum_experience,
                match_score=match_score,
                decision=decision
            )
            
            # ===== STEP 8: GET AI SUMMARY (Optional) =====
            ai_summary = AIGatekeeper._get_ai_summary(
                text_content[:3000],
                job_title,
                job_description,
                required_skills,
                decision
            )
            
            # ===== STEP 9: BUILD VERDICT =====
            if decision == "YES":
                verdict = "[YES] Strongly Recommended"
            elif decision == "MAYBE":
                verdict = "[MAYBE] Consider with Review"
            else:
                verdict = "[NO] Not Recommended"
            
            # Summary text
            skills_text = ', '.join(matching_skills[:5]) if matching_skills else 'None matched'
            summary = ai_summary if ai_summary else f"{personal['name']} - {category} candidate with {experience_years} years experience. Skills: {skills_text}."
            
            return {
                "category": category,
                "match_score": match_score,
                "personal_details": personal,
                "skills": detected_skills,  # All detected technical skills
                "experience_years": experience_years,
                "key_achievements": [],
                "verdict": verdict,
                "summary": summary,
                "reasoning": reasoning,
                "strengths": matching_skills,  # Skills that matched requirements
                "gaps": missing_skills  # Required skills not found
            }
            
        except Exception as e:
            print(f"[ERROR] Analysis failed: {e}")
            return AIGatekeeper._fallback_analysis()
    
    @staticmethod
    def _extract_personal_details(text: str) -> Dict:
        """Extract name, email, phone from resume text."""
        # Email
        email_match = re.search(
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            text[:3000]
        )
        email = email_match.group(0) if email_match else ""
        
        # Phone
        phone_match = re.search(
            r'(\+\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}',
            text[:3000]
        )
        phone = phone_match.group(0) if phone_match else ""
        
        # Name (first substantial line that's not a header)
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        name = "Unknown"
        skip_words = ['resume', 'curriculum', 'cv', 'contact', 'email', 'phone', 
                      'address', 'objective', 'summary', '@', 'http', 'www']
        
        for line in lines[:10]:
            line_lower = line.lower()
            # Skip if contains skip words or is too long/short
            if len(line) < 3 or len(line) > 50:
                continue
            if any(skip in line_lower for skip in skip_words):
                continue
            if re.search(r'\d{5,}', line):  # Skip phone/ID numbers
                continue
            # Likely a name
            name = line
            break
        
        return {
            "name": name,
            "email": email,
            "phone": phone,
            "location": ""
        }
    
    @staticmethod
    def _detect_technical_skills(text_lower: str) -> List[str]:
        """
        Detect ONLY valid technical skills from the master database.
        No random text - only real skills.
        """
        detected = []
        
        for skill in AIGatekeeper.TECHNICAL_SKILLS:
            skill_lower = skill.lower()
            # Word boundary matching to avoid partial matches
            # E.g., "C" shouldn't match "Contact"
            if len(skill) <= 2:
                # For very short skills (C, R, Go), require word boundaries
                pattern = r'\b' + re.escape(skill_lower) + r'\b'
                if re.search(pattern, text_lower):
                    detected.append(skill)
            else:
                # For longer skills, simple contains check works
                if skill_lower in text_lower:
                    detected.append(skill)
        
        return list(set(detected))
    
    @staticmethod
    def _extract_experience(text_lower: str) -> int:
        """Extract years of experience from resume."""
        # Pattern 1: "X years of experience"
        patterns = [
            r'(\d+)\+?\s*years?\s+(?:of\s+)?experience',
            r'experience[:\s]+(\d+)\+?\s*years?',
            r'(\d+)\+?\s*years?\s+in\s+',
            r'over\s+(\d+)\s+years',
            r'more\s+than\s+(\d+)\s+years',
            r'(\d+)\+?\s*yrs?\s+(?:of\s+)?exp',
        ]
        
        max_years = 0
        for pattern in patterns:
            matches = re.findall(pattern, text_lower)
            for match in matches:
                years = int(match)
                if years < 50:  # Sanity check
                    max_years = max(max_years, years)
        
        # If no explicit mention, try to calculate from date ranges
        if max_years == 0:
            # Look for year ranges like 2020-2024 or 2020-Present
            year_pattern = r'(20\d{2})\s*[-–to]+\s*(20\d{2}|present|current|now)'
            matches = re.findall(year_pattern, text_lower)
            
            total_years = 0
            for start, end in matches:
                start_year = int(start)
                if end.isdigit():
                    end_year = int(end)
                else:
                    end_year = 2026  # Current year
                
                if end_year >= start_year:
                    total_years += (end_year - start_year)
            
            max_years = min(total_years, 30)  # Cap at 30 years
        
        return max_years
    
    @staticmethod
    def _match_skills(resume_text: str, required_skills: List[str], detected_skills: List[str]) -> tuple:
        """
        Match required skills (from recruiter) against the resume text directly.
        
        Process:
        1. For each skill the recruiter specified, search the resume text directly
        2. Also check if it was in our detected skills list
        3. Return the recruiter's skill name (not our database name) for matches
        
        Returns (matching_skills, missing_skills)
        """
        text_lower = resume_text.lower()
        matching = []
        missing = []
        
        for required in required_skills:
            req_clean = required.strip()
            if not req_clean:
                continue
            
            req_lower = req_clean.lower()
            found = False
            
            # Method 1: Direct search in resume text
            # Use word boundary for short skills to avoid false matches
            if len(req_clean) <= 3:
                # For short skills like "C", "R", "Go" - need word boundaries
                pattern = r'\b' + re.escape(req_lower) + r'\b'
                if re.search(pattern, text_lower):
                    found = True
            else:
                # For longer skills, simple contains works
                if req_lower in text_lower:
                    found = True
            
            # Method 2: Check against detected skills (with variations)
            if not found:
                for detected in detected_skills:
                    det_lower = detected.lower()
                    if req_lower == det_lower:
                        found = True
                        break
                    elif req_lower in det_lower or det_lower in req_lower:
                        found = True
                        break
                    elif AIGatekeeper._are_skills_equivalent(req_lower, det_lower):
                        found = True
                        break
            
            if found:
                matching.append(req_clean)  # Return recruiter's exact skill name
            else:
                missing.append(req_clean)
        
        print(f"   [SKILL_MATCH] Required: {required_skills}")
        print(f"   [SKILL_MATCH] Found: {matching}")
        print(f"   [SKILL_MATCH] Missing: {missing}")
        
        return matching, missing
    
    @staticmethod
    def _are_skills_equivalent(skill1: str, skill2: str) -> bool:
        """Check if two skills are equivalent (e.g., 'js' == 'javascript')"""
        equivalents = [
            {'javascript', 'js', 'ecmascript'},
            {'typescript', 'ts'},
            {'python', 'py'},
            {'react', 'reactjs', 'react.js'},
            {'vue', 'vuejs', 'vue.js'},
            {'angular', 'angularjs'},
            {'node', 'nodejs', 'node.js'},
            {'postgres', 'postgresql'},
            {'mongo', 'mongodb'},
            {'kubernetes', 'k8s'},
            {'amazon web services', 'aws'},
            {'google cloud', 'gcp', 'google cloud platform'},
            {'microsoft azure', 'azure'},
            {'c#', 'csharp', 'c sharp'},
            {'c++', 'cpp'},
            {'.net', 'dotnet', 'dot net'},
        ]
        
        for group in equivalents:
            if skill1 in group and skill2 in group:
                return True
        
        return False
    
    @staticmethod
    def _calculate_score(
        matching_skills: List[str],
        required_skills: List[str],
        experience_years: int,
        minimum_experience: int
    ) -> tuple:
        """
        Calculate deterministic match score.
        
        Formula:
        - 70% weight on skill match
        - 30% weight on experience match
        
        Returns: (score, category, decision)
        """
        # Skill score (70% of total)
        if required_skills:
            skill_ratio = len(matching_skills) / len(required_skills)
            skill_score = skill_ratio * 70
        else:
            skill_score = 35  # Default if no skills specified
        
        # Experience score (30% of total)
        if minimum_experience > 0:
            exp_ratio = min(experience_years / minimum_experience, 1.5)  # Cap at 150%
            exp_score = min(exp_ratio * 30, 30)  # Max 30 points
        else:
            # No experience requirement - give full points if any experience
            exp_score = 30 if experience_years > 0 else 15
        
        # Total score
        total_score = int(skill_score + exp_score)
        total_score = min(100, max(0, total_score))
        
        # Decision thresholds
        if total_score >= 75:
            category = "High Match"
            decision = "YES"
        elif total_score >= 55:
            category = "Potential"
            decision = "MAYBE"
        else:
            category = "Reject"
            decision = "NO"
        
        return total_score, category, decision
    
    @staticmethod
    def _generate_reasoning(
        name: str,
        job_title: str,
        matching_skills: List[str],
        missing_skills: List[str],
        required_skills: List[str],
        experience_years: int,
        minimum_experience: int,
        match_score: int,
        decision: str
    ) -> str:
        """Generate conversational reasoning for the decision."""
        
        candidate_name = name if name != "Unknown" else "This candidate"
        skill_count = len(matching_skills)
        total_skills = len(required_skills)
        
        if decision == "YES":
            # Enthusiastic recommendation
            if skill_count == total_skills:
                reasoning = f"I'd definitely recommend {candidate_name} for the {job_title} role! "
                reasoning += f"They have all {total_skills} required skills we're looking for"
            else:
                reasoning = f"I think {candidate_name} would be a great fit for the {job_title} position. "
                reasoning += f"They've got {skill_count} out of {total_skills} key skills"
            
            if matching_skills:
                reasoning += f" including {', '.join(matching_skills[:3])}"
                if len(matching_skills) > 3:
                    reasoning += f" and {len(matching_skills) - 3} more"
            reasoning += ". "
            
            if experience_years > 0:
                if experience_years >= minimum_experience:
                    reasoning += f"With {experience_years} years of experience, they meet our requirements. "
                else:
                    reasoning += f"They bring {experience_years} years of relevant experience. "
            
            reasoning += "I'd say let's move forward with an interview!"
        
        elif decision == "MAYBE":
            # Cautiously optimistic
            reasoning = f"{candidate_name} has potential for the {job_title} role, but there are some gaps to consider. "
            
            if skill_count > 0:
                reasoning += f"On the plus side, they have experience with {', '.join(matching_skills[:3])}. "
            
            if missing_skills:
                reasoning += f"However, they're missing {', '.join(missing_skills[:3])}"
                if len(missing_skills) > 3:
                    reasoning += f" and {len(missing_skills) - 3} other skills"
                reasoning += " which are important for this role. "
            
            if experience_years > 0:
                reasoning += f"They do have {experience_years} years of experience which is valuable. "
            
            reasoning += "I'd suggest considering them if you're open to some training, or if you have other candidates to compare against."
        
        else:
            # Honest rejection
            reasoning = f"Unfortunately, I don't think {candidate_name} is the right fit for the {job_title} position at this time. "
            
            if skill_count == 0:
                reasoning += f"They don't seem to have any of the {total_skills} required skills we're looking for"
                if missing_skills:
                    reasoning += f" ({', '.join(missing_skills[:3])})"
                reasoning += ". "
            else:
                reasoning += f"They only have {skill_count} out of {total_skills} required skills. "
                if missing_skills:
                    reasoning += f"Key missing skills include {', '.join(missing_skills[:3])}. "
            
            if minimum_experience > 0 and experience_years < minimum_experience:
                reasoning += f"Also, they have {experience_years} years of experience but we need at least {minimum_experience}. "
            
            reasoning += "I'd recommend looking at other candidates who better match the requirements."
        
        return reasoning
    
    @staticmethod
    def _get_ai_summary(
        resume_text: str,
        job_title: str,
        job_description: str,
        required_skills: str,
        decision: str
    ) -> str:
        """Optional: Get AI-generated candidate summary."""
        
        if not HF_TOKEN:
            return ""
        
        try:
            prompt = f"""Write a 2-sentence professional summary of this candidate for a {job_title} role.
Focus on their strengths and fit for the role.

Resume excerpt:
{resume_text[:1500]}

Required skills: {required_skills}

Write ONLY the 2-sentence summary, nothing else:"""
            
            api_url = "https://router.huggingface.co/v1/chat/completions"
            response = requests.post(
                api_url,
                headers={
                    "Authorization": f"Bearer {HF_TOKEN}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "meta-llama/Llama-3.2-3B-Instruct",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 150,
                    "temperature": 0.3
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                summary = result.get('choices', [{}])[0].get('message', {}).get('content', '')
                if summary and len(summary) > 20:
                    return summary.strip()
            
        except Exception as e:
            print(f"[WARN] AI summary failed: {e}")
        
        return ""
    
    @staticmethod
    def _fallback_analysis() -> Dict:
        """Fallback when analysis fails."""
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
            "verdict": "[?] Manual Review Required",
            "summary": "Unable to analyze resume automatically. Please review manually.",
            "reasoning": "Analysis could not be completed. Manual review is recommended.",
            "strengths": [],
            "gaps": []
        }


# ===== BACKWARD COMPATIBLE API =====

def parse_resume_from_bytes(
    file_content: bytes,
    filename: str,
    job_description: str = "",
    job_requirements: str = "",
    job_title: str = "",
    minimum_experience: int = 0
) -> Dict:
    """
    Main entry point for resume analysis.
    Backward compatible with existing system.
    """
    
    result = AIGatekeeper.analyze_resume(
        pdf_bytes=file_content,
        job_title=job_title or "Position",
        job_description=job_description or "",
        required_skills=job_requirements or "",
        minimum_experience=minimum_experience
    )
    
    # Map category to status
    category_to_status = {
        "High Match": "Selected",
        "Potential": "Applied",
        "Reject": "Rejected"
    }
    
    personal = result.get("personal_details", {})
    
    return {
        # Core info
        "summary": result.get("summary", ""),
        "skills": result.get("skills", []),
        "experience": f"{result.get('experience_years', 0)} years",
        
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
        "ai_reasoning": "",
        
        # Achievements
        "achievements": result.get("key_achievements", [])
    }


def analyze_candidate_profile(file_content: bytes, filename: str, job_description: str = "") -> Dict:
    """Legacy wrapper"""
    return parse_resume_from_bytes(file_content, filename, job_description, "", "")


if __name__ == "__main__":
    print("🎯 AI Gatekeeper - Production Ready")
    print("=" * 60)
    
    if HF_TOKEN:
        print("✅ Hugging Face token configured")
    else:
        print("⚠️  No HF_TOKEN - AI summaries disabled")
    
    print("\n📋 This system will:")
    print("   1. Extract text from PDF")
    print("   2. Detect ONLY valid technical skills")
    print("   3. Match against job requirements")  
    print("   4. Calculate deterministic score (70% skills + 30% experience)")
    print("   5. Provide clear YES/NO/MAYBE recommendation")
    print("   6. Show matching and missing skills")