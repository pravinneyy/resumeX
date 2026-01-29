from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, JSON, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db import Base

# --- USERS ---
class Recruiter(Base):
    __tablename__ = "recruiters"
    id = Column(String, primary_key=True)
    email = Column(String, unique=True)
    company_name = Column(String)
    
    jobs = relationship("Job", back_populates="recruiter")

class Candidate(Base):
    __tablename__ = "candidates"
    id = Column(String, primary_key=True)
    name = Column(String)
    email = Column(String)
    phone = Column(String)
    skills = Column(String)
    resume_url = Column(String)
    parsed_summary = Column(Text)
    
    applications = relationship("Application", back_populates="candidate")

# --- JOBS & APPLICATIONS ---
class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, index=True)
    recruiter_id = Column(String, ForeignKey("recruiters.id"))
    title = Column(String)
    description = Column(Text)
    location = Column(String)
    salary_range = Column(String)
    requirements = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    recruiter = relationship("Recruiter", back_populates="jobs")
    applications = relationship("Application", back_populates="job")
    
    # FIX: Point to 'JobAssessment'
    assessment = relationship("JobAssessment", uselist=False, back_populates="job")

class Application(Base):
    __tablename__ = "applications"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    candidate_id = Column(String, ForeignKey("candidates.id"))
    status = Column(String, default="Applied")
    applied_at = Column(DateTime(timezone=True), server_default=func.now())
    
    ai_score = Column(Float, default=0.0)
    final_grade = Column(Float, default=0.0)
    verdict = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    job = relationship("Job", back_populates="applications")
    candidate = relationship("Candidate", back_populates="applications")

# --- ASSESSMENTS (Using JobAssessment to match DB) ---
class JobAssessment(Base):
    __tablename__ = "job_assessments" # Matches your Supabase table
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    title = Column(String)
    duration_minutes = Column(Integer, default=60)
    questions = Column(JSON)
    
    job = relationship("Job", back_populates="assessment")

# --- SUBMISSIONS ---
class AssessmentSubmission(Base):
    __tablename__ = "assessment_submissions"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    candidate_id = Column(String, ForeignKey("candidates.id"))
    
    code = Column(Text)
    language = Column(String)
    output = Column(Text)
    score = Column(Integer)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

class PsychometricSubmission(Base):
    __tablename__ = "psychometric_submissions"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    candidate_id = Column(String, ForeignKey("candidates.id"))
    
    answers = Column(JSON)
    score = Column(Integer)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())