import docx
import pdfplumber
import re

# Central Skill Database
SKILL_DB = [
    "python", "java", "c++", "c#", "javascript", "typescript", "html", "css", "sql", "go", "rust", 
    "react", "angular", "vue", "node.js", "django", "fastapi", "flask", "spring boot", ".net", 
    "docker", "kubernetes", "aws", "azure", "gcp", "git", "jenkins", "linux", 
    "mysql", "postgresql", "mongodb", "redis", "oracle", "sql server",
    "machine learning", "tensorflow", "pytorch", "pandas", "numpy", "opencv"
]

def extract_text_from_file(filepath):
    text = ""
    try:
        if filepath.endswith('.pdf'):
            with pdfplumber.open(filepath) as pdf:
                for page in pdf.pages:
                    extract = page.extract_text()
                    if extract: text += extract + "\n"
        elif filepath.endswith('.docx'):
            doc = docx.Document(filepath)
            for para in doc.paragraphs:
                text += para.text + "\n"
    except Exception as e:
        print(f"Error parsing file: {e}")
    return text

def parse_resume_sections(text):
    lines = text.split('\n')
    sections = {
        "Personal": [],
        "Experience": [],
        "Education": [],
        "Skills": [],
        "Projects": []
    }
    
    current_section = "Personal"
    
    headers = {
        "EXPERIENCE": "Experience", "WORK HISTORY": "Experience", "EMPLOYMENT": "Experience",
        "EDUCATION": "Education", "QUALIFICATIONS": "Education",
        "SKILLS": "Skills", "TECHNICAL SKILLS": "Skills",
        "PROJECTS": "Projects"
    }

    for line in lines:
        clean_line = line.strip().upper()
        if clean_line in headers:
            current_section = headers[clean_line]
        else:
            if line.strip():
                sections[current_section].append(line.strip())

    # Extraction Logic
    email = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)
    phone = re.search(r'(?:\+?\d{1,3}[-. \t]?)?\(?\d{3}\)?[-. \t]?\d{3}[-. \t]?\d{4}', text)
    name = sections["Personal"][0] if sections["Personal"] else "Candidate"

    found_skills = set()
    text_lower = text.lower()
    for skill in SKILL_DB:
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text_lower):
            found_skills.add(skill)

    return {
        "personal": {
            "name": name,
            "email": email.group(0) if email else "Not Found",
            "phone": phone.group(0).strip() if phone else "Not Found",
        },
        "experience": sections["Experience"][:10],
        "education": sections["Education"][:5],
        "skills": list(found_skills)
    }