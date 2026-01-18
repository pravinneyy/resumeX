from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from services.code_executor import execute_code
from sqlalchemy.orm import Session
from db import get_db
from models import Assessment, Candidate

router = APIRouter()

class Submission(BaseModel):
    code: str
    language: str
    stdin: str = "" # Optional input for the code

def get_current_user(x_user: str = Header(None)):
    if not x_user:
        raise HTTPException(status_code=401, detail="Missing X-User header")
    return x_user

@router.post("/assessments/submit/{candidate_id}/{round_index}")
def submit_assessment(
    candidate_id: str, 
    round_index: int, 
    submission: Submission,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    # 1. Execute Code via Judge0
    result = execute_code(submission.code, submission.language, submission.stdin)
    
    # 2. Save Result to Database
    # Check if assessment record exists, if not create one
    assessment = db.query(Assessment).filter_by(candidate_id=candidate_id, round_index=round_index).first()
    
    passed_status = "TRUE" if result['status'] == 'success' else "FALSE"
    
    if not assessment:
        assessment = Assessment(
            candidate_id=candidate_id,
            round_index=round_index,
            code_submission=submission.code,
            passed=passed_status,
            technical_score=100.0 if passed_status == "TRUE" else 0.0 # Simple scoring logic
        )
        db.add(assessment)
    else:
        assessment.code_submission = submission.code
        assessment.passed = passed_status
        assessment.technical_score = 100.0 if passed_status == "TRUE" else 0.0
        
    db.commit()
    
    return {
        "status": "success",
        "data": {
            "candidate_id": candidate_id,
            "round": round_index,
            "execution_output": result['output'],
            "passed": passed_status == "TRUE",
            "metrics": {
                "time": result.get("time"),
                "memory": result.get("memory")
            }
        }
    }