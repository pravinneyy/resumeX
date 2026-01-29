from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from models import Application, Candidate, Job
from pydantic import BaseModel
import shutil
import os

router = APIRouter()

# --- SCHEMAS ---
class ApplicationStatusUpdate(BaseModel):
    status: str

# --- ROUTES ---

@router.post("/applications/apply")
def apply_for_job(
    job_id: int = Form(...),
    candidate_id: str = Form(...),
    candidate_name: str = Form(...),
    candidate_email: str = Form(...),
    resume: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # 1. Save Resume File Locally
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_location = f"{upload_dir}/{candidate_id}_{resume.filename}"
    
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(resume.file, file_object)

    # 2. Check/Create Candidate
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        candidate = Candidate(
            id=candidate_id,
            name=candidate_name,
            email=candidate_email,
            resume_url=file_location
        )
        db.add(candidate)
        db.commit()
    else:
        candidate.resume_url = file_location
        db.commit()

    # 3. Create Application
    existing_app = db.query(Application).filter(
        Application.job_id == job_id,
        Application.candidate_id == candidate_id
    ).first()

    if existing_app:
        return {"message": "Already applied to this job"}

    new_app = Application(
        job_id=job_id,
        candidate_id=candidate_id,
        status="Applied"
    )
    db.add(new_app)
    db.commit()
    
    return {"message": "Application submitted successfully"}

# --- NEW ROUTE: UPDATE STATUS ---
@router.put("/applications/{application_id}/status")
def update_application_status(
    application_id: int, 
    data: ApplicationStatusUpdate, 
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == application_id).first()
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    app.status = data.status
    db.commit()
    
    return {"message": "Status updated successfully", "new_status": app.status}