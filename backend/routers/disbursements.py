from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
import models, auth
from database import get_db

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
    
    # Simulate M-Pesa transaction (in production, call actual API)
    # For now, mark as completed immediately
    import secrets
    disbursement.mpesa_transaction_id = f"SIM{secrets.token_hex(8).upper()}"
    disbursement.mpesa_result_code = "0"
    disbursement.mpesa_result_desc = "Success (Simulated)"
    disbursement.status = "completed"
    disbursement.completed_at = datetime.utcnow()
    
    # Update loan status
    loan.status = "active"
    
    db.commit()
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
        # Schema Fix: Ensure column exists using active connection
        try:
            db.execute(text("ALTER TABLE disbursement_transactions ADD COLUMN originator_conversation_id VARCHAR(100) DEFAULT NULL"))
            db.commit()
        except Exception:
            db.rollback() # Column likely exists or other error, proceed
            
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
