"""
Unit Tests for Scoring Engine

Comprehensive tests for all scoring components:
- Hard Gates
- Coding Scorer
- Technical Text Scorer
- Psychometric Scorer
- Behavioral Scorer
- Weight Handler
- Final Score Calculator

Run with: python -m pytest tests/test_scoring_engine.py -v
"""

import pytest
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.scoring_engine import (
    HardGates, HardGateResult,
    CodingScorer, TechnicalTextScorer, PsychometricScorer, BehavioralScorer,
    WeightHandler, FinalScoreCalculator,
    ComponentScore
)


# ============================================================
# HARD GATES TESTS
# ============================================================

class TestHardGates:
    """Tests for fail-fast hard gate checks"""
    
    def test_coding_correctness_passes_above_threshold(self):
        """Coding correctness >= 40% should pass"""
        result = HardGates.check_coding_correctness(4, 10)  # 40%
        assert result.passed is True
        
        result = HardGates.check_coding_correctness(8, 10)  # 80%
        assert result.passed is True
    
    def test_coding_correctness_fails_below_threshold(self):
        """Coding correctness < 40% should fail"""
        result = HardGates.check_coding_correctness(3, 10)  # 30%
        assert result.passed is False
        assert result.failed_gate == "coding_correctness"
        assert "30.0%" in result.reason
    
    def test_coding_correctness_zero_tests_passes(self):
        """Zero tests should pass (no tests = skip gate)"""
        result = HardGates.check_coding_correctness(0, 0)
        assert result.passed is True
    
    def test_psychometric_sections_passes_all_above_threshold(self):
        """All sections >= 30% should pass"""
        sections = {
            "numerical": {"correct": 4, "total": 10},   # 40%
            "verbal": {"correct": 5, "total": 10},      # 50%
            "abstract": {"correct": 3, "total": 10}     # 30%
        }
        result = HardGates.check_psychometric_sections(sections)
        assert result.passed is True
    
    def test_psychometric_sections_fails_if_any_below_threshold(self):
        """Any section < 30% should fail"""
        sections = {
            "numerical": {"correct": 5, "total": 10},   # 50%
            "verbal": {"correct": 2, "total": 10},      # 20% - FAIL
            "abstract": {"correct": 5, "total": 10}     # 50%
        }
        result = HardGates.check_psychometric_sections(sections)
        assert result.passed is False
        assert result.failed_gate == "psychometric_section"
        assert "verbal" in result.reason
    
    def test_psychometric_sections_skips_empty_sections(self):
        """Empty sections should be skipped"""
        sections = {
            "numerical": {"correct": 5, "total": 10},
            "verbal": {"correct": 0, "total": 0}        # Empty - skip
        }
        result = HardGates.check_psychometric_sections(sections)
        assert result.passed is True
    
    def test_integrity_flags_passes_no_violations(self):
        """No integrity violations should pass"""
        flags = {"severe_violations": [], "cheating_detected": False}
        result = HardGates.check_integrity_flags(flags)
        assert result.passed is True
    
    def test_integrity_flags_fails_on_cheating(self):
        """Cheating flag should fail"""
        flags = {"severe_violations": [], "cheating_detected": True}
        result = HardGates.check_integrity_flags(flags)
        assert result.passed is False
        assert result.failed_gate == "integrity"
    
    def test_integrity_flags_fails_on_severe_violations(self):
        """Severe violations should fail"""
        flags = {"severe_violations": ["multiple_faces"], "cheating_detected": False}
        result = HardGates.check_integrity_flags(flags)
        assert result.passed is False
        assert result.failed_gate == "integrity"
    
    def test_check_all_returns_first_failure(self):
        """check_all should return on first gate failure"""
        coding_data = {"passed_tests": 2, "total_tests": 10}  # 20% - FAIL
        psychometric_sections = {
            "numerical": {"correct": 5, "total": 10}  # Would also fail
        }
        
        result = HardGates.check_all(coding_data, psychometric_sections, None)
        assert result.passed is False
        assert result.failed_gate == "coding_correctness"


# ============================================================
# CODING SCORER TESTS
# ============================================================

class TestCodingScorer:
    """Tests for coding assessment scorer"""
    
    def test_full_correctness_max_score(self):
        """100% correctness should approach max score"""
        score = CodingScorer.calculate(10, 10, 1.0, 0.0)
        assert score.status == "evaluated"
        assert score.score == 40.0  # Max score
        assert score.max_score == 40.0
    
    def test_zero_correctness_base_score(self):
        """0% correctness should give only performance/quality points"""
        score = CodingScorer.calculate(0, 10, 1.0, 0.0)
        # 0.7*0 + 0.2*1 + 0.1*1 = 0.3, * 40 = 12
        assert score.score == 12.0
    
    def test_partial_correctness(self):
        """Partial correctness should scale proportionally"""
        score = CodingScorer.calculate(5, 10, 1.0, 0.0)
        # 0.7*0.5 + 0.2*1 + 0.1*1 = 0.65, * 40 = 26
        assert score.score == 26.0
    
    def test_quality_penalty_reduces_score(self):
        """Quality penalty should reduce score"""
        without_penalty = CodingScorer.calculate(10, 10, 1.0, 0.0)
        with_penalty = CodingScorer.calculate(10, 10, 1.0, 0.5)
        assert with_penalty.score < without_penalty.score
    
    def test_poor_performance_reduces_score(self):
        """Poor performance should reduce score"""
        good_perf = CodingScorer.calculate(10, 10, 1.0, 0.0)
        poor_perf = CodingScorer.calculate(10, 10, 0.5, 0.0)
        assert poor_perf.score < good_perf.score
    
    def test_zero_tests_not_evaluated(self):
        """Zero tests should return not_evaluated status"""
        score = CodingScorer.calculate(0, 0, 1.0, 0.0)
        assert score.status == "not_evaluated"
        assert score.score == 0.0
    
    def test_normalized_score_calculation(self):
        """Normalized score should be between 0 and 1"""
        score = CodingScorer.calculate(7, 10, 0.8, 0.1)
        assert 0 <= score.normalized <= 1


# ============================================================
# TECHNICAL TEXT SCORER TESTS
# ============================================================

class TestTechnicalTextScorer:
    """Tests for technical text question scorer"""
    
    def test_zero_questions_not_evaluated(self):
        """N=0 should return not_evaluated status"""
        score = TechnicalTextScorer.calculate([])
        assert score.status == "not_evaluated"
        assert score.score == 0.0
    
    def test_single_question_low_confidence(self):
        """N=1 should have confidence factor of 0.25"""
        score = TechnicalTextScorer.calculate([10.0])  # Perfect score
        assert score.status == "evaluated"
        assert score.details["confidence_factor"] == 0.25
        # base_score = (10/10) * 25 = 25, * 0.25 = 6.25
        assert score.score == 6.25
    
    def test_two_questions_half_confidence(self):
        """N=2 should have confidence factor of 0.5"""
        score = TechnicalTextScorer.calculate([10.0, 10.0])
        assert score.details["confidence_factor"] == 0.5
        # 25 * 0.5 = 12.5
        assert score.score == 12.5
    
    def test_four_questions_full_confidence(self):
        """N=4 should have confidence factor of 1.0"""
        score = TechnicalTextScorer.calculate([10.0, 10.0, 10.0, 10.0])
        assert score.details["confidence_factor"] == 1.0
        assert score.score == 25.0
    
    def test_more_than_four_questions_caps_confidence(self):
        """N>4 should still have confidence factor of 1.0"""
        score = TechnicalTextScorer.calculate([10.0] * 6)
        assert score.details["confidence_factor"] == 1.0
    
    def test_weak_fundamentals_flag_set(self):
        """N>=2 and avg<4 should set weak_fundamentals flag"""
        score = TechnicalTextScorer.calculate([2.0, 3.0])  # avg = 2.5
        assert score.details["weak_fundamentals"] is True
    
    def test_weak_fundamentals_flag_not_set_single_question(self):
        """N=1 should never set weak_fundamentals even with low score"""
        score = TechnicalTextScorer.calculate([2.0])
        assert score.details.get("weak_fundamentals", False) is False
    
    def test_weak_fundamentals_flag_not_set_high_scores(self):
        """High average should not set weak_fundamentals flag"""
        score = TechnicalTextScorer.calculate([8.0, 7.0])  # avg = 7.5
        assert score.details["weak_fundamentals"] is False
    
    def test_keyword_scoring_exact_match(self):
        """All keywords matched should give full score"""
        score, matched = TechnicalTextScorer.score_single_question(
            "This uses polymorphism and inheritance for encapsulation",
            ["polymorphism", "inheritance", "encapsulation"]
        )
        assert score == 10.0
        assert len(matched) == 3
    
    def test_keyword_scoring_partial_match(self):
        """Partial keyword match should give proportional score"""
        score, matched = TechnicalTextScorer.score_single_question(
            "This uses polymorphism only",
            ["polymorphism", "inheritance", "encapsulation"]
        )
        assert score == pytest.approx(3.33, rel=0.1)  # 1/3 * 10
        assert len(matched) == 1
    
    def test_keyword_scoring_no_match(self):
        """No keywords matched should give zero score"""
        score, matched = TechnicalTextScorer.score_single_question(
            "This answer is completely irrelevant",
            ["polymorphism", "inheritance"]
        )
        assert score == 0.0
        assert len(matched) == 0
    
    def test_keyword_scoring_empty_answer(self):
        """Empty answer should give zero score"""
        score, matched = TechnicalTextScorer.score_single_question(
            "",
            ["polymorphism"]
        )
        assert score == 0.0
    
    def test_keyword_scoring_no_keywords_full_credit(self):
        """No keywords defined should give full credit"""
        score, matched = TechnicalTextScorer.score_single_question(
            "Any answer",
            []
        )
        assert score == 10.0


# ============================================================
# PSYCHOMETRIC SCORER TESTS
# ============================================================

class TestPsychometricScorer:
    """Tests for psychometric test scorer"""
    
    def test_perfect_accuracy_max_score(self):
        """100% accuracy should give max score"""
        sections = {
            "numerical": {"correct": 10, "total": 10},
            "verbal": {"correct": 10, "total": 10}
        }
        score = PsychometricScorer.calculate(sections)
        assert score.score == 25.0
    
    def test_zero_accuracy_zero_score(self):
        """0% accuracy should give zero score"""
        sections = {
            "numerical": {"correct": 0, "total": 10},
            "verbal": {"correct": 0, "total": 10}
        }
        score = PsychometricScorer.calculate(sections)
        assert score.score == 0.0  # 0 - 5 (clamped to 0)
    
    def test_balance_penalty_applied(self):
        """Section < 40% should trigger -5 penalty"""
        sections = {
            "numerical": {"correct": 10, "total": 10},  # 100%
            "verbal": {"correct": 3, "total": 10}       # 30% - imbalanced
        }
        score = PsychometricScorer.calculate(sections)
        # Overall: 13/20 = 65% * 25 = 16.25, then -5 = 11.25
        assert score.details["balance_penalty_applied"] == 5.0
        assert "verbal" in score.details["imbalanced_sections"]
    
    def test_no_balance_penalty_when_all_balanced(self):
        """All sections >= 40% should not trigger penalty"""
        sections = {
            "numerical": {"correct": 5, "total": 10},  # 50%
            "verbal": {"correct": 4, "total": 10}      # 40%
        }
        score = PsychometricScorer.calculate(sections)
        assert score.details["balance_penalty_applied"] == 0.0
    
    def test_score_clamped_to_zero(self):
        """Score should never go below zero"""
        sections = {
            "numerical": {"correct": 1, "total": 10},  # 10% - imbalanced
            "verbal": {"correct": 1, "total": 10}      # 10% - imbalanced
        }
        score = PsychometricScorer.calculate(sections)
        assert score.score >= 0.0
    
    def test_empty_sections_not_evaluated(self):
        """Empty sections should return not_evaluated"""
        score = PsychometricScorer.calculate({})
        assert score.status == "not_evaluated"
    
    def test_all_empty_values_not_evaluated(self):
        """All sections with total=0 should return not_evaluated"""
        sections = {
            "numerical": {"correct": 0, "total": 0},
            "verbal": {"correct": 0, "total": 0}
        }
        score = PsychometricScorer.calculate(sections)
        assert score.status == "not_evaluated"


# ============================================================
# BEHAVIORAL SCORER TESTS
# ============================================================

class TestBehavioralScorer:
    """Tests for behavioral slider scorer"""
    
    def test_slider_normalization(self):
        """Slider value 1-5 should normalize to 0-1"""
        assert BehavioralScorer.normalize_slider(1.0) == 0.0
        assert BehavioralScorer.normalize_slider(5.0) == 1.0
        assert BehavioralScorer.normalize_slider(3.0) == 0.5
    
    def test_max_score_all_fives(self):
        """All 5s should give around max score (minus gaming penalty)"""
        values = {"q1": 5.0, "q2": 5.0, "q3": 5.0}
        score = BehavioralScorer.calculate(values)
        # All 5s = gaming detected, so 10 - 2 = 8
        assert score.details["gaming_detected"] is True
        assert score.score == 8.0
    
    def test_min_score_all_ones(self):
        """All 1s should give low score (with gaming penalty)"""
        values = {"q1": 1.0, "q2": 1.0, "q3": 1.0}
        score = BehavioralScorer.calculate(values)
        # All 1s = gaming detected
        assert score.details["gaming_detected"] is True
        assert score.score == 0.0  # 0 - 2 clamped to 0
    
    def test_no_gaming_penalty_normal_values(self):
        """Normal distribution should not trigger gaming penalty"""
        values = {"q1": 3.0, "q2": 4.0, "q3": 2.0}
        score = BehavioralScorer.calculate(values)
        assert score.details["gaming_detected"] is False
        assert score.details["behavioral_reliability"] == "normal"
    
    def test_gaming_detection_all_high(self):
        """All values >= 4.8 should be flagged as gaming"""
        is_gaming, reliability = BehavioralScorer.detect_gaming([4.8, 4.9, 5.0])
        assert is_gaming is True
        assert reliability == "low"
    
    def test_gaming_detection_all_low(self):
        """All values <= 1.2 should be flagged as gaming"""
        is_gaming, reliability = BehavioralScorer.detect_gaming([1.0, 1.1, 1.2])
        assert is_gaming is True
        assert reliability == "low"
    
    def test_gaming_detection_normal(self):
        """Mixed values should not be flagged"""
        is_gaming, reliability = BehavioralScorer.detect_gaming([2.0, 3.0, 4.0])
        assert is_gaming is False
        assert reliability == "normal"
    
    def test_empty_values_not_evaluated(self):
        """Empty slider values should return not_evaluated"""
        score = BehavioralScorer.calculate({})
        assert score.status == "not_evaluated"
    
    def test_average_values_mid_score(self):
        """Average values (3s) should give mid score"""
        values = {"q1": 3.0, "q2": 3.0, "q3": 3.0}
        score = BehavioralScorer.calculate(values)
        # Normalized: 0.5 each, weighted avg = 0.5, * 10 = 5
        assert score.score == 5.0


# ============================================================
# WEIGHT HANDLER TESTS
# ============================================================

class TestWeightHandler:
    """Tests for weight normalization and redistribution"""
    
    def test_all_components_evaluated_no_change(self):
        """All components evaluated should normalize to sum to 1"""
        weights = {
            "coding": 0.40,
            "technical": 0.25,
            "psychometric": 0.25,
            "behavioral": 0.10
        }
        evaluated = {"coding", "technical", "psychometric", "behavioral"}
        
        result = WeightHandler.normalize(weights, evaluated)
        
        assert sum(result.values()) == pytest.approx(1.0)
        assert len(result) == 4
    
    def test_missing_component_redistributed(self):
        """Missing component weight should be redistributed"""
        weights = {
            "coding": 0.40,
            "technical": 0.25,
            "psychometric": 0.25,
            "behavioral": 0.10
        }
        evaluated = {"coding", "psychometric", "behavioral"}  # No technical
        
        result = WeightHandler.normalize(weights, evaluated)
        
        assert "technical" not in result
        assert sum(result.values()) == pytest.approx(1.0)
        assert result["coding"] > 0.40  # Should be higher after redistribution
    
    def test_only_one_component_gets_all_weight(self):
        """Single evaluated component should get 100%"""
        weights = {
            "coding": 0.40,
            "technical": 0.25,
            "psychometric": 0.25,
            "behavioral": 0.10
        }
        evaluated = {"coding"}
        
        result = WeightHandler.normalize(weights, evaluated)
        
        assert result == {"coding": 1.0}
    
    def test_constraints_applied(self):
        """Weight constraints should be enforced"""
        weights = {
            "coding": 0.20,       # Below 30% minimum
            "psychometric": 0.10  # Below 15% minimum
        }
        
        constrained = WeightHandler.apply_constraints(weights)
        
        assert constrained["coding"] >= 0.30
        assert constrained["psychometric"] >= 0.15
    
    def test_behavioral_max_constraint(self):
        """Behavioral weight should be capped at 15%"""
        weights = {"behavioral": 0.25}  # Above 15% max
        
        constrained = WeightHandler.apply_constraints(weights)
        
        assert constrained["behavioral"] <= 0.15
    
    def test_empty_evaluated_returns_empty(self):
        """No evaluated components should return empty weights"""
        weights = {"coding": 0.40}
        evaluated = set()
        
        result = WeightHandler.normalize(weights, evaluated)
        
        assert result == {}


# ============================================================
# FINAL SCORE CALCULATOR TESTS
# ============================================================

class TestFinalScoreCalculator:
    """Tests for final score calculation and decision making"""
    
    def test_perfect_scores_strong_hire(self):
        """Perfect normalized scores should give STRONG_HIRE"""
        components = {
            "coding": ComponentScore(score=40.0, max_score=40.0),
            "psychometric": ComponentScore(score=25.0, max_score=25.0)
        }
        weights = {"coding": 0.6, "psychometric": 0.4}
        
        final_score, decision = FinalScoreCalculator.calculate(components, weights, {})
        
        assert final_score == 100.0
        assert decision == "STRONG_HIRE"
    
    def test_high_score_hire(self):
        """Score 70-84 should give HIRE"""
        components = {
            "coding": ComponentScore(score=30.0, max_score=40.0),  # 75%
            "psychometric": ComponentScore(score=18.0, max_score=25.0)  # 72%
        }
        weights = {"coding": 0.6, "psychometric": 0.4}
        
        final_score, decision = FinalScoreCalculator.calculate(components, weights, {})
        
        assert 70 <= final_score < 85
        assert decision == "HIRE"
    
    def test_medium_score_borderline(self):
        """Score 55-69 should give BORDERLINE_REVIEW"""
        components = {
            "coding": ComponentScore(score=24.0, max_score=40.0),  # 60%
            "psychometric": ComponentScore(score=14.0, max_score=25.0)  # 56%
        }
        weights = {"coding": 0.6, "psychometric": 0.4}
        
        final_score, decision = FinalScoreCalculator.calculate(components, weights, {})
        
        assert 55 <= final_score < 70
        assert decision == "BORDERLINE_REVIEW"
    
    def test_low_score_no_hire(self):
        """Score < 55 should give NO_HIRE"""
        components = {
            "coding": ComponentScore(score=16.0, max_score=40.0),  # 40%
            "psychometric": ComponentScore(score=10.0, max_score=25.0)  # 40%
        }
        weights = {"coding": 0.6, "psychometric": 0.4}
        
        final_score, decision = FinalScoreCalculator.calculate(components, weights, {})
        
        assert final_score < 55
        assert decision == "NO_HIRE"
    
    def test_risk_downgrade_weak_fundamentals(self):
        """weak_fundamentals flag should downgrade decision"""
        components = {
            "coding": ComponentScore(score=36.0, max_score=40.0),  # 90%
            "psychometric": ComponentScore(score=22.0, max_score=25.0)  # 88%
        }
        weights = {"coding": 0.6, "psychometric": 0.4}
        flags = {"weak_fundamentals": True}
        
        final_score, decision = FinalScoreCalculator.calculate(components, weights, flags)
        
        # Would be STRONG_HIRE without flag, but downgraded to HIRE
        assert decision == "HIRE"
    
    def test_risk_downgrade_low_behavioral_reliability(self):
        """Low behavioral reliability should downgrade decision"""
        components = {
            "coding": ComponentScore(score=32.0, max_score=40.0)  # 80%
        }
        weights = {"coding": 1.0}
        flags = {"behavioral_reliability": "low"}
        
        final_score, decision = FinalScoreCalculator.calculate(components, weights, flags)
        
        # Would be HIRE without flag, but downgraded to BORDERLINE_REVIEW
        assert decision == "BORDERLINE_REVIEW"
    
    def test_empty_weights_no_hire(self):
        """Empty weights should give NO_HIRE"""
        final_score, decision = FinalScoreCalculator.calculate({}, {}, {})
        
        assert final_score == 0.0
        assert decision == "NO_HIRE"


# ============================================================
# INTEGRATION TESTS
# ============================================================

class TestScoringIntegration:
    """Integration tests combining multiple components"""
    
    def test_complete_scoring_flow(self):
        """Test a complete scoring flow without database"""
        # Simulate component calculations
        coding = CodingScorer.calculate(8, 10, 0.9, 0.1)
        technical = TechnicalTextScorer.calculate([7.0, 8.0, 6.0, 9.0])
        psychometric = PsychometricScorer.calculate({
            "numerical": {"correct": 8, "total": 10},
            "verbal": {"correct": 7, "total": 10}
        })
        behavioral = BehavioralScorer.calculate({
            "teamwork": 4.0, "ownership": 3.5, "communication": 4.0
        })
        
        components = {
            "coding": coding,
            "technical": technical,
            "psychometric": psychometric,
            "behavioral": behavioral
        }
        
        weights = {
            "coding": 0.40,
            "technical": 0.25,
            "psychometric": 0.25,
            "behavioral": 0.10
        }
        
        evaluated = {"coding", "technical", "psychometric", "behavioral"}
        normalized_weights = WeightHandler.normalize(weights, evaluated)
        
        flags = {}
        if technical.details.get("weak_fundamentals"):
            flags["weak_fundamentals"] = True
        if behavioral.details.get("behavioral_reliability") == "low":
            flags["behavioral_reliability"] = "low"
        
        final_score, decision = FinalScoreCalculator.calculate(
            components, normalized_weights, flags
        )
        
        # Validate results
        assert 0 <= final_score <= 100
        assert decision in ["STRONG_HIRE", "HIRE", "BORDERLINE_REVIEW", "NO_HIRE"]
        assert sum(normalized_weights.values()) == pytest.approx(1.0)
    
    def test_missing_technical_redistributes_weights(self):
        """Test weight redistribution when technical is missing"""
        weights = {
            "coding": 0.40,
            "technical": 0.25,
            "psychometric": 0.25,
            "behavioral": 0.10
        }
        evaluated = {"coding", "psychometric", "behavioral"}  # No technical
        
        normalized = WeightHandler.normalize(weights, evaluated)
        
        # Technical weight should be redistributed
        assert "technical" not in normalized
        assert normalized["coding"] > 0.40
        assert sum(normalized.values()) == pytest.approx(1.0)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
