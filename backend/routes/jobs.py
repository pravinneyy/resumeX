from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from db import get_db
from models import Job, Application, Candidate
from pydantic import BaseModel

router = APIRouter()

class JobCreate(BaseModel):
    title: str
    company: str
    location: str
    salary: str
    type: str
    skills: str
    recruiterId: str

@router.post("/jobs")
def create_job(job: JobCreate, db: Session = Depends(get_db)):
    new_job = Job(
        title=job.title,
        company=job.company,
        location=job.location,
        salary=job.salary,
        type=job.type,
        skills=job.skills,
        recruiter_id=job.recruiterId
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return {"message": "Job created", "job": new_job}

@router.get("/jobs")
def get_jobs(db: Session = Depends(get_db)):
    return db.query(Job).all()

@router.get("/recruiter/applications")
def get_recruiter_applications(recruiterId: str, db: Session = Depends(get_db)):
    # 1. Find jobs
    jobs = db.query(Job).filter(Job.recruiter_id == recruiterId).all()
    job_ids = [j.id for j in jobs]
    
    if not job_ids:
        return []

    # 2. Find applications
    applications = db.query(Application).filter(Application.job_id.in_(job_ids)).options(joinedload(Application.candidate), joinedload(Application.job)).all()
    
    # 3. Format response
    result = []
    for app in applications:
        # Parse skills string back to list
        candidate_skills = []
        if app.candidate and app.candidate.skills:
            candidate_skills = app.candidate.skills.split(",")

        result.append({
            "id": app.id,
            "job_title": app.job.title if app.job else "Unknown",
            "candidate_name": app.candidate.name if app.candidate else "Unknown Candidate",
            "candidate_email": app.candidate.email if app.candidate else "",
            "status": app.status,
            "resume_url": app.candidate.resume_url if app.candidate else None,
            "skills": candidate_skills # <--- Now returning actual skills from DB
        })
    return result