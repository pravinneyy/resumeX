import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("❌ Error: Missing SUPABASE_URL or SUPABASE_KEY in .env")
    exit()

try:
    print(f"Connecting to: {url}")
    supabase = create_client(url, key)

    # Try to upload a dummy file
    print("🚀 Attempting to upload 'test.txt'...")
    
    data = b"Hello Supabase!"
    res = supabase.storage.from_("resumes").upload("teswwwt.txt", data, {"content-type": "text/plain"})
    
    print("✅ Upload Successful!")
    print(f"Response: {res}")
    
    # Get Public URL
    public_url = supabase.storage.from_("resumes").get_public_url("teswwwt.txt")
    print(f"🎉 File accessible at: {public_url}")

except Exception as e:
    # If it fails, print the REAL error
    print(f"❌ Upload Failed: {e}")
    if "row-level security" in str(e):
        print("👉 HINT: You missed the 'Policy' step. Go to Storage > Policies > New Policy > Check INSERT/SELECT.")
    elif "The resource was not found" in str(e):
        print("👉 HINT: The bucket name 'resumes' is wrong or doesn't exist.")