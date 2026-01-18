# schemas.py (extend existing)
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enums import CandidateState

class CandidateCreate(BaseModel):
    name: str
    email: str
    phone: str
    blueprint_id: str

class CandidateResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    state: CandidateState
    blueprint_id: Optional[str] = None
    current_round_index: int = 0
    created_at: datetime
    updated_at: datetime

class StateTransitionRequest(BaseModel):
    new_state: CandidateState
    reason: Optional[str] = None

class ResumeUploadRequest(BaseModel):
    resume_text: str

# Existing schemas remain unchanged
