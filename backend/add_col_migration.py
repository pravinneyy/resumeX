from db import engine
from sqlalchemy import text

def add_col():
    with engine.connect() as conn:
        try:
            # Postgres syntax
            conn.execute(text("ALTER TABLE job_assessments ADD COLUMN psychometric_ids JSON DEFAULT '[]'"))
            conn.commit()
            print("Column added successfully.")
        except Exception as e:
            print(f"Column addition skipped or failed (likely already exists): {e}")

if __name__ == "__main__":
    add_col()
