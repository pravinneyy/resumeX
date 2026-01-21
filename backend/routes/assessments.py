from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from models import Job, JobAssessment, AssessmentSubmission, Candidate, Application
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

# Schema for Saving Assessment
class QuestionSchema(BaseModel):
    title: str
    problem_text: str
    test_input: str
    test_output: str
    points: int

class AssessmentCreate(BaseModel):
    job_id: int
    title: str
    duration_minutes: int
    questions: List[QuestionSchema]

# Schema for Submitting Code
class SubmitSchema(BaseModel):
    job_id: int
    candidate_id: str
    code: str
    language: str

# 1. Save Assessment (Recruiter)
@router.post("/assessments")
def create_assessment(data: AssessmentCreate, db: Session = Depends(get_db)):
    # Check if assessment already exists for this job
    existing = db.query(JobAssessment).filter(JobAssessment.job_id == data.job_id).first()
    if existing:
        # Update existing
        existing.title = data.title
        existing.duration_minutes = data.duration_minutes
        existing.questions = [q.dict() for q in data.questions]
        db.commit()
        return {"message": "Assessment updated"}
    
    # Create new
    new_assessment = JobAssessment(
        job_id=data.job_id,
        title=data.title,
        duration_minutes=data.duration_minutes,
        questions=[q.dict() for q in data.questions]
    )
    db.add(new_assessment)
    db.commit()
    return {"message": "Assessment created"}

# 2. Get Assessment (Candidate)
@router.get("/jobs/{job_id}/assessment")
def get_assessment(job_id: int, db: Session = Depends(get_db)):
    assessment = db.query(JobAssessment).filter(JobAssessment.job_id == job_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment

# 3. Submit Assessment (Candidate)
@router.post("/assessment/submit")
def submit_code(data: SubmitSchema, db: Session = Depends(get_db)):
    # Simple grading logic (Check exact output match)
    assessment = db.query(JobAssessment).filter(JobAssessment.job_id == data.job_id).first()
    score = 0
    
    if assessment and assessment.questions:
        question = assessment.questions[0] # Just grading first question for MVP
        # In a real app, you would run the code here. 
        # For now, we simulate a 'pass' if the code is non-empty.
        if len(data.code) > 10: 
            score = question.get('points', 10)

    # Save Submission
    submission = AssessmentSubmission(
        job_id=data.job_id,
        candidate_id=data.candidate_id,
        code=data.code,
        language=data.language,
        score=score
    )
    db.add(submission)
    
    # Update Application Status
    app = db.query(Application).filter(
        Application.job_id == data.job_id, 
        Application.candidate_id == data.candidate_id
    ).first()
    if app:
        app.status = "Review Pending"
        
    db.commit()
    return {"message": "Submission received", "score": score}

# 4. Get Submission (Recruiter View)
@router.get("/assessment/submission")
def get_submission(jobId: int, candidateId: str, db: Session = Depends(get_db)):
    sub = db.query(AssessmentSubmission).filter(
        AssessmentSubmission.job_id == jobId,
        AssessmentSubmission.candidate_id == candidateId
    ).first()
    
    if not sub:
        raise HTTPException(status_code=404, detail="No submission found")
        
    return sub