import json
import os
import sys

# Add current directory to path to allow imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from db import SessionLocal, engine, Base
from models import PsychometricQuestion

# Create table if not exists
Base.metadata.create_all(bind=engine)

def seed_psychometric():
    # Load JSON - looking in root directory (parent of backend)
    json_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "psychometric_test_questions_all.json")
    
    if not os.path.exists(json_path):
        print(f"File not found: {json_path}")
        print(f"Current dir: {os.getcwd()}")
        return

    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading JSON: {e}")
        return

    db: Session = SessionLocal()
    
    try:
        # Check if already seeded but check if count matches? Or simple > 0 check
        count = db.query(PsychometricQuestion).count()
        if count > 0:
            print(f"Psychometric questions already seeded ({count} found). Skipping.")
            return

        print(f"Seeding {len(data)} questions...")
        for item in data:
            q = PsychometricQuestion(
                # Use item ID or let DB auto-increment? JSON has IDs, safest to use them if unique
                # But if we want to avoid conflicts, we can skip ID. 
                # Let's try to preserve ID if possible, but usually safer to let DB handle it 
                # unless mapping is critical. The JSON IDs are 1..30.
                section=item.get("section"),
                question=item.get("question"),
                context=item.get("context"),
                options=item.get("options"),
                answer=item.get("answer"),
                explanation=item.get("explanation")
            )
            db.add(q)
        
        db.commit()
        print("Seeding complete!")
    except Exception as e:
        print(f"Seeding error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_psychometric()
