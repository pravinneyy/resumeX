from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db import get_db
from models import Candidate
from pydantic import BaseModel

router = APIRouter()

class UserSyncRequest(BaseModel):
    id: str  # Clerk User ID
    email: str
    name: str
    role: str = "candidate"

@router.post("/sync")
def sync_user(data: UserSyncRequest, db: Session = Depends(get_db)):
    # Check if candidate exists, if not create them
    candidate = db.query(Candidate).filter(Candidate.id == data.id).first()
    
    if not candidate:
        new_candidate = Candidate(
            id=data.id, 
            email=data.email, 
            name=data.name,
            skills="General" # Default
        )
        db.add(new_candidate)
        db.commit()
        return {"message": "User created"}
    
    return {"message": "User exists"}