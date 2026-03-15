"""
routers/payments.py — FIXED
- Overpayment guard
- Double-payment detection (idempotency key)
- Automatic loan closure when fully paid
- Proper receipt data returned
"""

from datetime import date
from decimal import Decimal
from typing import List, Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, condecimal
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Loan, Payment
from ..routers.auth import get_current_user, require_role
from ..models import User

log = structlog.get_logger()
router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────
class PaymentCreate(BaseModel):
    loan_id:        int
    amount:         condecimal(gt=0, max_digits=12, decimal_places=2)
    payment_date:   date
    payment_method: str                       # cash, mobile_money, bank_transfer
    reference:      Optional[str]             # External transaction reference
    idempotency_key: Optional[str]            # Prevents duplicate submissions


class PaymentResponse(BaseModel):
    id:             int
    loan_id:        int
    amount:         Decimal
    payment_date:   date
    payment_method: str
    reference:      Optional[str]
    status:         str
    receipt_number: str
    outstanding_after: Decimal

    class Config:
        orm_mode = True


# ── Helpers ───────────────────────────────────────────────────────────────────
def _get_outstanding(loan: Loan) -> Decimal:
    confirmed_total = sum(
        p.amount for p in loan.payments if p.status == "confirmed"
    )
    return max(Decimal("0"), loan.amount - confirmed_total)


def _generate_receipt(payment_id: int, loan_id: int) -> str:
    return f"RCPT-{loan_id:05d}-{payment_id:06d}"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[PaymentResponse])
async def list_payments(
    loan_id:  Optional[int] = Query(None),
    page:     int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db:       Session = Depends(get_db),
    _:        User    = Depends(get_current_user),
):
    q = db.query(Payment)
    if loan_id:
        q = q.filter(Payment.loan_id == loan_id)
    payments = q.order_by(Payment.payment_date.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return payments


@router.post("/", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def record_payment(
    body:         PaymentCreate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(require_role("admin", "officer", "cashier")),
):
    # 1. Verify loan exists and is active
    loan = db.query(Loan).filter(Loan.id == body.loan_id, Loan.is_deleted == False).first()
    if not loan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loan not found")
    if loan.status not in ("active", "disbursed"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot accept payment for a loan in '{loan.status}' status",
        )

    # 2. FIXED: Idempotency check — reject duplicate payment submissions
    if body.idempotency_key:
        dup = db.query(Payment).filter(Payment.idempotency_key == body.idempotency_key).first()
        if dup:
            log.warning("duplicate_payment_blocked", key=body.idempotency_key)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A payment with this idempotency key has already been recorded",
            )

    # 3. FIXED: Overpayment guard
    outstanding = _get_outstanding(loan)
    if body.amount > outstanding:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Payment amount ({body.amount}) exceeds outstanding balance ({outstanding}). "
                   f"Maximum accepted: {outstanding}",
        )

    # 4. Record payment
    payment = Payment(
        loan_id=body.loan_id,
        amount=body.amount,
        payment_date=body.payment_date,
        payment_method=body.payment_method,
        reference=body.reference,
        idempotency_key=body.idempotency_key,
        status="confirmed",
        recorded_by=current_user.id,
    )
    db.add(payment)
    db.flush()   # Get payment.id before commit

    # 5. Generate receipt number
    payment.receipt_number = _generate_receipt(payment.id, loan.id)

    # 6. FIXED: Auto-close loan when fully paid
    new_outstanding = outstanding - body.amount
    if new_outstanding == 0:
        loan.status = "closed"
        log.info("loan_auto_closed", loan_id=loan.id, final_payment=str(body.amount))

    db.commit()
    db.refresh(payment)
    log.info("payment_recorded", payment_id=payment.id, loan_id=loan.id,
             amount=str(body.amount), outstanding_after=str(new_outstanding))

    result = payment.__dict__.copy()
    result["outstanding_after"] = new_outstanding
    return result


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: int,
    db:         Session = Depends(get_db),
    _:          User    = Depends(get_current_user),
):
    p = db.query(Payment).filter(Payment.id == payment_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    return p


@router.post("/{payment_id}/reverse", status_code=status.HTTP_200_OK)
async def reverse_payment(
    payment_id:   int,
    reason:       str,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(require_role("admin")),
):
    """
    Reverse a confirmed payment (admin only).
    Re-opens the loan if it was auto-closed by this payment.
    """
    p = db.query(Payment).filter(Payment.id == payment_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    if p.status == "reversed":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Payment already reversed")

    p.status = "reversed"
    p.reversal_reason = reason
    p.reversed_by = current_user.id

    # Re-open loan if it was closed
    loan = db.query(Loan).filter(Loan.id == p.loan_id).first()
    if loan and loan.status == "closed":
        loan.status = "active"
        log.info("loan_reopened_after_reversal", loan_id=loan.id)

    db.commit()
    log.info("payment_reversed", payment_id=payment_id, reversed_by=current_user.id, reason=reason)
    return {"detail": "Payment reversed successfully", "payment_id": payment_id}
