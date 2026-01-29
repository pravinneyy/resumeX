from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
# FIX: Import 'JobAssessment' to match models.py
from models import JobAssessment, AssessmentSubmission, Application, PsychometricSubmission, Job, Candidate
from pydantic import BaseModel
from typing import List, Dict, Any
import json

router = APIRouter()

# --- SCHEMAS ---
class Question(BaseModel):
    title: str
    problem_text: str
    test_input: str
    test_output: str
    points: int

class AssessmentCreate(BaseModel):
    job_id: int
    title: str
    duration_minutes: int
    questions: List[Question]

class SubmissionCreate(BaseModel):
    candidate_id: str
    code: str
    language: str
    output: str
    score: int

# --- ROUTES ---

@router.post("/assessments")
def create_assessment(data: AssessmentCreate, db: Session = Depends(get_db)):
    # 1. Verify Job Exists
    job = db.query(Job).filter(Job.id == data.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # 2. Serialize questions list to JSON string
    questions_json = json.dumps([q.dict() for q in data.questions])

    # 3. Create Assessment (Using 'JobAssessment')
    new_assessment = JobAssessment(
        job_id=data.job_id,
        title=data.title,
        duration_minutes=data.duration_minutes,
        questions=questions_json
    )
    db.add(new_assessment)
    db.commit()
    db.refresh(new_assessment)
    
    return {"message": "Assessment created successfully", "id": new_assessment.id}

@router.get("/assessments/{job_id}")
def get_assessment(job_id: int, db: Session = Depends(get_db)):
    # FIX: Query 'JobAssessment'
    assessment = db.query(JobAssessment).filter(JobAssessment.job_id == job_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    return {
        "id": assessment.id,
        "title": assessment.title,
        "duration_minutes": assessment.duration_minutes,
        # Parse JSON string back to list for Frontend
        "questions": json.loads(assessment.questions) if isinstance(assessment.questions, str) else assessment.questions
    }

@router.post("/assessments/{job_id}/submit")
def submit_assessment(job_id: int, data: SubmissionCreate, db: Session = Depends(get_db)):
    # 1. Check if candidate applied
    app = db.query(Application).filter(
        Application.job_id == job_id, 
        Application.candidate_id == data.candidate_id
    ).first()
    
    if not app:
        raise HTTPException(status_code=403, detail="Candidate has not applied to this job")

    # 2. Save Submission
    submission = AssessmentSubmission(
        job_id=job_id,
        candidate_id=data.candidate_id,
        code=data.code,
        language=data.language,
        output=data.output,
        score=data.score
    )
    db.add(submission)
    
    # 3. Update Application Status
    app.status = "Assessment Completed"
    
    db.commit()
    return {"message": "Assessment submitted successfully"}

# --- NEW ROUTE: FIX FOR MISSING MARKS IN MODAL ---
@router.get("/assessments/final_grade/{job_id}/{candidate_id}")
def get_final_grade(job_id: int, candidate_id: str, db: Session = Depends(get_db)):
    # 1. Get Technical Score
    tech = db.query(AssessmentSubmission).filter(
        AssessmentSubmission.job_id == job_id,
        AssessmentSubmission.candidate_id == candidate_id
    ).first()

    # 2. Get Psychometric Score
    psycho = db.query(PsychometricSubmission).filter(
        PsychometricSubmission.job_id == job_id,
        PsychometricSubmission.candidate_id == candidate_id
    ).first()

    # 3. Get Application (for final grade/verdict)
    app = db.query(Application).filter(
        Application.job_id == job_id,
        Application.candidate_id == candidate_id
    ).first()

    return {
        "technical_score": tech.score if tech else 0,
        "psychometric_score": psycho.score if psycho else 0,
        "final_score": app.final_grade if app else 0,
        "verdict": app.verdict if app else "Pending",
        "ai_analysis": app.notes if app else "No AI analysis available yet."
    }