"""
AI-powered candidate analysis based on assessment scores.
Evaluates candidates against job requirements using their test performance.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from models import CandidateFinalScore, Job, Candidate
from utils.security import get_current_user
import os
import httpx

router = APIRouter()

HF_API_KEY = os.getenv("HF_API_KEY", "")

async def analyze_candidate_with_ai(
    candidate_name: str,
    job_title: str,
    job_description: str,
    job_requirements: str,
    psychometric_score: float,
    technical_score: float,
    coding_score: float,
    final_score: float
) -> dict:
    """
    Call HuggingFace API to analyze candidate fit based on assessment scores.
    
    Returns structured analysis with strengths, weaknesses, and recommendation.
    """
    
    prompt = f"""You are an expert recruiter analyzing a candidate's assessment performance for a job opening.

JOB POSITION: {job_title}
JOB DESCRIPTION: {job_description}
REQUIREMENTS: {job_requirements}

CANDIDATE: {candidate_name}
ASSESSMENT SCORES (All out of 100):
- Psychometric: {psychometric_score if psychometric_score else 'Not completed'}/100 (personality, aptitude, soft skills)
- Technical: {technical_score if technical_score else 'Not completed'}/100 (domain knowledge, conceptual understanding)
- Coding: {coding_score if coding_score else 'Not completed'}/100 (programming challenges, algorithms)
- Total Score: {final_score}/100 (weighted average based on recruiter configuration)

Based on these assessment scores and the job requirements, provide a structured analysis:

1. **Strengths**: What are this candidate's top 2-3 strengths based on their scores?
2. **Weaknesses**: What are 1-2 areas where the candidate clearly lacks proficiency?
3. **Role Suitability**: Is this candidate suitable for the specific role requirements? Consider:
   - If technical/coding scores are HIGH (80%+) but psychometric LOW (60%-): Strong individual contributor, not manager
   - If psychometric HIGH but coding LOW: Better for leadership/coordination roles
   - If all scores balanced at 70%+: Well-rounded candidate
   - Give specific insights like "Strong coder but weak leadership skills - not suitable for manager position"
4. **Hiring Recommendation**: STRONG_HIRE | HIRE | BORDERLINE | NO_HIRE

Format your response as JSON:
{{
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "role_suitability": "detailed analysis paragraph with specific role recommendations",
  "recommendation": "STRONG_HIRE|HIRE|BORDERLINE|NO_HIRE",
  "reasoning": "brief explanation of recommendation"
}}"""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://router.huggingface.co/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {HF_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "meta-llama/Llama-3.3-70B-Instruct",
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 500,
                    "temperature": 0.3
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_response = result["choices"][0]["message"]["content"]
                
                # Try to parse JSON response
                import json
                try:
                    analysis = json.loads(ai_response)
                    return analysis
                except:
                    # Fallback if AI doesn't return valid JSON
                    return {
                        "strengths": ["Analysis available"],
                        "weaknesses": ["Analysis available"],
                        "role_suitability": ai_response,
                        "recommendation": "BORDERLINE",
                        "reasoning": "See role suitability for details"
                    }
            else:
                raise HTTPException(status_code=500, detail="AI analysis failed")
                
    except Exception as e:
        print(f"AI Analysis Error: {e}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@router.post("/candidates/{candidate_id}/jobs/{job_id}/analyze")
async def analyze_candidate(
    candidate_id: str,
    job_id: int,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    Generate AI-powered analysis of candidate's assessment performance
    against job requirements.
    """
    
    # 1. Verify job ownership
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.recruiter_id != current_user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # 2. Get candidate info
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # 3. Get assessment scores
    final_score = db.query(CandidateFinalScore).filter(
        CandidateFinalScore.job_id == job_id,
        CandidateFinalScore.candidate_id == candidate_id
    ).first()
    
    if not final_score:
        raise HTTPException(status_code=404, detail="No assessment scores found for this candidate")
    
    # 4. Call AI analysis
    analysis = await analyze_candidate_with_ai(
        candidate_name=candidate.name,
        job_title=job.title,
        job_description=job.description or "",
        job_requirements=job.requirements or "",
        psychometric_score=final_score.psychometric_score,
        technical_score=final_score.technical_score,
        coding_score=final_score.coding_score,
        final_score=final_score.final_score
    )
    
    return {
        "candidate_id": candidate_id,
        "candidate_name": candidate.name,
        "job_id": job_id,
        "job_title": job.title,
        "scores": {
            "psychometric": final_score.psychometric_score,
            "technical": final_score.technical_score,
            "coding": final_score.coding_score,
            "total": final_score.final_score
        },
        "analysis": analysis
    }
