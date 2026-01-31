# ResumeX IDE Judge System - Architecture & Design

## 1. SYSTEM OVERVIEW

The judge system is a **deterministic, safe, and auditable** grading engine for the ResumeX IDE. It runs on top of the existing code executor and provides:

- ✅ **Deterministic scoring** - Same code always gets same score
- ✅ **No AI judgement** - Only test case results determine pass/fail
- ✅ **Safe execution** - Timeout, memory limits, forbidden import checking
- ✅ **Transparent results** - Full breakdown of correctness, performance, quality points
- ✅ **Audit trail** - All evaluations stored in `EvaluationSession` table

## 2. EXECUTION FLOW

```
┌─────────────────────────────────────────────────────────────┐
│ User submits code in IDE                                     │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ "Run Code" button    │
        └──────────┬───────────┘
                   │
                   ▼
  ┌──────────────────────────────────────┐
  │ POST /problems/{problem_id}/         │
  │        run-sample-tests              │
  │                                      │
  │ 1. Validate function signature       │
  │ 2. Check dangerous imports/patterns  │
  │ 3. Execute vs SAMPLE tests only      │
  │ 4. Return stdout + test results      │
  │ 5. NO scoring (shows console output) │
  └──────────┬───────────────────────────┘
             │
             ▼
        ┌─────────────────┐
        │ Console output  │
        │ Sample pass/fail│
        └─────────────────┘
             
             
        ┌──────────────────┐
        │ "Finish Technical"│
        │    button        │
        └──────────┬───────┘
                   │
                   ▼
  ┌──────────────────────────────────────┐
  │ POST /problems/{problem_id}/         │
  │        evaluate                      │
  │                                      │
  │ [MAIN JUDGE FLOW]                    │
  │ 1. Validate function signature       │
  │ 2. Safety check (imports/patterns)   │
  │ 3. Build wrapper script              │
  │ 4. Execute vs HIDDEN tests           │
  │ 5. Calculate deterministic score     │
  │ 6. Store EvaluationSession in DB     │
  │ 7. Return full results               │
  └──────────┬───────────────────────────┘
             │
             ▼
  ┌─────────────────────────────────────┐
  │ EvaluationSession created:          │
  │ - evaluation_id (UUID)              │
  │ - problem_id                        │
  │ - candidate_id                      │
  │ - passed_hidden_tests: 6/10         │
  │ - correctness_points: 42.0          │
  │ - performance_points: 12.5          │
  │ - quality_points: 8.0               │
  │ - penalty_points: 0.0               │
  │ - final_score: 62.5                 │
  │ - verdict: PARTIAL_ACCEPTED         │
  │ - test_results: [...]               │
  └─────────────────────────────────────┘
             │
             ▼
  ┌──────────────────────┐
  │ Results panel shown  │
  │ to candidate         │
  └──────────────────────┘
```

## 3. ARCHITECTURE LAYERS

```
┌─────────────────────────────────────────────┐
│ Frontend IDE (Next.js/React)                │
│ - Lock function signature                   │
│ - Show Run Code / Finish Technical buttons  │
│ - Display results panel                     │
└────────────────┬────────────────────────────┘
                 │
                 │ REST API Calls
                 │
┌────────────────▼────────────────────────────┐
│ Backend API Routes (FastAPI)                │
│ - /run-sample-tests                         │
│ - /evaluate                                 │
│ - /evaluation/{evaluation_id}               │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│ Judge Layer (judge.py)                      │
│                                             │
│ [SafetyChecker]                             │
│  - Validate function signature              │
│  - Detect forbidden imports                 │
│  - Detect dangerous patterns                │
│                                             │
│ [TestExecutor]                              │
│  - Build wrapper script                     │
│  - Execute with subprocess (timeout)        │
│  - Parse test results                       │
│                                             │
│ [ScoringEngine]                             │
│  - Calculate correctness (70 pts)           │
│  - Calculate performance (15 pts)           │
│  - Calculate quality (10 pts)               │
│  - Calculate penalty                        │
│  - Clamp to 0-100                           │
│                                             │
│ [JudgingSession]                            │
│  - Orchestrate full workflow                │
│  - Return complete eval result              │
└────────────────┬────────────────────────────┘
                 │
                 │ Store
                 │
┌────────────────▼────────────────────────────┐
│ Database (SQLAlchemy)                       │
│                                             │
│ [Problem]                                   │
│  - problem_id (unique)                      │
│  - function_signature                       │
│  - sample_tests (visible)                   │
│  - hidden_tests (server-only)               │
│                                             │
│ [EvaluationSession]                         │
│  - evaluation_id (unique)                   │
│  - problem_id                               │
│  - candidate_id                             │
│  - submitted_code                           │
│  - All scoring fields                       │
│  - verdict                                  │
│  - test_results (JSON)                      │
└─────────────────────────────────────────────┘
```

## 4. JUDGE SCORING FORMULA

**Deterministic calculation (same code = same score always)**

```
final_score = correctness + performance + quality - penalty

Clamped to [0, 100]
```

### Correctness (0-70 points)
```
correctness = (passed_hidden / total_hidden) * 70
```
- All tests pass: 70 pts
- 5/10 tests pass: 35 pts
- 0 tests pass: 0 pts

### Performance (0-15 points)
```
If max_execution_time > time_limit:
    performance = 0
Else:
    ratio = max_execution_time / time_limit
    performance = 15 * (1 - ratio * 0.5)
```
- Executes in 0s: 15 pts
- Executes in 50% of limit: 11.25 pts
- Executes at limit: 7.5 pts
- Exceeds limit: 0 pts

### Quality (0-10 points)
```
runtime_errors = count(tests with exceptions)
quality = max(0, 10 - runtime_errors * 2)
```
- No errors: 10 pts
- 1 error: 8 pts
- 3+ errors: 0 pts
- Note: Wrong answers don't penalize quality (only correctness)

### Penalty (0+ points, subtracted)
```
penalty = 0
if forbidden_imports_found: penalty += 10
if too_many_errors: penalty += 5
```
- Forbidden `__import__`, `exec()`, `open()`, `os.`, etc.
- Network access attempts
- Filesystem access

### Verdict
```
if passed == total and score >= 80:  ACCEPTED
elif passed == total:                ACCEPTED
elif passed == 0:                    FAILED
elif passed > 0:                     PARTIAL_ACCEPTED
```

## 5. SAFETY MEASURES

### Hard Constraints
- ⏱️ **Timeout**: 5 seconds maximum per submission
- 🧠 **Memory**: 256 MB limit (subprocess-level)
- 📦 **Imports**: Only `{math, collections, itertools, functools}` allowed
- 🚫 **Forbidden**: `exec()`, `eval()`, `__import__()`, `open()`, `os.`, `sys.`, `subprocess`, `socket`, `urllib`

### Validation
1. **Function Signature**: User code must match server-side signature exactly (name, parameters)
2. **No Main Block**: User can ONLY write function body, no `if __name__ == "__main__":`
3. **Import Whitelist**: Anything else → auto-fail
4. **Dangerous Patterns**: Regex scan for exec, eval, imports, file access

### Execution Isolation
- Uses `subprocess.run()` with `capture_output=True`
- Python subprocess runs in isolated child process
- No shared memory with main app
- Timeout enforced by OS

## 6. DATA FLOW FOR TRANSPARENCY

### User Submits Code
```json
POST /problems/two_sum/evaluate
{
  "problem_id": "two_sum",
  "candidate_id": "clerk_user_123",
  "job_id": 42,
  "code": "def solution(nums, target):\n    for i, n in enumerate(nums):\n        ...",
  "language": "python"
}
```

### Judge Returns
```json
{
  "evaluation_id": "abc-def-123",
  "problem_id": "two_sum",
  "passed_hidden_tests": 6,
  "total_hidden_tests": 10,
  
  "correctness_points": 42.0,
  "performance_points": 12.5,
  "quality_points": 8.0,
  "penalty_points": 0.0,
  
  "final_score": 62.5,
  "verdict": "PARTIAL_ACCEPTED",
  "max_execution_time": 0.032,
  
  "error": null,
  
  "test_results": [
    {"ok": true, "time": 0.001, "error": null, ...},
    {"ok": false, "time": 0.002, "error": null, ...},
    ...
  ]
}
```

### Stored in Database
```python
evaluation = EvaluationSession(
    evaluation_id="abc-def-123",
    problem_id="two_sum",
    candidate_id="clerk_user_123",
    job_id=42,
    submitted_code="...",
    passed_hidden_tests=6,
    total_hidden_tests=10,
    correctness_points=42.0,
    performance_points=12.5,
    quality_points=8.0,
    penalty_points=0.0,
    final_score=62.5,
    verdict="PARTIAL_ACCEPTED",
    test_results=[...],
    evaluated_at=datetime.now()
)
```

**Single source of truth** - recruiter reads this, candidate sees summary.

## 7. TEST CASE INJECTION

### Wrapper Script Generation (Deterministic)
```python
# User code
def solution(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

# Injected test harness
import json, sys, time

test_results = []
test_data = [
    {"input": {"nums": [2, 7, 11, 15], "target": 9}, "expected_output": [0, 1]},
    {"input": {"nums": [3, 2, 4], "target": 6}, "expected_output": [1, 2]},
    ...
]

for test_case in test_data:
    try:
        inputs = test_case.get('input', {})
        expected = test_case.get('expected_output')
        
        start = time.time()
        result = solution(**inputs)  # Unpack as kwargs
        elapsed = time.time() - start
        
        passed = (result == expected)
        test_results.append({
            "ok": passed,
            "time": round(elapsed, 4),
            "error": None,
            "expected": expected,
            "got": result
        })
    except Exception as e:
        test_results.append({
            "ok": False,
            "time": 0,
            "error": str(type(e).__name__) + ": " + str(e)
        })

print(json.dumps(test_results))  # Only JSON, no prints allowed
```

**Key points:**
- User code injected as-is
- Test harness is deterministic
- Only JSON output, no `print()` statements
- Precise timing measurement per test
- Exception catching per test (not fatal)

## 8. WHY THIS IS SAFE & FAIR

### ❌ What Could Go Wrong (Addressed)
| Risk | Mitigation |
|------|-----------|
| Code takes forever | Hard 5s timeout + subprocess |
| Code accesses filesystem | Forbidden `open()`, `os.` patterns |
| Code accesses network | Forbidden `socket`, `urllib` patterns |
| Code imports dangerous modules | Whitelist only safe imports |
| Two candidates get different scores for same code | Scoring formula is deterministic, not random |
| AI decides pass/fail unfairly | No AI in judge; only test cases |
| Hidden tests are leaked to frontend | Never sent; only sample tests visible |
| Score can be manipulated | Stored immutably in `EvaluationSession` |

### ✅ Why It's Fair
1. **Test cases predefined** - Recruiter defines before candidate starts
2. **Same tests for all** - Every candidate on "two_sum" gets same 10 hidden tests
3. **Deterministic scoring** - Math formula, no randomness
4. **Auditable** - Full `test_results` JSON stored
5. **Reproducible** - Can re-run evaluation with same code, same tests = same score
6. **Transparent** - Candidate sees correctness %, performance time, exact score

### ✅ Why It's Safe
1. **Hard timeout** - Longest code can run is 5s
2. **No filesystem/network** - Caught by regex + whitelist
3. **Function signature enforced** - Can't run arbitrary code
4. **Wrapper injection** - User can't see test data until submission
5. **Subprocess isolation** - Code runs in child process
6. **No AI** - No bias, no "gut feeling"

## 9. ADMIN OPERATIONS (SQL)

### Seed Problems
```bash
cd backend
python seed_problems.py
```

### View All Evaluations for a Candidate
```sql
SELECT 
  evaluation_id, 
  problem_id, 
  final_score, 
  verdict,
  evaluated_at
FROM evaluation_sessions
WHERE candidate_id = 'clerk_user_123'
ORDER BY evaluated_at DESC;
```

### View Evaluation Details
```sql
SELECT 
  evaluation_id,
  passed_hidden_tests,
  total_hidden_tests,
  correctness_points,
  performance_points,
  quality_points,
  penalty_points,
  final_score,
  test_results,
  verdict
FROM evaluation_sessions
WHERE evaluation_id = 'abc-def-123';
```

## 10. FRONTEND INTEGRATION (MINIMAL CHANGES)

### Current Page: `app/(candidate)/candidate/interviews/[id]/ide/page.tsx`

**Changes Required:**
1. Lock function signature at top (read-only)
2. Show editable area = function body only
3. "Run Code" button calls `/run-sample-tests` (no judge)
4. "Finish Technical" button calls `/evaluate` (judge)
5. Add result panel showing:
   - Correctness % (passed/total)
   - Performance time (max execution)
   - Final score (0-100)
   - Verdict (ACCEPTED / PARTIAL_ACCEPTED / FAILED)
   - Test breakdown (which tests passed/failed)

### No AI-Generated Feedback
- Frontend MAY summarize judge output (e.g., "3/10 tests passed")
- Frontend MUST NOT use AI to decide if it's good/bad
- Frontend MUST NOT generate hints/solutions
- All explanations are fact-based (test results)

## 11. VALIDATION CHECKLIST

Before deployment, verify:

- [ ] No AI in judge (`judge.py` has NO AI calls)
- [ ] Same code = same score (test with identical submissions)
- [ ] Timeout enforced (submit infinite loop, verify 5s timeout)
- [ ] Forbidden imports blocked (try `import os`, verify rejection)
- [ ] Function signature validated (modify function name, verify rejection)
- [ ] Hidden tests never sent to frontend (check network tab, only sample tests)
- [ ] EvaluationSession stored (query DB, verify record exists)
- [ ] Scoring formula correct (manual calculation matches result)
- [ ] Performance scoring works (slow code gets lower points)
- [ ] Quality scoring works (runtime errors reduce points)

## 12. EXAMPLE: Two Sum Evaluation

**Problem:**
```python
def solution(nums, target):
    pass
```

**Sample Tests (visible):**
```json
[
  {"input": {"nums": [2, 7, 11, 15], "target": 9}, "expected_output": [0, 1]},
  {"input": {"nums": [3, 2, 4], "target": 6}, "expected_output": [1, 2]}
]
```

**Hidden Tests (server-only):** 8 more tests

**User Submits:**
```python
def solution(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []
```

**Judge Output:**
```json
{
  "evaluation_id": "eval-xyz",
  "problem_id": "two_sum",
  "passed_hidden_tests": 8,
  "total_hidden_tests": 10,
  "correctness_points": 56.0,    // (8/10) * 70
  "performance_points": 0.0,      // Exceeded time limit (brute force O(n²))
  "quality_points": 10.0,         // No runtime errors
  "penalty_points": 0.0,          // No forbidden code
  "final_score": 66.0,            // 56 + 0 + 10 - 0
  "verdict": "PARTIAL_ACCEPTED",
  "max_execution_time": 1.2,      // Exceeded 1.0s limit
  "test_results": [
    {"ok": true, "time": 0.0001, ...},
    {"ok": true, "time": 0.0002, ...},
    ...
    {"ok": false, "time": 0.5, ...},  // Large input timeout-like
    {"ok": false, "time": 0.6, ...}
  ]
}
```

**Candidate Sees:**
- ✅ 8/10 tests passed
- ⚠️ Performance slow (exceeds time limit)
- 📊 Score: 66/100
- 🏷️ Verdict: PARTIAL_ACCEPTED
- 💡 Hint: "Consider a more efficient algorithm (hash map approach)"

**No AI decided this.** It's all math.

---

## References

- **Backend Judge**: `backend/services/judge.py`
- **Database Models**: `backend/models.py` (`Problem`, `EvaluationSession`)
- **API Routes**: `backend/routes/assessments.py` (new endpoints)
- **Problem Seeding**: `backend/seed_problems.py`
- **Frontend IDE**: `app/(candidate)/candidate/interviews/[id]/ide/page.tsx` (minimal changes)
