from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.candidates import router as candidates_router
from routes.assessments import router as assessments_router
from db import engine, Base

app = FastAPI(title="HIREASSISTANT")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(candidates_router, prefix="/api", tags=["candidates"])
app.include_router(assessments_router, prefix="/api", tags=["assessments"])

@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)

@app.get("/health")
def health():
    return {"status": "ok"}
