# backend/clear_all_data.py
# This script CLEARS ALL DATA but KEEPS TABLE STRUCTURE
from db import SessionLocal
from sqlalchemy import text

def clear_all_data():
    """Delete all rows from all tables but keep table structure intact"""
    db = SessionLocal()
    
    try:
        # Order matters due to foreign key constraints
        tables_to_clear = [
            "anti_cheat_logs",
            "evaluation_sessions",
            "psychometric_submissions",
            "assessment_submissions",
            "job_assessments",
            "applications",
            "jobs",
            "problems",
            "candidates",
            "recruiters"
        ]
        
        print("🗑️  CLEARING ALL DATA FROM ALL TABLES...")
        print("=" * 50)
        
        deleted_counts = {}
        
        for table_name in tables_to_clear:
            try:
                result = db.execute(text(f"DELETE FROM {table_name}"))
                count = result.rowcount
                deleted_counts[table_name] = count
                print(f"✅ {table_name}: Deleted {count} rows")
            except Exception as e:
                print(f"❌ {table_name}: Error - {str(e)}")
                deleted_counts[table_name] = f"Error: {str(e)}"
        
        db.commit()
        
        print("=" * 50)
        print("✅ ALL DATA CLEARED SUCCESSFULLY!")
        print("\nSummary:")
        for table, count in deleted_counts.items():
            print(f"  • {table}: {count}")
        
        return deleted_counts
        
    except Exception as e:
        db.rollback()
        print(f"❌ CRITICAL ERROR: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    clear_all_data()
