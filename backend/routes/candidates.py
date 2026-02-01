from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from models import Candidate, Application, Job
# IMPORT GATEKEEPER
from utils.security import get_current_user

router = APIRouter()

@router.get("/candidates")
def get_all_candidates(
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user) # <--- SECURE TOKEN
):
    """
    Fetch all candidates, BUT only for jobs owned by the logged-in Recruiter.
    """
    results = db.query(Application, Candidate, Job)\
        .join(Candidate, Application.candidate_id == Candidate.id)\
        .join(Job, Application.job_id == Job.id)\
        .filter(Job.recruiter_id == current_user_id) \
        .all() # <--- CRITICAL FILTER
    
    if not results: return []

    data = []
    for app, cand, job in results:
        data.append({
            "id": cand.id,
            "application_id": app.id,
            "job_id": job.id, 
            "name": cand.name,
            "email": cand.email,
            "phone": cand.phone or "N/A",
            "position": job.title,
            "status": app.status,
            "appliedDate": app.applied_at.isoformat() if app.applied_at else "",
            "skills": (cand.skills or "").split(','),
            "score": app.final_grade or 0,
            "ai_reasoning": app.notes 
        })
    return data

@router.get("/candidate/applications")
def get_my_apps(
    candidateId: str = Query(...), 
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user) # <--- SECURE TOKEN
):
    """
    Fetch application history for a specific candidate.
    """
    # SECURITY CHECK: You can only view your own applications
    if current_user_id != candidateId:
        raise HTTPException(status_code=403, detail="Unauthorized access to application history")

    apps = db.query(Application).filter(Application.candidate_id == candidateId).all()
    if not apps: return []

    data = []
    for app in apps:
        data.append({
            "id": app.id,
            "job_id": app.job.id,
            "job_title": app.job.title if app.job else "Unknown",
            "company_name": app.job.recruiter.company_name if (app.job and app.job.recruiter) else "Unknown",
            "status": app.status,
            "applied_at": app.applied_at
        })
    return data