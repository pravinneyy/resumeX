from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db, supabase 
from models import Application, Job, Candidate
from typing import Optional
import uuid

# IMPORT SECURITY DEPENDENCIES
from utils.security import get_current_user
from services.ai_extract import parse_resume_from_bytes

router = APIRouter()

@router.post("/applications/apply")
async def apply_for_job(
    job_id: int = Form(...),
    candidate_id: str = Form(...),
    name: Optional[str] = Form(None),
    candidate_name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    candidate_email: Optional[str] = Form(None),
    skills: Optional[str] = Form(None),
    resume: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user) # <--- Validate Token
):
    # SECURITY CHECK: Identity Theft Protection
    # Ensure the token holder is actually the candidate applying
    if current_user_id != candidate_id:
        raise HTTPException(status_code=403, detail="You cannot submit applications for other users.")

    print(f"📥 Application received: Job={job_id}, Candidate={candidate_id}")

    # 1. Resolve name and email
    final_name = name or candidate_name
    final_email = email or candidate_email
    
    if not final_name or not final_email:
        raise HTTPException(status_code=422, detail="Missing name or email")

    # 2. Get job details
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # 3. Read resume bytes
    resume_bytes = await resume.read()
    
    # 4. ENHANCED AI ANALYSIS
    print("🤖 Starting AI analysis with job matching...")
    try:
        analysis = parse_resume_from_bytes(
            file_content=resume_bytes,
            filename=resume.filename,
            job_description=job.description or "",
            job_requirements=job.requirements or "",
            job_title=job.title # Pass title for better context
        )
        
        # Extract results
        ai_summary = analysis.get("summary", "No summary generated")
        detected_skills = analysis.get("skills", [])
        experience = analysis.get("experience", "N/A")
        match_score = analysis.get("match_score", 0)
        verdict = analysis.get("verdict", "Pending Review")
        status = analysis.get("status", "Applied")
        strengths = analysis.get("strengths", [])
        gaps = analysis.get("gaps", [])
        recommendation = analysis.get("recommendation", "")
        ai_reasoning = analysis.get("ai_reasoning", "")
        
    except Exception as e:
        print(f"⚠️ AI Analysis failed: {e}")
        # Fallback values
        ai_summary = "AI analysis unavailable"
        detected_skills = []
        experience = "N/A"
        match_score = 0
        verdict = "Error"
        status = "Applied"
        strengths = []
        gaps = []
        recommendation = f"Analysis failed: {str(e)}"
        ai_reasoning = ""

    # 5. Upload resume to Supabase
    resume_url = ""
    try:
        file_ext = resume.filename.split(".")[-1]
        unique_filename = f"{candidate_id}_{uuid.uuid4().hex[:8]}.{file_ext}"
        
        if supabase:
            supabase.storage.from_("resumes").upload(
                path=unique_filename,
                file=resume_bytes,
                file_options={"content-type": resume.content_type}
            )
            resume_url = unique_filename
        else:
            raise Exception("Supabase client not initialized")
            
    except Exception as e:
        print(f"❌ Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Resume upload failed: {str(e)}")

    # 6. Create/Update candidate
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    skills_str = ",".join(detected_skills) if detected_skills else "General"
    
    if not candidate:
        candidate = Candidate(
            id=candidate_id,
            name=final_name,
            email=final_email,
            skills=skills_str,
            resume_url=resume_url
        )
        db.add(candidate)
    else:
        candidate.name = final_name
        candidate.email = final_email
        candidate.skills = skills_str
        candidate.resume_url = resume_url
    
    db.commit()

    # 7. Create application
    existing_app = db.query(Application).filter(
        Application.job_id == job_id,
        Application.candidate_id == candidate_id
    ).first()

    if existing_app:
        return {"message": "You have already applied for this job."}

    detailed_notes = f"""{ai_summary}

EXPERIENCE: {experience}

MATCH ANALYSIS:
• Match Score: {match_score}%
• Verdict: {verdict}
• Strengths: {', '.join(strengths) if strengths else 'None identified'}
• Missing Skills: {', '.join(gaps) if gaps else 'None'}

RECOMMENDATION: {recommendation}

{ai_reasoning}"""

    new_app = Application(
        job_id=job_id,
        candidate_id=candidate_id,
        status=status,
        notes=detailed_notes,
        final_grade=match_score
    )
    db.add(new_app)
    db.commit()
    
    return {
        "message": "Application submitted successfully!",
        "analysis": {
            "match_score": match_score,
            "verdict": verdict
        }
    }


@router.put("/applications/{application_id}/status")
def update_application_status(
    application_id: int, 
    status: dict, 
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user) # <--- Validate Token
):
    """
    Update application status.
    SECURED: Only the recruiter who owns the job can change the status.
    """
    # 1. Get the application
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # 2. Get the job associated with this application
    job = db.query(Job).filter(Job.id == app.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job associated with application not found")

    # 3. SECURITY CHECK: Does this job belong to the requester?
    if job.recruiter_id != current_user_id:
        print(f"⛔ Unauthorized status change attempt by {current_user_id} on app {application_id}")
        raise HTTPException(status_code=403, detail="You are not authorized to update this application.")

    app.status = status.get("status")
    db.commit()
    
    return {"message": "Status updated successfully"}


@router.get("/candidate/applications")
def get_candidate_applications(
    candidateId: str, 
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user) # <--- Validate Token
):
    """Get all applications for a candidate"""
    
    # SECURITY CHECK: Users can only see their own applications
    if current_user_id != candidateId:
        raise HTTPException(status_code=403, detail="Unauthorized access to application history")

    apps = db.query(Application).filter(Application.candidate_id == candidateId).all()
    
    return [{
        "id": app.id,
        "job_id": app.job_id,
        "job_title": app.job.title if app.job else "Unknown",
        "company_name": app.job.recruiter.company_name if (app.job and app.job.recruiter) else "Unknown",
        "status": app.status,
        "applied_at": app.applied_at.isoformat() if app.applied_at else None,
        "match_score": app.final_grade or 0
    } for app in apps]