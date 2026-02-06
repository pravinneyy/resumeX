"""
Weight configuration endpoint for JobAssessment
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from models import JobAssessment, Job
from pydantic import BaseModel, validator
from utils.security import get_current_user

router = APIRouter()

class WeightUpdate(BaseModel):
    psychometric_weight: float
    technical_weight: float
    coding_weight: float
    behavioral_weight: float
    
    @validator('psychometric_weight', 'technical_weight', 'coding_weight', 'behavioral_weight')
    def check_weight_range(cls, v):
        if not (0 <= v <= 1):
            raise ValueError('Weight must be between 0 and 1')
        return v
    
    @validator('behavioral_weight')
    def check_sum(cls, v, values):
        total = v + values.get('psychometric_weight', 0) + values.get('technical_weight', 0) + values.get('coding_weight', 0)
        if abs(total - 1.0) > 0.01:  # Allow small floating point errors
            raise ValueError(f'Weights must sum to 1.0 (100%), got {total}')
        return v

@router.put("/assessments/{job_id}/weights")
def update_assessment_weights(
    job_id: int,
    weights: WeightUpdate,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    Update assessment weights for a job.
    Weights must sum to 1.0 (100%).
    """
    # Verify job ownership
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.recruiter_id != current_user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Get or create assessment
    assessment = db.query(JobAssessment).filter(JobAssessment.job_id == job_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found for this job")
    
    # Update weights
    assessment.psychometric_weight = weights.psychometric_weight
    assessment.technical_weight = weights.technical_weight
    assessment.coding_weight = weights.coding_weight
    assessment.behavioral_weight = weights.behavioral_weight
    
    db.commit()
    db.refresh(assessment)
    
    return {
        "message": "Weights updated successfully",
        "weights": {
            "psychometric": assessment.psychometric_weight,
            "technical": assessment.technical_weight,
            "coding": assessment.coding_weight,
            "behavioral": assessment.behavioral_weight
        }
    }

@router.get("/assessments/{job_id}/weights")
def get_assessment_weights(
    job_id: int,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """Get current assessment weights for a job"""
    # Verify job ownership
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.recruiter_id != current_user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    assessment = db.query(JobAssessment).filter(JobAssessment.job_id == job_id).first()
    if not assessment:
        return {
            "psychometric": 0.25,
            "technical": 0.25,
            "coding": 0.40,
            "behavioral": 0.10
        }
    
    return {
        "psychometric": assessment.psychometric_weight or 0.25,
        "technical": assessment.technical_weight or 0.25,
        "coding": assessment.coding_weight or 0.40,
        "behavioral": assessment.behavioral_weight or 0.10
    }
