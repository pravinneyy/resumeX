import os
import requests
import time
from dotenv import load_dotenv

load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN")
API_URL = "https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli"
HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"}

mock_resume = """
John Doe is a Senior Software Engineer with 5 years of experience in Python, FastAPI, and React.
He has built scalable microservices and deployed applications on AWS.
He is a strong team player and has led a team of 3 developers.
"""
labels = ["Qualified Candidate", "Not Qualified"]

def test_huggingface_connection():
    print("--- 🔍 STARTING DEBUG (Direct Router Request) ---")
    
    if not HF_TOKEN:
        print("❌ ERROR: HF_TOKEN not found.")
        return

    print(f"✅ Token Found: {HF_TOKEN[:5]}... (hidden)")
    print(f"📡 Connecting to: {API_URL}")
    print("⏳ Sending request... (If the model is 'cold', this can take up to 60 seconds. Please wait.)")

    payload = {
        "inputs": mock_resume,
        "parameters": {"candidate_labels": labels, "multi_label": False}
    }

    try:
        start_time = time.time()
        # Add a 90-second timeout to prevent infinite hanging
        response = requests.post(API_URL, headers=HEADERS, json=payload, timeout=90)
        elapsed = round(time.time() - start_time, 2)
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ SUCCESS! (Took {elapsed}s)")
            
            if "labels" in data:
                print(f"🧠 AI Verdict: {data['labels'][0]} ({round(data['scores'][0]*100, 1)}%)")
            else:
                print("⚠️ Unexpected format:", data)

        elif response.status_code == 503:
             print(f"\nzzz Model is loading (503). It needs more time. Try running this script again in 30 seconds.")
        
        else:
            print(f"\n❌ ERROR: Status {response.status_code}")
            print(f"   - Response: {response.text}")

    except requests.exceptions.Timeout:
        print("\n❌ TIMEOUT: The request took too long (>90s). Check your internet connection.")
    except Exception as e:
        print(f"\n❌ EXCEPTION: {str(e)}")

if __name__ == "__main__":
    test_huggingface_connection()