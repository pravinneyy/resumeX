"""
Bulk Upload API Routes
======================
Endpoints for recruiters to upload hundreds of resumes at once.
"""

from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import asyncio

from db import get_db
from models import Job, BulkUploadJob, BulkUploadResult
from services.bulk_processor import (
    BulkResumeProcessor,
    get_bulk_job_status,
    get_bulk_job_results
)
from utils.security import get_current_user

router = APIRouter(prefix="/bulk", tags=["Bulk Upload"])


@router.post("/jobs/{job_id}/upload")
async def bulk_upload_resumes(
    job_id: int,
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    auto_advance_threshold: int = Form(75),
    auto_reject_threshold: int = Form(40),
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    Upload multiple resumes for bulk ATS screening.
    
    - Validates that all files are PDFs under 10MB
    - Creates a bulk upload job for tracking
    - Processes resumes in the background
    - Auto-advances candidates above threshold to assessment
    - Auto-rejects candidates below threshold
    
    Args:
        job_id: ID of the job to screen against
        files: List of PDF files (max 500 per upload)
        auto_advance_threshold: Score threshold to auto-invite to assessment (default: 75)
        auto_reject_threshold: Score threshold to auto-reject (default: 40)
    
    Returns:
        bulk_job_id: ID to track progress
        total: Number of files uploaded
    """
    # 1. Validate job exists and belongs to recruiter
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.recruiter_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized to upload for this job")
    
    # 2. Validate file count
    if len(files) > 500:
        raise HTTPException(
            status_code=400, 
            detail="Maximum 500 files per upload. Please split into smaller batches."
        )
    
    if len(files) == 0:
        raise HTTPException(status_code=400, detail="No files provided")
    
    # 3. Validate and read files
    file_data = []
    for file in files:
        # Check file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type: {file.filename}. Only PDF files are accepted."
            )
        
        # Read content
        content = await file.read()
        
        # Check file size (10MB limit)
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail=f"File too large: {file.filename}. Maximum size is 10MB."
            )
        
        file_data.append((file.filename, content))
    
    # 4. Create bulk upload job
    processor = BulkResumeProcessor(db)
    bulk_job = processor.create_bulk_job(
        job_id=job_id,
        recruiter_id=current_user_id,
        total_files=len(file_data),
        auto_advance_threshold=auto_advance_threshold,
        auto_reject_threshold=auto_reject_threshold
    )
    
    # Capture IDs for background thread to avoid DetachedInstanceError
    bulk_upload_job_id = bulk_job.id
    target_job_id = job_id
    
    # 5. Process in background using asyncio
    # Create an event loop task that will run after request returns
    import threading
    
    def run_processing():
        """Run async processing in a background thread with its own event loop"""
        import asyncio
        
        async def process():
            try:
                # Create new DB session for background thread
                from db import SessionLocal
                db_session = SessionLocal()
                processor = BulkResumeProcessor(db_session)
                
                await processor.process_bulk_upload(
                    bulk_job_id=bulk_upload_job_id,
                    file_data=file_data,
                    job_id=target_job_id
                )
                db_session.close()
            except Exception as e:
                print(f"[BULK] Background processing error: {e}")
                import traceback
                traceback.print_exc()
                
                # Mark job as failed
                from db import SessionLocal as DBSession
                try:
                    err_db = DBSession()
                    failed_job = err_db.query(BulkUploadJob).filter(BulkUploadJob.id == bulk_upload_job_id).first()
                    if failed_job:
                        failed_job.status = "failed"
                        failed_job.error_message = str(e)
                        err_db.commit()
                    err_db.close()
                except:
                    pass
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(process())
        loop.close()
    
    # Start background thread
    thread = threading.Thread(target=run_processing, daemon=True)
    thread.start()
    
    return {
        "message": "Bulk upload started",
        "bulk_job_id": bulk_job.id,
        "total": len(file_data),
        "auto_advance_threshold": auto_advance_threshold,
        "auto_reject_threshold": auto_reject_threshold,
        "status_url": f"/api/bulk/status/{bulk_job.id}"
    }


@router.get("/status/{bulk_job_id}")
def get_bulk_upload_status(
    bulk_job_id: int,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    Get the current status of a bulk upload job.
    
    Returns progress, counts of passed/rejected, and processing time.
    """
    # Get bulk job
    bulk_job = db.query(BulkUploadJob).filter(
        BulkUploadJob.id == bulk_job_id
    ).first()
    
    if not bulk_job:
        raise HTTPException(status_code=404, detail="Bulk upload job not found")
    
    # Verify ownership
    if bulk_job.recruiter_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this job")
    
    status = get_bulk_job_status(db, bulk_job_id)
    
    if not status:
        raise HTTPException(status_code=404, detail="Bulk upload job not found")
    
    return status


@router.get("/results/{bulk_job_id}")
def get_bulk_upload_results(
    bulk_job_id: int,
    status_filter: Optional[str] = None,  # passed, rejected, error
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    Get detailed results for each resume in a bulk upload.
    
    Results are sorted by match score (highest first).
    Can filter by status: passed, rejected, error
    """
    # Get bulk job
    bulk_job = db.query(BulkUploadJob).filter(
        BulkUploadJob.id == bulk_job_id
    ).first()
    
    if not bulk_job:
        raise HTTPException(status_code=404, detail="Bulk upload job not found")
    
    # Verify ownership
    if bulk_job.recruiter_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this job")
    
    results = get_bulk_job_results(db, bulk_job_id)
    
    # Apply filter if provided
    if status_filter:
        results = [r for r in results if r["status"] == status_filter]
    
    return {
        "bulk_job_id": bulk_job_id,
        "total_results": len(results),
        "results": results
    }


@router.get("/history/{job_id}")
def get_bulk_upload_history(
    job_id: int,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    Get history of bulk uploads for a specific job.
    """
    # Verify job ownership
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.recruiter_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    bulk_jobs = db.query(BulkUploadJob).filter(
        BulkUploadJob.job_id == job_id
    ).order_by(BulkUploadJob.created_at.desc()).limit(limit).all()
    
    return [{
        "id": bj.id,
        "status": bj.status,
        "total": bj.total_resumes,
        "passed": bj.passed,
        "rejected": bj.rejected,
        "errors": bj.errors,
        "auto_advance_threshold": bj.auto_advance_threshold,
        "created_at": bj.created_at.isoformat() if bj.created_at else None,
        "completed_at": bj.completed_at.isoformat() if bj.completed_at else None
    } for bj in bulk_jobs]


@router.post("/resend-invites/{bulk_job_id}")
def resend_assessment_invites(
    bulk_job_id: int,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    Resend assessment invites to all passed candidates from a bulk upload.
    
    Useful if initial emails failed or need to send reminders.
    """
    # Get bulk job
    bulk_job = db.query(BulkUploadJob).filter(
        BulkUploadJob.id == bulk_job_id
    ).first()
    
    if not bulk_job:
        raise HTTPException(status_code=404, detail="Bulk upload job not found")
    
    if bulk_job.recruiter_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get all passed candidates
    passed_results = db.query(BulkUploadResult).filter(
        BulkUploadResult.bulk_job_id == bulk_job_id,
        BulkUploadResult.decision == "ADVANCE"
    ).all()
    
    # TODO: Implement email sending logic here
    # For now, just return the count
    
    return {
        "message": f"Would resend invites to {len(passed_results)} candidates",
        "candidate_count": len(passed_results)
    }


@router.delete("/jobs/{bulk_job_id}")
def delete_bulk_upload_job(
    bulk_job_id: int,
    delete_applications: bool = False,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    Delete a bulk upload job and optionally its created applications.
    
    Args:
        bulk_job_id: ID of the bulk upload to delete
        delete_applications: If true, also delete all applications created by this upload
    """
    bulk_job = db.query(BulkUploadJob).filter(
        BulkUploadJob.id == bulk_job_id
    ).first()
    
    if not bulk_job:
        raise HTTPException(status_code=404, detail="Bulk upload job not found")
    
    if bulk_job.recruiter_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Optionally delete associated applications
    if delete_applications:
        from models import Application
        db.query(Application).filter(
            Application.bulk_upload_id == bulk_job_id
        ).delete()
    
    # Delete results
    db.query(BulkUploadResult).filter(
        BulkUploadResult.bulk_job_id == bulk_job_id
    ).delete()
    
    # Delete the job
    db.delete(bulk_job)
    db.commit()
    
    return {"message": "Bulk upload job deleted successfully"}
