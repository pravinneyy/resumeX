from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# 1. Load Environment Variables
load_dotenv()

# 2. Import your routes
# Make sure these files exist in your 'routes' folder
from routes import auth, jobs, candidates, applications, assessments

app = FastAPI()

# 3. CRITICAL: Configure CORS
# This allows your Next.js frontend to send the "Authorization" token
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"], # Your Frontend URL
    allow_credentials=True,
    allow_methods=["*"], # Allow all methods (GET, POST, PUT, DELETE)
    allow_headers=["*"], # Allow all headers (Authorization, Content-Type)
)

# 4. Include the Routers
app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(jobs.router, prefix="/api", tags=["Jobs"])
app.include_router(candidates.router, prefix="/api", tags=["Candidates"])
app.include_router(applications.router, prefix="/api", tags=["Applications"])
app.include_router(assessments.router, prefix="/api", tags=["Assessments"])

@app.get("/")
def read_root():
    return {"message": "ResumeX Backend is Running Securely 🔒"}