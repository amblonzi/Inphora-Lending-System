from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
import models, auth, schemas
from database import get_db
from services.mpesa_service import MpesaService

def get_mpesa_service(db: Session):
    # Fetch from settings
    settings = db.query(models.SystemSettings).filter(models.SystemSettings.category == "payment").all()
    config = {s.setting_key: s.setting_value for s in settings}
    
    return MpesaService(
        consumer_key=config.get("mpesa_consumer_key", ""),
        consumer_secret=config.get("mpesa_consumer_secret", ""),
        shortcode=config.get("mpesa_shortcode", "174379"),
        passkey=config.get("mpesa_passkey", "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"),
        env=config.get("mpesa_env", "sandbox"),
        initiator_name=config.get("mpesa_initiator_name", "testapi"),
        initiator_password=config.get("mpesa_initiator_password", "")
    )

router = APIRouter(prefix="/disbursements", tags=["disbursements"])

def can_disburse(user: models.User):
    """Check if user has permission to disburse"""
    if user.role not in ["admin", "loan_officer", "finance_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to disburse funds")
    return True

@router.post("/loans/{loan_id}/disburse/mpesa")
def disburse_via_mpesa(
    loan_id: int,
    phone: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Disburse loan via M-Pesa (simulated for now)"""
    can_disburse(current_user)
    
    # Get loan
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    if loan.status != "approved":
        raise HTTPException(status_code=400, detail="Loan must be approved first")
    
    # Check if already disbursed
    existing = db.query(models.DisbursementTransaction).filter(
        models.DisbursementTransaction.loan_id == loan_id,
        models.DisbursementTransaction.status.in_(["completed", "processing"])
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Loan already disbursed or in progress")
    
    # Get client
    client = loan.client
    mpesa_phone = phone or client.mpesa_phone or client.phone
    
    # Create disbursement record
    disbursement = models.DisbursementTransaction(
        loan_id=loan_id,
        client_id=client.id,
        amount=loan.amount,
        method="mpesa",
        mpesa_phone=mpesa_phone,
        status="processing",
        initiated_by=current_user.id
    )
    db.add(disbursement)
    
    # Call M-Pesa Service
    mpesa = get_mpesa_service(db)
    callback_url = f"{auth.BASE_URL}/api/mpesa/b2c/result"
    
    try:
        response = mpesa.initiate_b2c(
            phone=mpesa_phone,
            amount=loan.amount,
            command_id="BusinessPayment",
            remarks=f"Loan Disbursement #{loan.id}",
            occasion="Loan",
            callback_url=callback_url
        )
        
        if response.get("ResponseCode") == "0":
            disbursement.status = "processing"
            disbursement.originator_conversation_id = response.get("OriginatorConversationID")
            db.commit()
            return {
                "message": "Disbursement initiated via M-Pesa",
                "transaction_id": disbursement.id,
                "status": "processing"
            }
        else:
            disbursement.status = "failed"
            disbursement.error_message = response.get("ResponseDescription")
            db.commit()
            raise HTTPException(status_code=400, detail=f"M-Pesa initiation failed: {response.get('ResponseDescription')}")
            
    except Exception as e:
        disbursement.status = "failed"
        disbursement.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))
    db.refresh(disbursement)
    
    return {
        "message": "Disbursement completed",
        "transaction_id": disbursement.id,
        "mpesa_ref": disbursement.mpesa_transaction_id,
        "amount": disbursement.amount,
        "phone": mpesa_phone
    }

@router.post("/loans/{loan_id}/disburse/bank")
def disburse_via_bank(
    loan_id: int,
    bank_reference: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Record bank transfer disbursement"""
    can_disburse(current_user)
    
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    if loan.status != "approved":
        raise HTTPException(status_code=400, detail="Loan must be approved first")
    
    # Check if already disbursed
    existing = db.query(models.DisbursementTransaction).filter(
        models.DisbursementTransaction.loan_id == loan_id,
        models.DisbursementTransaction.status == "completed"
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Loan already disbursed")
    
    client = loan.client
    
    # Create disbursement record
    disbursement = models.DisbursementTransaction(
        loan_id=loan_id,
        client_id=client.id,
        amount=loan.amount,
        method="bank",
        bank_name=client.bank_name,
        bank_account=client.bank_account_number,
        bank_reference=bank_reference,
        status="completed",
        initiated_by=current_user.id,
        completed_at=datetime.utcnow()
    )
    db.add(disbursement)
    
    # Update loan status
    loan.status = "active"
    
    db.commit()
    db.refresh(disbursement)
    
    return {
        "message": "Bank disbursement recorded",
        "transaction_id": disbursement.id,
        "reference": bank_reference,
        "amount": disbursement.amount
    }

from sqlalchemy import text

@router.post("/loans/{loan_id}/disburse/manual")
def disburse_manual(
    loan_id: int,
    notes: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Record manual cash disbursement"""
    try:
        can_disburse(current_user)
        
        loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
        if not loan:
            raise HTTPException(status_code=404, detail="Loan not found")
        
        if loan.status != "approved":
            raise HTTPException(status_code=400, detail="Loan must be approved first")
        
        disbursement = models.DisbursementTransaction(
            loan_id=loan_id,
            client_id=loan.client_id,
            amount=loan.amount,
            method="manual",
            bank_reference=notes,
            status="completed",
            initiated_by=current_user.id,
            completed_at=datetime.utcnow()
        )
        db.add(disbursement)
        
        loan.status = "active"
        
        db.commit()
        db.refresh(disbursement)
        
        return {
            "message": "Manual disbursement recorded",
            "transaction_id": disbursement.id
        }
    except Exception as e:
        print(f"Error disbursing manual: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.get("/history")
def get_disbursement_history(
    loan_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get disbursement transaction history"""
    query = db.query(models.DisbursementTransaction)
    
    if loan_id:
        query = query.filter(models.DisbursementTransaction.loan_id == loan_id)
    if status:
        query = query.filter(models.DisbursementTransaction.status == status)
    
    return query.order_by(models.DisbursementTransaction.initiated_at.desc()).all()

@router.get("/{transaction_id}")
def get_disbursement(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get disbursement transaction details"""
    disbursement = db.query(models.DisbursementTransaction).filter(
        models.DisbursementTransaction.id == transaction_id
    ).first()
    
    if not disbursement:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return disbursement
