from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from models import Job, Application, Recruiter, JobAssessment
from pydantic import BaseModel
from typing import Optional, List
import json

router = APIRouter()

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
    recruiter = db.query(Recruiter).filter(Recruiter.id == recruiter_id).first()
    
    if not recruiter:
        dummy = Recruiter(id=recruiter_id, email="test@example.com", company_name=job.company)
        db.add(dummy)
        db.commit()
    else:
        recruiter.company_name = job.company
        db.commit()

    new_job = Job(
        title=job.title, 
        description=f"{job.type} opportunity at {job.company}.",
        location=job.location,
        salary_range=job.salary,
        requirements=job.skills,
        recruiter_id=recruiter_id
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
            "resume_url": app.candidate.resume_url if app.candidate else ""
        } for app in apps]
    except Exception:
        return []

# --- FIX: Recursive JSON Parser (Handles Double Encoding) ---
@router.get("/jobs/{job_id}/assessment")
def get_job_assessment(job_id: int, db: Session = Depends(get_db)):
    assessment = db.query(JobAssessment).filter(JobAssessment.job_id == job_id).first()
    
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
        
    questions_data = assessment.questions

    # RECURSIVE DECODING LOOP
    # This will unwrap "String" -> "String" -> "List" safely
    for _ in range(3): # Try up to 3 times
        if isinstance(questions_data, str):
            try:
                parsed = json.loads(questions_data)
                questions_data = parsed
            except:
                break # Stop if parsing fails
        else:
            break # Stop if it's already a list/dict

    # Final Safety Check
    if not isinstance(questions_data, list):
        print(f"WARNING: Questions data is not a list! Type: {type(questions_data)}")
        questions_data = []

    return {
        "id": assessment.id,
        "title": assessment.title,
        "duration_minutes": assessment.duration_minutes,
        "questions": questions_data
    }