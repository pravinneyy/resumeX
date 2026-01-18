# backend/state_machine.py
from typing import List
from fastapi import HTTPException
from enums import CandidateState

TERMINAL_STATES = {
    CandidateState.REJECTED_PRE_ASSESSMENT,
    CandidateState.ROUND_FAILED,
    CandidateState.REVIEWED_BY_HR
}

class CandidateStateMachine:
    # Allowed transitions (generic)
    TRANSITIONS = {
        CandidateState.REGISTERED: [CandidateState.IN_ROUND, CandidateState.REJECTED_PRE_ASSESSMENT],
        CandidateState.IN_ROUND: [CandidateState.IN_ROUND, CandidateState.ROUND_FAILED, CandidateState.ASSESSMENT_COMPLETED, CandidateState.REJECTED_PRE_ASSESSMENT],
        CandidateState.ROUND_FAILED: [CandidateState.REJECTED_PRE_ASSESSMENT],  # Typically terminal unless HR allows retry
        CandidateState.ASSESSMENT_COMPLETED: [CandidateState.DECISION_GENERATED],
        CandidateState.DECISION_GENERATED: [CandidateState.REVIEWED_BY_HR],
        CandidateState.REVIEWED_BY_HR: [],  # Terminal
        CandidateState.REJECTED_PRE_ASSESSMENT: [],  # Terminal
    }

    @staticmethod
    def can_transition(current: CandidateState, new: CandidateState) -> bool:
        allowed = CandidateStateMachine.TRANSITIONS.get(current, [])
        return new in allowed

    @staticmethod
    def ensure_candidate_state(candidate, allowed_states: List[CandidateState]):
        if candidate.state not in allowed_states:
            raise HTTPException(status_code=400, detail=f"Action not allowed in state {candidate.state}")

    @staticmethod
    def transition_candidate_state(candidate, new_state: CandidateState, db_session, changed_by: str = "system", reason: str = None):
        """
        Authoritative state transition. Always use this to change candidate.state.
        - candidate: SQLAlchemy object
        - new_state: CandidateState
        - db_session: SQLAlchemy session (so transition is persisted)
        - changed_by: username/id performing change
        - reason: optional reason string
        """
        # Validation
        if not CandidateStateMachine.can_transition(candidate.state, new_state):
            raise HTTPException(status_code=400, detail=f"Invalid transition {candidate.state} -> {new_state}")

        old_state = candidate.state
        candidate.state = new_state

        # Persist CandidateStateHistory if model exists
        try:
            from models import CandidateStateHistory
            history = CandidateStateHistory(
                candidate_id=candidate.id,
                old_state=old_state,
                new_state=new_state,
                changed_by=changed_by,
                reason=reason
            )
            db_session.add(history)
            db_session.commit()
        except Exception:
            # If CandidateStateHistory isn't ready or DB commit fails, still keep the authoritative state change,
            # but raise a helpful error for debugging in dev environment.
            db_session.rollback()
            # Re-raise to make sure developer notices; in production you may want to handle differently.
            raise

    @staticmethod
    def ensure_candidate_in_correct_round(candidate, round_index: int):
        """
        Returns True if candidate is IN_ROUND and at the exact round_index.
        Use this in every round-based endpoint.
        """
        return candidate.state == CandidateState.IN_ROUND and candidate.current_round_index == round_index

    @staticmethod
    def enforce_round(candidate, requested_round_index: int):
        if candidate.state != CandidateState.IN_ROUND:
            raise HTTPException(status_code=400, detail="Candidate not in active assessment")
        if candidate.current_round_index != requested_round_index:
            raise HTTPException(status_code=400, detail="Invalid round order")

    @staticmethod
    def enforce_not_terminal(candidate):
        if candidate.state in TERMINAL_STATES:
            raise HTTPException(status_code=403, detail="Candidate flow terminated")

    @staticmethod
    def advance_round(candidate, total_rounds: int, db_session):
        candidate.current_round_index += 1
        if candidate.current_round_index >= total_rounds:
            CandidateStateMachine.transition_candidate_state(candidate, CandidateState.ASSESSMENT_COMPLETED, db_session, "system", "All rounds completed")