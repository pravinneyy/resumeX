# Scoring Engine Architecture

## Overview

The ResumeX Scoring Engine is a deterministic, explainable scoring system that evaluates candidates across four components with Supabase as the single source of truth.

## Components & Max Scores

| Component | Max Score | Weight Range |
|-----------|-----------|--------------|
| Coding Assessment | 40 pts | ≥30% |
| Technical Text | 25 pts | Variable |
| Psychometric | 25 pts | ≥15% |
| Behavioral | 10 pts | ≤15% |

## Flow Diagram

```
Candidate Submits Assessment
           ↓
┌──────────────────────────────────────────┐
│  COMPONENT SCORING                       │
├──────────────────────────────────────────┤
│ Psychometric → /api/assessments/psychometric │
│ Technical   → /api/technical-text/submit     │
│ Coding      → /api/judge/submit              │
└──────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────┐
│  SCORING ENGINE                          │
│  ScoringEngine.calculate_candidate_score │
├──────────────────────────────────────────┤
│ 1. Fetch all component data              │
│ 2. Apply hard gates (fail fast)          │
│ 3. Calculate each component score        │
│ 4. Normalize weights                     │
│ 5. Calculate final score                 │
│ 6. Determine decision                    │
│ 7. Store in candidate_final_scores       │
└──────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────┐
│  DISPLAY                                 │
├──────────────────────────────────────────┤
│ Recruiter: VerdictCard component         │
│ GET /api/scoring/result/{job}/{candidate}│
└──────────────────────────────────────────┘
```

## Database Tables

### 1. Component Submissions

```
psychometric_submissions
├── job_id, candidate_id
├── answers (JSONB)
├── score (legacy)
└── submitted_at

technical_text_submissions
├── job_id, candidate_id
├── answers (JSONB with per-question breakdown)
├── total_score, question_count
└── submitted_at

evaluation_sessions (Coding)
├── job_id, candidate_id
├── passed_hidden_tests, total_hidden_tests
├── correctness_points, performance_points, quality_points
├── final_score, verdict
└── evaluated_at
```

### 2. Final Scores (Single Source of Truth)

```
candidate_final_scores
├── job_id, candidate_id
├── Component Scores
│   ├── coding_score (0-40)
│   ├── technical_score (0-25)
│   ├── psychometric_score (0-25)
│   └── behavioral_score (0-10)
├── Weights Used (normalized to sum=1.0)
│   ├── coding_weight_used
│   ├── technical_weight_used
│   ├── psychometric_weight_used
│   └── behavioral_weight_used
├── Final Result
│   ├── final_score (0-100)
│   └── decision (STRONG_HIRE/HIRE/BORDERLINE_REVIEW/NO_HIRE)
├── Risk Flags (JSONB)
├── component_breakdown (JSONB for audit)
├── hard_gate_result (JSONB)
└── calculated_at, updated_at
```

## Hard Gates (Fail Fast)

| Gate | Threshold | Result |
|------|-----------|--------|
| Coding Correctness | <40% | AUTO NO_HIRE |
| Psychometric Section | <30% in any section | AUTO NO_HIRE |
| Integrity Flags | Severe violations | AUTO NO_HIRE |

## Scoring Formulas

### Coding (0-40 pts)
```
correctness = passed_tests / total_tests
coding_normalized = 0.7*correctness + 0.2*performance + 0.1*(1-quality_penalty)
coding_score = coding_normalized * 40
```

### Technical Text (0-25 pts)
```
if N = 0: status = "not_evaluated"
if N ≥ 1:
  raw_avg = sum(scores) / N
  base_score = (raw_avg / 10) * 25
  confidence = min(1, N/4)
  technical_score = base_score * confidence
```

### Psychometric (0-25 pts)
```
raw_accuracy = total_correct / total_questions
psychometric_score = raw_accuracy * 25
if any_section < 40%: score -= 5
```

### Behavioral (0-10 pts)
```
normalized = (slider_value - 1) / 4
weighted_avg = Σ(normalized * category_weight)
behavioral_score = weighted_avg * 10
if all_sliders >= 4.8 OR <= 1.2: score -= 2 (anti-gaming)
```

## Weight Normalization

1. Remove NOT_EVALUATED components
2. Apply constraints (coding ≥30%, psychometric ≥15%, behavioral ≤15%)
3. Normalize remaining weights to sum to 1.0

## Final Decision Thresholds

| Score Range | Decision |
|-------------|----------|
| 85-100 | STRONG_HIRE |
| 70-84 | HIRE |
| 55-69 | BORDERLINE_REVIEW |
| <55 | NO_HIRE |

### Risk Downgrades
- weak_fundamentals → downgrade 1 level
- behavioral_reliability = "low" → downgrade 1 level
- severe_imbalance → downgrade 1 level

## API Endpoints

### Triggering Score Calculation
All submission endpoints automatically trigger score recalculation:
- `POST /api/assessments/psychometric` - Submits psychometric, triggers scoring
- `POST /api/technical-text/submit` - Submits technical text, triggers scoring
- `POST /api/judge/submit` - Submits coding, triggers scoring

### Retrieving Scores
- `GET /api/scoring/result/{job_id}/{candidate_id}` - Get detailed score breakdown
- `GET /api/scoring/calculate/{job_id}/{candidate_id}` - Force recalculate
- `GET /api/scoring/recalculate/{job_id}` - Recalculate all candidates for a job

### Recruiter Configuration
- `PUT /api/assessments/{job_id}/weights` - Update scoring weights

## Frontend Components

### VerdictCard
Displays comprehensive score breakdown:
- Progress bars for each component
- Hard gate warnings
- Risk flags badges
- Final score with color coding

### CandidateScoreBadges
Compact score display:
- Final score percentage
- Component score badges

## Safety Features

1. **No division by zero** - All division operations check for zero denominators
2. **Missing components excluded** - NOT_EVALUATED status, not penalized
3. **Hard gates override weights** - Fail fast before any aggregation
4. **Deterministic scoring** - Keyword-based grading, no AI in scoring
5. **Full audit trail** - component_breakdown stored for transparency
