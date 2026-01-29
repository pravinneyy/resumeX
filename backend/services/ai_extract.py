import os
import io
import requests
import pdfplumber
import re
from dotenv import load_dotenv

load_dotenv()

# Configuration
HF_TOKEN = os.getenv("HF_TOKEN")
# Using the Direct Router URL (Confirmed Working)
API_URL = "https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli"
HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"}

def extract_text_from_pdf(file_content: bytes) -> str:
    """Helper to get raw text from PDF bytes"""
    try:
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            text = "\n".join([page.extract_text() or "" for page in pdf.pages])
        return text
    except Exception as e:
        print(f"❌ PDF Text Extraction Failed: {e}")
        return ""

def extract_skills_from_text(text: str) -> str:
    """
    Since we are using a Classifier (not a Chatbot), we extract skills 
    using keyword matching instead of asking the AI to write them.
    """
    # Common tech keywords to look for
    keywords = [
        "Python", "Java", "C++", "JavaScript", "TypeScript", "React", "Angular", "Vue",
        "Node.js", "Django", "FastAPI", "Flask", "SQL", "PostgreSQL", "MongoDB",
        "AWS", "Azure", "Docker", "Kubernetes", "Git", "Linux", "Machine Learning",
        "TensorFlow", "PyTorch", "HTML", "CSS", "C#", ".NET", "Go", "Rust"
    ]
    
    found_skills = set()
    text_lower = text.lower()
    
    for skill in keywords:
        # Check if the skill exists in the text (case-insensitive)
        # We use regex to ensure we match "Java" but not "Javascript" twice
        if re.search(r'\b' + re.escape(skill.lower()) + r'\b', text_lower):
            found_skills.add(skill)
            
    return ",".join(list(found_skills)) if found_skills else "General Engineering"

def parse_resume_from_bytes(file_content: bytes, filename: str):
    """
    Extracts text and returns a summary + extracted skills.
    """
    text = extract_text_from_pdf(file_content)
    if not text:
        return "Could not read resume text.", "General"
    
    # 1. Generate a Text Summary (First 300 chars)
    summary = text[:300].replace("\n", " ") + "..."
    
    # 2. Extract Skills using Python (Reliable & Free)
    skills = extract_skills_from_text(text)
    
    return summary, skills

def screen_candidate(resume_text: str, job_description: str):
    """
    Uses direct requests to Hugging Face Router for screening.
    """
    if not HF_TOKEN:
        return {"status": "Pending", "reasoning": "AI Token Missing"}

    labels = ["Qualified Candidate", "Not Qualified"]

    # Construct Payload
    payload = {
        "inputs": resume_text[:1000],
        "parameters": {
            "candidate_labels": labels,
            "multi_label": False
        }
    }

    try:
        response = requests.post(API_URL, headers=HEADERS, json=payload, timeout=30)
        data = response.json()

        # --- CRITICAL FIX FOR YOUR "UNEXPECTED FORMAT" WARNING ---
        # Handle List Response: [{'label': 'Not Qualified', 'score': 0.58}, ...]
        if isinstance(data, list) and len(data) > 0:
            # Sort by score descending
            data.sort(key=lambda x: x.get('score', 0), reverse=True)
            top_result = data[0]
            top_label = top_result.get('label', 'Unknown')
            top_score = top_result.get('score', 0)
            
        # Handle Dict Response (Fallback): {'labels': [...], 'scores': [...]}
        elif isinstance(data, dict) and "labels" in data:
            top_label = data['labels'][0]
            top_score = data['scores'][0]
            
        else:
             return {"status": "Applied", "reasoning": f"AI Error: Unexpected format {str(data)[:50]}"}

        # Decision Logic
        confidence = round(top_score * 100, 1)
        status = "Rejected"
        if top_label == "Qualified Candidate" and top_score > 0.5:
            status = "Selected"

        reasoning = f"AI Classification: {top_label} ({confidence}% confidence)."

        return {
            "status": status,
            "reasoning": reasoning
        }

    except Exception as e:
        print(f"❌ Screening Error: {e}")
        return {"status": "Applied", "reasoning": "AI Screening Failed"}