import requests
import json
import time

# Judge0 Language IDs (Standard Mapping)
# Full list: https://ce.judge0.com/#/runtimes
LANGUAGE_MAP = {
    "python": 71,  # Python 3.8.1
    "javascript": 63, # Node.js 12.14.0
    "java": 62,    # Java (OpenJDK 13.0.1)
    "cpp": 54,     # C++ (GCC 9.2.0)
    "go": 60,      # Go (1.13.5)
}

# --- CONFIGURATION ---
# 1. Get a key from: https://rapidapi.com/judge0-official/api/judge0-ce
API_KEY = "YOUR_RAPIDAPI_KEY_HERE"  # <--- PASTE YOUR KEY HERE
BASE_URL = "https://judge0-ce.p.rapidapi.com"

def execute_code(code: str, language: str, stdin: str = ""):
    """
    Sends code to Judge0 API and polls for the result.
    """
    lang_id = LANGUAGE_MAP.get(language.lower())
    
    if not lang_id:
        return {
            "status": "error", 
            "output": f"Language '{language}' not supported. Supported: {list(LANGUAGE_MAP.keys())}"
        }

    headers = {
        "content-type": "application/json",
        "X-RapidAPI-Key": API_KEY,
        "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com"
    }

    # 1. SUBMIT CODE
    payload = {
        "language_id": lang_id,
        "source_code": code,
        "stdin": stdin
    }
    
    try:
        response = requests.post(f"{BASE_URL}/submissions?base64_encoded=false&wait=false", json=payload, headers=headers)
        if response.status_code != 201:
            return {"status": "error", "output": f"API Error: {response.text}"}
        
        token = response.json().get("token")
        
        # 2. POLL FOR RESULT (Wait for execution to finish)
        # Judge0 is async, so we wait 1-2 seconds for the container to run
        result = None
        for _ in range(5): 
            time.sleep(1) # Wait 1 sec
            check_res = requests.get(f"{BASE_URL}/submissions/{token}?base64_encoded=false", headers=headers)
            data = check_res.json()
            
            # Status ID 3 means "Accepted" (Finished successfully)
            # Status ID > 3 means Error (Runtime Error, Compilation Error, etc)
            status_id = data.get("status", {}).get("id", 0)
            
            if status_id >= 3: 
                result = data
                break
        
        if not result:
            return {"status": "error", "output": "Execution timed out"}

        # 3. PARSE OUTPUT
        # stdout = normal output, stderr = error output, compile_output = syntax errors
        output = result.get("stdout") or result.get("stderr") or result.get("compile_output")
        
        # Check if it ran successfully (Status ID 3)
        is_success = result.get("status", {}).get("id") == 3
        
        return {
            "status": "success" if is_success else "failed",
            "output": output,
            "memory": result.get("memory"),
            "time": result.get("time")
        }

    except Exception as e:
        return {"status": "error", "output": str(e)}