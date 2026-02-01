from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
# FIX: Import 'JobAssessment' to match models.py
from models import JobAssessment, AssessmentSubmission, Application, PsychometricSubmission, Job, Candidate, Problem, EvaluationSession, AntiCheatLog
from pydantic import BaseModel
from typing import List, Dict, Any
import json
import requests
from services.judge import JudgingSession, SafetyChecker
from utils.security import get_current_user # <--- IMPORT SECURITY

router = APIRouter()

# --- SCHEMAS ---
class Question(BaseModel):
    title: str
    problem_text: str
    test_input: str
    test_output: str
    points: int

class AssessmentCreate(BaseModel):
    job_id: int
    title: str
    duration_minutes: int
    questions: List[Question]

class SubmissionCreate(BaseModel):
    candidate_id: str
    code: str
    language: str
    output: str
    score: int

class ExecutionRequest(BaseModel):
    code: str
    language: str = "python"

# --- NEW: JUDGE SYSTEM SCHEMAS ---
class RunSampleTestsRequest(BaseModel):
    problem_id: str
    code: str
    language: str = "python"

class FinalEvaluationRequest(BaseModel):
    problem_id: str
    candidate_id: str
    job_id: int
    code: str
    language: str = "python"

class EvaluationResponse(BaseModel):
    evaluation_id: str
    problem_id: str
    passed_hidden_tests: int
    total_hidden_tests: int
    correctness_points: float
    performance_points: float
    quality_points: float
    penalty_points: float
    final_score: float
    verdict: str
    max_execution_time: float
    error: str | None = None

# --- ROUTES ---

@router.post("/execute")
def execute_code(
    request: ExecutionRequest, 
    current_user_id: str = Depends(get_current_user)
):
    """
    Secure Proxy for Piston Code Execution.
    Prevents leaking user tokens to external APIs.
    """
    PISTON_API = "https://emkc.org/api/v2/piston/execute"
    payload = {
        "language": request.language,
        "version": "3.10.0",
        "files": [{"content": request.code}]
    }

    try:
        response = requests.post(PISTON_API, json=payload)
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution engine failed: {str(e)}")


@router.post("/assessments")
def create_assessment(
    data: AssessmentCreate, 
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user) # SECURE
):
    # 1. Verify Job Exists
    job = db.query(Job).filter(Job.id == data.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # 2. SECURITY: Verify Recruiter Ownership
    if job.recruiter_id != current_user_id:
        raise HTTPException(status_code=403, detail="Unauthorized to create assessment for this job")

    # 3. Serialize questions list to JSON string
    questions_json = json.dumps([q.dict() for q in data.questions])

    # 4. Create Assessment
    new_assessment = JobAssessment(
        job_id=data.job_id,
        title=data.title,
        duration_minutes=data.duration_minutes,
        questions=questions_json
    )
    db.add(new_assessment)
    db.commit()
    db.refresh(new_assessment)
    
    return {"message": "Assessment created successfully", "id": new_assessment.id}


@router.get("/assessments/{job_id}")
def get_assessment(
    job_id: int, 
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user) # SECURE
):
    # 1. Fetch Assessment
    assessment = db.query(JobAssessment).filter(JobAssessment.job_id == job_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # 2. SECURITY: Access Control
    # Allow if Recruiter (Owner) OR Candidate (Applied)
    job = db.query(Job).filter(Job.id == job_id).first()
    
    is_owner = job and job.recruiter_id == current_user_id
    is_applicant = db.query(Application).filter(
        Application.job_id == job_id,
        Application.candidate_id == current_user_id
    ).first()

    if not (is_owner or is_applicant):
        raise HTTPException(status_code=403, detail="Unauthorized access to assessment")

    return {
        "id": assessment.id,
        "title": assessment.title,
        "duration_minutes": assessment.duration_minutes,
        "questions": json.loads(assessment.questions) if isinstance(assessment.questions, str) else assessment.questions
    }


@router.post("/assessments/{job_id}/submit")
def submit_assessment(
    job_id: int, 
    data: SubmissionCreate, 
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user) # SECURE
):
    # SECURITY: Ensure user is submitting for themselves
    if current_user_id != data.candidate_id:
        raise HTTPException(status_code=403, detail="Identity mismatch")

    # 1. Check if candidate applied
    app = db.query(Application).filter(
        Application.job_id == job_id, 
        Application.candidate_id == data.candidate_id
    ).first()
    
    if not app:
        raise HTTPException(status_code=403, detail="Candidate has not applied to this job")

    # 2. Save Submission
    submission = AssessmentSubmission(
        job_id=job_id,
        candidate_id=data.candidate_id,
        code=data.code,
        language=data.language,
        output=data.output,
        score=data.score
    )
    db.add(submission)
    
    # 3. Update Application Status
    app.status = "Assessment Completed"
    
    db.commit()
    return {"message": "Assessment submitted successfully"}


@router.get("/assessments/final_grade/{job_id}/{candidate_id}")
def get_final_grade(
    job_id: int, 
    candidate_id: str, 
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user) # SECURE
):
    # SECURITY: Only Owner or Candidate themselves can see grades
    job = db.query(Job).filter(Job.id == job_id).first()
    is_owner = job and job.recruiter_id == current_user_id
    is_self = candidate_id == current_user_id

    if not (is_owner or is_self):
        raise HTTPException(status_code=403, detail="Unauthorized")

    tech = db.query(AssessmentSubmission).filter(
        AssessmentSubmission.job_id == job_id,
        AssessmentSubmission.candidate_id == candidate_id
    ).first()

    psycho = db.query(PsychometricSubmission).filter(
        PsychometricSubmission.job_id == job_id,
        PsychometricSubmission.candidate_id == candidate_id
    ).first()

    app = db.query(Application).filter(
        Application.job_id == job_id,
        Application.candidate_id == candidate_id
    ).first()

    return {
        "technical_score": tech.score if tech else 0,
        "psychometric_score": psycho.score if psycho else 0,
        "final_score": app.final_grade if app else 0,
        "verdict": app.verdict if app else "Pending",
        "ai_analysis": app.notes if app else "No AI analysis available yet."
    }


# ============================================================
# JUDGE SYSTEM ENDPOINTS (SECURED)
# ============================================================

@router.post("/problems/{problem_id}/run-sample-tests")
def run_sample_tests(
    problem_id: str, 
    request: RunSampleTestsRequest, 
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user) # SECURE
):
    problem = db.query(Problem).filter(Problem.problem_id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    valid, error_msg = SafetyChecker.validate_function_signature(request.code, problem.function_signature)
    if not valid:
        return {"error": error_msg, "sample_results": None}
    
    sample_tests = problem.sample_tests or []
    from services.judge import TestExecutor
    
    exec_result = TestExecutor.execute_tests(
        request.code,
        problem.function_signature,
        sample_tests,
        time_limit_sec=problem.time_limit_sec,
        language=request.language
    )
    
    return {
        "error": exec_result.get("error"),
        "sample_results": {
            "passed": exec_result["passed"],
            "total": exec_result["total"],
            "tests": exec_result["results"]
        }
    }


@router.post("/problems/{problem_id}/evaluate")
def evaluate_submission(
    problem_id: str,
    request: FinalEvaluationRequest,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user) # SECURE
):
    if current_user_id != request.candidate_id:
        raise HTTPException(status_code=403, detail="Identity mismatch")

    problem = db.query(Problem).filter(Problem.problem_id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    app = db.query(Application).filter(
        Application.job_id == request.job_id,
        Application.candidate_id == request.candidate_id
    ).first()
    if not app:
        raise HTTPException(status_code=403, detail="Candidate not eligible for this problem")
    
    judge_result = JudgingSession.judge_submission(
        user_code=request.code,
        problem_id=problem_id,
        function_signature=problem.function_signature,
        hidden_tests=problem.hidden_tests or [],
        time_limit_sec=problem.time_limit_sec,
        language=request.language
    )
    
    evaluation = EvaluationSession(
        evaluation_id=judge_result["evaluation_id"],
        problem_id=problem_id,
        candidate_id=request.candidate_id,
        job_id=request.job_id,
        submitted_code=request.code,
        language=request.language,
        total_hidden_tests=judge_result["total_hidden_tests"],
        passed_hidden_tests=judge_result["passed_hidden_tests"],
        test_results=judge_result["test_results"],
        correctness_points=judge_result["correctness_points"],
        performance_points=judge_result["performance_points"],
        quality_points=judge_result["quality_points"],
        penalty_points=judge_result["penalty_points"],
        final_score=judge_result["final_score"],
        verdict=judge_result["verdict"],
        max_execution_time=judge_result["max_execution_time"],
        evaluated_at=judge_result["evaluated_at"]
    )
    
    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)
    
    return {
        "evaluation_id": evaluation.evaluation_id,
        "problem_id": problem_id,
        "passed_hidden_tests": evaluation.passed_hidden_tests,
        "total_hidden_tests": evaluation.total_hidden_tests,
        "correctness_points": evaluation.correctness_points,
        "performance_points": evaluation.performance_points,
        "quality_points": evaluation.quality_points,
        "penalty_points": evaluation.penalty_points,
        "final_score": evaluation.final_score,
        "verdict": evaluation.verdict,
        "max_execution_time": evaluation.max_execution_time,
        "error": judge_result.get("error")
    }

@router.get("/problems")
def get_all_problems(db: Session = Depends(get_db)):
    # This is fine to be public/read-only or authenticated
    problems = db.query(Problem).all()
    return {"problems": [{"problem_id": p.problem_id, "title": p.title, "description": p.description} for p in problems]}

class CreateProblemRequest(BaseModel):
    title: str
    description: str
    difficulty: str = "easy"
    function_signature: str = ""
    language: str = "python"

@router.post("/problems/create")
def create_new_problem(
    request: CreateProblemRequest, 
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user) # SECURE
):
    # Only allow recruiters to create global problems? 
    # For now, just ensuring they are logged in is a good start.
    
    problem_id = request.title.lower().replace(" ", "_")
    existing = db.query(Problem).filter(Problem.problem_id == problem_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Problem already exists")
    
    new_problem = Problem(
        problem_id=problem_id,
        title=request.title,
        description=request.description,
        difficulty=request.difficulty,
        language=request.language,
        function_signature=request.function_signature or f"def solution():",
        sample_tests=json.dumps([]),
        hidden_tests=json.dumps([]),
        time_limit_sec=5.0,
        memory_limit_mb=256
    )
    
    db.add(new_problem)
    db.commit()
    db.refresh(new_problem)
    
    return {"problem": {"problem_id": new_problem.problem_id}}

# Anti-cheat logs usually don't need user ID checks as they are automated reports
# but adding it prevents spam.
@router.post("/anti-cheat/logs")
def log_anti_cheat_violations(request: Any, db: Session = Depends(get_db)):
    # Keep as is or add Depends(get_current_user)
    return {"status": "logged"}