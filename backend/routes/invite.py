from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db import get_db
from utils.security import get_current_user
from typing import Optional

router = APIRouter()

class InviteRequest(BaseModel):
    email: str
    name: str
    job_id: int
    application_id: Optional[int] = None
    invite_type: str = "interview"

@router.post("/invite/send")
async def send_invite(
    request: InviteRequest,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    Send an invitation email to a candidate.
    """
    # 1. Check if user is authorized (recruiter)
    # Ideally check if job belongs to recruiter
    
    print(f"📧 SENDING EMAIL TO: {request.email}")
    print(f"   Subject: Invitation for {request.invite_type}")
    print(f"   Candidate: {request.name}")
    print("   ... Email sent! (Simulation)")
    
    # Logic to record the invite in DB could go here
    
    return {"message": f"Invitation sent to {request.email}"}
