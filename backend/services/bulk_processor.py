"""
Bulk Resume Processor
=====================
Handles parallel processing of hundreds of resumes for ATS screening.

Features:
- Async/parallel processing with configurable concurrency
- Progress tracking in database
- Hard gate filtering
- Auto-advancement to assessment for passing candidates
- Detailed per-resume results
"""

import asyncio
import uuid
import json
import time
from datetime import datetime
from typing import List, Dict, Tuple, Optional
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO

import pdfplumber
from sqlalchemy.orm import Session

from models import (
    Job, Candidate, Application, 
    BulkUploadJob, BulkUploadResult
)
from services.ai_extract import AIGatekeeper
from services.ats_enhanced import (
    EnhancedATSParser, 
    HardGateChecker, 
    EnhancedScorer,
    EducationLevel
)


class BulkResumeProcessor:
    """
    Processes multiple resumes in parallel for bulk ATS screening.
    """
    
    # Max concurrent processing (adjust based on server capacity)
    MAX_CONCURRENCY = 10
    
    # Max file size (10MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024
    
    def __init__(self, db: Session):
        self.db = db
        self.executor = ThreadPoolExecutor(max_workers=self.MAX_CONCURRENCY)
    
    def create_bulk_job(
        self,
        job_id: int,
        recruiter_id: str,
        total_files: int,
        auto_advance_threshold: int = 75,
        auto_reject_threshold: int = 40
    ) -> BulkUploadJob:
        """
        Create a new bulk upload tracking job.
        """
        bulk_job = BulkUploadJob(
            job_id=job_id,
            recruiter_id=recruiter_id,
            total_resumes=total_files,
            auto_advance_threshold=auto_advance_threshold,
            auto_reject_threshold=auto_reject_threshold,
            status="pending"
        )
        self.db.add(bulk_job)
        self.db.commit()
        self.db.refresh(bulk_job)
        return bulk_job
    
    async def process_bulk_upload(
        self,
        bulk_job_id: int,
        file_data: List[Tuple[str, bytes]],  # List of (filename, content)
        job_id: int
    ) -> Dict:
        """
        Process multiple resumes in parallel.
        
        Args:
            bulk_job_id: ID of the bulk upload job
            file_data: List of (filename, content) tuples
            job_id: ID of the job for matching
            
        Returns:
            Summary of processing results
        """
        # Update bulk job to processing
        bulk_job = self.db.query(BulkUploadJob).filter(
            BulkUploadJob.id == bulk_job_id
        ).first()
        
        if not bulk_job:
            raise ValueError(f"Bulk job {bulk_job_id} not found")
            
        # Re-fetch job to ensure it's bound to current session
        job = self.db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise ValueError(f"Job {job_id} not found")
        
        bulk_job.status = "processing"
        bulk_job.started_at = datetime.utcnow()
        self.db.commit()
        
        # Parse job requirements
        job_config = self._parse_job_config(job)
        
        # Create pending results for all files
        pending_results = []
        for filename, content in file_data:
            result = BulkUploadResult(
                bulk_job_id=bulk_job_id,
                filename=filename,
                file_size_bytes=len(content),
                status="pending"
            )
            self.db.add(result)
            pending_results.append(result)
        
        self.db.commit()
        
        # Process in batches
        results = []
        for i, (filename, content) in enumerate(file_data):
            result = pending_results[i]
            
            try:
                # Process single resume
                processing_result = await self._process_single_resume(
                    result_id=result.id,
                    filename=filename,
                    content=content,
                    job=job,
                    job_config=job_config,
                    bulk_job=bulk_job
                )
                results.append(processing_result)
                
                # Update progress
                bulk_job.processed += 1
                if processing_result["decision"] == "ADVANCE":
                    bulk_job.passed += 1
                elif processing_result["decision"] == "REJECT":
                    bulk_job.rejected += 1
                    
            except Exception as e:
                print(f"[BULK] Error processing {filename}: {e}")
                result.status = "error"
                result.rejection_reasons = json.dumps([str(e)])
                bulk_job.errors += 1
                bulk_job.processed += 1
                
            self.db.commit()
        
        # Complete the bulk job
        bulk_job.status = "completed"
        bulk_job.completed_at = datetime.utcnow()
        self.db.commit()
        
        return {
            "bulk_job_id": bulk_job_id,
            "total": bulk_job.total_resumes,
            "processed": bulk_job.processed,
            "passed": bulk_job.passed,
            "rejected": bulk_job.rejected,
            "errors": bulk_job.errors,
            "status": "completed"
        }
    
    async def _process_single_resume(
        self,
        result_id: int,
        filename: str,
        content: bytes,
        job: Job,
        job_config: Dict,
        bulk_job: BulkUploadJob
    ) -> Dict:
        """
        Process a single resume within the bulk upload.
        """
        start_time = time.time()
        
        # Get the result record
        result = self.db.query(BulkUploadResult).filter(
            BulkUploadResult.id == result_id
        ).first()
        result.status = "processing"
        self.db.commit()
        
        try:
            # 1. Extract text from PDF
            text_content = self._extract_pdf_text(content)
            
            if not text_content.strip():
                result.status = "error"
                result.rejection_reasons = json.dumps(["Could not extract text from PDF"])
                self.db.commit()
                return {"decision": "ERROR", "reason": "Empty PDF"}
            
            text_lower = text_content.lower()
            
            # 2. Extract basic info using existing AIGatekeeper
            personal = AIGatekeeper._extract_personal_details(text_content)
            technical_skills = AIGatekeeper._detect_technical_skills(text_lower)
            experience_years = AIGatekeeper._extract_experience(text_lower)
            
            # 3. Enhanced extraction
            education_level, education_field, institution, grad_year = \
                EnhancedATSParser.extract_education(text_content)
            
            city, country = EnhancedATSParser.extract_location(text_content)
            soft_skills = EnhancedATSParser.extract_soft_skills(text_lower)
            job_titles = EnhancedATSParser.extract_job_titles(text_content)
            
            # Update result with extracted data
            result.candidate_name = personal.get("name", "Unknown")
            result.candidate_email = personal.get("email", "")
            result.detected_skills = ",".join(technical_skills[:20])
            result.experience_years = experience_years
            
            # 4. Run hard gate checks
            passed_gates, gate_failures = HardGateChecker.run_all_gates(
                candidate_experience=experience_years,
                candidate_education=education_level,
                candidate_skills=technical_skills,
                candidate_city=city,
                candidate_country=country,
                job_min_experience=job_config["min_experience"],
                job_required_education=job_config["required_education"],
                job_must_have_skills=job_config["must_have_skills"],
                job_location_requirement=job_config["location_requirement"],
                job_allowed_locations=job_config["allowed_locations"]
            )
            
            result.passed_hard_gates = passed_gates
            
            if not passed_gates:
                result.status = "rejected"
                result.decision = "REJECT"
                result.rejection_reasons = json.dumps(gate_failures)
                result.match_score = 0
                self.db.commit()
                
                processing_time = int((time.time() - start_time) * 1000)
                result.processing_time_ms = processing_time
                result.processed_at = datetime.utcnow()
                self.db.commit()
                
                return {
                    "decision": "REJECT",
                    "reasons": gate_failures,
                    "score": 0
                }
            
            # 5. Match skills against job requirements
            matching_skills, missing_skills = AIGatekeeper._match_skills(
                text_lower, 
                job_config["required_skills"],
                technical_skills
            )
            
            # 6. Calculate enhanced score
            location_matched = self._check_location_match(
                city, country, 
                job_config["location_requirement"],
                job_config["allowed_locations"]
            )
            
            total_score, breakdown = EnhancedScorer.calculate_total_score(
                matching_skills=matching_skills,
                required_skills=job_config["required_skills"],
                nice_to_have_skills=job_config["nice_to_have_skills"],
                candidate_skills=technical_skills,
                candidate_experience=experience_years,
                required_experience=job_config["min_experience"],
                candidate_education=education_level,
                required_education=job_config["required_education"],
                soft_skills=soft_skills,
                location_matched=location_matched
            )
            
            # 7. Determine decision
            decision, status = EnhancedScorer.get_decision(
                score=total_score,
                passed_hard_gates=passed_gates,
                auto_advance_threshold=bulk_job.auto_advance_threshold,
                auto_reject_threshold=bulk_job.auto_reject_threshold
            )
            
            # 8. Update result
            result.match_score = total_score
            result.skill_score = breakdown["skill_score"]
            result.experience_score = breakdown["experience_score"]
            result.education_score = breakdown["education_score"]
            result.location_score = breakdown["bonus_score"]
            result.decision = decision
            result.status = "passed" if decision in ["ADVANCE", "REVIEW"] else "rejected"
            
            processing_time = int((time.time() - start_time) * 1000)
            result.processing_time_ms = processing_time
            result.processed_at = datetime.utcnow()
            
            # 9. Create candidate and application if passing
            if decision in ["ADVANCE", "REVIEW"]:
                candidate, application = self._create_candidate_and_application(
                    personal=personal,
                    technical_skills=technical_skills,
                    soft_skills=soft_skills,
                    experience_years=experience_years,
                    education_level=education_level,
                    education_field=education_field,
                    institution=institution,
                    grad_year=grad_year,
                    city=city,
                    country=country,
                    job_titles=job_titles,
                    job=job,
                    bulk_job=bulk_job,
                    score=total_score,
                    status=status,
                    matching_skills=matching_skills,
                    missing_skills=missing_skills,
                    breakdown=breakdown
                )
                
                result.candidate_id = candidate.id
                result.application_id = application.id
            
            self.db.commit()
            
            return {
                "decision": decision,
                "score": total_score,
                "breakdown": breakdown,
                "status": status
            }
            
        except Exception as e:
            result.status = "error"
            result.rejection_reasons = json.dumps([str(e)])
            processing_time = int((time.time() - start_time) * 1000)
            result.processing_time_ms = processing_time
            result.processed_at = datetime.utcnow()
            self.db.commit()
            raise
    
    def _extract_pdf_text(self, pdf_bytes: bytes) -> str:
        """Extract text from PDF bytes."""
        pdf_file = BytesIO(pdf_bytes)
        text_content = ""
        
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_content += page_text + "\n"
        
        return text_content
    
    def _parse_job_config(self, job: Job) -> Dict:
        """Parse job requirements into a config dict."""
        return {
            "min_experience": job.min_experience or 0,
            "required_education": job.required_education,
            "required_skills": [s.strip() for s in (job.requirements or "").split(",") if s.strip()],
            "must_have_skills": [s.strip() for s in (job.must_have_skills or "").split(",") if s.strip()],
            "nice_to_have_skills": [s.strip() for s in (job.nice_to_have_skills or "").split(",") if s.strip()],
            "location_requirement": job.location_requirement or "any",
            "allowed_locations": [s.strip() for s in (job.allowed_locations or "").split(",") if s.strip()],
        }
    
    def _check_location_match(
        self,
        city: Optional[str],
        country: Optional[str],
        location_requirement: str,
        allowed_locations: List[str]
    ) -> bool:
        """Check if candidate location matches job requirements."""
        if location_requirement.lower() in ["any", "remote"]:
            return True
        
        if not allowed_locations:
            return True
        
        candidate_location = f"{city or ''} {country or ''}".lower().strip()
        
        if not candidate_location:
            return True  # Can't determine, assume match
        
        for allowed in allowed_locations:
            if allowed.lower() in candidate_location or candidate_location in allowed.lower():
                return True
        
        return False
    
    def _create_candidate_and_application(
        self,
        personal: Dict,
        technical_skills: List[str],
        soft_skills: List[str],
        experience_years: int,
        education_level: EducationLevel,
        education_field: Optional[str],
        institution: Optional[str],
        grad_year: Optional[int],
        city: Optional[str],
        country: Optional[str],
        job_titles: List[str],
        job: Job,
        bulk_job: BulkUploadJob,
        score: int,
        status: str,
        matching_skills: List[str],
        missing_skills: List[str],
        breakdown: Dict
    ) -> Tuple[Candidate, Application]:
        """Create candidate record and application."""
        
        # Generate unique ID if no email
        email = personal.get("email", "")
        candidate_id = email if email else f"bulk_{uuid.uuid4().hex[:12]}"
        
        # Check if candidate exists
        candidate = self.db.query(Candidate).filter(
            Candidate.id == candidate_id
        ).first()
        
        if not candidate:
            candidate = Candidate(
                id=candidate_id,
                name=personal.get("name", "Unknown"),
                email=email,
                phone=personal.get("phone", ""),
                skills=",".join(technical_skills[:20]),
                experience_years=experience_years,
                education_level=education_level.value,
                education_field=education_field,
                education_institution=institution,
                graduation_year=grad_year,
                location_city=city,
                location_country=country,
                job_titles=",".join(job_titles),
                soft_skills=",".join(soft_skills)
            )
            self.db.add(candidate)
            self.db.flush()
        else:
            # Update existing candidate
            candidate.name = personal.get("name", candidate.name)
            candidate.skills = ",".join(technical_skills[:20])
            candidate.experience_years = experience_years
        
        # Check for existing application
        existing_app = self.db.query(Application).filter(
            Application.job_id == job.id,
            Application.candidate_id == candidate.id
        ).first()
        
        if existing_app:
            # Update existing application
            existing_app.screening_score = score
            existing_app.status = status
            existing_app.source = "bulk_upload"
            existing_app.bulk_upload_id = bulk_job.id
            existing_app.notes = self._generate_notes(
                personal, matching_skills, missing_skills, 
                experience_years, breakdown, status
            )
            return candidate, existing_app
        
        # Create new application
        notes = self._generate_notes(
            personal, matching_skills, missing_skills,
            experience_years, breakdown, status
        )
        
        application = Application(
            job_id=job.id,
            candidate_id=candidate.id,
            status=status,
            source="bulk_upload",
            bulk_upload_id=bulk_job.id,
            screening_score=score,
            final_grade=score,
            hard_gate_passed=True,
            notes=notes
        )
        self.db.add(application)
        self.db.flush()
        
        return candidate, application
    
    def _generate_notes(
        self,
        personal: Dict,
        matching_skills: List[str],
        missing_skills: List[str],
        experience_years: int,
        breakdown: Dict,
        status: str
    ) -> str:
        """Generate detailed notes for the application."""
        return f"""ATS SCREENING RESULTS
====================
Candidate: {personal.get('name', 'Unknown')}
Status: {status}

SCORE BREAKDOWN:
• Skills Score: {breakdown['skill_score']}/50
• Experience Score: {breakdown['experience_score']}/25
• Education Score: {breakdown['education_score']}/15
• Bonus Score: {breakdown['bonus_score']}/10
• TOTAL: {breakdown['total']}/100

EXPERIENCE: {experience_years} years

SKILLS MATCHED: {', '.join(matching_skills) if matching_skills else 'None'}
SKILLS MISSING: {', '.join(missing_skills) if missing_skills else 'None'}

Source: Bulk Upload (ATS Screening)
"""


def get_bulk_job_status(db: Session, bulk_job_id: int) -> Optional[Dict]:
    """Get current status of a bulk upload job."""
    bulk_job = db.query(BulkUploadJob).filter(
        BulkUploadJob.id == bulk_job_id
    ).first()
    
    if not bulk_job:
        return None
    
    # Calculate progress percentage
    progress = 0
    if bulk_job.total_resumes > 0:
        progress = int((bulk_job.processed / bulk_job.total_resumes) * 100)
    
    # Get processing time if completed
    processing_time = None
    if bulk_job.completed_at and bulk_job.started_at:
        processing_time = (bulk_job.completed_at - bulk_job.started_at).total_seconds()
    
    return {
        "id": bulk_job.id,
        "job_id": bulk_job.job_id,
        "status": bulk_job.status,
        "progress": progress,
        "total": bulk_job.total_resumes,
        "processed": bulk_job.processed,
        "passed": bulk_job.passed,
        "rejected": bulk_job.rejected,
        "errors": bulk_job.errors,
        "processing_time_seconds": processing_time,
        "created_at": bulk_job.created_at.isoformat() if bulk_job.created_at else None,
        "completed_at": bulk_job.completed_at.isoformat() if bulk_job.completed_at else None
    }


def get_bulk_job_results(db: Session, bulk_job_id: int) -> List[Dict]:
    """Get all results for a bulk upload job."""
    results = db.query(BulkUploadResult).filter(
        BulkUploadResult.bulk_job_id == bulk_job_id
    ).order_by(BulkUploadResult.match_score.desc()).all()
    
    return [{
        "id": r.id,
        "filename": r.filename,
        "status": r.status,
        "decision": r.decision,
        "match_score": r.match_score,
        "candidate_name": r.candidate_name,
        "candidate_email": r.candidate_email,
        "experience_years": r.experience_years,
        "skills": r.detected_skills.split(",") if r.detected_skills else [],
        "score_breakdown": {
            "skills": r.skill_score,
            "experience": r.experience_score,
            "education": r.education_score,
            "bonus": r.location_score
        },
        "rejection_reasons": json.loads(r.rejection_reasons) if r.rejection_reasons else [],
        "processing_time_ms": r.processing_time_ms,
        "candidate_id": r.candidate_id,
        "application_id": r.application_id
    } for r in results]
