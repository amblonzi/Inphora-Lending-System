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
@limiter.limit("10/minute")
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
        
        # Sanitize and validate input
        try:
            full_name = auth_enhanced.sanitize_string(data.get("full_name", ""), max_length=100)
            phone = auth_enhanced.sanitize_phone(data.get("phone", ""))
            id_number = auth_enhanced.sanitize_string(data.get("id_number", ""), max_length=50)
            email = auth_enhanced.sanitize_email(data.get("email", "")) if data.get("email") else None
            address = auth_enhanced.sanitize_string(data.get("address", ""), max_length=255)
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

@router.post("/c2b/confirmation")
async def c2b_confirmation(request: Request, db: Session = Depends(get_db)):
    """Handle M-Pesa C2B Confirmation - Auto-matching repayments"""
    try:
        data = await request.json()
        trans_id = data.get('TransID')
        amount = float(data.get('TransAmount', 0))
        phone = data.get('MSISDN', '').replace('+', '')
        bill_ref = data.get('BillRefNumber', '').strip().upper()
        
        # Log the incoming transaction
        incoming = models.MpesaIncomingTransaction(
            transaction_id=trans_id,
            amount=amount,
            phone=phone,
            bill_ref=bill_ref,
            raw_callback_data=json.dumps(data),
            status="unmatched"
        )
        db.add(incoming)
        db.flush()

        # Try to match based on BillRefNumber (Loan Application REG or Loan Ref)
        if bill_ref.startswith('REG'):
            try:
                app_id = int(bill_ref.replace('REG', ''))
                application = db.query(models.RegistrationApplication).filter(models.RegistrationApplication.id == app_id).first()
                if application and application.status == "pending":
                    application.status = "paid"
                    application.mpesa_transaction_id = trans_id
                    application.amount_paid = amount
                    incoming.status = "matched"
            except: pass
        
        # Match based on BillRef as Loan ID if numeric or match phone to active loan
        if incoming.status == "unmatched":
            loan = None
            if bill_ref.isdigit():
                loan = db.query(models.Loan).filter(models.Loan.id == int(bill_ref), models.Loan.status == "active").first()
            
            if not loan:
                client = db.query(models.Client).filter(models.Client.phone.like(f"%{phone[-9:]}")).first()
                if client:
                    loan = db.query(models.Loan).filter(models.Loan.client_id == client.id, models.Loan.status == "active").first()
            
            if loan:
                repayment = models.Repayment(
                    loan_id=loan.id,
                    amount=amount,
                    payment_date=datetime.now().date(),
                    notes=f"Auto-matched M-Pesa {trans_id}",
                    mpesa_transaction_id=trans_id,
                    payment_method="mpesa"
                )
                db.add(repayment)
                db.flush()
                incoming.status = "matched"
                incoming.loan_id = loan.id
                incoming.client_id = loan.client_id
                incoming.repayment_id = repayment.id

        db.commit()
        return {"ResultCode": 0, "ResultDesc": "Accepted"}
    except Exception as e:
        db.rollback()
        return {"ResultCode": 1, "ResultDesc": str(e)}

@router.get("/transactions/unmatched", response_model=List[schemas.MpesaIncomingTransaction])
def get_unmatched_transactions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    return db.query(models.MpesaIncomingTransaction).filter(models.MpesaIncomingTransaction.status == "unmatched").all()

@router.post("/transactions/{trans_id}/reconcile")
def manual_reconcile(
    trans_id: int,
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    incoming = db.query(models.MpesaIncomingTransaction).filter(models.MpesaIncomingTransaction.id == trans_id).first()
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    
    if not incoming or not loan:
        raise HTTPException(status_code=404, detail="Transaction or Loan not found")
        
    repayment = models.Repayment(
        loan_id=loan.id,
        amount=incoming.amount,
        payment_date=datetime.now().date(),
        notes=f"Manually reconciled M-Pesa {incoming.transaction_id}",
        mpesa_transaction_id=incoming.transaction_id,
        payment_method="mpesa"
    )
    db.add(repayment)
    incoming.status = "matched"
    incoming.loan_id = loan.id
    incoming.client_id = loan.client_id
    incoming.repayment_id = repayment.id
    
    db.commit()
    # Log activity
    log_activity(db, current_user.id, "reconcile", "mpesa_transaction", incoming.id, {"loan_id": loan_id})
    
    create_notification(
        db,
        current_user.id,
        "M-Pesa Payment Reconciled",
        f"Payment of KES {incoming.amount:,.2f} manually reconciled to Loan #{loan_id}.",
        "success"
    )
    return {"message": "Transaction reconciled successfully"}

@router.post("/b2c/disburse/{loan_id}")
def initiate_disbursement(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan or loan.status != "approved":
        raise HTTPException(status_code=400, detail="Loan not found or not approved")
    
    if not loan.client.mpesa_phone:
        raise HTTPException(status_code=400, detail="Client has no M-Pesa phone number")

    # Create disbursement transaction
    trans = models.DisbursementTransaction(
        loan_id=loan.id,
        client_id=loan.client_id,
        amount=loan.amount,
        method="mpesa",
        mpesa_phone=loan.client.mpesa_phone,
        status="pending",
        initiated_by=current_user.id
    )
    db.add(trans)
    db.flush()

    # Call M-Pesa Service
    mpesa = get_mpesa_service(db)
    callback_url = f"{auth.BASE_URL}/api/mpesa/b2c/result" # Ensure auth.BASE_URL is set
    
    try:
        response = mpesa.initiate_b2c(
            phone=loan.client.mpesa_phone,
            amount=loan.amount,
            command_id="BusinessPayment",
            remarks=f"Loan Disbursement #{loan.id}",
            occasion="Loan",
            callback_url=callback_url
        )
        
        if response.get("ResponseCode") == "0":
            trans.status = "processing"
            trans.originator_conversation_id = response.get("OriginatorConversationID")
            db.commit()
        else:
            trans.status = "failed"
            trans.error_message = response.get("ResponseDescription")
            db.commit()
            raise HTTPException(status_code=400, detail=f"M-Pesa initiation failed: {response.get('ResponseDescription')}")

        # Log activity
        log_activity(db, current_user.id, "disburse", "loan", loan.id, {"method": "mpesa", "trans_id": trans.id})
        return {"message": "Disbursement initiated", "transaction_id": trans.id}
            
    except Exception as e:
        trans.status = "failed"
        trans.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/b2c/result")
async def b2c_result(request: Request, db: Session = Depends(get_db)):
    """Callback for B2C Disbursement"""
    data = await request.json()
    result = data.get("Result", {})
    if not result:
        return {"ResultCode": 1, "ResultDesc": "Invalid payload"}

    originator_cid = result.get("OriginatorConversationID")
    result_code = result.get("ResultCode")
    result_desc = result.get("ResultDesc")
    mpesa_trans_id = result.get("TransactionID")

    # Find the transaction
    trans = db.query(models.DisbursementTransaction).filter(
        models.DisbursementTransaction.originator_conversation_id == originator_cid
    ).first()

    if not trans:
        print(f"B2C Callback: Transaction not found for CID {originator_cid}")
        return {"status": "ignored"}

    trans.mpesa_result_code = str(result_code)
    trans.mpesa_result_desc = result_desc
    trans.mpesa_transaction_id = mpesa_trans_id
    trans.completed_at = datetime.utcnow()

    if int(result_code) == 0:
        trans.status = "completed"
        # Update loan status to active if it was approved
        loan = db.query(models.Loan).filter(models.Loan.id == trans.loan_id).first()
        if loan and loan.status == "approved":
            loan.status = "active"
    else:
        trans.status = "failed"
        trans.error_message = result_desc

    db.commit()
    return {"ResultCode": 0, "ResultDesc": "Success"}

@router.post("/stk/push/{loan_id}")
def initiate_stk_push(
    loan_id: int,
    amount: Optional[float] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
        
    payment_amount = amount or loan.amount # Or calculated next installment
    
    mpesa = get_mpesa_service(db)
    callback_url = f"{auth.BASE_URL}/api/mpesa/stk/callback"
    
    response = mpesa.stk_push(
        phone=loan.client.phone,
        amount=int(payment_amount),
        callback_url=callback_url,
        reference=f"LOAN{loan.id}",
        description=f"Repayment for Loan #{loan.id}"
    )
    
    # Log activity
    log_activity(db, current_user.id, "stk_push", "loan", loan.id, {"amount": payment_amount})
    return response

@router.post("/stk/callback")
async def stk_callback(request: Request, db: Session = Depends(get_db)):
    """Handle M-Pesa STK Push Callback"""
    data = await request.json()
    stk_callback = data.get("Body", {}).get("stkCallback", {})
    result_code = stk_callback.get("ResultCode")
    checkout_id = stk_callback.get("CheckoutRequestID")
    
    if result_code == 0:
        # Success
        metadata = stk_callback.get("CallbackMetadata", {}).get("Item", [])
        amount = 0
        receipt = ""
        phone = ""
        for item in metadata:
            if item["Name"] == "Amount": amount = item["Value"]
            if item["Name"] == "MpesaReceiptNumber": receipt = item["Value"]
            if item["Name"] == "PhoneNumber": phone = str(item["Value"])
        
        # Log incoming transaction
        incoming = models.MpesaIncomingTransaction(
            transaction_id=receipt,
            amount=amount,
            phone=phone,
            bill_ref=f"STK-{checkout_id}",
            raw_callback_data=json.dumps(data),
            status="unmatched"
        )
        db.add(incoming)
        db.flush()
        
        # Match by phone to the latest active loan
        client = db.query(models.Client).filter(models.Client.phone.like(f"%{phone[-9:]}")).first()
        if client:
            loan = db.query(models.Loan).filter(models.Loan.client_id == client.id, models.Loan.status == "active").order_by(models.Loan.id.desc()).first()
            if loan:
                repayment = models.Repayment(
                    loan_id=loan.id,
                    amount=amount,
                    payment_date=datetime.now().date(),
                    notes=f"STK Repayment {receipt}",
                    mpesa_transaction_id=receipt,
                    payment_method="mpesa"
                )
                db.add(repayment)
                incoming.status = "matched"
                incoming.loan_id = loan.id
                incoming.client_id = loan.client_id
                incoming.repayment_id = repayment.id

        db.commit()
        
    return {"ResultCode": 0, "ResultDesc": "Accepted"}

@router.get("/balance")
def check_balance(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin)
):
    """Check M-Pesa Account Balance"""
    
    mpesa = get_mpesa_service(db)
    # This usually triggers a callback, so in simulator we just return a mock or call the dummy
    # return mpesa.get_account_balance(callback_url=...)
    
    return {
        "balance": 150000.00,
        "last_checked": datetime.now(),
        "account": "Business Payment (Working)"
    }

@router.post("/settings")
def update_mpesa_settings(
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
                category="payment"
            )
            db.add(db_setting)
            
    db.commit()
    # Log activity
    log_activity(db, current_user.id, "update_settings", "mpesa", None, {"keys": list(settings.keys())})
    return {"message": "Settings updated successfully"}

