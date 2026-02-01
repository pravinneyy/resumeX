import os
import io
import requests
import pdfplumber
import re
from dotenv import load_dotenv
from typing import Dict, Tuple, List

load_dotenv()

# Configuration
HF_TOKEN = os.getenv("HF_TOKEN")

# AI Models
SUMMARIZATION_API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-cnn"
CLASSIFICATION_API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-mnli"

HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"}


def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF bytes"""
    try:
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            text = "\n".join([page.extract_text() or "" for page in pdf.pages])
        return text
    except Exception as e:
        print(f"❌ PDF Text Extraction Failed: {e}")
        return ""


def clean_personal_info(text: str) -> str:
    """Remove personal information (email, phone) from text"""
    # Remove email addresses
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '', text)
    
    # Remove phone numbers (various formats)
    text = re.sub(r'\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}', '', text)
    text = re.sub(r'\b\d{10,}\b', '', text)  # 10+ digit sequences
    
    # Clean up extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text


def extract_skills_from_text(text: str) -> List[str]:
    """Extract technical skills using keyword matching"""
    keywords = [
        # Programming Languages
        "Python", "Java", "C++", "JavaScript", "TypeScript", "C#", ".NET", "Go", 
        "Rust", "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R",
        
        # Frontend
        "React", "Angular", "Vue", "Next.js", "HTML", "CSS", "SASS", "Tailwind", 
        "Bootstrap", "Redux", "Webpack", "jQuery",
        
        # Backend
        "Node.js", "Django", "FastAPI", "Flask", "Spring Boot", "Express.js", 
        "Laravel", "ASP.NET", "Rails",
        
        # Databases
        "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", 
        "Oracle", "NoSQL", "Cassandra", "DynamoDB",
        
        # Cloud & DevOps
        "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Jenkins", "CI/CD", 
        "Terraform", "Linux", "Git", "GitHub", "GitLab",
        
        # Data & ML
        "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Scikit-learn",
        "Pandas", "NumPy", "Data Analysis", "AI", "NLP", "Computer Vision",
        
        # Other
        "REST API", "GraphQL", "Microservices", "Agile", "Scrum", "Testing",
        "Jest", "Pytest", "Selenium"
    ]
    
    found_skills = set()
    text_lower = text.lower()
    
    for skill in keywords:
        if re.search(r'\b' + re.escape(skill.lower()) + r'\b', text_lower):
            found_skills.add(skill)
    
    return sorted(list(found_skills))


def extract_experience_years(text: str) -> str:
    """Extract years of experience from text"""
    patterns = [
        r'(\d+)\+?\s*(?:to|-)\s*(\d+)\s*years',
        r'(\d+)\+\s*years',
        r'(\d+)\s*years?\s+(?:of\s+)?experience',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text.lower())
        if match:
            if len(match.groups()) == 2:
                return f"{match.group(1)}-{match.group(2)} years"
            else:
                return f"{match.group(1)}+ years"
    
    return "N/A"


def generate_clean_summary(text: str, max_length: int = 100) -> str:
    """
    Generate a clean, professional summary without personal info
    """
    if not HF_TOKEN or not text or len(text.strip()) < 100:
        # Fallback to basic extraction
        clean_text = clean_personal_info(text)
        return clean_text[:200].strip() + "..."
    
    # Clean personal info before summarization
    clean_text = clean_personal_info(text)
    
    # Truncate for API
    if len(clean_text) > 3000:
        clean_text = clean_text[:3000]
    
    payload = {
        "inputs": clean_text,
        "parameters": {
            "max_length": max_length,
            "min_length": 30,
            "do_sample": False,
            "early_stopping": True
        }
    }
    
    try:
        print("🤖 Generating professional summary...")
        response = requests.post(
            SUMMARIZATION_API_URL, 
            headers=HEADERS, 
            json=payload, 
            timeout=30
        )
        
        if response.status_code == 503:
            import time
            time.sleep(10)
            response = requests.post(SUMMARIZATION_API_URL, headers=HEADERS, json=payload, timeout=30)
        
        response.raise_for_status()
        data = response.json()
        
        if isinstance(data, list) and len(data) > 0:
            summary = data[0].get('summary_text', '')
        elif isinstance(data, dict):
            summary = data.get('summary_text', '')
        else:
            raise ValueError("Unexpected response format")
        
        if summary:
            # Extra cleaning pass to remove any remaining personal info
            summary = clean_personal_info(summary)
            print("✅ Professional summary generated")
            return summary
        else:
            raise ValueError("Empty summary")
            
    except Exception as e:
        print(f"⚠️ Summarization error: {e}, using fallback")
        clean_text = clean_personal_info(text)
        return clean_text[:200].strip() + "..."


def analyze_job_match(resume_text: str, resume_skills: List[str], job_description: str, 
                      job_requirements: str) -> Dict[str, any]:
    """
    Analyze how well the candidate matches the job requirements
    Returns detailed match analysis with gaps
    """
    if not job_description and not job_requirements:
        return {
            "match_score": 0,
            "verdict": "Pending Review",
            "strengths": [],
            "gaps": [],
            "recommendation": "Job requirements not specified. Manual review required."
        }
    
    # Combine job description and requirements
    job_text = f"{job_description or ''} {job_requirements or ''}"
    
    # Extract required skills from job description
    required_skills = extract_skills_from_text(job_text)
    
    # Find matching and missing skills
    matching_skills = [skill for skill in required_skills if skill in resume_skills]
    missing_skills = [skill for skill in required_skills if skill not in resume_skills]
    
    # Calculate basic match score
    if required_skills:
        skill_match_rate = (len(matching_skills) / len(required_skills)) * 100
    else:
        skill_match_rate = 0
    
    # Use AI to get overall qualification assessment
    ai_assessment = assess_candidate_fit(resume_text, job_text)
    
    # Combine scores (60% AI, 40% skill match)
    ai_confidence = ai_assessment.get("confidence", 0)
    final_score = (ai_confidence * 0.6) + (skill_match_rate * 0.4)
    
    # Determine verdict
    if final_score >= 75:
        verdict = "✅ Highly Qualified"
        status = "Selected"
    elif final_score >= 60:
        verdict = "✅ Qualified"
        status = "Selected"
    elif final_score >= 40:
        verdict = "⚠️ Partially Qualified"
        status = "Applied"
    else:
        verdict = "❌ Not Qualified"
        status = "Rejected"
    
    # Generate recommendation
    if final_score >= 75:
        recommendation = "Strong candidate. Recommend immediate interview."
    elif final_score >= 60:
        recommendation = "Good candidate. Consider for interview."
    elif final_score >= 40:
        recommendation = "Mixed profile. May be suitable for modified role."
    else:
        recommendation = "Does not meet key requirements. Not recommended."
    
    return {
        "match_score": round(final_score, 1),
        "skill_match_rate": round(skill_match_rate, 1),
        "ai_confidence": round(ai_confidence, 1),
        "verdict": verdict,
        "status": status,
        "strengths": matching_skills[:5],  # Top 5 matching skills
        "gaps": missing_skills[:5],  # Top 5 missing skills
        "recommendation": recommendation,
        "ai_reasoning": ai_assessment.get("reasoning", "")
    }


def assess_candidate_fit(resume_text: str, job_description: str) -> Dict[str, any]:
    """
    Use AI to assess if candidate fits the job requirements
    """
    if not HF_TOKEN:
        return {"confidence": 50, "label": "Unknown", "reasoning": "AI token not configured"}
    
    # Prepare text for classification
    combined_text = f"Job: {job_description[:500]} | Resume: {resume_text[:500]}"
    
    labels = ["Highly Qualified", "Qualified", "Partially Qualified", "Not Qualified"]
    
    payload = {
        "inputs": combined_text,
        "parameters": {
            "candidate_labels": labels,
            "multi_label": False
        }
    }
    
    try:
        print("🔍 Assessing candidate fit...")
        response = requests.post(
            CLASSIFICATION_API_URL,
            headers=HEADERS,
            json=payload,
            timeout=30
        )
        
        response.raise_for_status()
        data = response.json()
        
        if isinstance(data, list) and len(data) > 0:
            data.sort(key=lambda x: x.get('score', 0), reverse=True)
            top_result = data[0]
            label = top_result.get('label', 'Unknown')
            score = top_result.get('score', 0) * 100
        elif isinstance(data, dict) and "labels" in data:
            label = data['labels'][0]
            score = data['scores'][0] * 100
        else:
            return {"confidence": 50, "label": "Unknown", "reasoning": "Unexpected AI response"}
        
        reasoning = f"AI Assessment: {label} ({score:.1f}% confidence)"
        
        print(f"✅ Assessment complete: {label} ({score:.1f}%)")
        
        return {
            "confidence": score,
            "label": label,
            "reasoning": reasoning
        }
        
    except Exception as e:
        print(f"⚠️ Assessment error: {e}")
        return {"confidence": 50, "label": "Unknown", "reasoning": f"Assessment failed: {str(e)}"}


def parse_resume_from_bytes(file_content: bytes, filename: str, 
                            job_description: str = "", 
                            job_requirements: str = "") -> Dict[str, any]:
    """
    Complete resume analysis with job matching
    """
    text = extract_text_from_pdf(file_content)
    
    if not text or len(text.strip()) < 50:
        return {
            "summary": "Could not extract text from resume.",
            "skills": [],
            "experience": "N/A",
            "match_score": 0,
            "verdict": "Error",
            "status": "Applied",
            "strengths": [],
            "gaps": [],
            "recommendation": "Resume could not be processed. Please check file format."
        }
    
    print("📄 Analyzing resume...")
    
    # 1. Generate clean professional summary
    summary = generate_clean_summary(text, max_length=100)
    
    # 2. Extract skills
    skills = extract_skills_from_text(text)
    
    # 3. Extract experience
    experience = extract_experience_years(text)
    
    # 4. Analyze job match
    if job_description or job_requirements:
        match_analysis = analyze_job_match(text, skills, job_description, job_requirements)
    else:
        match_analysis = {
            "match_score": 0,
            "verdict": "Pending Review",
            "status": "Applied",
            "strengths": skills[:5] if skills else [],
            "gaps": [],
            "recommendation": "Job requirements not provided. Manual review required.",
            "ai_reasoning": ""
        }
    
    print(f"✅ Analysis complete - Match: {match_analysis['match_score']}%")
    
    return {
        "summary": summary,
        "skills": skills,
        "experience": experience,
        **match_analysis  # Merge match analysis results
    }


# For backward compatibility
def analyze_candidate_profile(file_content: bytes, filename: str, 
                              job_description: str = "") -> Dict[str, any]:
    """
    Wrapper for backward compatibility
    """
    return parse_resume_from_bytes(file_content, filename, job_description, "")


if __name__ == "__main__":
    print("Testing Enhanced AI Resume Analysis")
    print("=" * 60)
    
    sample_resume = """
    John Doe
    Senior Software Engineer
    
    Professional Summary:
    Experienced software engineer with 7 years in full-stack development.
    
    Skills:
    Python, Django, React, JavaScript, PostgreSQL, AWS, Docker, Git
    
    Experience:
    Senior Developer at Tech Corp (2020-Present)
    - Built microservices with Python and Django
    - Developed frontend with React
    - Deployed on AWS with Docker
    """
    
    sample_job = """
    We're looking for a Senior Full Stack Developer with:
    - 5+ years of experience
    - Expert in Python and React
    - Experience with AWS and Docker
    - Knowledge of PostgreSQL
    - Experience with microservices architecture
    """
    
    # Test summary cleaning
    print("\n1. Testing Summary Generation:")
    summary = generate_clean_summary(sample_resume)
    print(f"Summary: {summary}\n")
    
    # Test skill extraction
    print("2. Testing Skill Extraction:")
    skills = extract_skills_from_text(sample_resume)
    print(f"Skills: {', '.join(skills)}\n")
    
    # Test job matching
    print("3. Testing Job Match Analysis:")
    result = parse_resume_from_bytes(
        sample_resume.encode(),
        "test_resume.pdf",
        sample_job,
        ""
    )
    print(f"Match Score: {result['match_score']}%")
    print(f"Verdict: {result['verdict']}")
    print(f"Strengths: {', '.join(result['strengths'])}")
    print(f"Gaps: {', '.join(result['gaps']) if result['gaps'] else 'None'}")
    print(f"Recommendation: {result['recommendation']}")