"""
Test AI Summary Generation
"""
import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

def test_summary_generation():
    print("Testing AI Summary Generation...")
    
    hf_token = os.getenv("HF_TOKEN")
    if not hf_token:
        print("Error: HF_TOKEN not found")
        return

    prompt = """Analyze this resume for the job position.
    
JOB: Full Stack Developer
REQUIRED SKILLS: React, Node.js, Python
MIN EXPERIENCE: 3 years

RESUME:
Jane Doe
jane@example.com
Senior Developer with 5 years experience in React and Node.js.
Proficient in Python, AWS, and Docker.
Previous role: Lead Dev at Tech Co.

Respond with JSON only:
{"name": "candidate name", "email": "email", "summary": "professional summary (2-3 sentences)", "decision": "YES/NO", "reasoning": "detailed explanation"}"""

    url = "https://router.huggingface.co/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {hf_token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "meta-llama/Llama-3.2-3B-Instruct",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 500,
        "temperature": 0.3
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            print("\nAI Response:")
            print(content)
            
            # Check if summary exists
            if '"summary":' in content:
                print("\n✅ SUCCESS: 'summary' field found in response")
            else:
                print("\n❌ FAILURE: 'summary' field NOT found")
        else:
            print(f"Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_summary_generation()
