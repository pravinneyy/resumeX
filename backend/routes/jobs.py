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
        "applicant_count": len(j.applications)
    } for j in jobs]

# --- CANDIDATE FEED (All Jobs) ---
@router.get("/jobs/feed")
def get_all_jobs(
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user) 
):
    """
    Fetch ALL open jobs for candidates to browse.
    """
    jobs = db.query(Job).all()
    
    return [{
        "id": j.id,
        "title": j.title,
        "description": j.description,
        "location": j.location or "Remote",
        "salary": j.salary_range or "Competitive",
        "type": "Full-time",
        "skills": j.requirements,
        "company": j.recruiter.company_name if j.recruiter else "Unknown Company",
        "recruiter_name": j.recruiter.email if j.recruiter else "Unknown Recruiter",
        "recruiter_id": j.recruiter_id
    } for j in jobs]

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
    
    lines = notes.split('\n')
    summary_lines = []
    for line in lines:
        if line.startswith('EXPERIENCE:'): break
        if line.strip(): summary_lines.append(line.strip())
    result["summary"] = ' '.join(summary_lines)
    
    exp_match = re.search(r'EXPERIENCE:\s*(.+)', notes)
    if exp_match: result["experience"] = exp_match.group(1).strip()
    
    score_match = re.search(r'Match Score:\s*(\d+\.?\d*)%', notes)
    if score_match: result["match_score"] = float(score_match.group(1))
    
    verdict_match = re.search(r'Verdict:\s*(.+)', notes)
    if verdict_match: result["verdict"] = verdict_match.group(1).strip()
    
    strengths_match = re.search(r'Strengths:\s*(.+)', notes)
    if strengths_match:
        s_str = strengths_match.group(1).strip()
        if s_str and s_str != "None identified": result["strengths"] = [s.strip() for s in s_str.split(',')]
    
    gaps_match = re.search(r'Missing Skills:\s*(.+)', notes)
    if gaps_match:
        g_str = gaps_match.group(1).strip()
        if g_str and g_str != "None": result["gaps"] = [g.strip() for g in g_str.split(',')]
    
    rec_match = re.search(r'RECOMMENDATION:\s*(.+?)(?:\n|$)', notes, re.DOTALL)
    if rec_match: result["recommendation"] = rec_match.group(1).strip().split('\n')[0]
    
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