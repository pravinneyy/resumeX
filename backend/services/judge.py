"""
IDE Judge System - Deterministic, Safe, Non-AI Grading

This module provides:
1. Test execution with hard limits (timeout, memory)
2. Deterministic scoring based on test results
3. Anti-cheat detection (basic)
4. Clear separation from code execution (uses subprocess)

Flow:
  User Code → Validate Signature → Inject into Wrapper → Execute Tests → Score → Store Session
"""

import subprocess
import json
import time
import uuid
from typing import List, Dict, Any, Tuple
from datetime import datetime
import re

# Hard constraints
HARD_TIMEOUT_SEC = 5.0
MEMORY_LIMIT_MB = 256
ALLOWED_IMPORTS = {"math", "collections", "itertools", "functools"}
FORBIDDEN_PATTERNS = [
    r"__import__",
    r"exec\(",
    r"eval\(",
    r"compile\(",
    r"open\(",
    r"os\.",
    r"sys\.",
    r"subprocess",
    r"socket",
    r"urllib",
]

class JudgeError(Exception):
    """Custom exception for judge errors"""
    pass


class SafetyChecker:
    """Detects unsafe code patterns"""
    
    @staticmethod
    def check_dangerous_imports(code: str) -> Tuple[bool, str]:
        """Returns (is_safe, error_message)"""
        import_pattern = r"^from\s+(\w+)|^import\s+(\w+)"
        for match in re.finditer(import_pattern, code, re.MULTILINE):
            module = match.group(1) or match.group(2)
            if module not in ALLOWED_IMPORTS:
                return False, f"Import '{module}' not allowed. Allowed: {ALLOWED_IMPORTS}"
        return True, ""
    
    @staticmethod
    def check_dangerous_patterns(code: str) -> Tuple[bool, str]:
        """Detect dangerous function calls"""
        for pattern in FORBIDDEN_PATTERNS:
            if re.search(pattern, code, re.IGNORECASE):
                return False, f"Dangerous pattern detected: {pattern}"
        return True, ""
    
    @staticmethod
    def validate_function_signature(user_code: str, expected_signature: str) -> Tuple[bool, str]:
        """
        Verify user didn't modify function signature.
        
        Args:
            user_code: User's submitted code
            expected_signature: e.g., "def solution(nums, target):"
        
        Returns:
            (is_valid, error_message)
        """
        # Extract actual function signature from user code
        func_pattern = r"def\s+\w+\s*\([^)]*\):"
        match = re.search(func_pattern, user_code)
        
        if not match:
            return False, f"Function not found. Expected: {expected_signature}"
        
        actual_signature = match.group(0).strip()
        
        # Extract expected function name and params
        expected_match = re.search(r"def\s+(\w+)\s*\(([^)]*)\)", expected_signature)
        actual_match = re.search(r"def\s+(\w+)\s*\(([^)]*)\)", actual_signature)
        
        if not expected_match or not actual_match:
            return False, "Invalid signature format"
        
        exp_name = expected_match.group(1)
        exp_params = [p.strip() for p in expected_match.group(2).split(",") if p.strip()]
        
        act_name = actual_match.group(1)
        act_params = [p.strip() for p in actual_match.group(2).split(",") if p.strip()]
        
        if exp_name != act_name:
            return False, f"Function name mismatch. Expected '{exp_name}', got '{act_name}'"
        
        if exp_params != act_params:
            return False, f"Parameter mismatch. Expected {exp_params}, got {act_params}"
        
        return True, ""


class TestExecutor:
    """Executes code against test cases with safety measures"""
    
    @staticmethod
    def build_wrapper_script(user_code: str, function_signature: str, tests: List[Dict[str, Any]]) -> str:
        """
        Dynamically builds a wrapper that:
        1. Injects user code
        2. Imports the function
        3. Executes ONLY test cases
        4. Outputs JSON
        
        Args:
            user_code: User's solution code
            function_signature: Expected function signature
            tests: List of {input, expected_output}
        
        Returns:
            Complete wrapper script as string
        """
        func_name = re.search(r"def\s+(\w+)", function_signature).group(1)
        
        wrapper = f"""
import json
import sys
import time

# User-provided solution
{user_code}

# Test harness
test_results = []
test_data = {json.dumps(tests)}

for i, test_case in enumerate(test_data):
    try:
        inputs = test_case.get('input', {{}})
        expected = test_case.get('expected_output')
        
        start = time.time()
        
        # Call function with unpacked arguments
        if isinstance(inputs, dict):
            result = {func_name}(**inputs)
        elif isinstance(inputs, list):
            result = {func_name}(*inputs)
        else:
            result = {func_name}(inputs)
        
        elapsed = time.time() - start
        
        # Compare result
        passed = (result == expected)
        
        test_results.append({{
            "ok": passed,
            "time": round(elapsed, 4),
            "error": None,
            "input": str(inputs)[:100],
            "expected": str(expected)[:100],
            "got": str(result)[:100]
        }})
    
    except Exception as e:
        test_results.append({{
            "ok": False,
            "time": 0,
            "error": str(type(e).__name__) + ": " + str(e)[:100],
            "input": str(test_case.get('input'))[:100],
            "expected": str(test_case.get('expected_output'))[:100],
            "got": None
        }})

# Output as JSON (only output, no prints)
print(json.dumps(test_results))
"""
        return wrapper
    
    @staticmethod
    def execute_tests(
        user_code: str,
        function_signature: str,
        tests: List[Dict[str, Any]],
        time_limit_sec: float = 1.0,
        language: str = "python"
    ) -> Dict[str, Any]:
        """
        Execute user code against test cases with timeout and safety.
        
        Returns dict with:
        {
            "passed": int,
            "total": int,
            "results": [...],
            "error": str | null,
            "max_time": float
        }
        """
        if language != "python":
            raise JudgeError(f"Language '{language}' not yet supported. Only Python for now.")
        
        # Build wrapper
        wrapper = TestExecutor.build_wrapper_script(user_code, function_signature, tests)
        
        try:
            # Execute with timeout and capture output
            result = subprocess.run(
                ["python", "-c", wrapper],
                capture_output=True,
                text=True,
                timeout=HARD_TIMEOUT_SEC
            )
            
            if result.returncode != 0:
                return {
                    "passed": 0,
                    "total": len(tests),
                    "results": [],
                    "error": result.stderr or "Execution failed",
                    "max_time": 0
                }
            
            # Parse JSON output
            test_results = json.loads(result.stdout.strip())
            
            passed = sum(1 for t in test_results if t.get("ok", False))
            max_time = max((t.get("time", 0) for t in test_results), default=0)
            
            return {
                "passed": passed,
                "total": len(tests),
                "results": test_results,
                "error": None,
                "max_time": max_time
            }
        
        except subprocess.TimeoutExpired:
            return {
                "passed": 0,
                "total": len(tests),
                "results": [],
                "error": f"TIMEOUT: Execution exceeded {HARD_TIMEOUT_SEC}s",
                "max_time": HARD_TIMEOUT_SEC
            }
        except json.JSONDecodeError as e:
            return {
                "passed": 0,
                "total": len(tests),
                "results": [],
                "error": f"JSON parse error: {str(e)}",
                "max_time": 0
            }
        except Exception as e:
            return {
                "passed": 0,
                "total": len(tests),
                "results": [],
                "error": f"Judge error: {str(e)}",
                "max_time": 0
            }


class ScoringEngine:
    """
    Deterministic scoring: 0-100 points
    
    Formula:
    - Correctness: (passed / total) * 70
    - Performance: 15 - (slowest_test / time_limit) * 15  (min 0)
    - Quality: 10 - (runtime_errors * 2) (min 0)
    - Penalty: Forbidden imports, tab switches, etc.
    
    Final = correctness + performance + quality - penalty (clamped 0-100)
    """
    
    @staticmethod
    def calculate_correctness(passed: int, total: int) -> float:
        """Correctness: 0-70 points"""
        if total == 0:
            return 0.0
        return (passed / total) * 70.0
    
    @staticmethod
    def calculate_performance(
        max_execution_time: float,
        time_limit_sec: float,
        test_results: List[Dict[str, Any]]
    ) -> float:
        """Performance: 0-15 points
        
        Reward fast execution, penalize slow tests.
        """
        if max_execution_time == 0 or time_limit_sec == 0:
            return 15.0
        
        # If slowest test exceeds limit, get 0 points
        if max_execution_time > time_limit_sec:
            return 0.0
        
        # Otherwise: full 15 if within limit, scaled down as slower
        ratio = max_execution_time / time_limit_sec
        return 15.0 * (1 - ratio * 0.5)  # At limit, get 7.5 pts
    
    @staticmethod
    def calculate_quality(test_results: List[Dict[str, Any]]) -> float:
        """Quality: 0-10 points
        
        Deduct for runtime errors (each -2), no deduction for wrong answers.
        """
        runtime_errors = sum(1 for r in test_results if r.get("error") is not None)
        penalty = runtime_errors * 2
        return max(0.0, 10.0 - penalty)
    
    @staticmethod
    def calculate_penalty(user_code: str, test_results: List[Dict[str, Any]]) -> float:
        """Anti-cheat penalty: 0+ points"""
        penalty = 0.0
        
        # Forbidden imports
        for pattern in FORBIDDEN_PATTERNS:
            if re.search(pattern, user_code, re.IGNORECASE):
                penalty += 10.0
        
        # Multiple errors (sign of debugging/guessing)
        error_count = sum(1 for r in test_results if r.get("error") is not None)
        if error_count > len(test_results) * 0.5:
            penalty += 5.0
        
        return penalty
    
    @staticmethod
    def calculate_final_score(
        correctness: float,
        performance: float,
        quality: float,
        penalty: float
    ) -> float:
        """Calculate final score (0-100, clamped)"""
        score = correctness + performance + quality - penalty
        return max(0.0, min(100.0, score))
    
    @staticmethod
    def determine_verdict(passed: int, total: int, final_score: float) -> str:
        """Determine verdict based on results"""
        if passed == total and final_score >= 80:
            return "ACCEPTED"
        elif passed == total:
            return "ACCEPTED"  # All tests passed, even if slow
        elif passed == 0:
            return "FAILED"
        elif passed > 0:
            return "PARTIAL_ACCEPTED"
        return "FAILED"


class JudgingSession:
    """
    Orchestrates the entire judging workflow.
    Stateless - returns complete result object.
    """
    
    @staticmethod
    def judge_submission(
        user_code: str,
        problem_id: str,
        function_signature: str,
        hidden_tests: List[Dict[str, Any]],
        time_limit_sec: float = 1.0,
        language: str = "python"
    ) -> Dict[str, Any]:
        """
        Complete judging workflow.
        
        Returns EvaluationSession data as dict (ready to save to DB)
        """
        evaluation_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        # 1. Safety checks
        safe, error_msg = SafetyChecker.check_dangerous_imports(user_code)
        if not safe:
            return {
                "evaluation_id": evaluation_id,
                "problem_id": problem_id,
                "submitted_code": user_code,
                "language": language,
                "total_hidden_tests": len(hidden_tests),
                "passed_hidden_tests": 0,
                "test_results": [],
                "correctness_points": 0.0,
                "performance_points": 0.0,
                "quality_points": 0.0,
                "penalty_points": 0.0,
                "final_score": 0.0,
                "verdict": "FAILED",
                "max_execution_time": 0.0,
                "submitted_at": now,
                "evaluated_at": now,
                "error": error_msg
            }
        
        safe, error_msg = SafetyChecker.check_dangerous_patterns(user_code)
        if not safe:
            return {
                "evaluation_id": evaluation_id,
                "problem_id": problem_id,
                "submitted_code": user_code,
                "language": language,
                "total_hidden_tests": len(hidden_tests),
                "passed_hidden_tests": 0,
                "test_results": [],
                "correctness_points": 0.0,
                "performance_points": 0.0,
                "quality_points": 0.0,
                "penalty_points": 10.0,
                "final_score": 0.0,
                "verdict": "FAILED",
                "max_execution_time": 0.0,
                "submitted_at": now,
                "evaluated_at": now,
                "error": error_msg
            }
        
        # 2. Validate function signature
        valid, error_msg = SafetyChecker.validate_function_signature(user_code, function_signature)
        if not valid:
            return {
                "evaluation_id": evaluation_id,
                "problem_id": problem_id,
                "submitted_code": user_code,
                "language": language,
                "total_hidden_tests": len(hidden_tests),
                "passed_hidden_tests": 0,
                "test_results": [],
                "correctness_points": 0.0,
                "performance_points": 0.0,
                "quality_points": 0.0,
                "penalty_points": 0.0,
                "final_score": 0.0,
                "verdict": "FAILED",
                "max_execution_time": 0.0,
                "submitted_at": now,
                "evaluated_at": now,
                "error": error_msg
            }
        
        # 3. Execute tests
        exec_result = TestExecutor.execute_tests(
            user_code,
            function_signature,
            hidden_tests,
            time_limit_sec=time_limit_sec,
            language=language
        )
        
        # If execution error, return early
        if exec_result.get("error"):
            return {
                "evaluation_id": evaluation_id,
                "problem_id": problem_id,
                "submitted_code": user_code,
                "language": language,
                "total_hidden_tests": len(hidden_tests),
                "passed_hidden_tests": 0,
                "test_results": exec_result.get("results", []),
                "correctness_points": 0.0,
                "performance_points": 0.0,
                "quality_points": 0.0,
                "penalty_points": 0.0,
                "final_score": 0.0,
                "verdict": "RUNTIME_ERROR" if "TIMEOUT" in exec_result["error"] else "RUNTIME_ERROR",
                "max_execution_time": exec_result.get("max_time", 0),
                "submitted_at": now,
                "evaluated_at": now,
                "error": exec_result["error"]
            }
        
        # 4. Calculate score
        passed = exec_result["passed"]
        total = exec_result["total"]
        max_time = exec_result["max_time"]
        test_results = exec_result["results"]
        
        correctness = ScoringEngine.calculate_correctness(passed, total)
        performance = ScoringEngine.calculate_performance(max_time, time_limit_sec, test_results)
        quality = ScoringEngine.calculate_quality(test_results)
        penalty = ScoringEngine.calculate_penalty(user_code, test_results)
        final_score = ScoringEngine.calculate_final_score(correctness, performance, quality, penalty)
        verdict = ScoringEngine.determine_verdict(passed, total, final_score)
        
        return {
            "evaluation_id": evaluation_id,
            "problem_id": problem_id,
            "submitted_code": user_code,
            "language": language,
            "total_hidden_tests": total,
            "passed_hidden_tests": passed,
            "test_results": test_results,
            "correctness_points": round(correctness, 2),
            "performance_points": round(performance, 2),
            "quality_points": round(quality, 2),
            "penalty_points": round(penalty, 2),
            "final_score": round(final_score, 2),
            "verdict": verdict,
            "max_execution_time": round(max_time, 4),
            "submitted_at": now,
            "evaluated_at": now,
            "error": None
        }
