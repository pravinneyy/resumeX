"""
Deterministic Scoring Engine

A fair, explainable scoring system for evaluating candidates across four components:
1. Coding Assessment (0-100 points)
2. Technical Text Questions (0-100 points)
3. Psychometric Test (0-100 points)
4. Behavioral Slider Assessment (0-100 points)

Core Principles:
- Supabase is the only persistence layer
- Scoring logic runs server-side ONLY
- Components are independently scored
- Missing components are excluded, NOT penalized
- Hard gates always override weights (fail fast)
- Output is auditable and explainable

Author: Scoring Engine v1.0
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from services.ai_scorer import AIScorer
from sqlalchemy.orm import Session
import re


# ============================================================
# DATA CLASSES
# ============================================================

@dataclass
class HardGateResult:
    """Result of hard gate checks - fail fast if any gate fails"""
    passed: bool
    failed_gate: Optional[str] = None
    reason: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            "passed": self.passed,
            "failed_gate": self.failed_gate,
            "reason": self.reason
        }


@dataclass
class ComponentScore:
    """Individual component score with metadata"""
    score: float
    max_score: float
    status: str = "evaluated"  # evaluated, not_evaluated
    details: Dict[str, Any] = field(default_factory=dict)
    
    @property
    def normalized(self) -> float:
        """Normalize to 0-1 scale"""
        if self.max_score == 0:
            return 0.0
        return min(1.0, max(0.0, self.score / self.max_score))
    
    def to_dict(self) -> dict:
        return {
            "score": round(self.score, 2),
            "max_score": self.max_score,
            "normalized": round(self.normalized, 4),
            "status": self.status,
            "details": self.details
        }


@dataclass
class ScoringResult:
    """Complete scoring result for a candidate"""
    final_score: float
    decision: str
    component_breakdown: Dict[str, ComponentScore]
    weights_used: Dict[str, float]
    flags: Dict[str, Any]
    hard_gate_result: HardGateResult
    calculated_at: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> dict:
        return {
            "final_score": round(self.final_score, 2),
            "decision": self.decision,
            "component_breakdown": {
                k: v.to_dict() for k, v in self.component_breakdown.items()
            },
            "weights_used": {k: round(v, 4) for k, v in self.weights_used.items()},
            "flags": self.flags,
            "hard_gate_result": self.hard_gate_result.to_dict(),
            "calculated_at": self.calculated_at.isoformat()
        }


# ============================================================
# HARD GATES (FAIL FAST)
# ============================================================

class HardGates:
    """
    Apply BEFORE any aggregation.
    If any gate fails, return AUTO NO_HIRE immediately.
    """
    
    # Thresholds
    CODING_CORRECTNESS_MIN = 0.40  # 40%
    PSYCHOMETRIC_SECTION_MIN = 0.30  # 30%
    
    @staticmethod
    def check_coding_correctness(passed_tests: int, total_tests: int) -> HardGateResult:
        """Coding correctness < 40% → AUTO NO_HIRE"""
        if total_tests == 0:
            return HardGateResult(passed=True)  # No tests = skip gate
        
        correctness = passed_tests / total_tests
        if correctness < HardGates.CODING_CORRECTNESS_MIN:
            return HardGateResult(
                passed=False,
                failed_gate="coding_correctness",
                reason=f"Coding correctness {correctness:.1%} below minimum threshold {HardGates.CODING_CORRECTNESS_MIN:.0%}"
            )
        return HardGateResult(passed=True)
    
    @staticmethod
    def check_psychometric_sections(sections: Dict[str, Dict[str, int]]) -> HardGateResult:
        """Any psychometric section < 30% → AUTO NO_HIRE"""
        for section_name, section_data in sections.items():
            correct = section_data.get("correct", 0)
            total = section_data.get("total", 0)
            
            if total == 0:
                continue  # Skip empty sections
            
            accuracy = correct / total
            if accuracy < HardGates.PSYCHOMETRIC_SECTION_MIN:
                return HardGateResult(
                    passed=False,
                    failed_gate="psychometric_section",
                    reason=f"Section '{section_name}' accuracy {accuracy:.1%} below minimum {HardGates.PSYCHOMETRIC_SECTION_MIN:.0%}"
                )
        return HardGateResult(passed=True)
    
    @staticmethod
    def check_integrity_flags(flags: Dict[str, Any]) -> HardGateResult:
        """Severe integrity/cheating flags → AUTO NO_HIRE"""
        severe_violations = flags.get("severe_violations", [])
        cheating_detected = flags.get("cheating_detected", False)
        
        if cheating_detected or len(severe_violations) > 0:
            return HardGateResult(
                passed=False,
                failed_gate="integrity",
                reason=f"Integrity violation detected: {severe_violations if severe_violations else 'cheating flag'}"
            )
        return HardGateResult(passed=True)
    
    @classmethod
    def check_all(
        cls,
        coding_data: Optional[Dict[str, Any]],
        psychometric_sections: Optional[Dict[str, Dict[str, int]]],
        integrity_flags: Optional[Dict[str, Any]]
    ) -> HardGateResult:
        """Run all hard gate checks. Return on first failure."""
        
        # Check coding correctness
        if coding_data:
            result = cls.check_coding_correctness(
                coding_data.get("passed_tests", 0),
                coding_data.get("total_tests", 0)
            )
            if not result.passed:
                return result
        
        # Check psychometric sections
        if psychometric_sections:
            result = cls.check_psychometric_sections(psychometric_sections)
            if not result.passed:
                return result
        
        # Check integrity
        if integrity_flags:
            result = cls.check_integrity_flags(integrity_flags)
            if not result.passed:
                return result
        
        return HardGateResult(passed=True)


# ============================================================
# COMPONENT SCORERS
# ============================================================

class CodingScorer:
    """
    Coding Assessment Scorer
    Score: 0-100 points
    
    Formula:
    - correctness = passed_tests / total_tests
    - coding_normalized = 0.7 * correctness + 0.2 * performance_score + 0.1 * (1 - quality_penalty)
    - coding_score = coding_normalized * 100
    """
    MAX_SCORE = 100.0
    
    # Weight distribution
    CORRECTNESS_WEIGHT = 0.70
    PERFORMANCE_WEIGHT = 0.20
    QUALITY_WEIGHT = 0.10
    
    @classmethod
    def calculate(
        cls,
        final_score: float = None,  # Judge's final score (0-100)
        passed_tests: int = 0,
        total_tests: int = 0,
        performance_score: float = 1.0,  # 0-1 scale
        quality_penalty: float = 0.0     # 0-1 scale (0 = no penalty)
    ) -> ComponentScore:
        """Calculate coding score (0-100), using judge's final_score if available"""
        
        # If judge provided a final_score, use it directly
        if final_score is not None:
            return ComponentScore(
                score=round(final_score, 2),
                max_score=cls.MAX_SCORE,
                status="evaluated",
                details={
                    "judge_score": final_score,
                    "passed_tests": passed_tests,
                    "total_tests": total_tests,
                    "source": "judge"
                }
            )
        
        # Fallback: calculate from components if no judge score
        if total_tests == 0:
            return ComponentScore(
                score=0.0,
                max_score=cls.MAX_SCORE,
                status="not_evaluated",
                details={"reason": "No tests available"}
            )
        
        # Calculate correctness ratio
        correctness = passed_tests / total_tests
        
        # Clamp inputs
        performance_score = max(0.0, min(1.0, performance_score))
        quality_penalty = max(0.0, min(1.0, quality_penalty))
        
        # Apply formula
        coding_normalized = (
            cls.CORRECTNESS_WEIGHT * correctness +
            cls.PERFORMANCE_WEIGHT * performance_score +
            cls.QUALITY_WEIGHT * (1 - quality_penalty)
        )
        
        coding_score = coding_normalized * cls.MAX_SCORE
        
        return ComponentScore(
            score=round(coding_score, 2),
            max_score=cls.MAX_SCORE,
            status="evaluated",
            details={
                "passed_tests": passed_tests,
                "total_tests": total_tests,
                "correctness": round(correctness, 4),
                "performance_score": round(performance_score, 4),
                "quality_penalty": round(quality_penalty, 4),
                "source": "calculated",
                "breakdown": {
                    "correctness_contribution": round(cls.CORRECTNESS_WEIGHT * correctness * cls.MAX_SCORE, 2),
                    "performance_contribution": round(cls.PERFORMANCE_WEIGHT * performance_score * cls.MAX_SCORE, 2),
                    "quality_contribution": round(cls.QUALITY_WEIGHT * (1 - quality_penalty) * cls.MAX_SCORE, 2)
                }
            }
        )


class TechnicalTextScorer:
    """
    Technical Text Questions Scorer
    Score: 0-100 points (variable questions)
    
    Handles 0-4 questions with confidence factor.
    Uses AI + Keyword Bonus for scoring.
    """
    MAX_SCORE = 100.0
    EXPECTED_QUESTIONS = 4
    WEAK_FUNDAMENTALS_THRESHOLD = 4.0  # Average score below 4 = weak
    MIN_QUESTIONS_FOR_WEAK_FLAG = 2
    
    @classmethod
    def score_single_question(
        cls,
        question_text: str,
        answer_text: str,
        keywords: List[str]
    ) -> Tuple[float, List[str]]:
        """
        Score a single question using AI + Keyword Bonus.
        
        Returns: (score 0-10, list of matched keywords)
        """
        if not answer_text or not answer_text.strip():
            return 0.0, []
            
        # 1. Calculate Keyword Bonus (Synchronous)
        keywords = keywords or []
        answer_lower = answer_text.lower()
        matched = []
        
        for keyword in keywords:
            pattern = r'\b' + re.escape(keyword.lower()) + r'\b'
            if re.search(pattern, answer_lower):
                matched.append(keyword)
                
        keyword_ratio = len(matched) / max(1, len(keywords)) if keywords else 0
        keyword_bonus = keyword_ratio * 3.0
        
        # 2. AI Evaluation (Synchronous call - AI service handles it)
        try:
            ai_result = AIScorer.evaluate_answer(question_text, answer_text, keywords)
            
            base_score = ai_result["quality_score"]  # 0-7
            
            # Combine
            total_score = base_score + keyword_bonus
            
            # Penalize stuffing
            if ai_result["stuffing_flag"]:
                total_score = min(total_score, 3.0)
                
            final_score = min(10.0, total_score)
            
            return round(final_score, 2), matched
            
        except Exception as e:
            print(f"AI Scoring Error: {e}, falling back to keywords")
            # Fallback to strict keyword matching * 10 if AI fails
            fallback_score = keyword_ratio * 10
            return round(fallback_score, 2), matched
    
    @classmethod
    def calculate(
        cls,
        question_scores: List[float]  # Each score is 0-10
    ) -> ComponentScore:
        """
        Calculate technical text score (0-100).
        
        Case A - N = 0: Mark as NOT_EVALUATED
        Case B - N ≥ 1: Apply confidence factor
        """
        n = len(question_scores)
        
        # Case A: No questions answered
        if n == 0:
            return ComponentScore(
                score=0.0,
                max_score=cls.MAX_SCORE,
                status="not_evaluated",
                details={"reason": "No technical text questions in assessment"}
            )
        
        # Case B: 1+ questions
        raw_avg = sum(question_scores) / n
        
        # Normalize to component (raw_avg is 0-10, base_score is 0-25)
        base_score = (raw_avg / 10.0) * cls.MAX_SCORE
        
        # Confidence factor: grows linearly with question count
        confidence_factor = min(1.0, n / cls.EXPECTED_QUESTIONS)
        
        # Final technical score
        technical_score = base_score * confidence_factor
        
        # Check for weak fundamentals flag
        weak_fundamentals = False
        if n >= cls.MIN_QUESTIONS_FOR_WEAK_FLAG and raw_avg < cls.WEAK_FUNDAMENTALS_THRESHOLD:
            weak_fundamentals = True
        
        return ComponentScore(
            score=round(technical_score, 2),
            max_score=cls.MAX_SCORE,
            status="evaluated",
            details={
                "question_count": n,
                "expected_questions": cls.EXPECTED_QUESTIONS,
                "raw_average": round(raw_avg, 2),
                "confidence_factor": round(confidence_factor, 4),
                "base_score": round(base_score, 2),
                "weak_fundamentals": weak_fundamentals,
                "individual_scores": question_scores
            }
        )


class PsychometricScorer:
    """
    Psychometric Test Scorer
    Score: 0-100 points
    
    Sections: numerical, verbal, abstract
    Balance penalty: -20 if any section < 40%
    """
    MAX_SCORE = 100.0
    BALANCE_THRESHOLD = 0.40  # 40%
    BALANCE_PENALTY = 20.0
    
    @classmethod
    def calculate(
        cls,
        sections: Dict[str, Dict[str, int]]  # {section_name: {correct: x, total: y}}
    ) -> ComponentScore:
        """Calculate psychometric score (0-100)"""
        
        if not sections:
            return ComponentScore(
                score=0.0,
                max_score=cls.MAX_SCORE,
                status="not_evaluated",
                details={"reason": "No psychometric data available"}
            )
        
        total_correct = 0
        total_questions = 0
        section_accuracies = {}
        imbalanced_sections = []
        
        for section_name, section_data in sections.items():
            correct = section_data.get("correct", 0)
            total = section_data.get("total", 0)
            
            total_correct += correct
            total_questions += total
            
            if total > 0:
                accuracy = correct / total
                section_accuracies[section_name] = round(accuracy, 4)
                
                if accuracy < cls.BALANCE_THRESHOLD:
                    imbalanced_sections.append(section_name)
        
        if total_questions == 0:
            return ComponentScore(
                score=0.0,
                max_score=cls.MAX_SCORE,
                status="not_evaluated",
                details={"reason": "No psychometric questions answered"}
            )
        
        # Calculate raw accuracy
        raw_accuracy = total_correct / total_questions
        
        # Base score
        psychometric_score = raw_accuracy * cls.MAX_SCORE
        
        # Apply balance penalty if any section < 40%
        applied_penalty = 0.0
        if imbalanced_sections:
            psychometric_score -= cls.BALANCE_PENALTY
            applied_penalty = cls.BALANCE_PENALTY
        
        # Clamp between 0-100
        psychometric_score = max(0.0, min(cls.MAX_SCORE, psychometric_score))
        
        return ComponentScore(
            score=round(psychometric_score, 2),
            max_score=cls.MAX_SCORE,
            status="evaluated",
            details={
                "total_correct": total_correct,
                "total_questions": total_questions,
                "raw_accuracy": round(raw_accuracy, 4),
                "section_accuracies": section_accuracies,
                "imbalanced_sections": imbalanced_sections,
                "balance_penalty_applied": applied_penalty
            }
        )


class BehavioralScorer:
    """
    Behavioral Slider Assessment Scorer
    Score: 0-100 points
    
    Sliders are 1-5 scale, normalized to 0-1.
    Category weights: Teamwork 30%, Ownership 30%, Communication 25%, Risk 15%
    Anti-gaming: all sliders ≥4.8 or ≤1.2 triggers penalty
    """
    MAX_SCORE = 100.0
    
    # Category weights
    CATEGORY_WEIGHTS = {
        "teamwork": 0.30,
        "ownership": 0.30,
        "communication": 0.25,
        "risk": 0.15
    }
    
    # Anti-gaming thresholds
    GAMING_HIGH_THRESHOLD = 4.8
    GAMING_LOW_THRESHOLD = 1.2
    GAMING_PENALTY = 20.0
    
    @classmethod
    def normalize_slider(cls, value: float) -> float:
        """Normalize slider value from 1-5 to 0-1"""
        # Clamp to valid range first
        value = max(1.0, min(5.0, value))
        return (value - 1.0) / 4.0
    
    @classmethod
    def detect_gaming(cls, slider_values: List[float]) -> Tuple[bool, str]:
        """
        Detect anti-gaming patterns.
        
        Returns: (is_gaming, reliability status)
        """
        if not slider_values:
            return False, "normal"
        
        # Check if all values are suspiciously high
        all_high = all(v >= cls.GAMING_HIGH_THRESHOLD for v in slider_values)
        
        # Check if all values are suspiciously low
        all_low = all(v <= cls.GAMING_LOW_THRESHOLD for v in slider_values)
        
        if all_high or all_low:
            return True, "low"
        
        return False, "normal"
    
    @classmethod
    def calculate(
        cls,
        slider_values: Dict[str, float],  # {category: value (1-5)}
        category_mapping: Optional[Dict[int, str]] = None  # Map question IDs to categories
    ) -> ComponentScore:
        """Calculate behavioral score (0-10)"""
        
        if not slider_values:
            return ComponentScore(
                score=0.0,
                max_score=cls.MAX_SCORE,
                status="not_evaluated",
                details={"reason": "No behavioral slider data available"}
            )
        
        # Group slider values by category if mapping provided
        category_scores = {cat: [] for cat in cls.CATEGORY_WEIGHTS.keys()}
        unmapped_values = []
        
        for key, value in slider_values.items():
            # Try to get category from mapping or key
            category = None
            if category_mapping and key in category_mapping:
                category = category_mapping[key].lower()
            elif isinstance(key, str):
                # Try to extract category from key
                key_lower = key.lower()
                for cat in cls.CATEGORY_WEIGHTS.keys():
                    if cat in key_lower:
                        category = cat
                        break
            
            if category and category in category_scores:
                category_scores[category].append(value)
            else:
                unmapped_values.append(value)
        
        # If no category mapping, use average of all values
        all_values = list(slider_values.values())
        
        # Detect gaming
        is_gaming, reliability = cls.detect_gaming(all_values)
        
        # Calculate weighted average
        if any(category_scores.values()):
            # Use category weights
            weighted_sum = 0.0
            total_weight = 0.0
            
            for category, values in category_scores.items():
                if values:
                    category_avg = sum(values) / len(values)
                    normalized = cls.normalize_slider(category_avg)
                    weighted_sum += normalized * cls.CATEGORY_WEIGHTS[category]
                    total_weight += cls.CATEGORY_WEIGHTS[category]
            
            # Include unmapped values with equal distribution of remaining weight
            if unmapped_values and total_weight < 1.0:
                remaining_weight = 1.0 - total_weight
                unmapped_avg = sum(unmapped_values) / len(unmapped_values)
                normalized = cls.normalize_slider(unmapped_avg)
                weighted_sum += normalized * remaining_weight
                total_weight = 1.0
            
            if total_weight > 0:
                weighted_avg = weighted_sum / total_weight
            else:
                weighted_avg = 0.0
        else:
            # Fallback: simple average
            avg = sum(all_values) / len(all_values)
            weighted_avg = cls.normalize_slider(avg)
        
        # Calculate score
        behavioral_score = weighted_avg * cls.MAX_SCORE
        
        # Apply anti-gaming penalty
        penalty_applied = 0.0
        if is_gaming:
            behavioral_score -= cls.GAMING_PENALTY
            penalty_applied = cls.GAMING_PENALTY
        
        # Clamp to 0-10
        behavioral_score = max(0.0, min(cls.MAX_SCORE, behavioral_score))
        
        return ComponentScore(
            score=round(behavioral_score, 2),
            max_score=cls.MAX_SCORE,
            status="evaluated",
            details={
                "slider_count": len(slider_values),
                "weighted_average": round(weighted_avg, 4),
                "category_scores": {
                    cat: round(sum(vals)/len(vals), 2) if vals else None
                    for cat, vals in category_scores.items()
                },
                "gaming_detected": is_gaming,
                "behavioral_reliability": reliability,
                "penalty_applied": penalty_applied
            }
        )


# ============================================================
# WEIGHT HANDLER
# ============================================================

class WeightHandler:
    """
    Normalize and redistribute weights.
    
    Constraints:
    - Coding ≥ 30%
    - Psychometric ≥ 15%
    - Behavioral ≤ 15%
    - Total = 100%
    """
    
    # Weight constraints
    CODING_MIN = 0.30
    PSYCHOMETRIC_MIN = 0.15
    BEHAVIORAL_MAX = 0.15
    
    @classmethod
    def apply_constraints(cls, weights: Dict[str, float]) -> Dict[str, float]:
        """Apply weight constraints and return constrained weights.
        Only applies to keys that already exist in weights dict."""
        constrained = weights.copy()
        
        # Apply minimum/maximum constraints only to existing keys
        if "coding" in constrained and constrained["coding"] < cls.CODING_MIN:
            constrained["coding"] = cls.CODING_MIN
        
        if "psychometric" in constrained and constrained["psychometric"] < cls.PSYCHOMETRIC_MIN:
            constrained["psychometric"] = cls.PSYCHOMETRIC_MIN
        
        if "behavioral" in constrained and constrained["behavioral"] > cls.BEHAVIORAL_MAX:
            constrained["behavioral"] = cls.BEHAVIORAL_MAX
        
        return constrained
    
    @classmethod
    def normalize(
        cls,
        weights: Dict[str, float],
        evaluated_components: set
    ) -> Dict[str, float]:
        """
        Normalize weights for evaluated components only.
        
        Steps:
        1. Remove NOT_EVALUATED components
        2. Apply constraints
        3. Redistribute proportionally to sum to 1.0
        """
        # Filter to only evaluated components
        active_weights = {
            k: v for k, v in weights.items()
            if k in evaluated_components and v > 0
        }
        
        if not active_weights:
            return {}
        
        # Apply constraints
        constrained = cls.apply_constraints(active_weights)
        
        # Calculate sum
        total = sum(constrained.values())
        
        if total == 0:
            return {}
        
        # Normalize to sum to 1.0
        normalized = {
            k: v / total
            for k, v in constrained.items()
        }
        
        return normalized


# ============================================================
# FINAL SCORE CALCULATOR
# ============================================================

class FinalScoreCalculator:
    """
    Calculate final score and decision.
    
    Decision thresholds:
    - 85-100: STRONG_HIRE
    - 70-84: HIRE
    - 55-69: BORDERLINE_REVIEW
    - <55: NO_HIRE
    """
    
    DECISION_THRESHOLDS = {
        "STRONG_HIRE": 85,
        "HIRE": 70,
        "BORDERLINE_REVIEW": 55,
        "NO_HIRE": 0
    }
    
    @classmethod
    def calculate(
        cls,
        component_scores: Dict[str, ComponentScore],
        weights: Dict[str, float],
        flags: Dict[str, Any]
    ) -> Tuple[float, str]:
        """
        Calculate final score and decision.
        
        Returns: (final_score 0-100, decision)
        """
        if not weights:
            return 0.0, "NO_HIRE"
        
        # Calculate weighted sum of normalized scores
        weighted_sum = 0.0
        
        for component, weight in weights.items():
            if component in component_scores:
                score = component_scores[component]
                if score.status == "evaluated":
                    weighted_sum += score.normalized * weight
        
        # Scale to 0-100
        final_score = weighted_sum * 100.0
        
        # Determine base decision
        decision = "NO_HIRE"
        for level, threshold in cls.DECISION_THRESHOLDS.items():
            if final_score >= threshold:
                decision = level
                break
        
        # Apply risk downgrades
        decision = cls.apply_risk_downgrades(decision, flags)
        
        return round(final_score, 2), decision
    
    @classmethod
    def apply_risk_downgrades(cls, decision: str, flags: Dict[str, Any]) -> str:
        """
        Downgrade decision one level if risk flags exist.
        """
        risk_flags = [
            flags.get("weak_fundamentals", False),
            flags.get("behavioral_reliability") == "low",
            flags.get("severe_imbalance", False)
        ]
        
        if any(risk_flags):
            # Downgrade one level
            levels = ["STRONG_HIRE", "HIRE", "BORDERLINE_REVIEW", "NO_HIRE"]
            current_idx = levels.index(decision) if decision in levels else 3
            downgraded_idx = min(current_idx + 1, 3)
            return levels[downgraded_idx]
        
        return decision


# ============================================================
# MAIN SCORING ENGINE
# ============================================================

class ScoringEngine:
    """
    Main orchestrator for candidate scoring.
    
    Workflow:
    1. Fetch all component data from Supabase
    2. Apply hard gates (fail fast)
    3. Calculate each component score
    4. Normalize weights
    5. Calculate final score
    6. Determine decision
    7. Store and return result
    """
    
    @classmethod
    def calculate_candidate_score(
        cls,
        job_id: int,
        candidate_id: str,
        db: Session
    ) -> ScoringResult:
        """
        Calculate complete scoring for a candidate.
        
        This is the main entry point for the scoring engine.
        Fetches all data from Supabase and returns a complete ScoringResult.
        """
        # Import models here to avoid circular imports
        from models import (
            JobAssessment, EvaluationSession, PsychometricSubmission,
            TechnicalTextSubmission, PsychometricQuestion, AntiCheatLog,
            CandidateFinalScore
        )
        
        # 1. Fetch job assessment config (weights)
        assessment = db.query(JobAssessment).filter(
            JobAssessment.job_id == job_id
        ).first()
        
        if not assessment:
            return cls._create_error_result("Job assessment not found")
        
        # Get recruiter weights
        recruiter_weights = {
            "coding": assessment.coding_weight or 0.40,
            "technical": assessment.technical_weight or 0.25,
            "psychometric": assessment.psychometric_weight or 0.25,
            "behavioral": assessment.behavioral_weight or 0.10
        }
        
        # 2. Fetch coding evaluation data
        coding_eval = db.query(EvaluationSession).filter(
            EvaluationSession.job_id == job_id,
            EvaluationSession.candidate_id == candidate_id
        ).order_by(EvaluationSession.evaluated_at.desc()).first()
        
        coding_data = None
        if coding_eval:
            coding_data = {
                "final_score": coding_eval.final_score,  # Use judge's calculated score directly
                "passed_tests": coding_eval.passed_hidden_tests,
                "total_tests": coding_eval.total_hidden_tests,
                "performance_score": coding_eval.performance_points / 15.0 if coding_eval.performance_points else 1.0,
                "quality_penalty": coding_eval.penalty_points / 10.0 if coding_eval.penalty_points else 0.0
            }
        else:
            # Fallback: Check for legacy/simple AssessmentSubmission
            from models import AssessmentSubmission
            submission = db.query(AssessmentSubmission).filter(
                AssessmentSubmission.job_id == job_id,
                AssessmentSubmission.candidate_id == candidate_id
            ).order_by(AssessmentSubmission.submitted_at.desc()).first()
            
            if submission:
                coding_data = {
                    "final_score": float(submission.score) if submission.score is not None else 0.0,
                    "passed_tests": 1, # Placeholder to ensure handled as "evaluated"
                    "total_tests": 1,
                    "performance_score": 1.0,
                    "quality_penalty": 0.0
                }
        
        # 3. Fetch psychometric submission data
        psych_submission = db.query(PsychometricSubmission).filter(
            PsychometricSubmission.job_id == job_id,
            PsychometricSubmission.candidate_id == candidate_id
        ).order_by(PsychometricSubmission.submitted_at.desc()).first()
        
        # Parse psychometric data into sections
        psychometric_sections = None
        behavioral_values = {}
        
        if psych_submission and psych_submission.answers:
            psychometric_sections = cls._parse_psychometric_sections(
                psych_submission.answers,
                assessment.psychometric_ids or [],
                db
            )
            behavioral_values = cls._extract_behavioral_values(
                psych_submission.answers
            )
        
        # 4. Fetch technical text submission data
        tech_submission = db.query(TechnicalTextSubmission).filter(
            TechnicalTextSubmission.job_id == job_id,
            TechnicalTextSubmission.candidate_id == candidate_id
        ).order_by(TechnicalTextSubmission.submitted_at.desc()).first()
        
        technical_scores = []
        if tech_submission and tech_submission.answers:
            for q_id, q_data in tech_submission.answers.items():
                if isinstance(q_data, dict) and "score" in q_data:
                    technical_scores.append(q_data["score"])
        
        # 5. Fetch integrity flags (anti-cheat)
        integrity_flags = cls._get_integrity_flags(job_id, candidate_id, db)
        
        # 6. Apply hard gates
        hard_gate_result = HardGates.check_all(
            coding_data,
            psychometric_sections,
            integrity_flags
        )
        
        if not hard_gate_result.passed:
            return cls._create_hard_gate_failure_result(hard_gate_result)
        
        # 7. Calculate each component score
        component_scores = {}
        flags = {}
        evaluated_components = set()
        
        # Coding score - use judge's final_score directly
        if coding_data:
            coding_score = CodingScorer.calculate(
                final_score=coding_data.get("final_score", 0),
                passed_tests=coding_data["passed_tests"],
                total_tests=coding_data["total_tests"],
                performance_score=coding_data["performance_score"],
                quality_penalty=coding_data["quality_penalty"]
            )
            component_scores["coding"] = coding_score
            if coding_score.status == "evaluated":
                evaluated_components.add("coding")
        
        # Technical text score
        technical_score = TechnicalTextScorer.calculate(technical_scores)
        component_scores["technical"] = technical_score
        if technical_score.status == "evaluated":
            evaluated_components.add("technical")
            if technical_score.details.get("weak_fundamentals"):
                flags["weak_fundamentals"] = True
        
        # Psychometric score
        if psychometric_sections:
            psych_score = PsychometricScorer.calculate(psychometric_sections)
            component_scores["psychometric"] = psych_score
            if psych_score.status == "evaluated":
                evaluated_components.add("psychometric")
                if psych_score.details.get("imbalanced_sections"):
                    flags["severe_imbalance"] = True
        
        # Behavioral score
        if behavioral_values:
            behavioral_score = BehavioralScorer.calculate(behavioral_values)
            component_scores["behavioral"] = behavioral_score
            if behavioral_score.status == "evaluated":
                evaluated_components.add("behavioral")
                if behavioral_score.details.get("behavioral_reliability") == "low":
                    flags["behavioral_reliability"] = "low"
        
        # 8. Normalize weights (exclude non-evaluated components)
        normalized_weights = WeightHandler.normalize(
            recruiter_weights,
            evaluated_components
        )
        
        # 9. Calculate final score and decision
        final_score, decision = FinalScoreCalculator.calculate(
            component_scores,
            normalized_weights,
            flags
        )
        
        # 10. Create result
        return ScoringResult(
            final_score=final_score,
            decision=decision,
            component_breakdown=component_scores,
            weights_used=normalized_weights,
            flags=flags,
            hard_gate_result=hard_gate_result
        )
    
    @classmethod
    def _parse_psychometric_sections(
        cls,
        answers: Dict[str, Any],
        psychometric_ids: List[int],
        db: Session
    ) -> Dict[str, Dict[str, int]]:
        """Parse psychometric answers into section-based correct/total format"""
        from models import PsychometricQuestion
        
        # Fetch questions to get sections and correct answers
        questions = db.query(PsychometricQuestion).filter(
            PsychometricQuestion.id.in_(psychometric_ids)
        ).all()
        
        question_map = {f"db_{q.id}": q for q in questions}
        
        sections = {
            "numerical": {"correct": 0, "total": 0},
            "verbal": {"correct": 0, "total": 0},
            "abstract": {"correct": 0, "total": 0}
        }
        
        for q_key, user_answer in answers.items():
            q = question_map.get(q_key)
            if not q:
                continue
            
            # Skip sliders (they're behavioral, not psychometric MCQ)
            if q.section and "Behavioral Sliders" in q.section:
                continue
            
            # Determine section (default to "abstract" if unknown)
            section = "abstract"
            if q.section:
                section_lower = q.section.lower()
                if "numerical" in section_lower:
                    section = "numerical"
                elif "verbal" in section_lower:
                    section = "verbal"
            
            sections[section]["total"] += 1
            
            # Check correctness
            if q.answer and str(user_answer).strip().lower()[:1] == str(q.answer).strip().lower()[:1]:
                sections[section]["correct"] += 1
        
        return sections
    
    @classmethod
    def _extract_behavioral_values(cls, answers: Dict[str, Any]) -> Dict[str, float]:
        """Extract behavioral slider values from answers"""
        behavioral = {}
        
        for key, value in answers.items():
            # Slider values are numeric (1-5 range)
            if isinstance(value, (int, float)) and 1 <= value <= 5:
                behavioral[key] = float(value)
        
        return behavioral
    
    @classmethod
    def _get_integrity_flags(
        cls,
        job_id: int,
        candidate_id: str,
        db: Session
    ) -> Dict[str, Any]:
        """Fetch integrity/anti-cheat flags"""
        from models import AntiCheatLog, EvaluationSession
        
        # Get evaluation ID
        eval_session = db.query(EvaluationSession).filter(
            EvaluationSession.job_id == job_id,
            EvaluationSession.candidate_id == candidate_id
        ).first()
        
        if not eval_session:
            return {}
        
        # Count severe violations
        severe_types = ["CAMERA_VIOLATION", "WINDOW_BLUR", "COPY_ATTEMPT"]
        violations = db.query(AntiCheatLog).filter(
            AntiCheatLog.evaluation_id == eval_session.evaluation_id,
            AntiCheatLog.violation_type.in_(severe_types)
        ).count()
        
        return {
            "severe_violations": [] if violations < 3 else [f"{violations} severe violations"],
            "cheating_detected": violations >= 5
        }
    
    @classmethod
    def _create_error_result(cls, reason: str) -> ScoringResult:
        """Create an error result"""
        return ScoringResult(
            final_score=0.0,
            decision="NO_HIRE",
            component_breakdown={},
            weights_used={},
            flags={"error": reason},
            hard_gate_result=HardGateResult(passed=False, reason=reason)
        )
    
    @classmethod
    def _create_hard_gate_failure_result(cls, gate_result: HardGateResult) -> ScoringResult:
        """Create result for hard gate failure"""
        return ScoringResult(
            final_score=0.0,
            decision="NO_HIRE",
            component_breakdown={},
            weights_used={},
            flags={"hard_gate_failed": gate_result.failed_gate},
            hard_gate_result=gate_result
        )
    
    @classmethod
    def store_result(
        cls,
        result: ScoringResult,
        job_id: int,
        candidate_id: str,
        db: Session
    ) -> "CandidateFinalScore":
        """Store the scoring result in Supabase"""
        from models import CandidateFinalScore
        
        # Check for existing record
        existing = db.query(CandidateFinalScore).filter(
            CandidateFinalScore.job_id == job_id,
            CandidateFinalScore.candidate_id == candidate_id
        ).first()
        
        # Extract component scores
        coding = result.component_breakdown.get("coding")
        technical = result.component_breakdown.get("technical")
        psychometric = result.component_breakdown.get("psychometric")
        behavioral = result.component_breakdown.get("behavioral")
        
        if existing:
            # Update existing record
            existing.coding_score = coding.score if coding else None
            existing.technical_score = technical.score if technical and technical.status == "evaluated" else None
            existing.psychometric_score = psychometric.score if psychometric else None
            existing.behavioral_score = behavioral.score if behavioral else None
            
            existing.coding_weight_used = result.weights_used.get("coding")
            existing.technical_weight_used = result.weights_used.get("technical")
            existing.psychometric_weight_used = result.weights_used.get("psychometric")
            existing.behavioral_weight_used = result.weights_used.get("behavioral")
            
            existing.final_score = result.final_score
            existing.decision = result.decision
            existing.flags = result.flags
            existing.component_breakdown = result.to_dict()["component_breakdown"]
            existing.hard_gate_result = result.hard_gate_result.to_dict()
            
            db.commit()
            db.refresh(existing)
            return existing
        else:
            # Create new record
            new_score = CandidateFinalScore(
                job_id=job_id,
                candidate_id=candidate_id,
                coding_score=coding.score if coding else None,
                technical_score=technical.score if technical and technical.status == "evaluated" else None,
                psychometric_score=psychometric.score if psychometric else None,
                behavioral_score=behavioral.score if behavioral else None,
                coding_weight_used=result.weights_used.get("coding"),
                technical_weight_used=result.weights_used.get("technical"),
                psychometric_weight_used=result.weights_used.get("psychometric"),
                behavioral_weight_used=result.weights_used.get("behavioral"),
                final_score=result.final_score,
                decision=result.decision,
                flags=result.flags,
                component_breakdown=result.to_dict()["component_breakdown"],
                hard_gate_result=result.hard_gate_result.to_dict()
            )
            db.add(new_score)
            db.commit()
            db.refresh(new_score)
            return new_score


# ============================================================
# TECHNICAL TEXT GRADER (AI + Keyword Hybrid)
# ============================================================

class TechnicalTextGrader:
    """
    Grade technical text answers using AI + Keyword Hybrid.
    
    Uses AIScorer for evaluation with keyword bonus.
    """
    
    @classmethod
    def grade_submission(
        cls,
        job_id: int,
        candidate_id: str,
        answers: Dict[str, str],  # {question_id: answer_text}
        db: Session
    ) -> "TechnicalTextSubmission":
        """
        Grade all technical text answers and store submission.
        
        Returns: TechnicalTextSubmission record
        """
        from models import TechnicalQuestion, TechnicalTextSubmission, TechnicalTextProgress
        
        if not answers:
            # Nothing to grade
            return None
        
        # Get question IDs
        question_ids = [int(qid) for qid in answers.keys() if qid.isdigit()]
        
        # Fetch questions with keywords
        questions = db.query(TechnicalQuestion).filter(
            TechnicalQuestion.id.in_(question_ids)
        ).all()
        
        question_map = {str(q.id): q for q in questions}
        
        # Grade each answer
        graded_answers = {}
        scores = []
        
        for q_id, answer_text in answers.items():
            q = question_map.get(q_id)
            if not q:
                continue
            
            keywords = q.keywords or []
            
            # Use AI + Keyword scoring
            score, matched = TechnicalTextScorer.score_single_question(
                q.question,
                answer_text,
                keywords
            )
            
            graded_answers[q_id] = {
                "answer": answer_text,
                "score": score,
                "keywords_matched": matched,
                "total_keywords": len(keywords)
            }
            scores.append(score)
        
        # Calculate total score
        total_score = sum(scores) / len(scores) if scores else 0.0
        
        # Check for existing submission
        existing = db.query(TechnicalTextSubmission).filter(
            TechnicalTextSubmission.job_id == job_id,
            TechnicalTextSubmission.candidate_id == candidate_id
        ).first()
        
        if existing:
            existing.answers = graded_answers
            existing.total_score = total_score
            existing.question_count = len(scores)
            db.commit()
            db.refresh(existing)
            submission = existing
        else:
            submission = TechnicalTextSubmission(
                job_id=job_id,
                candidate_id=candidate_id,
                answers=graded_answers,
                total_score=total_score,
                question_count=len(scores)
            )
            db.add(submission)
            db.commit()
            db.refresh(submission)
        
        # Clean up progress data
        db.query(TechnicalTextProgress).filter(
            TechnicalTextProgress.job_id == job_id,
            TechnicalTextProgress.candidate_id == candidate_id
        ).delete()
        db.commit()
        
        return submission
