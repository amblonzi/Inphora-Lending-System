from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas, auth
from database import get_db
from services.sms_service import SmsService
from utils import log_activity

router = APIRouter(prefix="/sms", tags=["sms"])

def get_sms_service(db: Session):
    settings = db.query(models.SystemSettings).filter(models.SystemSettings.category == "sms").all()
    config = {s.setting_key: s.setting_value for s in settings}
    
    return SmsService(
        provider=config.get("sms_provider", "simulator"),
        api_key=config.get("sms_api_key"),
        username=config.get("sms_username")
    )

@router.post("/send-reminder/{loan_id}")
def send_loan_reminder(
    loan_id: int,
    message_custom: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
        
    client = loan.client
    if not client.phone:
        raise HTTPException(status_code=400, detail="Client has no phone number")
        
    sms = get_sms_service(db)
    
    # Calculate amount due for reminder
    principal = loan.amount
    interest = (principal * (loan.interest_rate or 0)) / 100
    total_due = principal + interest
    paid = sum([r.amount for r in loan.repayments])
    remaining = max(0, total_due - paid)
    
    default_message = f"Hello {client.full_name}, this is a reminder for your Loan #{loan.id}. Remaining balance: KES {remaining:,.2f}. Please clear by {loan.end_date}."
    message = message_custom or default_message
    
    formatted_phone = SmsService.format_phone(client.phone)
    result = sms.send_sms(formatted_phone, message)
    
    if result.get("status") != "error":
        log_activity(db, current_user.id, "send_sms_reminder", "loan", loan.id, {"phone": formatted_phone})
    
    return result

@router.post("/settings")
def update_sms_settings(
    settings: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin)
):
    for key, value in settings.items():
        db_setting = db.query(models.SystemSettings).filter(models.SystemSettings.setting_key == key).first()
        if db_setting:
            db_setting.setting_value = str(value)
        else:
            db_setting = models.SystemSettings(
                setting_key=key,
                setting_value=str(value),
                category="sms"
            )
            db.add(db_setting)
            
    db.commit()
    return {"message": "SMS settings updated"}
