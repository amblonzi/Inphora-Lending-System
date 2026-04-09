from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import models, schemas, auth
from tenant import get_tenant_db
from pagination import paginate

router = APIRouter(prefix="/repayments", tags=["repayments"])

@router.get("/", response_model=schemas.PaginatedResponse[schemas.Repayment])
def list_all_repayments(
    page: int = 1,
    size: int = 50,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    List all repayments across all loans for the organization.
    """
    query = db.query(models.Repayment).order_by(models.Repayment.payment_date.desc())
    return paginate(query, page, size, schemas.Repayment)

@router.get("/stats")
def get_repayment_stats(
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Get summary stats for repayments.
    """
    total_collected = db.query(models.Repayment).with_entities(models.Repayment.amount).all()
    total_val = sum([r.amount for r in total_collected])
    
    return {
        "total_count": len(total_collected),
        "total_amount": total_val
    }
