"""
Script to seed technical questions from JSON file into database.
Run: python seed_technical_questions.py
"""
import json
import os
from db import SessionLocal
from models import TechnicalQuestion

def seed():
    db = SessionLocal()
    
    # Check if already seeded
    count = db.query(TechnicalQuestion).count()
    print(f"Current count in technical_questions table: {count}")
    
    if count > 0:
        print("Already seeded! Skipping...")
        db.close()
        return
    
    # Load JSON file
    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(script_dir, "..", "technical_text_questions.json")
    
    print(f"Loading from: {json_path}")
    
    if not os.path.exists(json_path):
        print(f"ERROR: File not found at {json_path}")
        db.close()
        return
    
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    added = 0
    for section_data in data.get("sections", []):
        section_name = section_data.get("section")
        question_type = section_data.get("type", "text")
        
        print(f"  Processing section: {section_name}")
        
        for q in section_data.get("questions", []):
            new_q = TechnicalQuestion(
                section=section_name,
                question_type=question_type,
                question=q.get("question"),
                keywords=q.get("keywords", []),
                difficulty="medium"
            )
            db.add(new_q)
            added += 1
    
    db.commit()
    db.close()
    
    print(f"\n✅ Successfully seeded {added} technical questions!")

if __name__ == "__main__":
    seed()
