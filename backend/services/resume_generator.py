"""
AI Resume Generator Service (v2 - HTML/PDF)
============================================
This is a SEPARATE pipeline from the resume reviewer (ai_extract.py).
The generator REWRITES user-provided facts in the selected STYLE.

CRITICAL RULES:
- Output strict JSON only
- Never output markdown, HTML, or explanations
- Never invent experience, companies, metrics, or claims
- Style affects LANGUAGE only, not FACTS
- AI never modifies HTML/CSS templates
"""

import os
import json
import re
import requests
import asyncio
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, validator
from dotenv import load_dotenv

load_dotenv()

# Initialize HuggingFace token
HF_TOKEN = os.getenv("HF_TOKEN")

# ===== RESUME STYLES =====
# Each style has a specific writing instruction that affects HOW content is written
# but NOT what facts are included

RESUME_STYLES = {
    "academic": {
        "id": "academic",
        "name": "Academic / Research",
        "description": "Formal, scholarly tone. Emphasizes methodology, research contributions, and academic achievements.",
        "template": "mbzuai_academic.html",
        "prompt_instruction": """Write in a formal, academic tone suitable for university applications or research positions.
- Use precise, scholarly language
- Emphasize research methodology and contributions
- Structure sentences formally (e.g., "Conducted research on..." rather than "Worked on...")
- Highlight publications, presentations, and academic achievements
- Use third-person perspective where appropriate
- Avoid casual language, slang, or marketing-speak"""
    },
    "industry": {
        "id": "industry",
        "name": "Industry / Corporate",
        "description": "Professional, business-focused tone. Results-oriented language for corporate roles.",
        "template": "industry_harshibar.html",
        "prompt_instruction": """Write in a professional, corporate tone suitable for business and enterprise roles.
- Use action verbs (Led, Managed, Delivered, Implemented)
- Focus on business impact and outcomes
- Use professional but accessible language
- Structure: Role + Action + Result format
- Avoid overly technical jargon unless relevant
- Sound confident and results-oriented"""
    },
    "technical": {
        "id": "technical",
        "name": "Technical / ATS",
        "description": "Keyword-rich, ATS-optimized. Clear technical terminology for engineering roles.",
        "template": "technical_datasci.html",
        "prompt_instruction": """Write in a technical, ATS-optimized style suitable for engineering and developer roles.
- Include relevant technical keywords naturally
- Be specific about technologies, frameworks, and tools used
- Use clear, direct language without embellishment
- Structure: Technology + Implementation + Outcome
- Quantify technical specifics when provided (e.g., "Built API serving X requests")
- Keep descriptions concise and scannable"""
    },
    "minimal": {
        "id": "minimal",
        "name": "Minimal / Clean",
        "description": "Concise, elegant prose. Maximum information with minimum words.",
        "template": "minimal_clean.html",
        "prompt_instruction": """Write in a minimal, elegant style with maximum impact in minimum words.
- Be extremely concise - every word must earn its place
- Use short, punchy sentences
- Avoid adjectives and adverbs unless essential
- Strip away filler words and phrases
- Focus on core accomplishments only
- Aim for clarity and elegance over comprehensiveness"""
    },
    "creative": {
        "id": "creative",
        "name": "Creative / Startup",
        "description": "Energetic, modern tone. Dynamic language for startups and creative roles.",
        "template": "creative_startup.html",
        "prompt_instruction": """Write in an energetic, modern style suitable for startups and creative industries.
- Use dynamic, engaging language
- Show personality while remaining professional
- Emphasize innovation, creativity, and impact
- Use active voice and present tense where possible
- Structure for visual appeal and quick scanning
- Sound passionate and forward-thinking without being unprofessional"""
    }
}


# ===== JSON OUTPUT SCHEMA =====
class ProjectSchema(BaseModel):
    title: str = Field(..., description="Project title")
    description: str = Field(..., description="Rewritten project description (1-2 sentences)")
    tech: str = Field(..., description="Technologies used")
    year: Optional[str] = Field(None, description="Year of project")

class ResearchSchema(BaseModel):
    title: str = Field(..., description="Research title")
    role: str = Field(..., description="Role in the research")
    institution: str = Field(..., description="Institution or lab name")
    year: str = Field(..., description="Year or date range")
    description: str = Field(..., description="Rewritten research description")

class EducationSchema(BaseModel):
    institution: str = Field(..., description="School/University name")
    degree: str = Field(..., description="Degree name")
    year: str = Field(..., description="Graduation year")

class ReferenceSchema(BaseModel):
    name: str = Field(..., description="Reference full name")
    title: str = Field(..., description="Reference title/position")
    department: str = Field(..., description="Department name")
    institution: str = Field(..., description="Institution name")
    email: str = Field(..., description="Reference email")

class ResumeOutputSchema(BaseModel):
    """Strict JSON schema for resume generator output."""
    name: str
    email: str
    phone: Optional[str] = None
    location: Optional[str] = None
    github: Optional[str] = None
    linkedin: Optional[str] = None
    summary: Optional[str] = Field(None, description="Rewritten professional summary (2-3 sentences)")
    skills: List[str] = Field(default_factory=list)
    projects: List[ProjectSchema] = Field(default_factory=list)
    research: List[ResearchSchema] = Field(default_factory=list)
    education: List[EducationSchema] = Field(default_factory=list)
    references: List[ReferenceSchema] = Field(default_factory=list)
    hobbies: List[str] = Field(default_factory=list)


# ===== INPUT VALIDATION SCHEMA =====
class ResumeInputSchema(BaseModel):
    """Structured input from the candidate."""
    name: str
    email: str
    phone: Optional[str] = None
    location: Optional[str] = None
    about_me: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    programming_languages: List[str] = Field(default_factory=list)
    tools: List[str] = Field(default_factory=list)
    github_username: Optional[str] = None
    github_repos: List[str] = Field(default_factory=list)
    custom_projects: List[Dict[str, str]] = Field(default_factory=list)
    linkedin: Optional[str] = None
    education: List[Dict[str, str]] = Field(default_factory=list)
    work_experience: List[Dict[str, str]] = Field(default_factory=list)
    years_of_experience: str = "fresher"
    research: List[Dict[str, str]] = Field(default_factory=list)
    references: List[Dict[str, str]] = Field(default_factory=list)
    hobbies: List[str] = Field(default_factory=list)
    
    @validator('email')
    def validate_email(cls, v):
        if '@' not in v:
            raise ValueError('Invalid email address')
        return v
    
    @validator('name')
    def validate_name(cls, v):
        if len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters')
        return v.strip()


def build_style_prompt(style_id: str) -> str:
    """Build the complete system prompt with style-specific instructions."""
    
    style = RESUME_STYLES.get(style_id, RESUME_STYLES["technical"])
    style_instruction = style["prompt_instruction"]
    
    return f"""You are an expert resume writer that transforms user input into polished, professional content.

CRITICAL RULES:
1. REWRITE content to match the style - make it sound professional and impressive
2. EXPAND brief descriptions into detailed, compelling content (2-4 sentences per item)
3. Use industry-appropriate keywords and action verbs
4. You must NEVER invent new facts, companies, metrics, or skills not provided
5. Output ONLY valid JSON - no explanations, no markdown

STYLE INSTRUCTIONS:
{style_instruction}

YOUR TASK:
Transform the user's raw input into polished resume content:
- "about_me" → Write a compelling 3-4 sentence professional summary
- Project descriptions → Expand into detailed descriptions highlighting technologies and impact
- Research descriptions → Expand into academic-style descriptions emphasizing methodology and contributions
- Make everything sound professional, specific, and achievement-oriented

OUTPUT FORMAT - JSON ONLY:
{{
    "name": "string",
    "email": "string",
    "phone": "string or null",
    "location": "string or null",
    "github": "string or null",
    "linkedin": "string or null",
    "summary": "A compelling 3-4 sentence professional summary that highlights skills and goals",
    "skills": ["skill1", "skill2", ...],
    "projects": [
        {{
            "title": "Project Title",
            "description": "Detailed 2-3 sentence description with technologies, purpose, and impact",
            "tech": "Technologies used",
            "year": "2024"
        }}
    ],
    "research": [
        {{
            "title": "Research Title",
            "role": "Role",
            "institution": "Institution",
            "year": "Year",
            "description": "Detailed 2-3 sentence academic description"
        }}
    ],
    "education": [
        {{
            "institution": "string",
            "degree": "string",
            "year": "string"
        }}
    ]
}}

IMPORTANT: Make descriptions DETAILED and COMPELLING, not brief. Each project/research should have 2-3 sentences.
Return ONLY the JSON object. No other text."""


class ResumeGenerator:
    """
    AI Resume Generator v2 - Style-based content rewriting.
    Rewrites user content to match selected style.
    NEVER invents new facts.
    """
    
    @staticmethod
    def generate_resume_content(
        user_input: ResumeInputSchema, 
        style_id: str = "technical",
        github_repo_data: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Generate resume content by REWRITING user input in the selected style.
        
        Args:
            user_input: Validated user input from the form
            style_id: One of: academic, industry, technical, minimal, creative
            github_repo_data: Optional list of GitHub repo metadata
            
        Returns:
            Dict matching ResumeOutputSchema with style-appropriate content
        """
        
        if style_id not in RESUME_STYLES:
            style_id = "technical"  # Default fallback
        
        if not HF_TOKEN:
            print("[WARN] No HF_TOKEN found, using fallback generation")
            return ResumeGenerator._fallback_generation(user_input, style_id, github_repo_data)
        
        try:
            # Build the input context for the AI
            input_context = ResumeGenerator._build_input_context(user_input, github_repo_data)
            
            # Get style-specific system prompt
            system_prompt = build_style_prompt(style_id)
            
            # Build user message
            user_message = f"""Rewrite this resume content in the {RESUME_STYLES[style_id]['name']} style:

RAW USER INPUT:
{json.dumps(input_context, indent=2)}

Remember: REWRITE the content to match the style. Don't just copy it.
Output ONLY the JSON object."""

            # Use HuggingFace Router API
            chat_models = [
                "meta-llama/Llama-3.2-3B-Instruct",
                "Qwen/Qwen2.5-72B-Instruct",
            ]
            
            ai_result = None
            
            for model_name in chat_models:
                try:
                    print(f"[GENERATOR] Trying {model_name} with style={style_id}...")
                    
                    api_url = "https://router.huggingface.co/v1/chat/completions"
                    headers = {
                        "Authorization": f"Bearer {HF_TOKEN}",
                        "Content-Type": "application/json"
                    }
                    
                    payload = {
                        "model": model_name,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_message}
                        ],
                        "max_tokens": 1500,
                        "temperature": 0.4  # Slightly higher for creative rewriting
                    }
                    
                    response = requests.post(api_url, headers=headers, json=payload, timeout=90)
                    
                    if response.status_code == 200:
                        result = response.json()
                        ai_text = result.get('choices', [{}])[0].get('message', {}).get('content', '')
                        
                        if ai_text and len(ai_text) > 50:
                            print(f"[GENERATOR] Got response from {model_name}")
                            ai_result = ai_text
                            break
                    else:
                        print(f"[GENERATOR] {model_name} returned {response.status_code}")
                        
                except requests.Timeout:
                    print(f"[GENERATOR] Timeout on {model_name}")
                except Exception as e:
                    print(f"[GENERATOR] Error with {model_name}: {str(e)[:60]}")
            
            # Parse AI response
            if ai_result:
                try:
                    # Extract JSON from response
                    json_match = re.search(r'\{[\s\S]*\}', ai_result)
                    
                    if json_match:
                        parsed_data = json.loads(json_match.group(0))
                        
                        # Validate and sanitize output
                        validated = ResumeGenerator._validate_output(parsed_data, user_input)
                        return validated
                        
                except json.JSONDecodeError as e:
                    print(f"[GENERATOR] JSON parse error: {e}")
                except Exception as e:
                    print(f"[GENERATOR] Validation error: {e}")
            
            # Fallback if AI fails
            print("[GENERATOR] Using fallback generation")
            return ResumeGenerator._fallback_generation(user_input, style_id, github_repo_data)
            
        except Exception as e:
            print(f"[GENERATOR] Error: {e}")
            return ResumeGenerator._fallback_generation(user_input, style_id, github_repo_data)
    
    @staticmethod
    def _build_input_context(user_input: ResumeInputSchema, github_repo_data: Optional[List[Dict]] = None) -> Dict:
        """Build the input context for AI processing"""
        
        # Combine all skills
        all_skills = list(set(
            user_input.skills + 
            user_input.programming_languages + 
            user_input.tools
        ))
        
        context = {
            "name": user_input.name,
            "email": user_input.email,
            "phone": user_input.phone,
            "location": user_input.location,
            "about_me": user_input.about_me,
            "skills": all_skills,
            "education": user_input.education,
        }
        
        # Add GitHub info
        if user_input.github_username:
            context["github"] = f"https://github.com/{user_input.github_username}"
        
        # Add LinkedIn
        if user_input.linkedin:
            linkedin = user_input.linkedin
            if not linkedin.startswith("http"):
                linkedin = f"https://linkedin.com/in/{linkedin}"
            context["linkedin"] = linkedin
        
        # Add GitHub repo data if available
        projects = []
        if github_repo_data:
            projects.extend([
                {
                    "title": repo.get("name", ""),
                    "description": repo.get("description", "") or "Project repository",
                    "tech": repo.get("language", "") or ", ".join(repo.get("languages", [])),
                    "year": repo.get("year", "")
                }
                for repo in github_repo_data
            ])
        
        # Add custom projects (non-GitHub)
        if user_input.custom_projects:
            projects.extend([
                {
                    "title": proj.get("title", ""),
                    "description": proj.get("description", ""),
                    "tech": proj.get("technologies", ""),
                    "year": proj.get("year", "")
                }
                for proj in user_input.custom_projects
                if proj.get("title", "").strip() or proj.get("description", "").strip()
            ])
        
        if projects:
            context["projects"] = projects
        
        # Add research if available
        if user_input.research:
            context["research"] = [
                {
                    "title": res.get("title", ""),
                    "role": res.get("role", ""),
                    "institution": res.get("institution", ""),
                    "year": res.get("year", ""),
                    "description": res.get("description", "")
                }
                for res in user_input.research
            ]
        
        # Add work experience if available
        if user_input.work_experience:
            context["work_experience"] = [
                {
                    "company": work.get("company", ""),
                    "role": work.get("role", ""),
                    "type": work.get("type", "Internship"),
                    "startDate": work.get("startDate", ""),
                    "endDate": work.get("endDate", ""),
                    "description": work.get("description", "")
                }
                for work in user_input.work_experience
                if work.get("company", "").strip() or work.get("role", "").strip()
            ]
        
        # Add years of experience
        if user_input.years_of_experience:
            context["years_of_experience"] = user_input.years_of_experience
        
        return context
    
    @staticmethod
    def _validate_output(parsed_data: Dict, user_input: ResumeInputSchema) -> Dict:
        """
        Validate and sanitize AI output to prevent hallucination.
        Ensures output only contains user-provided facts.
        """
        
        # Start with user-provided data (ground truth)
        validated = {
            "name": user_input.name,
            "email": user_input.email,
            "phone": user_input.phone,
            "location": user_input.location,
            "github": None,
            "linkedin": None,
            "summary": None,
            "skills": [],
            "projects": [],
            "research": [],
            "education": [],
            "references": [],
            "hobbies": []
        }
        
        # Set GitHub URL (from user input, not AI)
        if user_input.github_username:
            validated["github"] = f"https://github.com/{user_input.github_username}"
        
        # Set LinkedIn URL (from user input, not AI)
        if user_input.linkedin:
            linkedin = user_input.linkedin
            if not linkedin.startswith("http"):
                linkedin = f"https://linkedin.com/in/{linkedin}"
            validated["linkedin"] = linkedin
        
        # Use AI-rewritten summary (this is where style matters)
        if parsed_data.get("summary"):
            summary = parsed_data["summary"]
            # Limit summary length
            if len(summary) <= 600:
                validated["summary"] = summary
        
        # Use user-provided skills (not AI-generated)
        all_skills = list(set(
            user_input.skills + 
            user_input.programming_languages + 
            user_input.tools
        ))
        validated["skills"] = all_skills
        
        # Use AI-rewritten projects (descriptions only)
        if parsed_data.get("projects"):
            valid_projects = []
            for project in parsed_data["projects"]:
                if isinstance(project, dict) and project.get("title"):
                    valid_projects.append({
                        "title": project.get("title", ""),
                        "description": project.get("description", "")[:400],
                        "tech": project.get("tech", ""),
                        "year": project.get("year")
                    })
            validated["projects"] = valid_projects[:10]
        
        # Use AI-rewritten research (descriptions only)
        if parsed_data.get("research"):
            valid_research = []
            for res in parsed_data["research"]:
                if isinstance(res, dict) and res.get("title"):
                    valid_research.append({
                        "title": res.get("title", ""),
                        "role": res.get("role", ""),
                        "institution": res.get("institution", ""),
                        "year": res.get("year", ""),
                        "description": res.get("description", "")[:400]
                    })
            validated["research"] = valid_research[:10]
        elif user_input.research:
            # Fallback to user-provided research if AI didn't process it
            validated["research"] = [
                {
                    "title": res.get("title", ""),
                    "role": res.get("role", ""),
                    "institution": res.get("institution", ""),
                    "year": res.get("year", ""),
                    "description": res.get("description", "")[:400]
                }
                for res in user_input.research
            ]
        
        # Use user-provided education (not AI-generated)
        if user_input.education:
            validated["education"] = [
                {
                    "institution": edu.get("institution", ""),
                    "degree": edu.get("degree", ""),
                    "year": edu.get("year", "")
                }
                for edu in user_input.education
            ]
        
        # Use user-provided references (not AI-generated - keep factual)
        if user_input.references:
            validated["references"] = [
                {
                    "name": ref.get("name", ""),
                    "title": ref.get("title", ""),
                    "department": ref.get("department", ""),
                    "institution": ref.get("institution", ""),
                    "email": ref.get("email", "")
                }
                for ref in user_input.references
            ]
        
        # Use user-provided hobbies (not AI-generated)
        if user_input.hobbies:
            validated["hobbies"] = user_input.hobbies[:20]  # Limit to 20 hobbies
        
        return validated
    
    @staticmethod
    def _fallback_generation(
        user_input: ResumeInputSchema, 
        style_id: str,
        github_repo_data: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Fallback generation without AI.
        Applies basic style transformations to user data.
        """
        
        # Combine all skills
        all_skills = list(set(
            user_input.skills + 
            user_input.programming_languages + 
            user_input.tools
        ))
        
        # Build basic summary from about_me with style hint
        summary = None
        if user_input.about_me:
            summary = user_input.about_me[:400]
        elif all_skills:
            skills_str = ", ".join(all_skills[:5])
            style = RESUME_STYLES.get(style_id, RESUME_STYLES["technical"])
            
            # Style-specific summary templates
            if style_id == "academic":
                summary = f"Research-oriented professional with expertise in {skills_str}. Seeking opportunities to contribute to academic and research initiatives."
            elif style_id == "industry":
                summary = f"Results-driven professional skilled in {skills_str}. Committed to delivering high-impact solutions."
            elif style_id == "minimal":
                summary = f"Specialist in {skills_str}."
            elif style_id == "creative":
                summary = f"Passionate technologist with a toolkit spanning {skills_str}. Building the future, one project at a time."
            else:
                summary = f"Technical professional proficient in {skills_str}. Focused on building scalable solutions."
        
        # Build projects from GitHub data and custom projects
        projects = []
        if github_repo_data:
            for repo in github_repo_data[:5]:
                projects.append({
                    "title": repo.get("name", ""),
                    "description": repo.get("description", "")[:200] if repo.get("description") else "Open source project",
                    "tech": repo.get("language", ""),
                    "year": repo.get("year") or ""
                })
        
        # Add custom projects
        if user_input.custom_projects:
            for proj in user_input.custom_projects:
                if proj.get("title", "").strip() or proj.get("description", "").strip():
                    projects.append({
                        "title": proj.get("title", ""),
                        "description": proj.get("description", "")[:200] if proj.get("description") else "",
                        "tech": proj.get("technologies", ""),
                        "year": proj.get("year", "")
                    })
        
        # Build education list
        education = []
        if user_input.education:
            for edu in user_input.education:
                education.append({
                    "institution": edu.get("institution", ""),
                    "degree": edu.get("degree", ""),
                    "year": edu.get("year", "")
                })
        
        # Build research list
        research = []
        if user_input.research:
            for res in user_input.research:
                research.append({
                    "title": res.get("title", ""),
                    "role": res.get("role", ""),
                    "institution": res.get("institution", ""),
                    "year": res.get("year", ""),
                    "description": res.get("description", "")[:400]
                })
        
        # Build references list
        references = []
        if user_input.references:
            for ref in user_input.references:
                references.append({
                    "name": ref.get("name", ""),
                    "title": ref.get("title", ""),
                    "department": ref.get("department", ""),
                    "institution": ref.get("institution", ""),
                    "email": ref.get("email", "")
                })
        
        # Build work experience list
        work_experience = []
        if user_input.work_experience:
            for work in user_input.work_experience:
                if work.get("company", "").strip() or work.get("role", "").strip():
                    work_experience.append({
                        "company": work.get("company", ""),
                        "role": work.get("role", ""),
                        "type": work.get("type", "Internship"),
                        "startDate": work.get("startDate", ""),
                        "endDate": work.get("endDate", ""),
                        "description": work.get("description", "")[:400]
                    })
        
        return {
            "name": user_input.name,
            "email": user_input.email,
            "phone": user_input.phone,
            "location": user_input.location,
            "github": f"https://github.com/{user_input.github_username}" if user_input.github_username else None,
            "linkedin": user_input.linkedin if user_input.linkedin else None,
            "summary": summary,
            "skills": all_skills,
            "projects": projects,
            "work_experience": work_experience,
            "years_of_experience": user_input.years_of_experience,
            "research": research,
            "education": education,
            "references": references,
            "hobbies": user_input.hobbies if user_input.hobbies else []
        }


class HTMLTemplateRenderer:
    """
    Renders resume data into HTML templates.
    AI NEVER touches the HTML/CSS - only placeholder replacement.
    """
    
    TEMPLATE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    @staticmethod
    def get_available_styles() -> List[Dict[str, str]]:
        """Return list of available resume styles with metadata"""
        return [
            {
                "id": style["id"],
                "name": style["name"],
                "description": style["description"]
            }
            for style in RESUME_STYLES.values()
        ]
    
    @staticmethod
    def render_template(style_id: str, resume_data: Dict) -> str:
        """
        Replace placeholders in HTML template with resume data.
        AI does NOT edit the template - only data substitution.
        
        Args:
            style_id: ID of style (determines template)
            resume_data: Dict matching ResumeOutputSchema
            
        Returns:
            Rendered HTML string
        """
        
        style = RESUME_STYLES.get(style_id)
        if not style:
            style = RESUME_STYLES["technical"]
        
        template_file = style["template"]
        template_path = os.path.join(HTMLTemplateRenderer.TEMPLATE_DIR, template_file)
        
        if not os.path.exists(template_path):
            raise FileNotFoundError(f"Template not found: {template_path}")
        
        with open(template_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        def escape_html(text: str) -> str:
            """Escape HTML special characters"""
            if not text:
                return ""
            return (text
                .replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;')
                .replace('"', '&quot;')
                .replace("'", '&#39;'))
        
        # Replace simple placeholders
        replacements = {
            "{{name}}": escape_html(resume_data.get("name", "")),
            "{{email}}": escape_html(resume_data.get("email", "")),
            "{{phone}}": escape_html(resume_data.get("phone", "") or ""),
            "{{location}}": escape_html(resume_data.get("location", "") or ""),
            "{{github}}": escape_html(resume_data.get("github", "") or ""),
            "{{linkedin}}": escape_html(resume_data.get("linkedin", "") or ""),
            "{{summary}}": escape_html(resume_data.get("summary", "") or ""),
        }
        
        for placeholder, value in replacements.items():
            html_content = html_content.replace(placeholder, value)
        
        # Handle conditional sections {{#section}}...{{/section}}
        def handle_conditional(match):
            section_name = match.group(1)
            content = match.group(2)
            
            data = resume_data.get(section_name)
            if data and (isinstance(data, list) and len(data) > 0 or isinstance(data, str) and data.strip()):
                # Section has content, render it
                return content.replace(f"{{{{{section_name}}}}}", "")  # Remove inner placeholder
            else:
                # Section is empty, remove it
                return ""
        
        html_content = re.sub(
            r'\{\{#(\w+)\}\}(.*?)\{\{/\1\}\}',
            handle_conditional,
            html_content,
            flags=re.DOTALL
        )
        
        # Render skills
        skills = resume_data.get("skills", [])
        if skills:
            # Detect skill format from template
            if "skill-badge" in html_content or "skills-grid" in html_content:
                # Creative template - use badges
                skills_html = "\n".join([
                    f'<span class="skill-badge">{escape_html(skill)}</span>'
                    for skill in skills
                ])
            elif "skills-list" in html_content:
                # Minimal template - use spans
                skills_html = "\n".join([
                    f'<span class="skill">{escape_html(skill)}</span>'
                    for skill in skills
                ])
            elif "<ul>" in html_content and "{{skills}}" in html_content:
                # List format
                skills_html = "\n".join([
                    f'<li>{escape_html(skill)}</li>'
                    for skill in skills
                ])
            else:
                # Fallback - comma separated
                skills_html = ", ".join([escape_html(skill) for skill in skills])
            
            html_content = html_content.replace("{{skills}}", skills_html)
        else:
            html_content = html_content.replace("{{skills}}", "")
        
        # Render projects
        projects = resume_data.get("projects", [])
        if projects:
            if "card" in html_content:
                # Card-based layout (creative)
                projects_html = "\n".join([
                    f'''<div class="card">
                        <div class="card-title">{escape_html(p.get('title', ''))}</div>
                        <div class="card-meta">{escape_html(p.get('tech', ''))} {escape_html(p.get('year', '') or '')}</div>
                        <div class="card-description">{escape_html(p.get('description', ''))}</div>
                    </div>'''
                    for p in projects
                ])
            elif "entry" in html_content:
                # Entry-based layout (minimal)
                projects_html = "\n".join([
                    f'''<div class="entry">
                        <div class="entry-header">
                            <span class="entry-title">{escape_html(p.get('title', ''))}</span>
                            <span class="entry-meta">{escape_html(p.get('year', '') or '')}</span>
                        </div>
                        <div class="entry-description">{escape_html(p.get('description', ''))} <em>({escape_html(p.get('tech', ''))})</em></div>
                    </div>'''
                    for p in projects
                ])
            else:
                # Default layout - compact like Word
                projects_html = "\n".join([
                    f'''<div class="entry" style="margin-bottom: 8pt;">
                        <div class="entry-header" style="display: flex; justify-content: space-between;">
                            <span class="entry-title" style="font-weight: bold;">{escape_html(p.get('title', ''))}</span>
                            <span class="entry-meta" style="font-size: 10pt; color: #666;">{escape_html(p.get('year', '') or '')}</span>
                        </div>
                        <div class="entry-description" style="font-size: 10pt; margin-top: 2pt;">{escape_html(p.get('description', ''))}</div>
                        <div class="entry-tech" style="font-size: 9pt; color: #555; font-style: italic;">Technologies: {escape_html(p.get('tech', ''))}</div>
                    </div>'''
                    for p in projects
                ])
            
            html_content = html_content.replace("{{projects}}", projects_html)
        else:
            html_content = html_content.replace("{{projects}}", "")
        
        # Render education
        education = resume_data.get("education", [])
        if education:
            if "card" in html_content:
                education_html = "\n".join([
                    f'''<div class="card">
                        <div class="card-title">{escape_html(e.get('institution', ''))}</div>
                        <div class="card-meta">{escape_html(e.get('year', ''))}</div>
                        <div class="card-description">{escape_html(e.get('degree', ''))}</div>
                    </div>'''
                    for e in education
                ])
            elif "entry" in html_content:
                education_html = "\n".join([
                    f'''<div class="entry">
                        <div class="entry-header">
                            <span class="entry-title">{escape_html(e.get('institution', ''))}</span>
                            <span class="entry-meta">{escape_html(e.get('year', ''))}</span>
                        </div>
                        <div class="entry-description">{escape_html(e.get('degree', ''))}</div>
                    </div>'''
                    for e in education
                ])
            else:
                education_html = "\n".join([
                    f'''<div class="entry" style="margin-bottom: 6pt;">
                        <div class="entry-header" style="display: flex; justify-content: space-between;">
                            <span class="entry-title" style="font-weight: bold;">{escape_html(e.get('institution', ''))}</span>
                            <span class="entry-meta" style="font-size: 10pt; color: #666;">{escape_html(e.get('year', ''))}</span>
                        </div>
                        <div class="entry-subtitle" style="font-size: 10pt; font-style: italic;">{escape_html(e.get('degree', ''))}</div>
                    </div>'''
                    for e in education
                ])
            
            html_content = html_content.replace("{{education}}", education_html)
        else:
            html_content = html_content.replace("{{education}}", "")
        
        # Render work experience section
        work_experience = resume_data.get("work_experience", [])
        years_of_exp = resume_data.get("years_of_experience", "fresher")
        
        if work_experience:
            work_items_html = "\n".join([
                f'''<div class="entry" style="margin-bottom: 8pt;">
                    <div class="entry-header" style="display: flex; justify-content: space-between;">
                        <span class="entry-title" style="font-weight: bold;">{escape_html(w.get('role', ''))}</span>
                        <span class="entry-meta" style="font-size: 10pt; color: #666;">{escape_html(w.get('startDate', ''))} - {escape_html(w.get('endDate', ''))}</span>
                    </div>
                    <div class="entry-subtitle" style="font-size: 10pt; color: #444;">{escape_html(w.get('company', ''))} • {escape_html(w.get('type', 'Internship'))}</div>
                    <div class="entry-description" style="font-size: 10pt; margin-top: 2pt;">{escape_html(w.get('description', ''))}</div>
                </div>'''
                for w in work_experience
            ])
            
            experience_label = "Fresher" if years_of_exp == "fresher" else f"{years_of_exp} year{'s' if years_of_exp != '1' else ''} of experience"
            
            work_section_html = f'''<div class="section" style="margin-bottom: 12pt;">
                <h2 class="section-title" style="font-size: 12pt; font-weight: bold; border-bottom: 1px solid #333; padding-bottom: 2pt; margin-bottom: 6pt;">WORK EXPERIENCE <span style="font-weight: normal; font-size: 10pt;">({experience_label})</span></h2>
                {work_items_html}
            </div>'''
            
            html_content = html_content.replace("{{work_experience_section}}", work_section_html)
            html_content = html_content.replace("{{work_experience}}", work_items_html)
        else:
            html_content = html_content.replace("{{work_experience_section}}", "")
            html_content = html_content.replace("{{work_experience}}", "")
        
        # Render research section (header + content together)
        research = resume_data.get("research", [])
        if research:
            if "card" in html_content:
                research_items = "\n".join([
                    f'''<div class="card">
                        <div class="card-title">{escape_html(r.get('title', ''))}</div>
                        <div class="card-meta">{escape_html(r.get('role', ''))} at {escape_html(r.get('institution', ''))} • {escape_html(r.get('year', ''))}</div>
                        <div class="card-description">{escape_html(r.get('description', ''))}</div>
                    </div>'''
                    for r in research
                ])
            elif "entry" in html_content:
                research_items = "\n".join([
                    f'''<div class="entry">
                        <div class="entry-header">
                            <span class="entry-title">{escape_html(r.get('title', ''))}</span>
                            <span class="entry-meta">{escape_html(r.get('year', ''))}</span>
                        </div>
                        <div class="entry-description"><em>{escape_html(r.get('role', ''))}</em> at {escape_html(r.get('institution', ''))}</div>
                        <div class="entry-description">{escape_html(r.get('description', ''))}</div>
                    </div>'''
                    for r in research
                ])
            else:
                research_items = "\n".join([
                    f'''<div class="entry" style="margin-bottom: 8pt;">
                        <div class="entry-header" style="display: flex; justify-content: space-between;">
                            <span class="entry-title" style="font-weight: bold;">{escape_html(r.get('title', ''))}</span>
                            <span class="entry-meta" style="font-size: 10pt; color: #666;">{escape_html(r.get('year', ''))}</span>
                        </div>
                        <div class="entry-subtitle" style="font-size: 10pt; font-style: italic;">{escape_html(r.get('role', ''))} at {escape_html(r.get('institution', ''))}</div>
                        <div class="entry-description" style="font-size: 10pt; margin-top: 2pt;">{escape_html(r.get('description', ''))}</div>
                    </div>'''
                    for r in research
                ])
            
            research_section = f"<h2>Research</h2>\n{research_items}"
            html_content = html_content.replace("{{research_section}}", research_section)
            html_content = html_content.replace("{{research}}", research_items)
        else:
            html_content = html_content.replace("{{research_section}}", "")
            html_content = html_content.replace("{{research}}", "")
        
        # Render references section (header + content together)
        references = resume_data.get("references", [])
        if references:
            references_items = '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12pt;">'
            for ref in references:
                references_items += f'''
                    <div style="margin-bottom: 6pt;">
                        <span style="font-weight: bold;">{escape_html(ref.get('name', ''))}</span><br>
                        <span style="font-size: 10pt;">{escape_html(ref.get('title', ''))}</span><br>
                        <span style="font-size: 10pt;">{escape_html(ref.get('department', ''))}, {escape_html(ref.get('institution', ''))}</span><br>
                        <span style="font-size: 10pt;">Email: {escape_html(ref.get('email', ''))}</span>
                    </div>'''
            references_items += '</div>'
            
            references_section = f"<h2>References</h2>\n{references_items}"
            html_content = html_content.replace("{{references_section}}", references_section)
            html_content = html_content.replace("{{references}}", references_items)
        else:
            html_content = html_content.replace("{{references_section}}", "")
            html_content = html_content.replace("{{references}}", "")
        
        # Render hobbies section (header + content together)
        hobbies = resume_data.get("hobbies", [])
        if hobbies:
            if "skill-badge" in html_content or "skills-grid" in html_content:
                hobbies_items = '<div class="skills-grid">' + "\n".join([
                    f'<span class="skill-badge">{escape_html(hobby)}</span>'
                    for hobby in hobbies
                ]) + '</div>'
            else:
                hobbies_items = "<p>" + ", ".join([escape_html(hobby) for hobby in hobbies]) + "</p>"
            
            hobbies_section = f"<h2>Hobbies &amp; Interests</h2>\n{hobbies_items}"
            html_content = html_content.replace("{{hobbies_section}}", hobbies_section)
            html_content = html_content.replace("{{hobbies}}", hobbies_items)
        else:
            html_content = html_content.replace("{{hobbies_section}}", "")
            html_content = html_content.replace("{{hobbies}}", "")
        
        # Render experience (empty for now - users don't add work experience)
        html_content = html_content.replace("{{experience}}", "")
        
        # Clean up any remaining template tags
        html_content = re.sub(r'\{\{/?[a-z_#]+\}\}', '', html_content)
        
        return html_content


class PDFGenerator:
    """
    Generates PDF from HTML using playwright (headless browser).
    This is a server-side operation - AI never touches this.
    
    NOTE: On Windows, we use run_in_executor to run the sync API
    in a separate thread to avoid asyncio subprocess issues.
    """
    
    @staticmethod
    def _generate_pdf_in_thread(html_content: str) -> bytes:
        """
        Internal method to generate PDF using sync Playwright.
        This runs in a separate thread to avoid Windows asyncio issues.
        """
        try:
            from playwright.sync_api import sync_playwright
            
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                
                # Set content
                page.set_content(html_content, wait_until='networkidle')
                
                # Generate PDF
                pdf_bytes = page.pdf(
                    format='A4',
                    margin={
                        'top': '20mm',
                        'bottom': '20mm',
                        'left': '15mm',
                        'right': '15mm'
                    },
                    print_background=True
                )
                
                browser.close()
                return pdf_bytes
                
        except ImportError:
            raise ImportError("playwright not installed. Run: pip install playwright && playwright install chromium")
        except Exception as e:
            raise RuntimeError(f"PDF generation failed: {e}")
    
    @staticmethod
    async def generate_pdf_async(html_content: str) -> bytes:
        """
        Generate PDF from HTML content.
        Uses run_in_executor to run sync Playwright in a thread pool,
        avoiding Windows asyncio subprocess issues.
        
        Args:
            html_content: Complete HTML string
            
        Returns:
            PDF bytes
        """
        import concurrent.futures
        
        loop = asyncio.get_event_loop()
        
        # Run the sync playwright in a thread pool executor
        with concurrent.futures.ThreadPoolExecutor() as executor:
            pdf_bytes = await loop.run_in_executor(
                executor,
                PDFGenerator._generate_pdf_in_thread,
                html_content
            )
        
        return pdf_bytes
    
    @staticmethod
    def generate_pdf_sync(html_content: str) -> bytes:
        """
        Generate PDF from HTML content using playwright sync API.
        Use this from sync contexts only (not from FastAPI async routes).
        """
        return PDFGenerator._generate_pdf_in_thread(html_content)
    
    @staticmethod
    def generate_pdf(html_content: str) -> bytes:
        """
        Convenience wrapper - uses sync API directly.
        For FastAPI, use generate_pdf_async instead.
        """
        return PDFGenerator.generate_pdf_sync(html_content)


class GitHubRepoFetcher:
    """
    Fetches public GitHub repository data for resume generation.
    Only retrieves publicly available information.
    Uses GITHUB_TOKEN from .env if available for higher rate limits.
    """
    
    @staticmethod
    def _get_headers() -> Dict[str, str]:
        """Get headers with optional GitHub token for higher rate limits."""
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "ResumeX-Generator"
        }
        
        # Check for GitHub token in environment
        github_token = os.getenv("GITHUB_TOKEN")
        if github_token:
            headers["Authorization"] = f"token {github_token}"
            
        return headers
    
    @staticmethod
    def fetch_user_repos(username: str, max_repos: int = 10) -> List[Dict]:
        """
        Fetch public repositories for a GitHub user.
        """
        try:
            api_url = f"https://api.github.com/users/{username}/repos"
            params = {
                "sort": "updated",
                "direction": "desc",
                "per_page": max_repos,
                "type": "owner"
            }
            
            headers = GitHubRepoFetcher._get_headers()
            response = requests.get(api_url, params=params, headers=headers, timeout=10)
            
            if response.status_code == 200:
                repos = response.json()
                
                return [
                    {
                        "name": repo.get("name", ""),
                        "description": repo.get("description", ""),
                        "language": repo.get("language", ""),
                        "url": repo.get("html_url", ""),
                        "stars": repo.get("stargazers_count", 0),
                        "year": repo.get("updated_at", "")[:4] if repo.get("updated_at") else ""
                    }
                    for repo in repos
                    if not repo.get("fork", False)
                ]
            elif response.status_code == 403:
                print(f"[GITHUB] Rate limit exceeded. Add GITHUB_TOKEN to .env for higher limits.")
                return []
            else:
                print(f"[GITHUB] API returned {response.status_code}: {response.text[:200]}")
                return []
                
        except Exception as e:
            print(f"[GITHUB] Error fetching repos: {e}")
            return []
    
    @staticmethod
    def fetch_repo_details(repo_url: str) -> Optional[Dict]:
        """
        Fetch details for a specific repository.
        """
        try:
            match = re.search(r'github\.com/([^/]+)/([^/]+)', repo_url)
            if not match:
                return None
            
            owner, repo = match.groups()
            api_url = f"https://api.github.com/repos/{owner}/{repo}"
            
            headers = GitHubRepoFetcher._get_headers()
            response = requests.get(api_url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                repo_data = response.json()
                
                languages = []
                lang_url = repo_data.get("languages_url")
                if lang_url:
                    lang_response = requests.get(lang_url, headers=headers, timeout=5)
                    if lang_response.status_code == 200:
                        languages = list(lang_response.json().keys())
                
                return {
                    "name": repo_data.get("name", ""),
                    "description": repo_data.get("description", ""),
                    "language": repo_data.get("language", ""),
                    "languages": languages,
                    "url": repo_data.get("html_url", ""),
                    "stars": repo_data.get("stargazers_count", 0),
                    "year": repo_data.get("updated_at", "")[:4] if repo_data.get("updated_at") else ""
                }
            elif response.status_code == 403:
                print(f"[GITHUB] Rate limit exceeded for repo details.")
                return None
            else:
                return None
                
        except Exception as e:
            print(f"[GITHUB] Error fetching repo details: {e}")
            return None
