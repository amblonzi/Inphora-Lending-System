from fastapi import APIRouter, Depends, HTTPException, Request, Form
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List
import logging
import json
import models, schemas, auth, auth_enhanced
from database import get_db
from tenant import get_tenant_db
from utils import log_activity, create_notification
from services.mpesa_service import MpesaService
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/mpesa", tags=["mpesa"])
logger = logging.getLogger(__name__)
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
    db: Session = Depends(get_tenant_db)
):
    """Submit registration application - handles both JSON and form-data"""
    try:
        # Handle both JSON and form-data requests
        content_type = request.headers.get("content-type", "")
        
        if "application/json" in content_type:
            data = await request.json()
        else:
            form_data = await request.form()
            data = dict(form_data)
        
        # Get data with fallback to empty strings to avoid None issues in sanitization
        full_name = data.get("full_name", "")
        phone = data.get("phone", "")
        id_number = data.get("id_number", "")
        email = data.get("email")
        address = data.get("address", "")
        
        # Sanitize and validate input
        try:
            full_name = auth_enhanced.sanitize_string(full_name, max_length=100)
            phone = auth_enhanced.sanitize_phone(phone)
            id_number = auth_enhanced.sanitize_string(id_number, max_length=50)
            email = auth_enhanced.sanitize_email(email) if email else None
            address = auth_enhanced.sanitize_string(address, max_length=255)
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
            amount_paid=0, # Initial
            created_at=datetime.utcnow()
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
        logger.error(f"Registration failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "message": "Registration failed",
                "error": "REGISTRATION_FAILED"
            }
        )

@router.get("/transactions/unmatched")
async def get_unmatched_transactions(
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Fetch M-Pesa transactions that haven't been linked to a loan or repayment"""
    transactions = db.query(models.MpesaIncomingTransaction).filter(
        models.MpesaIncomingTransaction.loan_id == None,
        models.MpesaIncomingTransaction.repayment_id == None
    ).all()
    return transactions

@router.post("/reconcile/{trans_id}/{loan_id}")
async def reconcile_transaction(
    trans_id: str,
    loan_id: int,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Manually link an M-Pesa transaction to a loan repayment"""
    transaction = db.query(models.MpesaIncomingTransaction).filter(
        models.MpesaIncomingTransaction.transaction_id == trans_id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
        
    # Create repayment record
    repayment = models.Repayment(
        loan_id=loan_id,
        amount=transaction.amount,
        payment_date=transaction.transaction_date or datetime.utcnow(),
        mpesa_transaction_id=transaction.transaction_id,
        payment_method="mpesa",
        notes=f"Reconciled from M-Pesa: {transaction.sender_name} ({transaction.phone_number})"
    )
    
    db.add(repayment)
    transaction.loan_id = loan_id
    transaction.client_id = loan.client_id
    
    db.commit()
    db.refresh(repayment)
    
    log_activity(db, current_user.id, "reconcile", "mpesa_transaction", trans_id, {
        "loan_id": loan_id,
        "amount": transaction.amount
    })
    
    return {"success": True, "message": "Transaction reconciled", "repayment_id": repayment.id}

@router.get("/settings")
async def get_mpesa_settings(
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get M-Pesa API configuration"""
    settings = db.query(models.SystemSettings).filter(models.SystemSettings.category == "payment").all()
    return {s.setting_key: s.setting_value for s in settings}

@router.post("/settings")
async def update_mpesa_settings(
    settings_data: dict,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Update M-Pesa API configuration"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update settings")
        
    for key, value in settings_data.items():
        setting = db.query(models.SystemSettings).filter(
            models.SystemSettings.setting_key == key,
            models.SystemSettings.category == "payment"
        ).first()
        
        if setting:
            setting.setting_value = str(value)
        else:
            setting = models.SystemSettings(
                setting_key=key,
                setting_value=str(value),
                category="payment"
            )
            db.add(setting)
            
    db.commit()
    return {"success": True, "message": "Settings updated"}

@router.get("/balance")
async def get_mpesa_balance(
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Trigger an M-Pesa account balance query"""
    mpesa = get_mpesa_service(db)
    callback_url = f"{auth.BASE_URL}/api/mpesa/balance/result"
    
    try:
        response = mpesa.get_account_balance(callback_url)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"M-Pesa API error: {str(e)}")

@router.get("/applications")
async def get_registration_applications(
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get the list of pending registration applications"""
    apps = db.query(models.RegistrationApplication).order_by(
        models.RegistrationApplication.created_at.desc()
    ).all()
    return apps

@router.post("/stk/push/{loan_id}")
async def initiate_stk_push(
    loan_id: int,
    amount: float,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Initiate M-Pesa STK Push for loan repayment"""
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
        
    client = loan.client
    phone = client.mpesa_phone or client.phone
    
    mpesa = get_mpesa_service(db)
    callback_url = f"{auth.BASE_URL}/api/mpesa/stk/result"
    
    try:
        response = mpesa.stk_push(
            phone=phone,
            amount=int(amount),
            callback_url=callback_url,
            reference=f"LOAN-{loan_id}",
            description=f"Repayment for Loan #{loan_id}"
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STK Push failed: {str(e)}")
