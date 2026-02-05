"""
Candidate applications endpoint - shows candidate's own applications
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from models import Application, Job, CandidateFinalScore
from utils.security import get_current_user

router = APIRouter()

@router.get("/candidates/me/applications")
def get_my_applications(
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    Get all applications for the logged-in candidate
    """
    applications = db.query(Application, Job).join(
        Job, Application.job_id == Job.id
    ).filter(
        Application.candidate_id == current_user_id
    ).all()
    
    result = []
    for app, job in applications:
        # Get assessment scores if available
        final_score = db.query(CandidateFinalScore).filter(
            CandidateFinalScore.job_id == job.id,
            CandidateFinalScore.candidate_id == current_user_id
        ).first()
        
        result.append({
            "application_id": app.id,
            "job_id": job.id,
            "job_title": job.title,
            "company": job.recruiter_id,  # You might want to join with Recruiter table for company name
            "applied_date": app.applied_at.isoformat() if app.applied_at else None,
            "status": app.status,
            "assessment_completed": final_score is not None,
            "final_score": final_score.final_score if final_score else None,
            "psychometric_score": final_score.psychometric_score if final_score else None,
            "technical_score": final_score.technical_score if final_score else None,
            "coding_score": final_score.coding_score if final_score else None
        })
    
    return result
