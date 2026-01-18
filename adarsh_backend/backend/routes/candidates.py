from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models import Candidate, CandidateStateHistory, CandidateState
from schemas import CandidateCreate, CandidateResponse, StateTransitionRequest, ResumeUploadRequest
from db import get_db  # We'll define this in db.py
from auth import get_current_user
from ai_extract import extract_resume_info  # Assuming this exists
from state_machine import CandidateStateMachine

def compute_resume_match_score(extracted, job_description):
    # Placeholder: deterministic scoring based on extracted data
    # In real impl, compare skills, experience, etc.
    return 60  # Always pass for now

def job_description_for(blueprint_id):
    # Placeholder: return job description for blueprint
    return {"skills": ["python", "fastapi"]}

router = APIRouter()

@router.post("/candidates", response_model=CandidateResponse)
def create_candidate(candidate: CandidateCreate, db: Session = Depends(get_db)):
    # Create candidate in REGISTERED state
    new_candidate = Candidate(**candidate.dict(), state=CandidateState.REGISTERED, current_round_index=0)
    db.add(new_candidate)
    db.commit()
    return new_candidate

@router.post("/candidates/{candidate_id}/transition")
def transition_state(candidate_id: str, transition: StateTransitionRequest, user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(404, "Candidate not found")
    
    # Use state machine to transition
    CandidateStateMachine.transition_candidate_state(candidate, transition.new_state, db, user, transition.reason)
    return {"message": "State updated"}

@router.post("/resume/{candidate_id}")
def upload_resume(candidate_id: str, request: ResumeUploadRequest, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    CandidateStateMachine.enforce_not_terminal(candidate)

    # Only allow upload when REGISTERED
    CandidateStateMachine.ensure_candidate_state(candidate, [CandidateState.REGISTERED])

    # AI resume extraction - placeholder function should return structured data
    extracted = extract_resume_info(request.resume_text)

    # Deterministic resume scoring
    match_score = compute_resume_match_score(extracted, job_description_for(candidate.blueprint_id))
    threshold = 50  # or load from blueprint config

    if match_score < threshold:
        CandidateStateMachine.transition_candidate_state(candidate, CandidateState.REJECTED_PRE_ASSESSMENT, db, "system", f"Resume score {match_score} < {threshold}")
        db.add(candidate)
        db.commit()
        return {"message": "Rejected", "reason": "Low resume match"}
    else:
        candidate.resume_url = "uploaded"  # or store S3 url
        candidate.current_round_index = 0
        db.add(candidate)
        db.commit()
        CandidateStateMachine.transition_candidate_state(candidate, CandidateState.IN_ROUND, db, "system", "Resume passed")
        return {"message": "Resume uploaded, proceeding to round 0"}