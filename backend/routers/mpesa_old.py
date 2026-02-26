from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List
import json
import models, schemas, auth, auth_enhanced
from database import get_db
from utils import log_activity, create_notification
from services.mpesa_service import MpesaService
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/mpesa", tags=["mpesa"])
limiter = Limiter(key_func=get_remote_address)

# Registration fee (can be moved to settings)
REGISTRATION_FEE = 100

def get_mpesa_service(db: Session):
    # Fetch from settings
    settings = db.query(models.SystemSettings).filter(models.SystemSettings.category == "payment").all()
    config = {s.setting_key: s.setting_value for s in settings}
    
    consumer_key = config.get("mpesa_consumer_key", "")
    consumer_secret = config.get("mpesa_consumer_secret", "")
    shortcode = config.get("mpesa_shortcode", "174379")
    passkey = config.get("mpesa_passkey", "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919")
    env = config.get("mpesa_env", "sandbox")
    initiator_name = config.get("mpesa_initiator_name", "testapi")
    initiator_password = config.get("mpesa_initiator_password", "")
    
    return MpesaService(
        consumer_key=consumer_key,
        consumer_secret=consumer_secret,
        shortcode=shortcode,
        passkey=passkey,
        env=env,
        initiator_name=initiator_name,
        initiator_password=initiator_password
    )

@router.post("/register")
async def submit_registration(
    request: Request,
    db: Session = Depends(get_db)
):
    """Submit registration application - handles both JSON and form-data"""
    try:
        # Handle both JSON and form-data requests
        content_type = request.headers.get("content-type", "")
        
        if "application/json" in content_type:
            # JSON request
            data = await request.json()
        else:
            # Form-data request (original format)
            form_data = await request.form()
            data = dict(form_data)
        
        # Get data from JSON body or form
        full_name = data.get("full_name")
        phone = data.get("phone")
        id_number = data.get("id_number")
        email = data.get("email")
        address = data.get("address")
        
        # Sanitize and validate input
        try:
            full_name = auth_enhanced.sanitize_string(full_name or "", max_length=100)
            phone = auth_enhanced.sanitize_phone(phone or "")
            id_number = auth_enhanced.sanitize_string(id_number or "", max_length=50)
            email = auth_enhanced.sanitize_email(email) if email else None
            address = auth_enhanced.sanitize_string(address or "", max_length=255)
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail={
                    "success": False,
                    "message": f"Validation error: {str(e)}",
                    "error": "VALIDATION_ERROR"
                }
            )
        
        # Check if phone or ID already exists
        existing_client = db.query(models.Client).filter(
            (models.Client.phone == phone) | (models.Client.id_number == id_number)
        ).first()
        
        if existing_client:
            raise HTTPException(
                status_code=400,
                detail={
                    "success": False,
                    "message": "Client with this phone or ID already exists",
                    "error": "DUPLICATE_CLIENT"
                }
            )
        
        existing_app = db.query(models.RegistrationApplication).filter(
            (models.RegistrationApplication.phone == phone) | 
            (models.RegistrationApplication.id_number == id_number)
        ).first()
        
        if existing_app and existing_app.status not in ["rejected", "completed"]:
            raise HTTPException(
                status_code=400,
                detail={
                    "success": False,
                    "message": "Registration application already exists",
                    "error": "DUPLICATE_APPLICATION"
                }
            )
        
        # Create registration application
        application = models.RegistrationApplication(
            full_name=full_name,
            phone=phone,
            id_number=id_number,
            email=email,
            address=address,
            status="pending",
            registration_fee=REGISTRATION_FEE,
            submitted_at=datetime.utcnow()
        )
        
        db.add(application)
        db.commit()
        db.refresh(application)
        
        # Log activity
        log_activity(db, None, "register", "registration_application", application.id, {
            "full_name": full_name,
            "phone": phone,
            "id_number": id_number
        })
        
        return {
            "success": True,
            "message": "Registration submitted successfully",
            "data": {
                "application_id": application.id,
                "paybill": "174379",
                "account": f"REG{application.id:06d}",
                "fee": REGISTRATION_FEE,
                "status": "pending"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "message": "Registration failed",
                "error": "REGISTRATION_FAILED"
            }
        )
