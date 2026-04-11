from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any
import models
import json
from tenant import get_tenant_db
from auth import get_current_active_user
from datetime import datetime

router = APIRouter(prefix="/logs", tags=["logs"])

class ErrorLogEntry(BaseModel):
    level: str
    message: str
    error: Optional[Dict[str, Any]] = None
    url: str
    userAgent: str
    timestamp: str
    namespace: str

@router.post("/error")
async def log_frontend_error(
    error_data: ErrorLogEntry,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Log frontend errors from the client application.
    """
    try:
        # Store error in database logs table
        log_entry = models.ActivityLog(
            user_id=current_user.id,
            action="frontend_error",
            resource=error_data.namespace,
            resource_id=error_data.url[:50],
            details=json.dumps({
                "message": error_data.message,
                "error": error_data.error,
                "userAgent": error_data.userAgent,
                "timestamp": error_data.timestamp
            }),
            ip_address=None # Could be extracted from request
        )
        db.add(log_entry)
        db.commit()
        
        return {"success": True, "message": "Error logged successfully"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to log error: {str(e)}")
