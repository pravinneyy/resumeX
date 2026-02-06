from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from db import get_db
from models import AntiCheatLog, Candidate, Job

router = APIRouter()

@router.get("/anti-cheat/all-violations")
def get_all_violations(limit: int = 100, db: Session = Depends(get_db)):
    """Fetch all anti-cheat violations with candidate and job details"""
    violations = db.query(AntiCheatLog)\
        .order_by(desc(AntiCheatLog.logged_at))\
        .limit(limit)\
        .all()
    
    result = []
    for v in violations:
        # Fetch candidate name if possible
        candidate_name = "Unknown"
        if v.candidate_id:
            candidate = db.query(Candidate).filter(Candidate.id == v.candidate_id).first()
            if candidate:
                candidate_name = candidate.name
        
        # Fetch job title if possible
        job_title = "Unknown Job"
        if v.job_id:
            job = db.query(Job).filter(Job.id == v.job_id).first()
            if job:
                job_title = job.title
                
        result.append({
            "id": v.id,
            "type": v.violation_type,
            "reason": v.reason,
            "duration": v.duration,
            "context": v.context,
            "timestamp": v.violation_timestamp,
            "logged_at": v.logged_at.isoformat(),
            "candidate_name": candidate_name,
            "candidate_id": v.candidate_id,
            "job_title": job_title,
            "job_id": v.job_id,
            "session_id": v.session_id
        })
        
    return {"violations": result}

@router.delete("/anti-cheat/clear-logs")
def clear_all_logs(db: Session = Depends(get_db)):
    """Delete all anti-cheat logs"""
    try:
        db.query(AntiCheatLog).delete()
        db.commit()
        return {"message": "All logs cleared successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
