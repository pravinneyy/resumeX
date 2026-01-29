from db import SessionLocal
from models import JobAssessment
import json

db = SessionLocal()
job_id = 1  # FIXING JOB ID 1 (based on your URL)

print(f"🔧 Fixing Question Data for Job {job_id}...")

assessment = db.query(JobAssessment).filter(JobAssessment.job_id == job_id).first()

if assessment:
    # DEFINING CLEAR DATA
    questions_data = [
        {
            "title": "Two Sum", 
            "problem_text": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.", 
            "test_input": "nums = [2,7,11,15], target = 9", 
            "test_output": "[0,1]", 
            "points": 10,
            "starter_code": "def solve(nums, target):\n    # Write your solution here\n    pass"
        }
    ]

    # FORCE UPDATE
    # We dump it to JSON string to ensure it's stored safely
    assessment.questions = json.dumps(questions_data)
    db.commit()
    print("✅ Job 1 Data Updated Successfully!")
else:
    print("❌ Assessment for Job 1 not found.")