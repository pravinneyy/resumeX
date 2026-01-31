from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from models import Job, Application, Recruiter, JobAssessment
from pydantic import BaseModel
from typing import Optional
import json
import os

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://your-project.supabase.co")

class JobCreate(BaseModel):
    title: str
    company: str
    location: str
    salary: str
    type: str
    skills: str
    description: Optional[str] = None
    recruiter_id: Optional[str] = "user_default" 

@router.post("/jobs")
def create_job(job: JobCreate, db: Session = Depends(get_db)):
    recruiter_id = job.recruiter_id or "user_default"
    
    # 1. Check/Create Recruiter
    recruiter = db.query(Recruiter).filter(Recruiter.id == recruiter_id).first()
    
    if not recruiter:
        unique_email = f"test_{recruiter_id}@example.com"
        existing_email = db.query(Recruiter).filter(Recruiter.email == unique_email).first()
        
        if existing_email:
            recruiter = existing_email
        else:
            recruiter = Recruiter(id=recruiter_id, email=unique_email, company_name=job.company)
            db.add(recruiter)
            db.commit()
    
    # FIX: Removed the code that overwrites recruiter.company_name

    # 2. Use Custom Description
    final_description = job.description if job.description else f"{job.type} opportunity at {job.company}."

    # 3. Create the Job
    new_job = Job(
        title=job.title, 
        description=final_description, # Saves your specific description
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
            "description": j.description, # Returns the saved description
            "location": j.location or "Remote",
            "salary": j.salary_range or "Competitive",
            "type": "Full-time",
            # Returns the recruiter's company name
            "company": j.recruiter.company_name if j.recruiter else "Unknown Company"
        } for j in jobs]
    except Exception as e:
        print(f"Error fetching jobs: {e}")
        return [] 

# ... (Keep get_job_applications and get_job_assessment as they were) ...
# If you need those functions included, let me know, but the critical fix is above.
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
            "resume_url": (
                f"{SUPABASE_URL}/storage/v1/object/public/resumes/{app.candidate.resume_url}"
                if app.candidate and app.candidate.resume_url and not app.candidate.resume_url.startswith("http")
                else (app.candidate.resume_url if app.candidate else "")
            )
        } for app in apps]
    except Exception:
        return []