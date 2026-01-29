import os
from dotenv import load_dotenv
from google import genai

# Load API Key
load_dotenv()
KEY = os.getenv("GENAI_API_KEY")

if not KEY:
    print("Error: GENAI_API_KEY not found in .env")
    exit()

print(f"Using Key: {KEY[:5]}...")

client = genai.Client(api_key=KEY)

print("\n--- AVAILABLE MODELS ---")
try:
    # List all models available to your API key
    for model in client.models.list():
        print(f"- {model.name}")
        
except Exception as e:
    print(f"Error listing models: {e}")