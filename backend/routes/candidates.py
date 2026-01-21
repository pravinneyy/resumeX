import os
import shutil
import json
import logging
import re
import traceback
from dotenv import load_dotenv
from google import genai
from pypdf import PdfReader
from fastapi import APIRouter, Depends, Form, UploadFile, File, HTTPException, Body
from sqlalchemy.orm import Session
from db import get_db
from models import Candidate, Application, Job, AssessmentSubmission
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
load_dotenv()
router = APIRouter()
UPLOAD_DIR = "uploads"
GENAI_API_KEY = os.getenv("GENAI_API_KEY")

class StatusUpdate(BaseModel):
    status: str

# --- ROBUST AI PARSER (Using Gemini Pro) ---
def parse_resume_with_ai(file_path):
    print(f"\n[AI] Processing: {file_path}")

    if not GENAI_API_KEY:
        return "AI Parsing Disabled", "General"
        
    try:
        # 1. Extract Text from PDF
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        
        # Clean text to remove weird characters
        clean_text = re.sub(r'[^\x00-\x7F]+', ' ', text)
        
        if len(clean_text) < 50:
            return "Resume text too short/unreadable", "Manual Review"

        # 2. Call Gemini Pro (Standard Model)
        client = genai.Client(api_key=GENAI_API_KEY)
        
        prompt = f"""
        Extract professional summary and technical skills from this resume text.
        Return ONLY valid JSON.
        {{
          "summary": "3 sentence summary",
          "skills": "skill1, skill2, skill3"
        }}
        
        RESUME TEXT:
        {clean_text[:5000]}
        """

        # Using 'gemini-pro' as it is the most stable free model
        response = client.models.generate_content(
            model='gemini-pro', 
            contents=prompt
        )
        
        # 3. Parse Response
        match = re.search(r'\{.*\}', response.text, re.DOTALL)
        if match:
            data = json.loads(match.group(0))
            return data.get("summary", "Summary not found"), data.get("skills", "General")
        else:
            return "AI format error", "Manual Review"

    except Exception as e:
        print(f"[AI ERROR] {str(e)}")
        return f"Error: {str(e)}", "Manual Review"

# --- ROUTES ---

@router.post("/applications/apply")
async def apply_job(
    job_id: int = Form(...),
    candidate_id: str = Form(...),
    candidate_name: str = Form(...),
    candidate_email: str = Form(...),
    resume: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)

    file_location = f"{UPLOAD_DIR}/{candidate_id}_{resume.filename}"
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(resume.file, file_object)
        
    summary, skills = parse_resume_with_ai(file_location)
        
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        candidate = Candidate(
            id=candidate_id, name=candidate_name, email=candidate_email, 
            resume_url=file_location, parsed_summary=summary, skills=skills
        )
        db.add(candidate)
    else:
        candidate.resume_url = file_location
        candidate.parsed_summary = summary
        candidate.skills = skills
    
    existing_app = db.query(Application).filter(
        Application.job_id == job_id, Application.candidate_id == candidate_id
    ).first()

    if not existing_app:
        new_app = Application(job_id=job_id, candidate_id=candidate_id, status="Applied")
        db.add(new_app)
    
    db.commit()
    return {"message": "Application successful"}

@router.put("/applications/{app_id}/status")
def update_application_status(app_id: int, data: StatusUpdate, db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    app.status = data.status
    db.commit()
    return {"message": f"Status updated to {data.status}"}

@router.get("/candidates")
def get_all_candidates(db: Session = Depends(get_db)):
    results = db.query(Application, Candidate, Job)\
        .join(Candidate, Application.candidate_id == Candidate.id)\
        .join(Job, Application.job_id == Job.id)\
        .all()
    
    data = []
    for app, cand, job in results:
        submission = db.query(AssessmentSubmission).filter(
            AssessmentSubmission.job_id == job.id,
            AssessmentSubmission.candidate_id == cand.id
        ).first()
        
        data.append({
            "id": cand.id,
            "application_id": app.id,
            "name": cand.name,
            "email": cand.email,
            "phone": cand.phone or "N/A",
            "location": job.location, 
            "position": job.title,
            "skills": (cand.skills or "General").split(','),
            "status": app.status,
            "appliedDate": app.applied_at.isoformat(),
            "aiScore": submission.score if submission else 0,
            "avatar": "" 
        })
    return data

@router.get("/candidate/applications")
def get_my_apps(candidateId: str, db: Session = Depends(get_db)):
    apps = db.query(Application).filter(Application.candidate_id == candidateId).all()
    return [{
        "id": app.id,
        "job_id": app.job.id,
        "job_title": app.job.title,
        "company_name": app.job.company,
        "status": app.status,
        "applied_at": app.applied_at
    } for app in apps]

@router.get("/candidate/check_application")
def check_application(candidateId: str, jobId: int, db: Session = Depends(get_db)):
    exists = db.query(Application).filter(
        Application.candidate_id == candidateId, Application.job_id == jobId
    ).first()
    return {"applied": bool(exists)}