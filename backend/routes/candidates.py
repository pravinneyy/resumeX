from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from db import get_db
from models import Candidate, Application, Job
from services.ai_extract import AIGatekeeper
from utils.security import get_current_user
from typing import List

router = APIRouter()

@router.get("/candidates")
def get_all_candidates(
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user) # <--- SECURE TOKEN
):
    """
    Fetch all candidates, BUT only for jobs owned by the logged-in Recruiter.
    """
    results = db.query(Application, Candidate, Job)\
        .join(Candidate, Application.candidate_id == Candidate.id)\
        .join(Job, Application.job_id == Job.id)\
        .filter(Job.recruiter_id == current_user_id) \
        .all() # <--- CRITICAL FILTER
    
    if not results: return []

    data = []
    for app, cand, job in results:
        data.append({
            "id": cand.id,
            "application_id": app.id,
            "job_id": job.id, 
            "name": cand.name,
            "email": cand.email,
            "phone": cand.phone or "N/A",
            "position": job.title,
            "status": app.status,
            "appliedDate": app.applied_at.isoformat() if app.applied_at else "",
            "skills": (cand.skills or "").split(','),
            "score": app.final_grade or 0,
            "ai_reasoning": app.notes 
        })
    return data

@router.get("/candidate/applications")
def get_my_apps(
    candidateId: str = Query(...), 
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user) # <--- SECURE TOKEN
):
    """
    Fetch application history for a specific candidate.
    """
    # SECURITY CHECK: You can only view your own applications
    if current_user_id != candidateId:
        raise HTTPException(status_code=403, detail="Unauthorized access to application history")

    apps = db.query(Application).filter(Application.candidate_id == candidateId).all()
    if not apps: return []

    data = []
    for app in apps:
        data.append({
            "id": app.id,
            "job_id": app.job.id,
            "job_title": app.job.title if app.job else "Unknown",
            "company_name": app.job.recruiter.company_name if (app.job and app.job.recruiter) else "Unknown",
            "status": app.status,
            "applied_at": app.applied_at
        })
    return data


@router.get("/candidates/{candidate_id}/profile")
def get_candidate_profile(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    Fetch existing candidate profile data (resume analysis results).
    Returns saved skills, summary, and personal info if available.
    """
    # Security check
    if current_user_id != candidate_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    
    if not candidate or not candidate.skills:
        return {
            "has_resume": False,
            "data": None
        }
    
    return {
        "has_resume": True,
        "data": {
            "summary": candidate.parsed_summary or "",
            "skills": candidate.skills.split(",") if candidate.skills else [],
            "personal": {
                "name": candidate.name or "",
                "email": candidate.email or "",
                "phone": candidate.phone or ""
            }
        }
    }



@router.post("/candidates/{candidate_id}/resume")
async def upload_and_analyze_resume(
    candidate_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    Upload resume, analyze with AI, and save candidate profile.
    This endpoint provides skills detection and summary for candidates.
    """
    # Security: Can only upload your own resume
    if current_user_id != candidate_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        # Read PDF content
        pdf_bytes = await file.read()
        
        # Analyze resume with AI (no job context needed for candidate view)
        analysis_result = AIGatekeeper.analyze_resume(
            pdf_bytes=pdf_bytes,
            job_title="General Analysis",
            job_description="",
            required_skills="",
            minimum_experience=0
        )
        
        # Extract personal details
        personal = analysis_result.get("personal_details", {})
        name = personal.get("name", "Unknown")
        email = personal.get("email", "")
        phone = personal.get("phone", "")
        skills = analysis_result.get("skills", [])
        summary = analysis_result.get("summary", "")
        
        # Create or update candidate record
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        
        if not candidate:
            candidate = Candidate(
                id=candidate_id,
                name=name,
                email=email,
                phone=phone,
                skills=",".join(skills),
                parsed_summary=summary
            )
            db.add(candidate)
        else:
            # Update existing candidate
            candidate.name = name or candidate.name
            candidate.email = email or candidate.email
            candidate.phone = phone or candidate.phone
            candidate.skills = ",".join(skills)
            candidate.parsed_summary = summary
        
        db.commit()
        db.refresh(candidate)
        
        # Return analysis results
        return {
            "success": True,
            "message": "Resume analyzed successfully",
            "data": {
                "summary": summary,
                "skills": skills,
                "personal": {
                    "name": name,
                    "email": email,
                    "phone": phone
                }
            }
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Resume analysis failed: {str(e)}")


@router.get("/candidates/{candidate_id}/recommended-jobs")
def get_recommended_jobs(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    Get job recommendations for a candidate based on their skills.
    Returns jobs ranked by match score.
    """
    # Security check
    if current_user_id != candidate_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Get candidate profile
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    
    if not candidate or not candidate.skills:
        return {"recommended_jobs": []}
    
    # Parse candidate skills
    candidate_skills = [s.strip().lower() for s in candidate.skills.split(',') if s.strip()]
    
    if not candidate_skills:
        return {"recommended_jobs": []}
    
    # Get all active jobs with recruiter relationship loaded
    jobs = db.query(Job).options(joinedload(Job.recruiter)).all()
    
    if not jobs:
        return {"recommended_jobs": []}
    
    recommendations = []
    
    for job in jobs:
        # Parse job requirements (assuming comma-separated skills)
        job_requirements = job.requirements or ""
        required_skills = [s.strip().lower() for s in job_requirements.split(',') if s.strip()]
        
        if not required_skills:
            continue
        
        # Find matching skills with weighted scoring
        matching_skills = []
        match_score_raw = 0.0
        
        for required_skill in required_skills:
            best_match = None
            best_weight = 0.0
            
            for candidate_skill in candidate_skills:
                # Exact match (case-insensitive)
                if candidate_skill == required_skill:
                    best_match = candidate_skill.title()
                    best_weight = 1.0
                    break
                
                # Partial match (must be at least 3 chars to avoid false positives)
                if len(candidate_skill) >= 3 and len(required_skill) >= 3:
                    if candidate_skill in required_skill or required_skill in candidate_skill:
                        # Longer overlap = better match
                        overlap = min(len(candidate_skill), len(required_skill))
                        weight = 0.3 + (overlap / max(len(candidate_skill), len(required_skill)) * 0.4)
                        if weight > best_weight:
                            best_match = candidate_skill.title()
                            best_weight = weight
            
            if best_match:
                matching_skills.append(best_match)
                match_score_raw += best_weight
        
        # Remove duplicates while preserving order
        seen = set()
        matching_skills = [x for x in matching_skills if not (x in seen or seen.add(x))]
        
        # Calculate percentage match (weighted)
        if required_skills:
            match_score = int((match_score_raw / len(required_skills)) * 100)
        else:
            match_score = 0
        
        # Only include jobs with reasonable match (>40%)
        if match_score >= 40:
            recommendations.append({
                "id": job.id,
                "title": job.title,
                "company": job.recruiter.company_name if job.recruiter else "Unknown Company",
                "location": job.location or "Remote",
                "match_score": match_score,
                "matching_skills": matching_skills[:5],  # Top 5 matching skills
                "description": job.description[:200] + "..." if job.description else ""
            })
    
    # Sort by match score descending
    recommendations.sort(key=lambda x: x["match_score"], reverse=True)
    
    # Return top 10 matches
    return {"recommended_jobs": recommendations[:10]}