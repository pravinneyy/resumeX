from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from models import Job, Application, Recruiter
from pydantic import BaseModel
from typing import Optional
import json
import os
import re

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
    recruiter_id: Optional[str] = "user_default"

@router.post("/jobs")
def create_job(job: JobCreate, db: Session = Depends(get_db)):
    recruiter_id = job.recruiter_id or "user_default"
    
    # Check/Create recruiter
    recruiter = db.query(Recruiter).filter(Recruiter.id == recruiter_id).first()
    
    if not recruiter:
        unique_email = f"test_{recruiter_id}@example.com"
        existing = db.query(Recruiter).filter(Recruiter.email == unique_email).first()
        
        if existing:
            recruiter = existing
        else:
            recruiter = Recruiter(id=recruiter_id, email=unique_email, company_name=job.company)
            db.add(recruiter)
            db.commit()

    # Create job with description
    final_description = job.description if job.description else f"{job.type} opportunity at {job.company}."

    new_job = Job(
        title=job.title,
        description=final_description,
        location=job.location,
        salary_range=job.salary,
        requirements=job.skills,  # This is important for AI matching!
        recruiter_id=recruiter.id
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    
    return {"message": "Job created", "id": new_job.id}


@router.get("/jobs")
def get_jobs(db: Session = Depends(get_db)):
    try:
        jobs = db.query(Job).all()
        if not jobs:
            return []

        return [{
            "id": j.id,
            "title": j.title,
            "description": j.description,
            "location": j.location or "Remote",
            "salary": j.salary_range or "Competitive",
            "type": "Full-time",
            "company": j.recruiter.company_name if j.recruiter else "Unknown Company"
        } for j in jobs]
    except Exception as e:
        print(f"Error fetching jobs: {e}")
        return []


def parse_enhanced_notes(notes: str) -> dict:
    """
    Parse the enhanced notes format with match analysis
    
    Expected format:
    [Summary]
    
    EXPERIENCE: X years
    
    MATCH ANALYSIS:
    • Match Score: X%
    • Verdict: ...
    • Strengths: ...
    • Missing Skills: ...
    
    RECOMMENDATION: ...
    
    [AI Reasoning]
    """
    if not notes:
        return {
            "summary": "No analysis available",
            "experience": "N/A",
            "match_score": 0,
            "verdict": "Pending",
            "strengths": [],
            "gaps": [],
            "recommendation": "Manual review required",
            "ai_reasoning": ""
        }
    
    result = {
        "summary": "",
        "experience": "N/A",
        "match_score": 0,
        "verdict": "Pending",
        "strengths": [],
        "gaps": [],
        "recommendation": "",
        "ai_reasoning": ""
    }
    
    # Split into sections
    lines = notes.split('\n')
    
    # Extract summary (first paragraph before EXPERIENCE)
    summary_lines = []
    for line in lines:
        if line.startswith('EXPERIENCE:'):
            break
        if line.strip():
            summary_lines.append(line.strip())
    result["summary"] = ' '.join(summary_lines)
    
    # Extract experience
    exp_match = re.search(r'EXPERIENCE:\s*(.+)', notes)
    if exp_match:
        result["experience"] = exp_match.group(1).strip()
    
    # Extract match score
    score_match = re.search(r'Match Score:\s*(\d+\.?\d*)%', notes)
    if score_match:
        result["match_score"] = float(score_match.group(1))
    
    # Extract verdict
    verdict_match = re.search(r'Verdict:\s*(.+)', notes)
    if verdict_match:
        result["verdict"] = verdict_match.group(1).strip()
    
    # Extract strengths
    strengths_match = re.search(r'Strengths:\s*(.+)', notes)
    if strengths_match:
        strengths_str = strengths_match.group(1).strip()
        if strengths_str and strengths_str != "None identified":
            result["strengths"] = [s.strip() for s in strengths_str.split(',')]
    
    # Extract gaps/missing skills
    gaps_match = re.search(r'Missing Skills:\s*(.+)', notes)
    if gaps_match:
        gaps_str = gaps_match.group(1).strip()
        if gaps_str and gaps_str != "None":
            result["gaps"] = [g.strip() for g in gaps_str.split(',')]
    
    # Extract recommendation
    rec_match = re.search(r'RECOMMENDATION:\s*(.+?)(?:\n|$)', notes, re.DOTALL)
    if rec_match:
        result["recommendation"] = rec_match.group(1).strip().split('\n')[0]
    
    # Extract AI reasoning (last part after recommendation)
    parts = notes.split('RECOMMENDATION:')
    if len(parts) > 1:
        reasoning_part = parts[1].strip()
        # Get everything after the first line (recommendation)
        reasoning_lines = reasoning_part.split('\n')[1:]
        result["ai_reasoning"] = '\n'.join(reasoning_lines).strip()
    
    return result


@router.get("/jobs/{job_id}/applications")
def get_job_applications(job_id: int, db: Session = Depends(get_db)):
    try:
        apps = db.query(Application).filter(Application.job_id == job_id).all()
        if not apps:
            return []

        def parse_skills(app):
            if not app.candidate or not app.candidate.skills:
                return []
            skills = app.candidate.skills
            if skills.startswith("["):
                try:
                    return json.loads(skills)
                except:
                    return [skills]
            return skills.split(",")

        result = []
        for app in apps:
            # Parse enhanced notes
            analysis = parse_enhanced_notes(app.notes)
            
            result.append({
                "id": app.id,
                "candidate_id": app.candidate_id,
                "name": app.candidate.name if app.candidate else "Unknown",
                "email": app.candidate.email if app.candidate else "",
                "skills": parse_skills(app),
                
                # Enhanced AI analysis fields
                "ai_summary": analysis["summary"],
                "ai_experience": analysis["experience"],
                "match_score": analysis["match_score"],
                "verdict": analysis["verdict"],
                "strengths": analysis["strengths"],
                "gaps": analysis["gaps"],
                "recommendation": analysis["recommendation"],
                "ai_reasoning": analysis["ai_reasoning"],
                
                # Keep original for backward compatibility
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