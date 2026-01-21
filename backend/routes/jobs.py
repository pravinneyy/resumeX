from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from models import Job, Application, Candidate, AssessmentSubmission
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

# Schema for creating a job
class JobCreate(BaseModel):
    title: str
    company: str
    location: str
    salary: str
    type: str
    skills: str
    recruiter_id: str

# 1. Post a Job
@router.post("/jobs")
def create_job(job: JobCreate, db: Session = Depends(get_db)):
    new_job = Job(
        title=job.title,
        company=job.company,
        location=job.location,
        salary=job.salary,
        type=job.type,
        skills=job.skills,
        recruiter_id=job.recruiter_id
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return new_job

# 2. Get All Jobs
@router.get("/jobs")
def get_jobs(db: Session = Depends(get_db)):
    return db.query(Job).all()

# 3. Get Single Job
@router.get("/jobs/{job_id}")
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

# 4. Get Applications for a Job (Includes AI Data & Scores)
@router.get("/jobs/{job_id}/applications")
def get_job_applications(job_id: int, db: Session = Depends(get_db)):
    # Fetch applications for this job
    apps = db.query(Application).filter(Application.job_id == job_id).all()
    
    result = []
    for app in apps:
        # Fetch the score if they have submitted the exam
        submission = db.query(AssessmentSubmission).filter(
            AssessmentSubmission.job_id == job_id,
            AssessmentSubmission.candidate_id == app.candidate_id
        ).first()

        score = submission.score if submission else 0

        # We serialize the candidate data manually to include the AI fields & Score
        candidate_data = {
            "id": app.id,
            "job_id": app.job_id,
            "candidate_id": app.candidate_id,
            "status": app.status,
            "applied_at": app.applied_at,
            # Flatten Candidate Info
            "candidate_name": app.candidate.name if app.candidate else "Unknown",
            "candidate_email": app.candidate.email if app.candidate else "No Email",
            # AI FIELDS
            "candidate_skills": app.candidate.skills if app.candidate else "Pending...",
            "candidate_summary": app.candidate.parsed_summary if app.candidate else "Analysis in progress...",
            "resume_url": app.candidate.resume_url if app.candidate else None,
            # NEW: SCORE FIELD
            "score": score
        }
        result.append(candidate_data)
        
    return result