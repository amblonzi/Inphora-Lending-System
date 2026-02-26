from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any
import models
from database import get_db
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
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Log frontend errors from the client application.
    """
    try:
        # Store error in database or external logging service
        # For now, we'll just print it and could store in a logs table
        
        print(f"FRONTEND ERROR [{error_data.namespace}]: {error_data.message}")
        if error_data.error:
            print(f"Error details: {error_data.error}")
        print(f"URL: {error_data.url}")
        print(f"User Agent: {error_data.userAgent}")
        print(f"User ID: {current_user.id}")
        print(f"Timestamp: {error_data.timestamp}")
        print("-" * 50)
        
        # TODO: Store in database logs table or send to external service like Sentry
        
        return {"status": "logged", "message": "Error logged successfully"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to log error: {str(e)}")
