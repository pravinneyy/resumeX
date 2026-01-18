from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from rules import make_decision
from proctoring import calculate_integrity_risk
from db import get_db
from models import Candidate, AssessmentRound
from state_machine import CandidateStateMachine, CandidateState

router = APIRouter()

@router.post("/submit/{candidate_id}/{round_index}")
def submit_round(candidate_id: str, round_index: int, payload: dict, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    # Global terminal guard
    CandidateStateMachine.enforce_not_terminal(candidate)

    # Enforce round order
    CandidateStateMachine.enforce_round(candidate, round_index)

    # Load blueprint and round config
    from models import AssessmentBlueprint, AssessmentRound  # or however you store blueprint
    blueprint = db.query(AssessmentBlueprint).filter(AssessmentBlueprint.id == candidate.blueprint_id).first()
    if not blueprint:
        raise HTTPException(500, "Blueprint not configured")

    if round_index >= len(blueprint.rounds):
        raise HTTPException(400, "Invalid round index")

    round_cfg = blueprint.rounds[round_index]

    # Evaluate modules in this round (mcq, coding, text etc.) - do per module
    # Example: if CODING module - call services/code_executor.execute_code(...)
    # Placeholder scoring here:
    score = evaluate_round(round_cfg, payload, candidate, db)  # implement this

    # Decide pass/fail for round based on round_cfg threshold
    passed = score >= (round_cfg.get("passing_score", 50))

    if passed:
        # Advance round index or complete
        total_rounds = len(blueprint.rounds)
        CandidateStateMachine.advance_round(candidate, total_rounds, db)
        if candidate.state == CandidateState.ASSESSMENT_COMPLETED:
            return {"message": "Assessment completed", "score": score}
        else:
            return {"message": "Round passed. Proceed to next round", "next_round_index": candidate.current_round_index}
    else:
        # Mark round failed
        CandidateStateMachine.transition_candidate_state(candidate, CandidateState.ROUND_FAILED, db, "system", f"Round {round_index} failed with score {score}")
        db.add(candidate)
        db.commit()
        return {"message": "Round failed", "score": score}

from services.code_executor import execute_code

def evaluate_round(round_cfg, payload, candidate, db):
    """
    Evaluates a single assessment round and returns score + details.
    Does NOT mutate candidate state.
    """

    # -------------------------------
    # CODING ROUND
    # -------------------------------
    if round_cfg.type == "coding":
        result = execute_code(
            source_code=payload.code,
            language=payload.language,
            test_cases=round_cfg.hidden_test_cases
        )

        return {
            "score": result["score"],
            "details": result
        }

    # -------------------------------
    # MCQ ROUND (example)
    # -------------------------------
    if round_cfg.type == "mcq":
        correct = 0
        for q in round_cfg.questions:
            if payload.answers.get(q.id) == q.correct_option:
                correct += 1

        score = (correct / len(round_cfg.questions)) * 100

        return {
            "score": score,
            "details": {
                "correct": correct,
                "total": len(round_cfg.questions)
            }
        }

    # -------------------------------
    # UNKNOWN ROUND TYPE
    # -------------------------------
    raise ValueError(f"Unsupported round type: {round_cfg.type}")

