from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
# FIX: Import 'JobAssessment' to match models.py
from models import JobAssessment, AssessmentSubmission, Application, PsychometricSubmission, Job, Candidate, Problem, EvaluationSession, AntiCheatLog, PsychometricQuestion, PsychometricProgress, TechnicalQuestion, TechnicalTextProgress
from sqlalchemy.sql import func
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
from services.judge import JudgingSession, SafetyChecker, Compiler
from services.scoring_engine import ScoringEngine, TechnicalTextGrader
from models import TechnicalTextSubmission, CandidateFinalScore

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
    preferred_traits: List[str] = []  # Optional: Culture fit traits
    psychometric_ids: List[int] = []  # Optional: Selected psychometric questions
    technical_question_ids: List[int] = []  # Optional: Selected technical text questions

class SubmissionCreate(BaseModel):
    candidate_id: str
    code: str
    language: str
    output: str
    score: int

class PsychometricCreate(BaseModel):
    job_id: int
    candidate_id: str
    answers: Dict[str, Any]

# --- NEW: COMPILE REQUEST SCHEMA ---
class CompileRequest(BaseModel):
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

@router.post("/assessments")
def create_assessment(data: AssessmentCreate, db: Session = Depends(get_db)):
    # 1. Verify Job Exists
    print(f"[create_assessment] Received payload: job_id={data.job_id}, title={data.title}, questions_count={len(data.questions)}, traits={data.preferred_traits}")
    
    job = db.query(Job).filter(Job.id == data.job_id).first()
    if not job:
        print(f"[create_assessment] Job {data.job_id} not found")
        raise HTTPException(status_code=404, detail="Job not found")

    # 2. Serialize questions list to JSON string
    questions_json = json.dumps([q.dict() for q in data.questions])
    print(f"[create_assessment] Serialized questions: {questions_json}")
    print(f"[create_assessment] Psychometric IDs: {data.psychometric_ids}")
    print(f"[create_assessment] Technical Question IDs: {data.technical_question_ids}")

    # 3. Create or Update Assessment
    existing = db.query(JobAssessment).filter(JobAssessment.job_id == data.job_id).first()
    
    if existing:
        existing.title = data.title
        existing.duration_minutes = data.duration_minutes
        existing.questions = questions_json
        existing.psychometric_ids = data.psychometric_ids
        existing.technical_question_ids = data.technical_question_ids
        db.commit()
        db.refresh(existing)
        print(f"[create_assessment] Assessment updated for job {data.job_id}")
        return {"message": "Assessment updated successfully", "id": existing.id}
    else:
        new_assessment = JobAssessment(
            job_id=data.job_id,
            title=data.title,
            duration_minutes=data.duration_minutes,
            questions=questions_json,
            psychometric_ids=data.psychometric_ids,
            technical_question_ids=data.technical_question_ids
        )
        db.add(new_assessment)
        db.commit()
        db.refresh(new_assessment)
        
        print(f"[create_assessment] Assessment created with ID: {new_assessment.id}")
        return {"message": "Assessment created successfully", "id": new_assessment.id}

@router.get("/assessments/{job_id}")
def get_assessment(job_id: int, db: Session = Depends(get_db)):
    print(f"[get_assessment] Fetching assessment for job_id: {job_id}")
    
    # FIX: Query 'JobAssessment'
    assessment = db.query(JobAssessment).filter(JobAssessment.job_id == job_id).first()
    if not assessment:
        print(f"[get_assessment] No assessment found for job_id: {job_id}")
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    parsed_questions = json.loads(assessment.questions) if isinstance(assessment.questions, str) else assessment.questions
    print(f"[get_assessment] Found assessment with {len(parsed_questions) if parsed_questions else 0} questions")
    
    return {
        "id": assessment.id,
        "title": assessment.title,
        "duration_minutes": assessment.duration_minutes,
        # Parse JSON string back to list for Frontend
        "id": assessment.id,
        "title": assessment.title,
        "duration_minutes": assessment.duration_minutes,
        "questions": parsed_questions,
        "psychometric_ids": assessment.psychometric_ids or [],
        "technical_question_ids": assessment.technical_question_ids or []
    }

@router.post("/assessments/{job_id}/submit")
def submit_assessment(job_id: int, data: SubmissionCreate, db: Session = Depends(get_db)):
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

    # 4. Consolidate Final Score (Coding + Psychometric)
    # Fetch latest psychometric score
    psych_sub = db.query(PsychometricSubmission).filter(
        PsychometricSubmission.job_id == job_id,
        PsychometricSubmission.candidate_id == data.candidate_id
    ).order_by(PsychometricSubmission.submitted_at.desc()).first()
    
    psych_score = psych_sub.score if psych_sub else 0
    
    # Formula: 60% Coding, 40% Psychometric
    final_match_score = int((data.score * 0.6) + (psych_score * 0.4))
    app.match_score = final_match_score
    
    db.commit()
    return {"message": "Assessment submitted successfully"}

@router.post("/assessments/psychometric/seed")
def seed_psychometric_questions(db: Session = Depends(get_db)):
    """
    Seed psychometric questions (MCQs and Behavioral Sliders) from JSON files.
    """
    import os
    
    # 1. Seed MCQs (Existing logic, if needed)
    # ... (skipping for now, assuming they exist or handled elsewhere)
    
    # 2. Seed Behavioral Sliders
    json_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "behavioral_sliders.json")
    
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        # Fallback to hardcoded path if relative fails
        json_path = "behavioral_sliders.json" 
        try:
             with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except:
            raise HTTPException(status_code=404, detail="behavioral_sliders.json not found")

    added_count = 0
    categories = data.get("categories", [])
    
    for cat in categories:
        category_name = cat.get("category")
        focus = cat.get("focus")
        
        for q in cat.get("questions", []):
            # Check for duplicates
            exists = db.query(PsychometricQuestion).filter(
                PsychometricQuestion.question == q["statement"]
            ).first()
            
            if not exists:
                # Store traits in options as JSON
                traits = {
                    "left": q.get("left_trait", "Disagree"),
                    "right": q.get("right_trait", "Agree")
                }
                
                new_q = PsychometricQuestion(
                    section=f"Behavioral Sliders: {category_name}", # Tag as slider
                    question=q["statement"],
                    context=None,
                    options=json.dumps(traits), # Store traits here
                    answer="", # No single correct answer
                    explanation=focus
                )
                db.add(new_q)
                added_count += 1
    
    db.commit()
    return {"message": f"Seeded {added_count} behavioral slider questions"}

@router.get("/assessments/{job_id}/psychometric")
def get_job_psychometric_questions(job_id: int, db: Session = Depends(get_db)):
    """Fetch psychometric questions assigned to a specific job"""
    assessment = db.query(JobAssessment).filter(JobAssessment.job_id == job_id).first()
    
    questions = []
    # Check if recruiter selected specific questions
    if assessment and assessment.psychometric_ids:
        # Assuming psychometric_ids is a list of integers
        selected_ids = assessment.psychometric_ids
        if isinstance(selected_ids, list) and len(selected_ids) > 0:
            questions = db.query(PsychometricQuestion).filter(PsychometricQuestion.id.in_(selected_ids)).all()
    
    # Fallback to random if no selection
    if not questions:
        questions = db.query(PsychometricQuestion).order_by(func.random()).limit(10).all()

    results = []
    for q in questions:
        # Determine type based on section
        is_slider = q.section and "Behavioral Sliders" in q.section
        
        if is_slider:
            # Parse traits from options JSON
            try:
                traits = json.loads(q.options) if q.options else {}
            except:
                traits = {"left": "Disagree", "right": "Agree"}
                
            results.append({
                "id": f"db_{q.id}",
                "type": "slider",
                "text": q.question,
                "leftLabel": traits.get("left", "Disagree"),
                "rightLabel": traits.get("right", "Agree"),
                "section": q.section
            })
        else:
            # Handle MCQ
            opts_raw = q.options or ""
            options_list = []
            if opts_raw:
                parts = opts_raw.split("|")
                for p in parts:
                    p = p.strip()
                    if ")" in p:
                        val = p.split(")")[0]
                        label = p
                        options_list.append({"value": val, "label": label})
            
            results.append({
                "id": f"db_{q.id}",
                "type": "mcq",
                "text": q.question,
                "context": q.context,
                "options": options_list,
                "section": q.section
            })
    return {"questions": results}

@router.get("/assessments/psychometric/questions")
def get_psychometric_questions(limit: int = 100, db: Session = Depends(get_db)): # Increased default limit
    """Fetch psychometric questions from the bank (MCQs & Sliders)"""
    questions = db.query(PsychometricQuestion).limit(limit).all() # Just fetch all/limit
    
    results = []
    for q in questions:
        is_slider = q.section and "Behavioral Sliders" in q.section
        
        if is_slider:
             try:
                traits = json.loads(q.options) if q.options else {}
             except:
                traits = {"left": "Disagree", "right": "Agree"}
             
             results.append({
                "id": f"db_{q.id}",
                "type": "slider",
                "text": q.question,
                "leftLabel": traits.get("left", "Disagree"),
                "rightLabel": traits.get("right", "Agree"),
                "section": q.section
            })
        else:
            # Parse options
            opts_raw = q.options or ""
            # Assuming format "A) ... | B) ..."
            options_list = []
            if opts_raw:
                parts = opts_raw.split("|")
                for p in parts:
                    p = p.strip()
                    if ")" in p:
                        val = p.split(")")[0]
                        label = p
                        options_list.append({"value": val, "label": label})
            
            results.append({
                "id": f"db_{q.id}",
                "type": "mcq", 
                "text": q.question,
                "context": q.context,
                "options": options_list,
                "section": q.section
            })
    return {"questions": results}

@router.post("/assessments/psychometric")
def submit_psychometric(data: PsychometricCreate, db: Session = Depends(get_db)):
    """
    Save psychometric (personality fit) responses for a candidate.
    """
    # Verify candidate applied for the job
    app = db.query(Application).filter(
        Application.job_id == data.job_id,
        Application.candidate_id == data.candidate_id
    ).first()
    if not app:
        raise HTTPException(status_code=403, detail="Candidate has not applied to this job")

    # 1. Calculate Slider Score (Work Style) - Average of 1-5 scaled to 100
    slider_score = 0
    slider_vals = [v for k,v in data.answers.items() if (str(k).startswith('q') or str(k).startswith('db_')) and isinstance(v, (int, float))]
    if slider_vals:
         # Map 1-5 to 20-100
         slider_score = int(round((sum(slider_vals)/len(slider_vals)) * 20))
    
    # 2. Calculate MCQ Score (Aptitude)
    mcq_score = 0
    mcq_count = 0
    mcq_correct = 0
    
    # Identify DB questions (keys like "db_12")
    db_ids = []
    for k in data.answers.keys():
        if str(k).startswith("db_"):
            try:
                qid = int(str(k).replace("db_", ""))
                db_ids.append(qid)
            except:
                pass

    if db_ids:
        questions = db.query(PsychometricQuestion).filter(PsychometricQuestion.id.in_(db_ids)).all()
        q_map = {f"db_{q.id}": q.answer for q in questions}
        
        for q_key, correct_answer in q_map.items():
            user_ans = data.answers.get(q_key)
            # Compare assuming format "A" == "A" (Case insensitive just in case)
            if user_ans and correct_answer and str(user_ans).strip().lower()[:1] == str(correct_answer).strip().lower()[:1]:
                mcq_correct += 1
            mcq_count += 1
            
    if mcq_count > 0:
        mcq_score = int((mcq_correct / mcq_count) * 100)
    
    # Weighted Final Score: 30% Work Style, 70% Aptitude (if aptitude exists)
    if mcq_count > 0:
        final_score = int((slider_score * 0.3) + (mcq_score * 0.7))
    else:
        final_score = slider_score

    submission = PsychometricSubmission(
        job_id=data.job_id,
        candidate_id=data.candidate_id,
        answers=data.answers,
        score=final_score
    )
    db.add(submission)
    
    # Update temporary status (Optional, but good for UI)
    # app.status = "Psychometric Completed" 
    
    # Clean up temporary progress data after successful submission
    db.query(PsychometricProgress).filter(
        PsychometricProgress.job_id == data.job_id,
        PsychometricProgress.candidate_id == data.candidate_id
    ).delete()
    
    db.commit()
    
    # Trigger scoring engine to recalculate final score
    try:
        scoring_result = ScoringEngine.calculate_candidate_score(data.job_id, data.candidate_id, db)
        ScoringEngine.store_result(scoring_result, data.job_id, data.candidate_id, db)
        
        # Update application record with new score
        app.final_grade = scoring_result.final_score
        app.verdict = scoring_result.decision
        db.commit()
        
        print(f"[✅ SUBMITTED] Psychometric saved. New final score: {scoring_result.final_score}, Decision: {scoring_result.decision}")
        
        return {
            "message": "Psychometric submitted successfully", 
            "score": final_score,
            "final_score": scoring_result.final_score,
            "decision": scoring_result.decision
        }
    except Exception as e:
        print(f"[⚠️ WARNING] Scoring engine failed: {str(e)}. Psychometric data still saved.")
        return {"message": "Psychometric submitted successfully", "score": final_score}
# --- NEW ROUTE: FIX FOR MISSING MARKS IN MODAL ---
# ⚠️ DEPRECATED: This endpoint uses job_id + candidate_id, which causes stale data
# It's kept for backward compatibility only. Use /api/evaluation/{evaluation_id} instead.
@router.get("/assessments/final_grade/{job_id}/{candidate_id}")
def get_final_grade(job_id: int, candidate_id: str, db: Session = Depends(get_db)):
    print(f"[⚠️ DEPRECATED] /assessments/final_grade called with job_id={job_id}, candidate_id={candidate_id}")
    print(f"[⚠️ WARNING] This endpoint may return stale data. Use /api/evaluation/{{evaluation_id}} instead.")
    
    # 1. Get Technical Score from latest AssessmentSubmission
    tech = db.query(AssessmentSubmission).filter(
        AssessmentSubmission.job_id == job_id,
        AssessmentSubmission.candidate_id == candidate_id
    ).order_by(AssessmentSubmission.submitted_at.desc()).first()

    # 2. Get Psychometric Score from latest PsychometricSubmission
    psycho = db.query(PsychometricSubmission).filter(
        PsychometricSubmission.job_id == job_id,
        PsychometricSubmission.candidate_id == candidate_id
    ).order_by(PsychometricSubmission.submitted_at.desc()).first()

    # 3. Get Application (for final grade/verdict)
    app = db.query(Application).filter(
        Application.job_id == job_id,
        Application.candidate_id == candidate_id
    ).first()
    
    # 4. Try to find latest EvaluationSession (CORRECT SOURCE OF TRUTH)
    latest_eval = db.query(EvaluationSession).filter(
        EvaluationSession.job_id == job_id,
        EvaluationSession.candidate_id == candidate_id
    ).order_by(EvaluationSession.evaluated_at.desc()).first()
    
    print(f"[DEBUG] tech={tech.score if tech else 'None'}, psycho={psycho.score if psycho else 'None'}, app_grade={app.final_grade if app else 'None'}, latest_eval={latest_eval.final_score if latest_eval else 'None'}")

    return {
        "technical_score": tech.score if tech else 0,
        "psychometric_score": psycho.score if psycho else 0,
        "final_score": app.final_grade if app else 0,
        "verdict": app.verdict if app else "Pending",
        "ai_analysis": app.notes if app else "No AI analysis available yet.",
        "evaluation_id": latest_eval.evaluation_id if latest_eval else None,
        "evaluation_final_score": latest_eval.final_score if latest_eval else None
    }


@router.get("/assessments/validation/{evaluation_id}")
def validate_and_get_evaluation(evaluation_id: str, db: Session = Depends(get_db)):
    """
    🚫 DEFENSIVE ENDPOINT
    
    This endpoint ENFORCES that evaluation_id MUST be provided.
    It refuses to guess or fallback to other identifiers.
    
    If you want evaluation data, you MUST have evaluation_id.
    Otherwise, the request fails explicitly (no silent fallback).
    
    This prevents the bug where different pages fetch different data.
    """
    print(f"\n[🔒 VALIDATION MODE]")
    print(f"  evaluation_id={evaluation_id}")
    
    if not evaluation_id or evaluation_id == "undefined" or evaluation_id == "null":
        print(f"[❌ REJECTED] evaluation_id is missing or invalid")
        raise HTTPException(
            status_code=400, 
            detail="evaluation_id is REQUIRED. Cannot fetch evaluation data without explicit evaluation_id. "
                   "This is by design to prevent stale data bugs. "
                   "First fetch evaluation_id using /api/evaluation/latest/{job_id}/{candidate_id}"
        )
    
    evaluation = db.query(EvaluationSession).filter(
        EvaluationSession.evaluation_id == evaluation_id
    ).first()
    
    if not evaluation:
        print(f"[❌ NOT FOUND] evaluation_id={evaluation_id} not in database")
        raise HTTPException(
            status_code=404, 
            detail=f"Evaluation {evaluation_id} not found in evaluation_sessions. "
                   "Double-check that the evaluation_id is correct."
        )
    
    print(f"[✅ VALIDATED] evaluation_id={evaluation_id} exists")
    return {
        "valid": True,
        "evaluation_id": evaluation_id,
        "final_score": evaluation.final_score,
        "verdict": evaluation.verdict,
        "message": "Evaluation is valid. You can safely fetch full details."
    }


# ============================================================
# JUDGE SYSTEM ENDPOINTS (NEW)
# ============================================================

@router.post("/compile")
def compile_code(request: CompileRequest):
    """
    COMPILE CODE FIRST - Fast syntax validation.
    
    This endpoint checks code for syntax errors without executing it.
    Should be called BEFORE running sample tests or final evaluation
    to provide immediate feedback on syntax issues.
    
    Flow: Compile → (if success) → Run Tests OR Evaluate
    
    Returns:
        {
            "success": bool,
            "error": str | null,
            "error_line": int | null,
            "error_type": str | null,
            "compilation_details": {...} | null
        }
    """
    print(f"\n[🔧 COMPILE]")
    print(f"  language={request.language}")
    print(f"  code_length={len(request.code)} chars")
    
    result = Compiler.compile_code(request.code, request.language)
    
    if result.get("success"):
        print(f"[✅ COMPILATION SUCCESS]")
    else:
        print(f"[❌ COMPILATION FAILED]")
        print(f"  error={result.get('error')}")
        print(f"  line={result.get('error_line')}")
    
    return result


@router.post("/problems/{problem_id}/run-sample-tests")
def run_sample_tests(problem_id: str, request: RunSampleTestsRequest, db: Session = Depends(get_db)):
    """
    Run user code against SAMPLE tests only.
    Used for "Run Code" button - shows stdout + test pass/fail.
    
    WORKFLOW: Compile → Safety Check → Validate Signature → Execute Tests
    
    NEVER returns hidden tests.
    """
    problem = db.query(Problem).filter(Problem.problem_id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # 1. COMPILE FIRST
    compile_result = Compiler.compile_code(request.code, request.language)
    if not compile_result.get("success", False):
        return {
            "error": compile_result.get("error"),
            "error_type": "COMPILATION_ERROR",
            "error_line": compile_result.get("error_line"),
            "compilation_details": compile_result.get("error_details"),
            "sample_results": None
        }
    
    # 2. Validate function signature
    valid, error_msg = SafetyChecker.validate_function_signature(request.code, problem.function_signature)
    if not valid:
        return {
            "error": error_msg,
            "error_type": "SIGNATURE_ERROR",
            "sample_results": None
        }
    
    # 3. Execute against sample tests only
    sample_tests = problem.sample_tests or []
    print(f"\n[🧪 SAMPLE TESTS]")
    print(f"  problem_id={problem_id}")
    print(f"  sample_tests_count={len(sample_tests)}")
    print(f"  sample_tests={sample_tests}")
    
    from services.judge import TestExecutor
    
    exec_result = TestExecutor.execute_tests(
        request.code,
        problem.function_signature,
        sample_tests,
        time_limit_sec=problem.time_limit_sec,
        language=request.language
    )
    
    print(f"\n[📊 EXEC RESULT]")
    print(f"  passed={exec_result['passed']}")
    print(f"  total={exec_result['total']}")
    print(f"  results={exec_result['results']}")
    print(f"  error={exec_result.get('error')}")
    
    return {
        "error": exec_result.get("error"),
        "compiled": True,
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
    db: Session = Depends(get_db)
):
    """
    FINAL EVALUATION: Judge against HIDDEN tests.
    
    Creates an EvaluationSession (single source of truth).
    Returns scoring breakdown.
    
    **CRITICAL**: This endpoint ONLY runs deterministic test cases.
    No AI makes pass/fail decisions.
    """
    print(f"\n[🎯 EVALUATE SUBMISSION]")
    print(f"  problem_id={problem_id}")
    print(f"  candidate_id={request.candidate_id}")
    print(f"  job_id={request.job_id}")
    
    problem = db.query(Problem).filter(Problem.problem_id == problem_id).first()
    if not problem:
        print(f"[❌ ERROR] Problem {problem_id} not found")
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Validate candidate applied to job with this problem
    app = db.query(Application).filter(
        Application.job_id == request.job_id,
        Application.candidate_id == request.candidate_id
    ).first()
    if not app:
        print(f"[❌ ERROR] Candidate {request.candidate_id} not eligible for job {request.job_id}")
        raise HTTPException(status_code=403, detail="Candidate not eligible for this problem")
    
    # Run the judge
    judge_result = JudgingSession.judge_submission(
        user_code=request.code,
        problem_id=problem_id,
        function_signature=problem.function_signature,
        hidden_tests=problem.hidden_tests or [],
        time_limit_sec=problem.time_limit_sec,
        language=request.language
    )
    
    print(f"[📊 JUDGE RESULT]")
    print(f"  evaluation_id={judge_result['evaluation_id']}")
    print(f"  final_score={judge_result['final_score']}")
    print(f"  verdict={judge_result['verdict']}")
    print(f"  passed_hidden_tests={judge_result['passed_hidden_tests']}/{judge_result['total_hidden_tests']}")
    
    # Store EvaluationSession (single source of truth)
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
    
    print(f"[✅ SAVED TO DB]")
    print(f"  evaluation_sessions.id={evaluation.id}")
    print(f"  evaluation_sessions.evaluation_id={evaluation.evaluation_id}")
    
    # Trigger scoring engine recalculation
    try:
        scoring_result = ScoringEngine.calculate_candidate_score(request.job_id, request.candidate_id, db)
        ScoringEngine.store_result(scoring_result, request.job_id, request.candidate_id, db)
        
        # Update application record with new score
        app.final_grade = scoring_result.final_score
        app.verdict = scoring_result.decision
        db.commit()
        
        print(f"[🎯 SCORING UPDATED]")
        print(f"  new_final_score={scoring_result.final_score}")
        print(f"  new_decision={scoring_result.decision}")
    except Exception as e:
        print(f"[⚠️ WARNING] Scoring engine failed: {str(e)}. Coding evaluation still saved.")
    
    response = {
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
    
    print(f"[📤 RESPONSE]\n{response}\n")
    return response


@router.get("/evaluation/{evaluation_id}")
def get_evaluation_details(evaluation_id: str, db: Session = Depends(get_db)):
    """
    ✅ SINGLE SOURCE OF TRUTH
    
    Retrieve full evaluation session details by evaluation_id ONLY.
    This is the authoritative endpoint for all evaluation data.
    
    Used for:
    - Result panel in IDE page
    - Recruiter review of candidate scores
    - Displaying violations (anti-cheat logs)
    
    Returns:
    - All scoring breakdown (correctness, performance, quality, penalties)
    - Test results detail
    - Candidate/problem/job metadata
    """
    print(f"\n[📋 GET EVALUATION BY ID]")
    print(f"  evaluation_id={evaluation_id}")
    
    evaluation = db.query(EvaluationSession).filter(
        EvaluationSession.evaluation_id == evaluation_id
    ).first()
    
    if not evaluation:
        print(f"[❌ ERROR] Evaluation {evaluation_id} not found")
        raise HTTPException(status_code=404, detail=f"Evaluation {evaluation_id} not found in evaluation_sessions table")
    
    print(f"[✅ FOUND]")
    print(f"  candidate_id={evaluation.candidate_id}")
    print(f"  job_id={evaluation.job_id}")
    print(f"  final_score={evaluation.final_score}")
    print(f"  verdict={evaluation.verdict}")
    
    # Fetch associated anti-cheat logs
    anti_cheat_logs = db.query(AntiCheatLog).filter(
        AntiCheatLog.evaluation_id == evaluation_id
    ).all()
    
    print(f"  anti_cheat_violations={len(anti_cheat_logs)}")
    
    response = {
        "evaluation_id": evaluation.evaluation_id,
        "problem_id": evaluation.problem_id,
        "candidate_id": evaluation.candidate_id,
        "job_id": evaluation.job_id,
        "passed_hidden_tests": evaluation.passed_hidden_tests,
        "total_hidden_tests": evaluation.total_hidden_tests,
        "correctness_points": evaluation.correctness_points,
        "performance_points": evaluation.performance_points,
        "quality_points": evaluation.quality_points,
        "penalty_points": evaluation.penalty_points,
        "final_score": evaluation.final_score,
        "verdict": evaluation.verdict,
        "max_execution_time": evaluation.max_execution_time,
        "test_results": evaluation.test_results,
        "submitted_code": evaluation.submitted_code,
        "language": evaluation.language,
        "submitted_at": evaluation.submitted_at.isoformat() if evaluation.submitted_at else None,
        "evaluated_at": evaluation.evaluated_at.isoformat() if evaluation.evaluated_at else None,
        "anti_cheat_violations": [
            {
                "type": v.violation_type,
                "reason": v.reason,
                "duration": v.duration,
                "context": v.context,
                "timestamp": v.violation_timestamp,
                "logged_at": v.logged_at.isoformat() if v.logged_at else None
            }
            for v in anti_cheat_logs
        ]
    }
    
    print(f"[📤 RESPONSE] Returning evaluation with {len(anti_cheat_logs)} violation logs\n")
    return response


@router.get("/evaluation/latest/{job_id}/{candidate_id}")
def get_latest_evaluation_id(job_id: int, candidate_id: str, db: Session = Depends(get_db)):
    """
    Find the latest evaluation_id for a candidate on a specific job.
    
    ✅ PHASE 2 FIX: This bridges the recruiter page to evaluation_sessions
    
    Returns the evaluation_id which should be used to fetch full evaluation data
    via GET /api/evaluation/{evaluation_id}
    
    Used by:
    - Recruiter job details page (to find evaluation_id for candidates)
    - VerdictCard component (to fetch scores by evaluation_id)
    """
    print(f"\n[🔍 GET LATEST EVALUATION]")
    print(f"  job_id={job_id}, candidate_id={candidate_id}")
    
    latest_eval = db.query(EvaluationSession).filter(
        EvaluationSession.job_id == job_id,
        EvaluationSession.candidate_id == candidate_id
    ).order_by(EvaluationSession.evaluated_at.desc()).first()
    
    if not latest_eval:
        print(f"[⚠️ NO EVALUATION FOUND]")
        # Return null evaluation_id and fallback scores from submissions
        app = db.query(Application).filter(
            Application.job_id == job_id,
            Application.candidate_id == candidate_id
        ).first()
        
        return {
            "has_evaluation": False,
            "evaluation_id": None,
            "job_id": job_id,
            "candidate_id": candidate_id,
            "fallback_final_grade": app.final_grade if app else 0,
            "fallback_verdict": app.verdict if app else "Pending",
            "message": "No formal evaluation completed yet. Showing resume match score."
        }
    
    print(f"[✅ FOUND] evaluation_id={latest_eval.evaluation_id}, score={latest_eval.final_score}")
    
    return {
        "has_evaluation": True,
        "evaluation_id": latest_eval.evaluation_id,
        "job_id": job_id,
        "candidate_id": candidate_id,
        "final_score": latest_eval.final_score,
        "verdict": latest_eval.verdict,
        "evaluated_at": latest_eval.evaluated_at.isoformat() if latest_eval.evaluated_at else None
    }


@router.get("/problems")
def get_all_problems(db: Session = Depends(get_db)):
    """
    Fetch all existing problems for the problem selector.
    """
    problems = db.query(Problem).all()
    
    return {
        "problems": [
            {
                "problem_id": p.problem_id,
                "title": p.title,
                "description": p.description,
                "difficulty": p.difficulty,
                "language": p.language
            }
            for p in problems
        ]
    }


@router.get("/problems/{problem_id}")
def get_problem_details(problem_id: str, db: Session = Depends(get_db)):
    """
    Get detailed problem information including function signature.
    Used by the IDE to show the correct starter code.
    
    NOTE: This endpoint NEVER returns hidden tests.
    """
    problem = db.query(Problem).filter(Problem.problem_id == problem_id).first()
    
    if not problem:
        raise HTTPException(status_code=404, detail=f"Problem '{problem_id}' not found")
    
    # Build starter code template from function signature
    function_signature = problem.function_signature or "def solution():"
    
    # Generate a more complete starter code with the function signature
    starter_code = f"""# Write your Python solution for: {problem.title}

{function_signature}
    # Your code here
    pass
"""
    
    return {
        "problem_id": problem.problem_id,
        "title": problem.title,
        "description": problem.description,
        "difficulty": problem.difficulty,
        "language": problem.language,
        "function_signature": function_signature,
        "starter_code": starter_code,
        "time_limit_sec": problem.time_limit_sec,
        "memory_limit_mb": problem.memory_limit_mb,
        # Sample tests are visible to the candidate
        "sample_tests": problem.sample_tests or []
    }


class CreateProblemRequest(BaseModel):
    title: str
    description: str
    difficulty: str = "easy"
    function_signature: str = ""
    language: str = "python"


@router.post("/problems/create")
def create_new_problem(request: CreateProblemRequest, db: Session = Depends(get_db)):
    """
    Create a new problem and store it in the database.
    """
    # Generate problem_id from title (slugify)
    problem_id = request.title.lower().replace(" ", "_")
    
    # Check if problem already exists
    existing = db.query(Problem).filter(Problem.problem_id == problem_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Problem already exists")
    
    # Create new problem
    new_problem = Problem(
        problem_id=problem_id,
        title=request.title,
        description=request.description,
        difficulty=request.difficulty,
        language=request.language,
        function_signature=request.function_signature or f"def solution():",
        sample_tests=json.dumps([]),  # Empty sample tests
        hidden_tests=json.dumps([]),  # Empty hidden tests
        time_limit_sec=5.0,
        memory_limit_mb=256
    )
    
    db.add(new_problem)
    db.commit()
    db.refresh(new_problem)
    
    return {
        "problem": {
            "problem_id": new_problem.problem_id,
            "title": new_problem.title,
            "description": new_problem.description,
            "difficulty": new_problem.difficulty,
            "language": new_problem.language
        }
    }


# ===== ANTI-CHEAT LOGGING =====
class ViolationLog(BaseModel):
    type: str
    reason: str = None
    duration: int = None
    context: str = None
    timestamp: int


class AntiCheatLogsRequest(BaseModel):
    session_id: str
    candidate_id: str = None
    job_id: int = None
    violations: List[ViolationLog]


@router.post("/anti-cheat/logs")
def log_anti_cheat_violations(request: AntiCheatLogsRequest, db: Session = Depends(get_db)):
    """
    Store anti-cheat violation logs from the client.
    These are used for analysis and potential penalties, NOT for blocking.
    """
    print(f"[📷 ANTI-CHEAT LOG] session={request.session_id}, candidate={request.candidate_id}, job={request.job_id}, violations={len(request.violations)}")
    
    for violation in request.violations:
        log = AntiCheatLog(
            session_id=request.session_id,
            candidate_id=request.candidate_id,
            job_id=request.job_id,
            violation_type=violation.type,
            reason=violation.reason,
            duration=violation.duration,
            context=violation.context,
            violation_timestamp=violation.timestamp
        )
        db.add(log)
    
    db.commit()
    
    return {
        "status": "logged",
        "count": len(request.violations)
    }


@router.get("/anti-cheat/violations/{session_id}")
def get_session_violations(session_id: str, db: Session = Depends(get_db)):
    """
    Retrieve all violation logs for a specific evaluation session.
    Used by recruiters to review suspicious activity.
    """
    violations = db.query(AntiCheatLog).filter(
        AntiCheatLog.session_id == session_id
    ).all()
    
    return {
        "session_id": session_id,
        "total_violations": len(violations),
        "violations": [
            {
                "type": v.violation_type,
                "reason": v.reason,
                "duration": v.duration,
                "context": v.context,
                "timestamp": v.violation_timestamp,
                "logged_at": v.logged_at.isoformat() if v.logged_at else None
            }
            for v in violations
        ]
    }

@router.get("/anti-cheat/all-violations")
def get_all_violations(limit: int = 50, db: Session = Depends(get_db)):
    """
    Retrieve latest violations across all sessions.
    Includes candidate details if linked directly or via evaluation.
    """
    violations = db.query(AntiCheatLog).order_by(
        AntiCheatLog.logged_at.desc()
    ).limit(limit).all()
    
    results = []
    for v in violations:
        candidate_name = "Unknown"
        job_title = "Unknown Job"
        candidate_id_display = v.candidate_id
        job_id_display = v.job_id
        
        # First, try to use direct candidate_id and job_id
        if v.candidate_id:
            candidate = db.query(Candidate).filter(Candidate.id == v.candidate_id).first()
            if candidate:
                candidate_name = candidate.name
        
        if v.job_id:
            job = db.query(Job).filter(Job.id == v.job_id).first()
            if job:
                job_title = job.title
        
        # Fallback: Try to fetch via EvaluationSession if no direct link
        if candidate_name == "Unknown" and v.evaluation_id:
            eval_sess = db.query(EvaluationSession).filter(
                EvaluationSession.evaluation_id == v.evaluation_id
            ).first()
            if eval_sess:
                candidate_id_display = eval_sess.candidate_id
                job_id_display = eval_sess.job_id
                
                candidate = db.query(Candidate).filter(Candidate.id == eval_sess.candidate_id).first()
                if candidate:
                    candidate_name = candidate.name
                
                if eval_sess.job_id:
                    job = db.query(Job).filter(Job.id == eval_sess.job_id).first()
                    if job:
                        job_title = job.title
                        
        results.append({
            "id": v.id,
            "type": v.violation_type,
            "reason": v.reason,
            "duration": v.duration,
            "context": v.context,
            "timestamp": v.violation_timestamp,
            "logged_at": v.logged_at.isoformat() if v.logged_at else None,
            "candidate_name": candidate_name,
            "candidate_id": candidate_id_display,
            "job_title": job_title,
            "job_id": job_id_display,
            "session_id": v.session_id
        })
        
    return {"violations": results}


# ============================================================
# PSYCHOMETRIC PROGRESS (Temporary Storage for Refresh Persistence)
# ============================================================

class PsychometricProgressCreate(BaseModel):
    job_id: int
    candidate_id: str
    answers: Dict[str, Any]


@router.put("/assessments/psychometric/progress")
def save_psychometric_progress(data: PsychometricProgressCreate, db: Session = Depends(get_db)):
    """
    Auto-save psychometric test progress.
    
    Called on each answer change to persist data in case of page refresh.
    Uses upsert pattern - creates new record or updates existing.
    
    This is a temporary table that gets cleaned up after final submission.
    """
    print(f"[📝 SAVE PROGRESS] job_id={data.job_id}, candidate_id={data.candidate_id}")
    
    # Check if progress record exists
    existing = db.query(PsychometricProgress).filter(
        PsychometricProgress.job_id == data.job_id,
        PsychometricProgress.candidate_id == data.candidate_id
    ).first()
    
    if existing:
        # Update existing record
        existing.answers = data.answers
        # SQLAlchemy should auto-update 'updated_at' due to onupdate trigger
        db.commit()
        db.refresh(existing)
        print(f"[✅ UPDATED] Progress updated for job_id={data.job_id}")
        return {
            "status": "updated",
            "message": "Progress saved successfully",
            "updated_at": existing.updated_at.isoformat() if existing.updated_at else None
        }
    else:
        # Create new progress record
        new_progress = PsychometricProgress(
            job_id=data.job_id,
            candidate_id=data.candidate_id,
            answers=data.answers
        )
        db.add(new_progress)
        db.commit()
        db.refresh(new_progress)
        print(f"[✅ CREATED] New progress record for job_id={data.job_id}")
        return {
            "status": "created",
            "message": "Progress saved successfully",
            "created_at": new_progress.created_at.isoformat() if new_progress.created_at else None
        }


@router.get("/assessments/psychometric/progress/{job_id}/{candidate_id}")
def get_psychometric_progress(job_id: int, candidate_id: str, db: Session = Depends(get_db)):
    """
    Load saved psychometric test progress.
    
    Called when the psychometric test page loads to restore any in-progress answers.
    Returns empty answers dict if no progress found.
    """
    print(f"[📖 LOAD PROGRESS] job_id={job_id}, candidate_id={candidate_id}")
    
    progress = db.query(PsychometricProgress).filter(
        PsychometricProgress.job_id == job_id,
        PsychometricProgress.candidate_id == candidate_id
    ).first()
    
    if progress:
        print(f"[✅ FOUND] Progress found with {len(progress.answers or {})} answers")
        return {
            "found": True,
            "answers": progress.answers or {},
            "created_at": progress.created_at.isoformat() if progress.created_at else None,
            "updated_at": progress.updated_at.isoformat() if progress.updated_at else None
        }
    else:
        print(f"[ℹ️ NOT FOUND] No progress found")
        return {
            "found": False,
            "answers": {},
            "message": "No saved progress found"
        }


@router.delete("/assessments/psychometric/progress/{job_id}/{candidate_id}")
def delete_psychometric_progress(job_id: int, candidate_id: str, db: Session = Depends(get_db)):
    """
    Delete psychometric test progress after final submission.
    
    Called after successful submission to clean up temporary data.
    This should be called from submit_psychometric after successful save.
    """
    print(f"[🗑️ DELETE PROGRESS] job_id={job_id}, candidate_id={candidate_id}")
    
    deleted = db.query(PsychometricProgress).filter(
        PsychometricProgress.job_id == job_id,
        PsychometricProgress.candidate_id == candidate_id
    ).delete()
    
    db.commit()
    
    if deleted > 0:
        print(f"[✅ DELETED] Removed {deleted} progress record(s)")
        return {"status": "deleted", "count": deleted}
    else:
        print(f"[ℹ️ NO-OP] No progress to delete")
        return {"status": "no_progress", "count": 0}


# ============================================================
# TECHNICAL TEXT QUESTIONS ENDPOINTS
# ============================================================

@router.get("/technical-questions")
def get_all_technical_questions(db: Session = Depends(get_db)):
    """
    List all technical text questions for recruiter to select from.
    Organized by section: Conceptual, Situational, Behavioral
    """
    questions = db.query(TechnicalQuestion).all()
    
    # Group by section
    grouped = {}
    for q in questions:
        section = q.section
        if section not in grouped:
            grouped[section] = []
        grouped[section].append({
            "id": q.id,
            "question": q.question,
            "keywords": q.keywords or [],
            "difficulty": q.difficulty,
            "question_type": q.question_type
        })
    
    return {
        "total": len(questions),
        "sections": grouped
    }


@router.post("/technical-questions/seed")
def seed_technical_questions(db: Session = Depends(get_db)):
    """
    Seed technical questions from JSON file into database.
    Idempotent - only adds questions that don't already exist.
    """
    import os
    
    # Check if questions already exist
    existing_count = db.query(TechnicalQuestion).count()
    if existing_count > 0:
        return {
            "status": "skipped",
            "message": f"Database already has {existing_count} technical questions",
            "added": 0
        }
    
    # Load from JSON file
    json_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "technical_text_questions.json")
    
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="technical_text_questions.json not found")
    
    added = 0
    for section_data in data.get("sections", []):
        section_name = section_data.get("section")
        question_type = section_data.get("type", "text")
        
        for q in section_data.get("questions", []):
            new_question = TechnicalQuestion(
                section=section_name,
                question_type=question_type,
                question=q.get("question"),
                keywords=q.get("keywords", []),
                difficulty="medium"  # Default, can be updated later
            )
            db.add(new_question)
            added += 1
    
    db.commit()
    
    print(f"[✅ SEEDED] Added {added} technical questions to database")
    return {
        "status": "success",
        "message": f"Seeded {added} technical questions",
        "added": added
    }


@router.get("/technical-questions/by-ids")
def get_technical_questions_by_ids(ids: str, db: Session = Depends(get_db)):
    """
    Get specific technical questions by IDs.
    
    Used by candidate UI to load the selected technical questions for an assessment.
    
    Query param: ids (comma-separated, e.g., "1,5,10,15")
    """
    if not ids:
        return {"questions": []}
    
    id_list = [int(i.strip()) for i in ids.split(",") if i.strip().isdigit()]
    
    questions = db.query(TechnicalQuestion).filter(TechnicalQuestion.id.in_(id_list)).all()
    
    return {
        "questions": [
            {
                "id": q.id,
                "section": q.section,
                "question": q.question,
                "question_type": q.question_type,
                # NOTE: Don't send keywords to candidate - used for grading only
            }
            for q in questions
        ]
    }


# --- TECHNICAL TEXT PROGRESS (for refresh persistence) ---

class TechnicalProgressRequest(BaseModel):
    job_id: int
    candidate_id: str
    answers: Dict[str, str]  # {question_id: answer_text}


@router.post("/assessments/technical/progress")
def save_technical_progress(request: TechnicalProgressRequest, db: Session = Depends(get_db)):
    """
    Save in-progress technical text answers.
    Called periodically or on blur to prevent data loss.
    """
    print(f"[💾 SAVE TECHNICAL PROGRESS] job_id={request.job_id}, candidate_id={request.candidate_id}")
    print(f"  Answers: {len(request.answers)} questions answered")
    
    existing = db.query(TechnicalTextProgress).filter(
        TechnicalTextProgress.job_id == request.job_id,
        TechnicalTextProgress.candidate_id == request.candidate_id
    ).first()
    
    if existing:
        existing.answers = request.answers
        db.commit()
        db.refresh(existing)
        print(f"[✅ UPDATED] Progress updated")
        return {"status": "updated", "id": existing.id}
    else:
        new_progress = TechnicalTextProgress(
            job_id=request.job_id,
            candidate_id=request.candidate_id,
            answers=request.answers
        )
        db.add(new_progress)
        db.commit()
        db.refresh(new_progress)
        print(f"[✅ CREATED] Progress saved with ID: {new_progress.id}")
        return {"status": "created", "id": new_progress.id}


@router.get("/assessments/technical/progress/{job_id}/{candidate_id}")
def get_technical_progress(job_id: int, candidate_id: str, db: Session = Depends(get_db)):
    """
    Load saved technical text progress to restore answers after refresh.
    """
    print(f"[📂 LOAD TECHNICAL PROGRESS] job_id={job_id}, candidate_id={candidate_id}")
    
    progress = db.query(TechnicalTextProgress).filter(
        TechnicalTextProgress.job_id == job_id,
        TechnicalTextProgress.candidate_id == candidate_id
    ).first()
    
    if progress:
        print(f"[✅ FOUND] Progress found with {len(progress.answers or {})} answers")
        return {
            "found": True,
            "answers": progress.answers or {},
            "updated_at": progress.updated_at.isoformat() if progress.updated_at else None
        }
    else:
        print(f"[ℹ️ NOT FOUND] No progress found")
        return {"found": False, "answers": {}}


@router.delete("/assessments/technical/progress/{job_id}/{candidate_id}")
def delete_technical_progress(job_id: int, candidate_id: str, db: Session = Depends(get_db)):
    """
    Delete technical progress after final submission.
    """
    print(f"[🗑️ DELETE TECHNICAL PROGRESS] job_id={job_id}, candidate_id={candidate_id}")
    
    deleted = db.query(TechnicalTextProgress).filter(
        TechnicalTextProgress.job_id == job_id,
        TechnicalTextProgress.candidate_id == candidate_id
    ).delete()
    
    db.commit()
    
    return {"status": "deleted" if deleted > 0 else "no_progress", "count": deleted}


# ============================================================
# SCORING ENGINE ENDPOINTS
# ============================================================

class RecruiterWeightsUpdate(BaseModel):
    """Schema for updating recruiter weight preferences"""
    coding_weight: float = 0.40
    technical_weight: float = 0.25
    psychometric_weight: float = 0.25
    behavioral_weight: float = 0.10


class TechnicalTextSubmitRequest(BaseModel):
    """Schema for submitting technical text answers"""
    job_id: int
    candidate_id: str
    answers: Dict[str, str]  # {question_id: answer_text}


@router.post("/scoring/calculate/{job_id}/{candidate_id}")
def calculate_candidate_score(job_id: int, candidate_id: str, db: Session = Depends(get_db)):
    """
    Calculate and store the final score for a candidate.
    
    Triggers the full scoring engine which:
    1. Applies hard gates (fail fast)
    2. Calculates each component score
    3. Normalizes weights
    4. Calculates final score and decision
    5. Stores result in candidate_final_scores
    
    Returns the complete scoring breakdown.
    """
    print(f"\n[🎯 CALCULATE SCORE]")
    print(f"  job_id={job_id}")
    print(f"  candidate_id={candidate_id}")
    
    # Verify candidate exists and applied
    app = db.query(Application).filter(
        Application.job_id == job_id,
        Application.candidate_id == candidate_id
    ).first()
    
    if not app:
        print(f"[❌ ERROR] Candidate {candidate_id} not found for job {job_id}")
        raise HTTPException(status_code=404, detail="Candidate application not found")
    
    try:
        # Calculate score
        result = ScoringEngine.calculate_candidate_score(job_id, candidate_id, db)
        
        # Store result
        stored = ScoringEngine.store_result(result, job_id, candidate_id, db)
        
        print(f"[✅ SCORE CALCULATED]")
        print(f"  final_score={result.final_score}")
        print(f"  decision={result.decision}")
        print(f"  hard_gate_passed={result.hard_gate_result.passed}")
        
        # Also update application record with summary
        app.final_grade = result.final_score
        app.verdict = result.decision
        db.commit()
        
        return {
            "success": True,
            "job_id": job_id,
            "candidate_id": candidate_id,
            "result": result.to_dict(),
            "stored_id": stored.id
        }
    except Exception as e:
        print(f"[❌ ERROR] Scoring failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Scoring calculation failed: {str(e)}")


@router.get("/scoring/result/{job_id}/{candidate_id}")
def get_candidate_score(job_id: int, candidate_id: str, db: Session = Depends(get_db)):
    """
    Retrieve the stored scoring result for a candidate.
    
    Returns the full breakdown stored in candidate_final_scores.
    """
    print(f"\n[📋 GET SCORE RESULT]")
    print(f"  job_id={job_id}")
    print(f"  candidate_id={candidate_id}")
    
    score_record = db.query(CandidateFinalScore).filter(
        CandidateFinalScore.job_id == job_id,
        CandidateFinalScore.candidate_id == candidate_id
    ).order_by(CandidateFinalScore.calculated_at.desc()).first()
    
    if not score_record:
        print(f"[❌ NOT FOUND] No score record found")
        raise HTTPException(status_code=404, detail="Score not calculated yet. Call /scoring/calculate first.")
    
    print(f"[✅ FOUND]")
    print(f"  final_score={score_record.final_score}")
    print(f"  decision={score_record.decision}")
    
    return {
        "job_id": job_id,
        "candidate_id": candidate_id,
        "final_score": score_record.final_score,
        "decision": score_record.decision,
        "component_breakdown": {
            "coding": score_record.coding_score,
            "technical": score_record.technical_score,
            "psychometric": score_record.psychometric_score,
            "behavioral": score_record.behavioral_score
        },
        "weights_used": {
            "coding": score_record.coding_weight_used,
            "technical": score_record.technical_weight_used,
            "psychometric": score_record.psychometric_weight_used,
            "behavioral": score_record.behavioral_weight_used
        },
        "flags": score_record.flags,
        "hard_gate_result": score_record.hard_gate_result,
        "full_breakdown": score_record.component_breakdown,
        "calculated_at": score_record.calculated_at.isoformat() if score_record.calculated_at else None
    }


@router.put("/assessments/{job_id}/weights")
def update_assessment_weights(job_id: int, weights: RecruiterWeightsUpdate, db: Session = Depends(get_db)):
    """
    Update recruiter weight preferences for a job assessment.
    
    Weights must respect constraints:
    - Coding ≥ 30%
    - Psychometric ≥ 15%
    - Behavioral ≤ 15%
    - All weights must sum to 100% (normalized automatically)
    """
    print(f"\n[⚖️ UPDATE WEIGHTS]")
    print(f"  job_id={job_id}")
    print(f"  weights={weights}")
    
    assessment = db.query(JobAssessment).filter(JobAssessment.job_id == job_id).first()
    
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # Validate constraints
    errors = []
    if weights.coding_weight < 0.30:
        errors.append("Coding weight must be at least 30%")
    if weights.psychometric_weight < 0.15:
        errors.append("Psychometric weight must be at least 15%")
    if weights.behavioral_weight > 0.15:
        errors.append("Behavioral weight cannot exceed 15%")
    
    total = weights.coding_weight + weights.technical_weight + weights.psychometric_weight + weights.behavioral_weight
    if abs(total - 1.0) > 0.01:
        errors.append(f"Weights must sum to 100% (got {total*100:.1f}%)")
    
    if errors:
        raise HTTPException(status_code=400, detail={"errors": errors})
    
    # Update weights
    assessment.coding_weight = weights.coding_weight
    assessment.technical_weight = weights.technical_weight
    assessment.psychometric_weight = weights.psychometric_weight
    assessment.behavioral_weight = weights.behavioral_weight
    
    db.commit()
    db.refresh(assessment)
    
    print(f"[✅ WEIGHTS UPDATED]")
    
    return {
        "message": "Weights updated successfully",
        "job_id": job_id,
        "weights": {
            "coding": assessment.coding_weight,
            "technical": assessment.technical_weight,
            "psychometric": assessment.psychometric_weight,
            "behavioral": assessment.behavioral_weight
        }
    }


@router.post("/technical-text/submit")
def submit_technical_text(data: TechnicalTextSubmitRequest, db: Session = Depends(get_db)):
    """
    Submit and grade technical text answers.
    
    Uses deterministic keyword-based grading:
    - score = (matched_keywords / total_keywords) * 10
    - Each question scored 0-10
    
    After grading, triggers score recalculation.
    """
    print(f"\n[📝 SUBMIT TECHNICAL TEXT]")
    print(f"  job_id={data.job_id}")
    print(f"  candidate_id={data.candidate_id}")
    print(f"  answers_count={len(data.answers)}")
    
    # Verify candidate applied
    app = db.query(Application).filter(
        Application.job_id == data.job_id,
        Application.candidate_id == data.candidate_id
    ).first()
    
    if not app:
        raise HTTPException(status_code=403, detail="Candidate has not applied to this job")
    
    try:
        # Grade submission
        submission = TechnicalTextGrader.grade_submission(
            data.job_id,
            data.candidate_id,
            data.answers,
            db
        )
        
        if not submission:
            return {"message": "No answers to grade", "score": 0}
        
        print(f"[✅ GRADED]")
        print(f"  total_score={submission.total_score}")
        print(f"  question_count={submission.question_count}")
        
        # Trigger score recalculation
        result = ScoringEngine.calculate_candidate_score(data.job_id, data.candidate_id, db)
        ScoringEngine.store_result(result, data.job_id, data.candidate_id, db)
        
        return {
            "message": "Technical text submitted and graded successfully",
            "submission_id": submission.id,
            "total_score": submission.total_score,
            "question_count": submission.question_count,
            "graded_answers": submission.answers,
            "final_score_updated": True,
            "new_final_score": result.final_score,
            "new_decision": result.decision
        }
    except Exception as e:
        print(f"[❌ ERROR] Technical text submission failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Technical text submission failed: {str(e)}")


@router.get("/scoring/recalculate/{job_id}")
def recalculate_all_candidates(job_id: int, db: Session = Depends(get_db)):
    """
    Recalculate scores for all candidates who applied to a job.
    
    Useful after changing weights or when needing to refresh all scores.
    """
    print(f"\n[🔄 RECALCULATE ALL]")
    print(f"  job_id={job_id}")
    
    # Verify job exists
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get all candidates who applied
    applications = db.query(Application).filter(Application.job_id == job_id).all()
    
    results = []
    errors = []
    
    for app in applications:
        try:
            result = ScoringEngine.calculate_candidate_score(job_id, app.candidate_id, db)
            ScoringEngine.store_result(result, job_id, app.candidate_id, db)
            
            # Update application
            app.final_grade = result.final_score
            app.verdict = result.decision
            
            results.append({
                "candidate_id": app.candidate_id,
                "final_score": result.final_score,
                "decision": result.decision
            })
        except Exception as e:
            errors.append({
                "candidate_id": app.candidate_id,
                "error": str(e)
            })
    
    db.commit()
    
    print(f"[✅ RECALCULATED]")
    print(f"  success={len(results)}")
    print(f"  errors={len(errors)}")
    
    return {
        "job_id": job_id,
        "total_candidates": len(applications),
        "successful": len(results),
        "failed": len(errors),
        "results": results,
        "errors": errors if errors else None
    }
