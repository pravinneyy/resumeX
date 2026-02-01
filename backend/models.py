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

# --- JUDGE SYSTEM: PROBLEMS ---
class Problem(Base):
    """Server-side problem definition with hidden test cases"""
    __tablename__ = "problems"
    id = Column(Integer, primary_key=True)
    problem_id = Column(String, unique=True, nullable=False, index=True)  # Unique slug like "two_sum"
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    function_signature = Column(String, nullable=False)  # e.g., "def solution(nums, target):"
    language = Column(String, default="python")
    difficulty = Column(String, default="medium")  # easy, medium, hard
    sample_tests = Column(JSON)  # Visible tests for "Run Code"
    hidden_tests = Column(JSON)  # Hidden tests for judging (NEVER sent to frontend)
    time_limit_sec = Column(Float, default=1.0)
    memory_limit_mb = Column(Integer, default=256)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# --- JUDGE SYSTEM: EVALUATION SESSIONS ---
class EvaluationSession(Base):
    """Single source of truth for grading a submission"""
    __tablename__ = "evaluation_sessions"
    id = Column(Integer, primary_key=True, index=True)
    evaluation_id = Column(String, unique=True, nullable=False)  # UUID or unique identifier
    problem_id = Column(String, ForeignKey("problems.problem_id"), nullable=False)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True)
    
    # Submission metadata
    submitted_code = Column(Text, nullable=False)
    language = Column(String, default="python")
    
    # Judge results (DETERMINISTIC)
    total_hidden_tests = Column(Integer, default=0)
    passed_hidden_tests = Column(Integer, default=0)
    test_results = Column(JSON)  # Array of {ok: bool, time: float, error: str|null}
    
    # Scoring breakdown (70-15-10 formula)
    correctness_points = Column(Float, default=0.0)  # 70 max
    performance_points = Column(Float, default=0.0)  # 15 max
    quality_points = Column(Float, default=0.0)      # 10 max
    penalty_points = Column(Float, default=0.0)      # Subtractive
    final_score = Column(Float, default=0.0)  # 0-100, clamped
    
    # Verdict and feedback
    verdict = Column(String, default="PENDING")  # PENDING, ACCEPTED, PARTIAL_ACCEPTED, FAILED, RUNTIME_ERROR, TIMEOUT
    max_execution_time = Column(Float, default=0.0)  # Highest single test time
    
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    evaluated_at = Column(DateTime(timezone=True), nullable=True)
    
    candidate = relationship("Candidate")
    problem = relationship("Problem")


# --- ANTI-CHEAT LOGS ---
class AntiCheatLog(Base):
    __tablename__ = "anti_cheat_logs"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)  # Links to EvaluationSession.evaluation_id
    evaluation_id = Column(String, ForeignKey("evaluation_sessions.evaluation_id"), nullable=True)
    
    # Violation type and details
    violation_type = Column(String)  # CAMERA_VIOLATION, TAB_SWITCH, WINDOW_BLUR, COPY_ATTEMPT, PASTE_ATTEMPT, etc.
    reason = Column(String, nullable=True)  # NO_FACE, TAB_HIDDEN, PERMISSION_DENIED, etc.
    duration = Column(Integer, nullable=True)  # Duration in seconds (for tab/blur events)
    context = Column(String, nullable=True)  # EDITOR, UNKNOWN, etc.
    
    # Timestamp of violation
    violation_timestamp = Column(Integer)  # Unix timestamp in milliseconds
    logged_at = Column(DateTime(timezone=True), server_default=func.now())
    
    evaluation = relationship("EvaluationSession")