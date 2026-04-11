from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas, auth
from tenant import get_tenant_db
from datetime import datetime, timezone

router = APIRouter(prefix="/collections", tags=["collections"])

@router.get("/dashboard")
def get_collections_dashboard(
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Overview for collections officers:
    PAR (Portfolio at Risk) and upcoming payouts.
    """
    active_loans = db.query(models.Loan).filter(models.Loan.status == "active").all()
    overdue_loans = [l for l in active_loans if l.end_date < datetime.now(timezone.utc).date()]
    
    return {
        "active_count": len(active_loans),
        "overdue_count": len(overdue_loans),
        "par_amount": sum([l.amount for l in overdue_loans]),
        "due_today": 12 # Mock
    }

@router.post("/loans/{loan_id}/write-off")
def write_off_loan(
    loan_id: int,
    reason: str,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.require_admin)
):
    """
    Handles loan write-offs with reason and admin authorisation.
    """
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
        
    loan.status = "written-off"
    loan.rejection_reason = f"WRITE-OFF: {reason}"
    db.commit()
    
    return {"message": "Loan written off successfully"}
