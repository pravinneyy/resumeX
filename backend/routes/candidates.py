from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Header, Form
from sqlalchemy.orm import Session
from db import get_db
from models import Candidate, Application
from services.ai_extract import extract_resume_info

router = APIRouter()

def get_current_user(x_user: str = Header(None)):
    if not x_user:
        raise HTTPException(status_code=401, detail="Missing X-User header")
    return x_user

@router.post("/candidates/{candidate_id}/resume")
async def upload_resume(
    candidate_id: str, 
    job_id: int = Form(...),
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    # 1. Parse Resume
    resume_data = await extract_resume_info(file, file.filename)
    
    # 2. Convert List of skills to String for Database (e.g., "Python,Java,React")
    skills_str = ",".join(resume_data.get('skills', []))

    # 3. Update/Create Candidate
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        candidate = Candidate(
            id=candidate_id, 
            name=resume_data['personal']['name'],
            email=resume_data['personal']['email'],
            phone=resume_data['personal']['phone'],
            state="REGISTERED",
            skills=skills_str # <--- Saving Skills Here
        )
        db.add(candidate)
    else:
        # Update existing candidate skills
        candidate.skills = skills_str
    
    candidate.resume_url = f"uploads/{file.filename}"

    # 4. Create Application Link
    existing_app = db.query(Application).filter_by(job_id=job_id, candidate_id=candidate_id).first()
    if not existing_app:
        new_app = Application(job_id=job_id, candidate_id=candidate_id)
        db.add(new_app)

    db.commit()

    return {
        "status": "success", 
        "message": "Application submitted", 
        "data": resume_data
    }

@router.get("/candidates/{candidate_id}")
def get_candidate(
    candidate_id: str, 
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    return {
        "status": "success",
        "data": {
            "id": candidate.id,
            "name": candidate.name,
            "state": candidate.state,
            "current_round": candidate.current_round_index,
            "skills": candidate.skills.split(",") if candidate.skills else []
        }
    }