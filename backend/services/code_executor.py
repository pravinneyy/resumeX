import requests
import json
import time

# Piston API Endpoint (Public & Free)
# Documentation: https://piston.readthedocs.io/en/latest/api-v2/
PISTON_API_URL = "https://emkc.org/api/v2/piston/execute"

# Map frontend language names to Piston's expected "language" and "version"
# You can check supported languages: GET https://emkc.org/api/v2/piston/runtimes
LANGUAGE_CONFIG = {
    "python": {"language": "python", "version": "3.10.0"},
    "javascript": {"language": "javascript", "version": "18.15.0"},
    "java": {"language": "java", "version": "15.0.2"},
    "cpp": {"language": "c++", "version": "10.2.0"},
    "go": {"language": "go", "version": "1.16.2"},
}

def calculate_complexity(code: str) -> int:
    """
    Simple heuristic: counts indentation depth to guess complexity.
    Deeper nesting = Higher complexity score (bad).
    """
    max_depth = 0
    for line in code.split('\n'):
        # Count leading spaces (assuming 4 spaces per indent)
        indent = len(line) - len(line.lstrip())
        current_depth = indent // 4 
        if current_depth > max_depth:
            max_depth = current_depth
    return max_depth

def execute_code(code: str, language: str, stdin: str = ""):
    """
    Sends code to Piston API for execution and calculates efficiency metrics.
    """
    lang_config = LANGUAGE_CONFIG.get(language.lower())
    
    if not lang_config:
        return {
            "status": "error", 
            "output": f"Language '{language}' not supported. Supported: {list(LANGUAGE_CONFIG.keys())}"
        }

    payload = {
        "language": lang_config["language"],
        "version": lang_config["version"],
        "files": [{"content": code}],
        "stdin": stdin,
        "run_timeout": 3000, # 3 seconds hard limit
    }

    start_time = time.time()
    
    try:
        response = requests.post(PISTON_API_URL, json=payload)
        end_time = time.time()
        
        if response.status_code != 200:
            return {"status": "error", "output": f"Piston API Error: {response.text}"}
        
        data = response.json()
        run_stage = data.get("run", {})
        
        output = run_stage.get("stdout", "") + run_stage.get("stderr", "")
        exit_code = run_stage.get("code")
        
        # --- EFFICIENCY CALCULATION ---
        execution_duration = end_time - start_time
        
        # 1. Time Score (Target: < 1.0s)
        # If it runs in 0s, score is 100. If 1.0s, score is 0.
        time_score = max(0, 100 * (1 - execution_duration))
        
        # 2. Complexity Score (Target: Depth < 3)
        # Depth 0 = 100, Depth 1 = 90, etc.
        depth = calculate_complexity(code)
        complexity_score = max(0, 100 - (10 * depth))
        
        # 3. Combined Efficiency Score
        efficiency_score = int((0.6 * time_score) + (0.4 * complexity_score))

        return {
            "status": "success" if exit_code == 0 else "failed",
            "output": output.strip(),
            "execution_time": round(execution_duration, 3),
            "efficiency_score": efficiency_score,
            "metrics": {
                "time_score": int(time_score),
                "complexity_score": int(complexity_score)
            }
        }

    except Exception as e:
        return {"status": "error", "output": str(e)}