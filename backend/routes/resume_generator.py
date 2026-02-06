"""
Resume Generator API Routes (v2 - HTML/PDF)
=============================================
Separate API endpoints for AI resume generation with style-based rewriting.
These routes are ISOLATED from the resume reviewer endpoints.

This feature is:a
- Optional for candidates
- Non-graded
- Not connected to application scoring
"""

from fastapi import APIRouter, HTTPException, Depends
from utils.security import get_current_user
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import base64

from services.resume_generator import (
    ResumeGenerator,
    ResumeInputSchema,
    HTMLTemplateRenderer,
    PDFGenerator,
    GitHubRepoFetcher,
    RESUME_STYLES
)

router = APIRouter()


# ===== REQUEST/RESPONSE MODELS =====

class EducationInput(BaseModel):
    institution: str
    degree: str
    year: str

class ResearchInput(BaseModel):
    title: str = ""
    role: str = ""
    institution: str = ""
    year: str = ""
    description: str = ""

class ReferenceInput(BaseModel):
    name: str = ""
    title: str = ""
    department: str = ""
    institution: str = ""
    email: str = ""

class CustomProjectInput(BaseModel):
    title: str = ""
    description: str = ""
    technologies: str = ""
    year: str = ""

class WorkExperienceInput(BaseModel):
    company: str = ""
    role: str = ""
    type: str = "Internship"  # Full-time, Internship, Part-time, Contract, Freelance
    startDate: str = ""
    endDate: str = ""
    description: str = ""

class ResumeGenerateRequest(BaseModel):
    """Request body for resume generation"""
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., pattern=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    phone: Optional[str] = None
    location: Optional[str] = None
    about_me: Optional[str] = Field(None, max_length=500)
    skills: List[str] = Field(default_factory=list)
    programming_languages: List[str] = Field(default_factory=list)
    tools: List[str] = Field(default_factory=list)
    github_username: Optional[str] = None
    github_repos: List[str] = Field(default_factory=list)
    custom_projects: List[CustomProjectInput] = Field(default_factory=list)
    linkedin: Optional[str] = None
    education: List[EducationInput] = Field(default_factory=list)
    work_experience: List[WorkExperienceInput] = Field(default_factory=list)
    years_of_experience: str = Field(default="fresher")
    research: List[ResearchInput] = Field(default_factory=list)
    references: List[ReferenceInput] = Field(default_factory=list)
    hobbies: List[str] = Field(default_factory=list)
    # Style selection
    style_id: str = Field(default="technical", description="Resume style: academic, industry, technical, minimal, creative")

class ResumeGenerateResponse(BaseModel):
    """Response from resume generation"""
    success: bool
    resume_data: Optional[Dict[str, Any]] = None
    html_content: Optional[str] = None
    pdf_base64: Optional[str] = None
    style_id: Optional[str] = None
    error: Optional[str] = None

class StyleListResponse(BaseModel):
    """List of available resume styles"""
    styles: List[Dict[str, str]]

class GitHubReposResponse(BaseModel):
    """Response with GitHub repositories"""
    success: bool
    repos: List[Dict[str, Any]] = Field(default_factory=list)
    error: Optional[str] = None


# ===== API ENDPOINTS =====

@router.get("/resume-generator/styles", response_model=StyleListResponse)
async def get_styles():
    """
    Get list of available resume styles.
    Each style affects how the AI rewrites content (language/tone only, not facts).
    """
    styles = HTMLTemplateRenderer.get_available_styles()
    return StyleListResponse(styles=styles)


# Keep templates endpoint for backwards compatibility
@router.get("/resume-generator/templates", response_model=StyleListResponse)
async def get_templates():
    """
    DEPRECATED: Use /styles instead.
    Returns styles formatted as templates for backwards compatibility.
    """
    styles = HTMLTemplateRenderer.get_available_styles()
    # Map to old format
    templates = [
        {"id": s["id"], "name": s["name"], "description": s["description"]}
        for s in styles
    ]
    return StyleListResponse(styles=templates)


@router.get("/resume-generator/github-repos/{username}", response_model=GitHubReposResponse)
async def get_github_repos(
    username: str,
    current_user_id: str = Depends(get_current_user)
):
    """
    Fetch public GitHub repositories for a user.
    Returns repo metadata for selection.
    """
    try:
        repos = GitHubRepoFetcher.fetch_user_repos(username, max_repos=15)
        return GitHubReposResponse(success=True, repos=repos)
    except Exception as e:
        return GitHubReposResponse(success=False, repos=[], error=str(e))


@router.post("/resume-generator/generate", response_model=ResumeGenerateResponse)
async def generate_resume(
    request: ResumeGenerateRequest,
    current_user_id: str = Depends(get_current_user)
):
    """
    Generate resume content with style-based rewriting.
    
    This endpoint:
    1. Validates user input
    2. Fetches GitHub repo data if repos selected
    3. REWRITES resume content using AI in the selected style
    4. Renders HTML template
    5. Returns data + HTML content
    
    IMPORTANT:
    - The AI REWRITES content to match the style (not copy verbatim)
    - Style affects LANGUAGE only, not FACTS
    - AI never invents experience, companies, or metrics
    
    NOTE: This is an OPTIONAL, NON-GRADED feature.
    """
    try:
        # Validate style
        style_id = request.style_id
        if style_id not in RESUME_STYLES:
            style_id = "technical"  # Default fallback
        
        # Convert request to internal schema
        user_input = ResumeInputSchema(
            name=request.name,
            email=request.email,
            phone=request.phone,
            location=request.location,
            about_me=request.about_me,
            skills=request.skills,
            programming_languages=request.programming_languages,
            tools=request.tools,
            github_username=request.github_username,
            github_repos=request.github_repos,
            custom_projects=[proj.dict() for proj in request.custom_projects],
            linkedin=request.linkedin,
            education=[edu.dict() for edu in request.education],
            work_experience=[work.dict() for work in request.work_experience],
            years_of_experience=request.years_of_experience,
            research=[res.dict() for res in request.research],
            references=[ref.dict() for ref in request.references],
            hobbies=request.hobbies
        )
        
        print(f"[GENERATOR] Received hobbies: {request.hobbies}")
        print(f"[GENERATOR] Received work_experience: {len(request.work_experience)}")
        print(f"[GENERATOR] Received years_of_experience: {request.years_of_experience}")
        
        # Fetch GitHub repo details if repos selected
        github_repo_data = None
        if request.github_repos:
            github_repo_data = []
            for repo_url in request.github_repos[:5]:  # Limit to 5 repos
                repo_data = GitHubRepoFetcher.fetch_repo_details(repo_url)
                if repo_data:
                    github_repo_data.append(repo_data)
        elif request.github_username:
            # Fetch user's top repos
            github_repo_data = GitHubRepoFetcher.fetch_user_repos(request.github_username, max_repos=5)
        
        # Generate resume content with style-based rewriting
        resume_data = ResumeGenerator.generate_resume_content(
            user_input, 
            style_id=style_id,
            github_repo_data=github_repo_data
        )
        
        # Render HTML template
        html_content = HTMLTemplateRenderer.render_template(style_id, resume_data)
        
        return ResumeGenerateResponse(
            success=True,
            resume_data=resume_data,
            html_content=html_content,
            style_id=style_id
        )
        
    except ValueError as e:
        return ResumeGenerateResponse(
            success=False,
            error=f"Validation error: {str(e)}"
        )
    except FileNotFoundError as e:
        return ResumeGenerateResponse(
            success=False,
            error=f"Template error: {str(e)}"
        )
    except Exception as e:
        print(f"[RESUME-GEN] Error: {e}")
        return ResumeGenerateResponse(
            success=False,
            error="Failed to generate resume. Please try again."
        )


@router.post("/resume-generator/compile-pdf", response_model=ResumeGenerateResponse)
async def compile_pdf(
    request: Dict[str, str],
    current_user_id: str = Depends(get_current_user)
):
    """
    Compile HTML content to PDF using headless browser (Playwright).
    Returns base64-encoded PDF.
    
    Requires: pip install playwright && playwright install chromium
    """
    html_content = request.get("html_content")
    
    if not html_content:
        return ResumeGenerateResponse(
            success=False,
            error="No HTML content provided"
        )
    
    try:
        # Generate PDF using Playwright async API (since we're in an async route)
        pdf_bytes = await PDFGenerator.generate_pdf_async(html_content)
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        
        return ResumeGenerateResponse(
            success=True,
            pdf_base64=pdf_base64
        )
        
    except ImportError as e:
        return ResumeGenerateResponse(
            success=False,
            error="PDF generation not available. Install playwright: pip install playwright && playwright install chromium"
        )
    except Exception as e:
        print(f"[PDF-COMPILE] Error: {e}")
        return ResumeGenerateResponse(
            success=False,
            error=f"Failed to compile PDF: {str(e)}"
        )


@router.post("/resume-generator/preview")
async def preview_resume(
    request: Dict[str, Any],
    current_user_id: str = Depends(get_current_user)
):
    """
    Generate a preview of the resume.
    Returns structured data and HTML for frontend rendering.
    """
    try:
        resume_data = request.get("resume_data")
        style_id = request.get("style_id", "technical")
        
        if not resume_data:
            raise HTTPException(status_code=400, detail="No resume data provided")
        
        # Validate style
        if style_id not in RESUME_STYLES:
            style_id = "technical"
        
        # Render HTML for preview
        html_content = HTMLTemplateRenderer.render_template(style_id, resume_data)
        
        return {
            "success": True,
            "preview": {
                "style_id": style_id,
                "html_content": html_content,
                "resume_data": resume_data
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Preview generation failed")


@router.get("/resume-generator/style-info/{style_id}")
async def get_style_info(style_id: str):
    """
    Get detailed information about a specific style.
    """
    if style_id not in RESUME_STYLES:
        raise HTTPException(status_code=404, detail=f"Style not found: {style_id}")
    
    style = RESUME_STYLES[style_id]
    
    return {
        "id": style["id"],
        "name": style["name"],
        "description": style["description"],
        "template": style["template"],
        # Don't expose the internal prompt instruction
    }
