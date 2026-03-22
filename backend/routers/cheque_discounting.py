from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
import models, schemas, auth
from tenant import get_tenant_db
from pagination import paginate
from utils import log_activity

router = APIRouter(prefix="/cheque-discounting", tags=["cheque-discounting"])

@router.post("/", response_model=schemas.ChequeDiscount)
def create_cheque_discount(
    cheque: schemas.ChequeDiscountCreate,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Calculate discount
    discount_amount = (cheque.face_amount * cheque.discount_rate) / 100
    net_amount = cheque.face_amount - discount_amount
    
    db_cheque = models.ChequeDiscount(
        **cheque.dict(),
        discount_amount=discount_amount,
        net_amount=net_amount,
        status="pending"
    )
    db.add(db_cheque)
    db.commit()
    db.refresh(db_cheque)
    
    log_activity(db, current_user.id, "create", "cheque_discount", db_cheque.id, {"cheque_number": db_cheque.cheque_number})
    return db_cheque

@router.get("/", response_model=schemas.PaginatedResponse[schemas.ChequeDiscount])
def list_cheque_discounts(
    page: int = 1,
    size: int = 50,
    status: Optional[str] = None,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    query = db.query(models.ChequeDiscount).order_by(models.ChequeDiscount.created_at.desc())
    if status:
        query = query.filter(models.ChequeDiscount.status == status)
    
    return paginate(query, page, size, schemas.ChequeDiscount)

@router.put("/{cheque_id}/status")
def update_cheque_status(
    cheque_id: int,
    status: str,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    db_cheque = db.query(models.ChequeDiscount).filter(models.ChequeDiscount.id == cheque_id).first()
    if not db_cheque:
        raise HTTPException(status_code=404, detail="Cheque not found")
    
    db_cheque.status = status
    db.commit()
    
    log_activity(db, current_user.id, "update_status", "cheque_discount", db_cheque.id, {"status": status})
    return {"message": f"Cheque status updated to {status}"}

@router.delete("/{cheque_id}")
def delete_cheque_discount(
    cheque_id: int,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.require_admin)
):
    db_cheque = db.query(models.ChequeDiscount).filter(models.ChequeDiscount.id == cheque_id).first()
    if not db_cheque:
        raise HTTPException(status_code=404, detail="Cheque not found")
    
    db.delete(db_cheque)
    db.commit()
    return {"message": "Cheque discount removed"}
