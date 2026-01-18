import requests
import time
from typing import List, Dict

# --------------------------------------------------
# CONFIG
# --------------------------------------------------

# Judge0 CE running via docker-compose in WSL
JUDGE0_URL = "http://localhost:2358"

# Language mapping (lock this, HR selects from these)
LANGUAGE_MAP = {
    "python": 71,   # Python 3
    "cpp": 54,      # C++
    "java": 62      # Java
}

# Execution limits (defensive defaults)
CPU_TIME_LIMIT = 2        # seconds
MEMORY_LIMIT = 128000     # KB (~128 MB)
MAX_WAIT_SECONDS = 10     # safety timeout


# --------------------------------------------------
# CORE EXECUTION FUNCTION
# --------------------------------------------------

def execute_code(
    *,
    source_code: str,
    language: str,
    test_cases: List[Dict[str, str]]
) -> Dict:
    """
    Executes user-submitted code against hidden test cases using Judge0.

    Judge0 is used ONLY as an execution sandbox.
    All evaluation logic is owned by this backend.

    Args:
        source_code (str): Candidate code
        language (str): Language key (python/cpp/java)
        test_cases (List[Dict]): [{"input": "...", "expected": "..."}]

    Returns:
        {
            "passed": int,
            "total": int,
            "score": float,
            "results": [
                {
                    "input": "...",
                    "expected": "...",
                    "stdout": "...",
                    "stderr": "...",
                    "status": "...",
                    "passed": bool
                }
            ]
        }
    """

    if language not in LANGUAGE_MAP:
        raise ValueError(f"Unsupported language: {language}")

    if not test_cases:
        raise ValueError("No test cases provided")

    language_id = LANGUAGE_MAP[language]

    passed_count = 0
    results = []

    for index, tc in enumerate(test_cases):
        submission_payload = {
            "language_id": language_id,
            "source_code": source_code,
            "stdin": tc.get("input", ""),
            "expected_output": None,  # IMPORTANT: we do comparison ourselves
            "cpu_time_limit": CPU_TIME_LIMIT,
            "memory_limit": MEMORY_LIMIT
        }

        try:
            response = requests.post(
                f"{JUDGE0_URL}/submissions?wait=true",
                json=submission_payload,
                headers={"Content-Type": "application/json"},
                timeout=MAX_WAIT_SECONDS
            )
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"Judge0 request failed: {str(e)}")

        result = response.json()

        stdout = (result.get("stdout") or "").strip()
        stderr = (result.get("stderr") or "").strip()
        status_desc = result.get("status", {}).get("description", "UNKNOWN")

        expected = tc.get("expected", "").strip()

        is_passed = (
            status_desc == "Accepted"
            and stderr == ""
            and stdout == expected
        )

        if is_passed:
            passed_count += 1

        results.append({
            "test_case_index": index,
            "input": tc.get("input", ""),
            "expected": expected,
            "stdout": stdout,
            "stderr": stderr,
            "status": status_desc,
            "passed": is_passed
        })

    total = len(test_cases)
    score = round((passed_count / total) * 100, 2)

    return {
        "passed": passed_count,
        "total": total,
        "score": score,
        "results": results
    }
