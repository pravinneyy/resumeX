from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from models import Candidate
from pydantic import BaseModel
from utils.security import get_current_user

router = APIRouter()

class UserSyncRequest(BaseModel):
    id: str
    email: str
    name: str
    role: str = "candidate"

# FIX: Path updated to match frontend request
@router.post("/users/sync")
def sync_user(
    data: UserSyncRequest, 
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    # Security check
    if data.id != current_user_id:
        raise HTTPException(status_code=403, detail="Identity mismatch")

    candidate = db.query(Candidate).filter(Candidate.id == data.id).first()
    
    if not candidate:
        new_candidate = Candidate(
            id=data.id, 
            email=data.email, 
            name=data.name,
            skills="General"
        )
        db.add(new_candidate)
        db.commit()
        return {"message": "User created"}
    
    return {"message": "User exists"}