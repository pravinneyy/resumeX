from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from models import Job, Application, Recruiter, JobAssessment
from pydantic import BaseModel
from typing import Optional, List
import json
import os

router = APIRouter()

# Get Supabase URL from environment
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://your-project.supabase.co")

class JobCreate(BaseModel):
    title: str
    company: str
    location: str
    salary: str
    type: str
    skills: str
    recruiter_id: Optional[str] = "user_default" 

@router.post("/jobs")
def create_job(job: JobCreate, db: Session = Depends(get_db)):
    recruiter_id = job.recruiter_id or "user_default"
    
    # 1. Check if Recruiter exists by ID
    recruiter = db.query(Recruiter).filter(Recruiter.id == recruiter_id).first()
    
    if not recruiter:
        # --- FIX 1: Generate Unique Email to avoid Duplicate Key Error ---
        unique_email = f"test_{recruiter_id}@example.com"
        
        # Safety check: if email somehow exists, use that recruiter
        existing_email_user = db.query(Recruiter).filter(Recruiter.email == unique_email).first()
        
        if existing_email_user:
            recruiter = existing_email_user
        else:
            recruiter = Recruiter(id=recruiter_id, email=unique_email, company_name=job.company)
            db.add(recruiter)
            db.commit()
    else:
        recruiter.company_name = job.company
        db.commit()

    # 2. Create the Job
    new_job = Job(
        title=job.title, 
        description=f"{job.type} opportunity at {job.company}.",
        location=job.location,
        salary_range=job.salary,
        requirements=job.skills,
        recruiter_id=recruiter.id
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return {"message": "Job created", "id": new_job.id}

@router.get("/jobs")
def get_jobs(db: Session = Depends(get_db)):
    try:
        jobs = db.query(Job).all()
        if not jobs: return []

        return [{
            "id": j.id,
            "title": j.title,
            "location": j.location or "Remote",
            "salary": j.salary_range or "Competitive",
            "type": "Full-time",
            "company": j.recruiter.company_name if j.recruiter else "Unknown Company"
        } for j in jobs]
    except Exception as e:
        print(f"Error fetching jobs: {e}")
        return [] 

@router.get("/jobs/{job_id}/applications")
def get_job_applications(job_id: int, db: Session = Depends(get_db)):
    try:
        apps = db.query(Application).filter(Application.job_id == job_id).all()
        if not apps: return []

        def parse_skills(app):
            if not app.candidate or not app.candidate.skills: return []
            skills = app.candidate.skills
            if skills.startswith("["): 
                try: return json.loads(skills)
                except: return [skills]
            return skills.split(",")

        return [{
            "id": app.id,
            "candidate_id": app.candidate_id,
            "name": app.candidate.name if app.candidate else "Unknown",
            "email": app.candidate.email if app.candidate else "",
            "skills": parse_skills(app),
            "ai_reasoning": app.notes,
            "status": app.status,
            "score": app.final_grade or 0, 
            # --- FIX 2: Return Full Supabase URL for Resume ---
            "resume_url": (
                f"{SUPABASE_URL}/storage/v1/object/public/resumes/{app.candidate.resume_url}"
                if app.candidate and app.candidate.resume_url and not app.candidate.resume_url.startswith("http")
                else (app.candidate.resume_url if app.candidate else "")
            )
        } for app in apps]
    except Exception:
        return []

@router.get("/jobs/{job_id}/assessment")
def get_job_assessment(job_id: int, db: Session = Depends(get_db)):
    assessment = db.query(JobAssessment).filter(JobAssessment.job_id == job_id).first()
    
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
        
    questions_data = assessment.questions

    # Recursive Decoding Loop (Handles Double Encoding)
    for _ in range(3): 
        if isinstance(questions_data, str):
            try:
                parsed = json.loads(questions_data)
                questions_data = parsed
            except:
                break
        else:
            break

    if not isinstance(questions_data, list):
        questions_data = []

    return {
        "id": assessment.id,
        "title": assessment.title,
        "duration_minutes": assessment.duration_minutes,
        "questions": questions_data
    }