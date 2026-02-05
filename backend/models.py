from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, JSON, Boolean, Text, BigInteger
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
    questions = Column(JSON)  # Coding questions
    psychometric_ids = Column(JSON, default=[])  # Psychometric question IDs (MCQ/slider)
    technical_question_ids = Column(JSON, default=[])  # Technical text question IDs
    
    # Recruiter-configurable scoring weights (must sum to 1.0 after normalization)
    coding_weight = Column(Float, default=0.40)       # 40% default, min 30%
    technical_weight = Column(Float, default=0.25)    # 25% default
    psychometric_weight = Column(Float, default=0.25) # 25% default, min 15%
    behavioral_weight = Column(Float, default=0.10)   # 10% default, max 15%
    
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

# --- PSYCHOMETRIC QUESTIONS ---
class PsychometricQuestion(Base):
    __tablename__ = "psychometric_questions"
    id = Column(Integer, primary_key=True, index=True)
    section = Column(String)
    question = Column(String)
    context = Column(Text, nullable=True)
    options = Column(String)
    answer = Column(String)
    explanation = Column(Text)

# --- TECHNICAL TEXT QUESTIONS ---
class TechnicalQuestion(Base):
    """
    Text-based technical interview questions.
    Types: conceptual, situational, behavioral
    
    Keywords are used for AI/automated grading - 
    checking if candidate's response mentions key concepts.
    """
    __tablename__ = "technical_questions"
    id = Column(Integer, primary_key=True, index=True)
    section = Column(String, nullable=False)  # "Conceptual Questions", "Situational Questions", "Behavioral Questions"
    question_type = Column(String, default="text")  # "text", "mcq" (for future)
    question = Column(Text, nullable=False)
    keywords = Column(JSON, default=[])  # List of expected keywords for grading
    difficulty = Column(String, default="medium")  # easy, medium, hard
    time_limit_sec = Column(Integer, default=300)  # 5 minutes per question
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# --- TEMPORARY: TECHNICAL TEXT PROGRESS ---
class TechnicalTextProgress(Base):
    """
    Temporary storage for in-progress technical text answers.
    Similar to PsychometricProgress - prevents data loss on page refresh.
    """
    __tablename__ = "technical_text_progress"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, nullable=False)
    candidate_id = Column(String, nullable=False)
    answers = Column(JSON, nullable=False, default={})  # {question_id: answer_text}
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

# --- TEMPORARY: PSYCHOMETRIC PROGRESS (for refresh persistence) ---
class PsychometricProgress(Base):
    """
    Temporary table to store in-progress psychometric test answers.
    This prevents data loss when candidates refresh the page during the test.
    Data is deleted after final submission and scoring.
    
    NOTE: No foreign key constraints since this stores Clerk user IDs 
    which may not have corresponding entries in the candidates table yet.
    """
    __tablename__ = "psychometric_progress"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, nullable=False)  # No FK - just store the ID
    candidate_id = Column(String, nullable=False)  # Clerk user ID - no FK
    
    # Store answers as JSON (same format as final submission)
    answers = Column(JSON, nullable=False, default={})
    
    # Track when progress was last updated
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

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
    violation_timestamp = Column(BigInteger)  # Unix timestamp in milliseconds
    logged_at = Column(DateTime(timezone=True), server_default=func.now())
    
    evaluation = relationship("EvaluationSession")


# --- TECHNICAL TEXT SUBMISSIONS ---
class TechnicalTextSubmission(Base):
    """
    Stores graded technical text question submissions.
    
    Each answer is scored using keyword matching:
    score = (matched_keywords / total_keywords) * 10, capped at 10
    """
    __tablename__ = "technical_text_submissions"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False)
    
    # Per-question breakdown: {question_id: {answer, score, keywords_matched, total_keywords}}
    answers = Column(JSON, nullable=False, default={})
    
    # Aggregated score (average of all question scores, 0-10 scale)
    total_score = Column(Float, default=0.0)
    question_count = Column(Integer, default=0)
    
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    
    job = relationship("Job")
    candidate = relationship("Candidate")


# --- CANDIDATE FINAL SCORES (Single Source of Truth) ---
class CandidateFinalScore(Base):
    """
    Unified scoring result for a candidate on a job.
    
    This is the SINGLE SOURCE OF TRUTH for all candidate scores.
    Contains full breakdown for auditability and explainability.
    """
    __tablename__ = "candidate_final_scores"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False)
    
    # Component scores (raw, before weighting)
    coding_score = Column(Float, nullable=True)          # 0-40, null if not evaluated
    technical_score = Column(Float, nullable=True)       # 0-25, null if not evaluated
    psychometric_score = Column(Float, nullable=True)    # 0-25, null if not evaluated
    behavioral_score = Column(Float, nullable=True)      # 0-10, null if not evaluated
    
    # Weights used after normalization (sum to 1.0)
    coding_weight_used = Column(Float, nullable=True)
    technical_weight_used = Column(Float, nullable=True)
    psychometric_weight_used = Column(Float, nullable=True)
    behavioral_weight_used = Column(Float, nullable=True)
    
    # Final result
    final_score = Column(Float, default=0.0)             # 0-100
    decision = Column(String, default="PENDING")         # STRONG_HIRE, HIRE, BORDERLINE_REVIEW, NO_HIRE
    
    # Flags for risk assessment
    flags = Column(JSON, default={})  # {weak_fundamentals, behavioral_reliability, hard_gate_failed, etc.}
    
    # Full audit trail
    component_breakdown = Column(JSON, default={})       # Complete breakdown for transparency
    hard_gate_result = Column(JSON, nullable=True)       # If hard gate failed, details here
    
    # Timestamps
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    job = relationship("Job")
    candidate = relationship("Candidate")