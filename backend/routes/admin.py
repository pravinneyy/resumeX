from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, inspect
from db import get_db, engine
from models import (
    Recruiter, Candidate, Job, Application, JobAssessment,
    AssessmentSubmission, PsychometricSubmission, Problem,
    EvaluationSession, AntiCheatLog
)
from pydantic import BaseModel
from typing import Any, Dict, List

router = APIRouter()

# Super admin emails (should match frontend)
SUPER_ADMINS = ["pravinleein@gmail.com"]

# NOTE: Authentication is handled by frontend Clerk protection
# Backend temporarily bypasses auth check since admin page requires Clerk login

# ===== DATABASE METADATA =====
@router.get("/admin/tables")
def get_all_tables(db: Session = Depends(get_db)):
    """Get list of all tables with row counts"""
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    
    result = []
    for table_name in table_names:
        try:
            count_query = text(f"SELECT COUNT(*) FROM {table_name}")
            count = db.execute(count_query).scalar()
            result.append({
                "table_name": table_name,
                "row_count": count
            })
        except Exception as e:
            result.append({
                "table_name": table_name,
                "row_count": 0,
                "error": str(e)
            })
    
    return {"tables": result}

# ===== GENERIC CRUD OPERATIONS =====
TABLE_MODEL_MAP = {
    "recruiters": Recruiter,
    "candidates": Candidate,
    "jobs": Job,
    "applications": Application,
    "job_assessments": JobAssessment,
    "assessment_submissions": AssessmentSubmission,
    "psychometric_submissions": PsychometricSubmission,
    "problems": Problem,
    "evaluation_sessions": EvaluationSession,
    "anti_cheat_logs": AntiCheatLog
}

@router.get("/admin/table/{table_name}")
def get_table_data(
    table_name: str,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get all records from a specific table"""
    if table_name not in TABLE_MODEL_MAP:
        raise HTTPException(status_code=404, detail=f"Table {table_name} not found in model map")
    
    model = TABLE_MODEL_MAP[table_name]
    
    try:
        total_count = db.query(model).count()
        records = db.query(model).limit(limit).offset(offset).all()
        
        # Convert to dictionaries
        data = []
        for record in records:
            record_dict = {}
            for column in record.__table__.columns:
                value = getattr(record, column.name)
                # Convert datetime and other non-serializable types
                if hasattr(value, 'isoformat'):
                    value = value.isoformat()
                record_dict[column.name] = value
            data.append(record_dict)
        
        return {
            "table_name": table_name,
            "total_count": total_count,
            "returned_count": len(data),
            "limit": limit,
            "offset": offset,
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")

@router.delete("/admin/table/{table_name}/record/{record_id}")
def delete_record(
    table_name: str,
    record_id: str,
    db: Session = Depends(get_db)
):
    """Delete a specific record from a table"""
    if table_name not in TABLE_MODEL_MAP:
        raise HTTPException(status_code=404, detail=f"Table {table_name} not found")
    
    model = TABLE_MODEL_MAP[table_name]
    
    try:
        # Get primary key column name
        pk_column = list(model.__table__.primary_key.columns)[0].name
        
        # Query by primary key
        record = db.query(model).filter(getattr(model, pk_column) == record_id).first()
        
        if not record:
            raise HTTPException(status_code=404, detail="Record not found")
        
        db.delete(record)
        db.commit()
        
        return {"message": f"Record {record_id} deleted from {table_name}"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting record: {str(e)}")

class UpdateRecordRequest(BaseModel):
    updates: Dict[str, Any]

@router.put("/admin/table/{table_name}/record/{record_id}")
def update_record(
    table_name: str,
    record_id: str,
    request: UpdateRecordRequest,
    db: Session = Depends(get_db)
):
    """Update a specific record"""
    if table_name not in TABLE_MODEL_MAP:
        raise HTTPException(status_code=404, detail=f"Table {table_name} not found")
    
    model = TABLE_MODEL_MAP[table_name]
    
    try:
        pk_column = list(model.__table__.primary_key.columns)[0].name
        record = db.query(model).filter(getattr(model, pk_column) == record_id).first()
        
        if not record:
            raise HTTPException(status_code=404, detail="Record not found")
        
        # Update fields
        for key, value in request.updates.items():
            if hasattr(record, key):
                setattr(record, key, value)
        
        db.commit()
        db.refresh(record)
        
        return {"message": "Record updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating record: {str(e)}")

# ===== DATABASE RESET =====
@router.post("/admin/reset-all-tables")
def reset_all_tables(
    db: Session = Depends(get_db)
):
    """Clear all data from all tables (but keep table structure)"""
    try:
        # Order matters due to foreign key constraints
        tables_to_clear = [
            "anti_cheat_logs",
            "evaluation_sessions",
            "psychometric_submissions",
            "assessment_submissions",
            "job_assessments",
            "applications",
            "jobs",
            "problems",
            "candidates",
            "recruiters"
        ]
        
        deleted_counts = {}
        
        for table_name in tables_to_clear:
            try:
                # Use raw SQL for efficiency
                result = db.execute(text(f"DELETE FROM {table_name}"))
                deleted_counts[table_name] = result.rowcount
            except Exception as e:
                deleted_counts[table_name] = f"Error: {str(e)}"
        
        db.commit()
        
        return {
            "message": "All tables cleared successfully",
            "deleted_counts": deleted_counts
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error resetting database: {str(e)}")

@router.delete("/admin/table/{table_name}/clear")
def clear_table(
    table_name: str,
    db: Session = Depends(get_db)
):
    """Clear all data from a specific table (and dependent tables if needed)"""
    if table_name not in TABLE_MODEL_MAP:
        raise HTTPException(status_code=404, detail=f"Table {table_name} not found")
    
    
    try:
        # Use TRUNCATE CASCADE - PostgreSQL automatically handles all dependencies
        # This avoids manual dependency management and FK constraint issues
        db.execute(text(f"TRUNCATE TABLE {table_name} CASCADE"))
        db.commit()
        
        return {
            "message": f"Table {table_name} cleared successfully (CASCADE applied)",
            "status": "success"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error clearing table: {str(e)}")
