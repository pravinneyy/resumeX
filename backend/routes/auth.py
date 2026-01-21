from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db import get_db
from models import Recruiter, Candidate

router = APIRouter()

class UserSync(BaseModel):
    id: str
    email: str
    name: str
    role: str  # 'recruiter' or 'candidate'

@router.post("/auth/sync")
def sync_user(user: UserSync, db: Session = Depends(get_db)):
    if user.role == "recruiter":
        existing = db.query(Recruiter).filter(Recruiter.id == user.id).first()
        if not existing:
            new_recruiter = Recruiter(id=user.id, email=user.email, name=user.name)
            db.add(new_recruiter)
            db.commit()
            return {"message": "Recruiter synced"}
    
    elif user.role == "candidate":
        existing = db.query(Candidate).filter(Candidate.id == user.id).first()
        if not existing:
            new_candidate = Candidate(
                id=user.id, 
                email=user.email, 
                name=user.name, 
                resume_url="", 
                parsed_summary="", 
                skills=""
            )
            db.add(new_candidate)
            db.commit()
            return {"message": "Candidate synced"}
            
    return {"message": "User already exists"}