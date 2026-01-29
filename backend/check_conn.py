import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# 1. Load the exact same environment variables your app uses
load_dotenv()

url = os.getenv("DATABASE_URL")
print(f"\n🔎 CONNECTING TO: {url}")

if not url:
    print("❌ ERROR: DATABASE_URL is missing in .env")
    exit()

if "sqlite" in url:
    print("⚠️ WARNING: You are still using SQLite! (Local file)")
    print("   Please update .env with your Supabase URL.")

try:
    engine = create_engine(url)
    with engine.connect() as conn:
        print("✅ Connection Successful!")
        
        # 2. Check if the table exists
        result = conn.execute(text("SELECT to_regclass('public.job_assessments');"))
        if not result.scalar():
            print("❌ ERROR: Table 'job_assessments' does NOT exist in this database.")
        else:
            print("✅ Table 'job_assessments' found.")
            
            # 3. Check for the specific assessment
            # We check for job_id = 1 because that is what your screenshot shows
            result = conn.execute(text("SELECT id, title, job_id FROM job_assessments WHERE job_id = 1;"))
            rows = result.fetchall()
            
            if len(rows) == 0:
                print("❌ ERROR: Table exists, but it has NO ASSESSMENT for job_id=1.")
                print("   (This explains why you get 'Assessment not found')")
            else:
                print(f"✅ FOUND DATA: {rows}")
                print("   If you see this, the App should work. Try restarting the server.")

except Exception as e:
    print(f"❌ CONNECTION FAILED: {e}")