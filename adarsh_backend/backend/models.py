# models.py (extend existing)
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, Enum, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
from enums import CandidateState

Base = declarative_base()

class Candidate(Base):
    __tablename__ = "candidates"
    id = Column(String, primary_key=True)
    name = Column(String)
    email = Column(String, unique=True)
    phone = Column(String)
    resume_url = Column(String, nullable=True)
    state = Column(Enum(CandidateState), default=CandidateState.REGISTERED)
    blueprint_id = Column(String, ForeignKey("assessment_blueprints.id"), nullable=True)
    current_round_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Relationships
    state_history = relationship("CandidateStateHistory", back_populates="candidate")
    assessments = relationship("Assessment", back_populates="candidate")
    blueprint = relationship("AssessmentBlueprint", back_populates="candidates")

class CandidateStateHistory(Base):
    __tablename__ = "candidate_state_history"
    id = Column(Integer, primary_key=True, autoincrement=True)
    candidate_id = Column(String, ForeignKey("candidates.id"))
    old_state = Column(Enum(CandidateState), nullable=True)
    new_state = Column(Enum(CandidateState))
    changed_by = Column(String)  # User ID (HR/Admin)
    reason = Column(Text, nullable=True)  # e.g., "Resume uploaded"
    timestamp = Column(DateTime, default=datetime.utcnow)
    candidate = relationship("Candidate", back_populates="state_history")

class AssessmentBlueprint(Base):  # For future assessment config
    __tablename__ = "assessment_blueprints"
    id = Column(String, primary_key=True)
    name = Column(String)
    job_id = Column(String)  # Link to job posting
    rounds = relationship("AssessmentRound", back_populates="blueprint")
    candidates = relationship("Candidate", back_populates="blueprint")

class AssessmentRound(Base):
    __tablename__ = "assessment_rounds"
    id = Column(Integer, primary_key=True, autoincrement=True)
    blueprint_id = Column(String, ForeignKey("assessment_blueprints.id"))
    round_number = Column(Integer)
    modules = Column(JSON)  # e.g., ["RESUME", "MCQ", "CODING"]
    passing_threshold = Column(Float)
    allowed_languages = Column(JSON)  # e.g., ["python", "java"] for CODING modules
    blueprint = relationship("AssessmentBlueprint", back_populates="rounds")

# Existing models (converted to SQLAlchemy)
class Assessment(Base):
    __tablename__ = "assessments"
    id = Column(Integer, primary_key=True, autoincrement=True)
    candidate_id = Column(String, ForeignKey("candidates.id"))
    round_id = Column(Integer, ForeignKey("assessment_rounds.id"))
    technical_score = Column(Float)
    psychometric_score = Column(Float)
    integrity_risk = Column(String)
    candidate = relationship("Candidate", back_populates="assessments")

class ProctoringLog(Base):
    __tablename__ = "proctoring_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    candidate_id = Column(String, ForeignKey("candidates.id"))
    event = Column(String)
    timestamp = Column(DateTime)

class Decision(Base):
    __tablename__ = "decisions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    candidate_id = Column(String, ForeignKey("candidates.id"))
    recommendation = Column(String)
    explanation = Column(Text)