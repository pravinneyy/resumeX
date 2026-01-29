# backend/test_supabase.py
import os
from dotenv import load_dotenv
from supabase import create_client

# 1. Force load .env
load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

print("--- Supabase Connection Test ---")
print(f"URL Found: {'Yes' if url else 'No'}")
print(f"Key Found: {'Yes' if key else 'No'}")

if url and key:
    try:
        print("Attempting to connect...")
        supabase = create_client(url, key)
        
        # Try to list buckets to verify access
        buckets = supabase.storage.list_buckets()
        print("✅ Connection Successful!")
        print(f"Buckets found: {len(buckets)}")
        
        # Check specifically for 'resumes'
        resume_bucket = next((b for b in buckets if b.name == 'resumes'), None)
        if resume_bucket:
            print("✅ 'resumes' bucket exists.")
        else:
            print("❌ 'resumes' bucket NOT found. Please create it in Supabase Dashboard.")
            
    except Exception as e:
        print(f"❌ Connection Failed: {e}")
else:
    print("❌ Missing .env variables. Make sure SUPABASE_URL and SUPABASE_KEY are set.")