from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles  # <--- NEW IMPORT
from fastapi.middleware.cors import CORSMiddleware
from db import engine, Base
from routes import auth, jobs, candidates, assessments
from contextlib import asynccontextmanager
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    # Ensure uploads directory exists on startup
    if not os.path.exists("uploads"):
        os.makedirs("uploads")
    yield

app = FastAPI(lifespan=lifespan)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# NEW: Serve the 'uploads' folder so PDFs are accessible
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Register Routes
app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(jobs.router, prefix="/api", tags=["Jobs"])
app.include_router(candidates.router, prefix="/api", tags=["Candidates"])
app.include_router(assessments.router, prefix="/api", tags=["Assessments"])

@app.get("/")
def home():
    return {"message": "ResumeX Backend Running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)