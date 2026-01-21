from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db import Base

class Recruiter(Base):
    __tablename__ = "recruiters"
    id = Column(String, primary_key=True) # Clerk ID
    email = Column(String)
    name = Column(String)
    jobs = relationship("Job", back_populates="recruiter")

# ... (Keep your existing Job, Candidate, Application, Assessment classes) ...
# Ensure Job has this relationship:
# recruiter = relationship("Recruiter", back_populates="jobs")
class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    company = Column(String)
    location = Column(String)
    salary = Column(String)
    type = Column(String)
    skills = Column(String)
    recruiter_id = Column(String, ForeignKey("recruiters.id"))
    
    recruiter = relationship("Recruiter", back_populates="jobs")
    applications = relationship("Application", back_populates="job")
    # New: Assessment relationship
    assessment = relationship("JobAssessment", back_populates="job", uselist=False)

class Candidate(Base):
    __tablename__ = "candidates"
    id = Column(String, primary_key=True) # Clerk ID
    name = Column(String)
    email = Column(String)
    phone = Column(String, nullable=True)
    resume_url = Column(String)
    parsed_summary = Column(Text)
    skills = Column(String)
    
    applications = relationship("Application", back_populates="candidate")

class Application(Base):
    __tablename__ = "applications"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    candidate_id = Column(String, ForeignKey("candidates.id"))
    status = Column(String, default="Applied")
    applied_at = Column(DateTime(timezone=True), server_default=func.now())
    
    job = relationship("Job", back_populates="applications")
    candidate = relationship("Candidate", back_populates="applications")

class JobAssessment(Base):
    __tablename__ = "job_assessments"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    title = Column(String)
    duration_minutes = Column(Integer)
    questions = Column(JSON) # Stores list of questions
    
    job = relationship("Job", back_populates="assessment")

class AssessmentSubmission(Base):
    __tablename__ = "assessment_submissions"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    candidate_id = Column(String, ForeignKey("candidates.id"))
    code = Column(Text)
    language = Column(String)
    score = Column(Integer)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())