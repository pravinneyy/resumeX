from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from models import Job, Application, Recruiter
from pydantic import BaseModel
from typing import Optional
import json
import os
import re
from utils.security import get_current_user 

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://your-project.supabase.co")

class JobCreate(BaseModel):
    title: str
    company: str
    location: str
    salary: str
    type: str
    skills: str
    description: Optional[str] = None

@router.post("/jobs")
def create_job(
    job: JobCreate, 
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    # 1. Use the secure ID from the token
    recruiter_id = current_user_id
    
    # 2. Check/Create recruiter (Auto-provisioning)
    recruiter = db.query(Recruiter).filter(Recruiter.id == recruiter_id).first()
    
    if not recruiter:
        unique_email = f"user_{recruiter_id[-8:]}@resume-x.com" 
        recruiter = Recruiter(id=recruiter_id, email=unique_email, company_name=job.company)
        db.add(recruiter)
        db.commit()

    # 3. Create job
    final_description = job.description if job.description else f"{job.type} opportunity at {job.company}."

    new_job = Job(
        title=job.title,
        description=final_description,
        location=job.location,
        salary_range=job.salary,
        requirements=job.skills,
        recruiter_id=recruiter_id
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    
    return {"message": "Job created", "id": new_job.id}

# --- RECRUITER VIEW (My Jobs) ---
@router.get("/jobs")
def get_my_jobs(
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    Fetch only the jobs created by the logged-in Recruiter.
    """
    jobs = db.query(Job).filter(Job.recruiter_id == current_user_id).all()
    
    return [{
        "id": j.id,
        "title": j.title,
        "description": j.description,
        "location": j.location or "Remote",
        "salary": j.salary_range or "Competitive",
        "type": "Full-time",
        "company": j.recruiter.company_name if j.recruiter else "Unknown Company",
        "applicant_count": len(j.applications),
        "recruited_count": len([a for a in j.applications if a.status in ["Hired", "Offer Accepted", "Recruited"]])
    } for j in jobs]

# --- CANDIDATE FEED (All Jobs) ---
@router.get("/jobs/feed")
def get_public_job_feed(
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user)  
):
    """Get ALL jobs for the candidate job feed with recruiter info"""
    # Join with Recruiter to get recruiter name
    jobs = db.query(Job).join(Recruiter, Job.recruiter_id == Recruiter.id).all()
    
    # Format response with recruiter info
    jobs_list = []
    for job in jobs:
        # The join already loaded the recruiter, so access it directly
        recruiter = job.recruiter
        
        # Extract name from Clerk or use company name
        recruiter_name = recruiter.company_name if recruiter else "Recruiter"
        recruiter_email = recruiter.email if recruiter else ""
        
        jobs_list.append({
            "id": job.id,
            "title": job.title,
            "company": recruiter.company_name if recruiter else "Unknown Company", # Assuming company name is from recruiter
            "location": job.location,
            "salary": job.salary_range,
            "type": "Full-time", # Assuming a default type as it's not in Job model
            "description": job.description,
            "requirements": job.requirements,
            "created_at": job.created_at.isoformat() if job.created_at else None, # Assuming created_at exists and is datetime
            "recruiter_name": recruiter_name,
            "recruiter_email": recruiter_email
        })
    
    return jobs_list

# --- HELPER & APPLICATION ROUTES ---

def parse_enhanced_notes(notes: str) -> dict:
    if not notes:
        return {
            "summary": "No analysis available", "experience": "N/A", "match_score": 0,
            "verdict": "Pending", "strengths": [], "gaps": [], "recommendation": "Manual review", "ai_reasoning": ""
        }
    
    result = {
        "summary": "", "experience": "N/A", "match_score": 0, "verdict": "Pending",
        "strengths": [], "gaps": [], "recommendation": "", "ai_reasoning": ""
    }
    
    # Extract summary (everything before "EXPERIENCE:")
    lines = notes.split('\n')
    summary_lines = []
    for line in lines:
        if line.startswith('EXPERIENCE:'): break
        if line.strip() and not line.startswith('MATCH ANALYSIS:'):
            summary_lines.append(line.strip())
    result["summary"] = ' '.join(summary_lines)
    
    # Extract experience
    exp_match = re.search(r'EXPERIENCE:\s*(.+)', notes)
    if exp_match: 
        result["experience"] = exp_match.group(1).strip()
    
    # Extract match score (with bullet point)
    score_match = re.search(r'[•●]\s*Match Score:\s*(\d+\.?\d*)%', notes)
    if score_match: 
        result["match_score"] = float(score_match.group(1))
    
    # Extract verdict (with bullet point)
    verdict_match = re.search(r'[•●]\s*Verdict:\s*(.+)', notes)
    if verdict_match: 
        result["verdict"] = verdict_match.group(1).strip()
    
    # Extract strengths (with bullet point)
    strengths_match = re.search(r'[•●]\s*Strengths:\s*(.+)', notes)
    if strengths_match:
        s_str = strengths_match.group(1).strip()
        if s_str and s_str != "None identified" and s_str != "None": 
            result["strengths"] = [s.strip() for s in s_str.split(',')]
    
    # Extract gaps/missing skills (with bullet point)
    gaps_match = re.search(r'[•●]\s*Missing Skills:\s*(.+)', notes)
    if gaps_match:
        g_str = gaps_match.group(1).strip()
        if g_str and g_str != "None": 
            result["gaps"] = [g.strip() for g in g_str.split(',')]
    
    # Extract recommendation (everything after "RECOMMENDATION:")
    # Use re.DOTALL to capture newlines (full multi-paragraph reasoning)
    rec_match = re.search(r'RECOMMENDATION:\s*(.+)$', notes, re.DOTALL)
    if rec_match: 
        result["recommendation"] = rec_match.group(1).strip()
    
    # AI reasoning is now part of recommendation, but keep this just in case
    # checking for explicit AI DECISION section if present separately
    if "AI DECISION:" in notes and not "AI DECISION:" in result["recommendation"]:
         reasoning_match = re.search(r'AI DECISION:.*?\n\n(.+)', notes, re.DOTALL)
         if reasoning_match:
            result["ai_reasoning"] = reasoning_match.group(1).strip()
    
    return result

@router.get("/jobs/{job_id}/applications")
def get_job_applications(
    job_id: int, 
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job: return [] 
            
        # Security: Only owner can see applications
        if job.recruiter_id != current_user_id:
            return [] 

        apps = db.query(Application).filter(Application.job_id == job_id).all()
        if not apps: return []

        def parse_skills(app):
            if not app.candidate or not app.candidate.skills: return []
            skills = app.candidate.skills
            if skills.startswith("["):
                try: return json.loads(skills)
                except: return [skills]
            return skills.split(",")

        result = []
        for app in apps:
            analysis = parse_enhanced_notes(app.notes)
            result.append({
                "id": app.id,
                "candidate_id": app.candidate_id,
                "name": app.candidate.name if app.candidate else "Unknown",
                "email": app.candidate.email if app.candidate else "",
                "skills": parse_skills(app),
                "ai_summary": analysis["summary"],
                "ai_experience": analysis["experience"],
                "match_score": analysis["match_score"],
                "verdict": analysis["verdict"],
                "strengths": analysis["strengths"],
                "gaps": analysis["gaps"],
                "recommendation": analysis["recommendation"],
                "ai_reasoning": analysis["ai_reasoning"],
                "ai_reasoning_full": app.notes,
                "status": app.status,
                "score": app.final_grade or 0,
                "resume_url": (
                    f"{SUPABASE_URL}/storage/v1/object/public/resumes/{app.candidate.resume_url}"
                    if app.candidate and app.candidate.resume_url and not app.candidate.resume_url.startswith("http")
                    else (app.candidate.resume_url if app.candidate else "")
                )
            })
        return result
    except Exception as e:
        print(f"Error fetching applications: {e}")
        return []

# --- RECRUITER LOGS ---
@router.get("/logs/activity")
def get_recruiter_logs(
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    Get combined activity log for recruiter:
    - New Applications
    - Status Changes (approximated by current status if recent) - difficult without history table
    - Anti-Cheat Violations
    """
    try:
        # 1. Get Recruiter Jobs
        jobs = db.query(Job).filter(Job.recruiter_id == current_user_id).all()
        job_ids = [j.id for j in jobs]
        
        if not job_ids: return []

        logs = []

        # 2. Get Recent Applications (Last 50)
        recent_apps = db.query(Application).filter(Application.job_id.in_(job_ids))\
            .order_by(Application.applied_at.desc()).limit(50).all()
            
        for app in recent_apps:
            logs.append({
                "id": f"app_{app.id}",
                "type": "APPLICATION",
                "title": "New Application",
                "message": f"{app.candidate.name if app.candidate else 'Someone'} applied for {app.job.title}",
                "job_title": app.job.title,
                "candidate_name": app.candidate.name if app.candidate else "Unknown",
                "timestamp": app.applied_at.isoformat() if app.applied_at else None,
                "severity": "info"
            })
            
            # If status is not just Applied, maybe show that too (though we don't know WHEN it changed)
            if app.status not in ["Applied", "Pending"]:
                logs.append({
                    "id": f"status_{app.id}",
                    "type": "STATUS_CHANGE",
                    "title": f"Candidate {app.status}",
                    "message": f"{app.candidate.name if app.candidate else 'Unknown'} is marked as {app.status}",
                    "job_title": app.job.title,
                    "candidate_name": app.candidate.name if app.candidate else "Unknown",
                    "timestamp": app.applied_at.isoformat(), # Using applied_at as proxy since we don't have updated_at
                    "severity": "success" if app.status in ["Hired", "Offer Accepted"] else "default"
                })

        return sorted(logs, key=lambda x: x['timestamp'] or "", reverse=True)
    except Exception as e:
        print(f"Error fetching logs: {e}")
        return []