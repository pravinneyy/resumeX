from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from db import engine, Base
import models 

# FIX: Import 'applications' and 'admin'
from routes import auth, jobs, candidates, assessments, applications, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables if they don't exist
    # Use checkfirst=True to avoid errors on existing tables
    Base.metadata.create_all(bind=engine, checkfirst=True)
    # Removed local uploads folder creation since we use Supabase now
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REMOVED: app.mount("/uploads"...) ---
# We no longer serve files locally.

# --- ROUTES ---
app.include_router(auth.router, prefix="/api/users", tags=["Auth"])
app.include_router(jobs.router, prefix="/api", tags=["Jobs"])
app.include_router(candidates.router, prefix="/api", tags=["Candidates"])
app.include_router(assessments.router, prefix="/api", tags=["Assessments"])
app.include_router(applications.router, prefix="/api", tags=["Applications"])
app.include_router(admin.router, prefix="/api", tags=["Admin"])

@app.get("/")
def home():
    return {"message": "ResumeX Backend Running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)