import os
from dotenv import load_dotenv
from google import genai

# 1. Load Environment Variables
load_dotenv()
KEY = os.getenv("GENAI_API_KEY")

print("------------------------------------------------")
print(f"1. Checking API Key: {'FOUND' if KEY else 'MISSING'}")
if KEY:
    print(f"   Key starts with: {KEY[:5]}...")
else:
    print("   ERROR: Create a .env file and add GENAI_API_KEY=AIza...")
    exit()

# 2. Test Connection
print("\n2. Testing Gemini Connection...")
try:
    client = genai.Client(api_key=KEY)
    
    # Simple Hello World test
    response = client.models.generate_content(
        model='gemini-1.5-flash', 
        contents='Reply with "AI is working!" if you can read this.'
    )
    
    print(f"   SUCCESS! AI Reply: {response.text}")

except Exception as e:
    print(f"   FAILURE: {str(e)}")
    print("\n   SUGGESTION: Try changing the model name in routes/candidates.py")
    print("   Common valid models: gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash-exp")

print("------------------------------------------------")