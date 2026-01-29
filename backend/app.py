from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from db import engine, Base
import models 

# FIX: Import 'applications'
from routes import auth, jobs, candidates, assessments, applications

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    if not os.path.exists("uploads"):
        os.makedirs("uploads")
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# --- ROUTES ---
app.include_router(auth.router, prefix="/api/users", tags=["Auth"])

# FIX: Use prefix="/api" because jobs.py already has "/jobs"
app.include_router(jobs.router, prefix="/api", tags=["Jobs"])

app.include_router(candidates.router, prefix="/api", tags=["Candidates"])

# FIX: Use prefix="/api" because assessments.py already has "/assessments"
app.include_router(assessments.router, prefix="/api", tags=["Assessments"])

# FIX: Register Applications Router
app.include_router(applications.router, prefix="/api", tags=["Applications"])

@app.get("/")
def home():
    return {"message": "ResumeX Backend Running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)