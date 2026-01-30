from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db, supabase 
from models import Application, Job, Candidate
from typing import Optional
import uuid

router = APIRouter()

@router.post("/applications/apply")
def apply_for_job(
    job_id: int = Form(...),
    candidate_id: str = Form(...),
    # FIX: Accept BOTH naming conventions
    name: Optional[str] = Form(None),
    candidate_name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    candidate_email: Optional[str] = Form(None),
    skills: Optional[str] = Form(None),
    resume: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    print(f"📥 Received Application: Job={job_id}, Cand={candidate_id}")

    # 1. Resolve Name and Email
    final_name = name or candidate_name
    final_email = email or candidate_email
    
    if not final_name or not final_email:
        raise HTTPException(status_code=422, detail="Missing name or email fields.")

    # 2. Check if Job exists
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # 3. Upload Resume to Supabase Storage
    resume_url = ""
    try:
        # Generate unique filename
        file_ext = resume.filename.split(".")[-1]
        unique_filename = f"{candidate_id}_{uuid.uuid4().hex[:8]}.{file_ext}"
        
        # FIX: Sync read (Removed 'await')
        file_content = resume.file.read()
        
        print(f"🚀 Uploading {unique_filename} to Supabase 'resumes' bucket...")

        if supabase:
            res = supabase.storage.from_("resumes").upload(
                path=unique_filename,
                file=file_content,
                file_options={"content-type": resume.content_type}
            )
            resume_url = unique_filename
            print("✅ Upload Successful")
        else:
            print("❌ ERROR: Supabase client is None. Check db.py and .env")
            raise Exception("Supabase client not initialized")

    except Exception as e:
        print(f"❌ Upload FAILED: {str(e)}")
        # Allow flow to continue, but log error (or you can raise HTTPException here)
        raise HTTPException(status_code=500, detail=f"Failed to upload resume: {str(e)}")

    # 4. Create or Update Candidate
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    final_skills = skills or "General"

    if not candidate:
        candidate = Candidate(
            id=candidate_id,
            name=final_name,
            email=final_email,
            skills=final_skills,
            resume_url=resume_url
        )
        db.add(candidate)
    else:
        candidate.name = final_name
        if skills: candidate.skills = final_skills
        candidate.resume_url = resume_url
    
    db.commit()

    # 5. Create Application
    existing_app = db.query(Application).filter(
        Application.job_id == job_id, 
        Application.candidate_id == candidate_id
    ).first()

    if existing_app:
        return {"message": "You have already applied for this job."}

    new_app = Application(
        job_id=job_id,
        candidate_id=candidate_id,
        status="Applied",
        notes="Pending AI Analysis"
    )
    db.add(new_app)
    db.commit()
    
    return {"message": "Application submitted successfully!"}

@router.put("/applications/{application_id}/status")
def update_application_status(application_id: int, status: dict, db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    app.status = status.get("status")
    db.commit()
    return {"message": "Status updated successfully"}

@router.get("/candidate/applications")
def get_candidate_applications(candidateId: str, db: Session = Depends(get_db)):
    apps = db.query(Application).filter(Application.candidate_id == candidateId).all()
    return [{
        "id": app.id,
        "job_id": app.job_id,
        "job_title": app.job.title,
        "company_name": app.job.recruiter.company_name if app.job.recruiter else "Unknown",
        "status": app.status,
        "applied_at": app.applied_at.isoformat() if app.applied_at else None
    } for app in apps]