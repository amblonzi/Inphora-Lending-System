"""
routers/loans.py — FIXED
- Full CRUD with proper HTTP status codes
- Loan status state machine (prevents invalid transitions)
- Pagination on list endpoints
- Role-based access control
- Input validation via Pydantic
"""

from datetime import date
from decimal import Decimal
from enum import Enum
from typing import List, Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, condecimal, validator
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Loan, Borrower, Payment
from ..routers.auth import get_current_user, require_role
from ..models import User

log = structlog.get_logger()
router = APIRouter()


# ── Enums ─────────────────────────────────────────────────────────────────────
class LoanStatus(str, Enum):
    PENDING    = "pending"
    APPROVED   = "approved"
    DISBURSED  = "disbursed"
    ACTIVE     = "active"
    CLOSED     = "closed"
    DEFAULTED  = "defaulted"
    REJECTED   = "rejected"

# Valid transitions: from → {allowed next statuses}
VALID_TRANSITIONS = {
    LoanStatus.PENDING:   {LoanStatus.APPROVED, LoanStatus.REJECTED},
    LoanStatus.APPROVED:  {LoanStatus.DISBURSED, LoanStatus.REJECTED},
    LoanStatus.DISBURSED: {LoanStatus.ACTIVE},
    LoanStatus.ACTIVE:    {LoanStatus.CLOSED, LoanStatus.DEFAULTED},
    LoanStatus.CLOSED:    set(),
    LoanStatus.DEFAULTED: {LoanStatus.ACTIVE},
    LoanStatus.REJECTED:  set(),
}


# ── Schemas ───────────────────────────────────────────────────────────────────
class LoanCreate(BaseModel):
    borrower_id:     int
    amount:          condecimal(gt=0, max_digits=12, decimal_places=2)
    interest_rate:   condecimal(ge=0, le=100, max_digits=5, decimal_places=2)
    term_months:     int
    loan_type:       str
    purpose:         Optional[str]
    disbursement_date: Optional[date]

    @validator("term_months")
    def term_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("term_months must be greater than 0")
        return v


class LoanUpdate(BaseModel):
    amount:           Optional[condecimal(gt=0, max_digits=12, decimal_places=2)]
    interest_rate:    Optional[condecimal(ge=0, le=100, max_digits=5, decimal_places=2)]
    term_months:      Optional[int]
    purpose:          Optional[str]
    disbursement_date: Optional[date]


class LoanStatusUpdate(BaseModel):
    status:  LoanStatus
    notes:   Optional[str]


class LoanResponse(BaseModel):
    id:               int
    borrower_id:      int
    amount:           Decimal
    interest_rate:    Decimal
    term_months:      int
    status:           LoanStatus
    loan_type:        str
    purpose:          Optional[str]
    disbursement_date: Optional[date]
    created_at:       date
    monthly_payment:  Optional[Decimal]
    total_paid:       Optional[Decimal]
    outstanding_balance: Optional[Decimal]

    class Config:
        orm_mode = True


# ── Helpers ───────────────────────────────────────────────────────────────────
def _calculate_monthly_payment(principal: Decimal, annual_rate: Decimal, months: int) -> Decimal:
    """Standard amortisation formula."""
    if annual_rate == 0:
        return principal / months
    r = annual_rate / 100 / 12
    payment = principal * (r * (1 + r) ** months) / ((1 + r) ** months - 1)
    return round(payment, 2)


def _get_loan_or_404(loan_id: int, db: Session) -> Loan:
    loan = db.query(Loan).filter(Loan.id == loan_id, Loan.is_deleted == False).first()
    if not loan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loan not found")
    return loan


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[LoanResponse])
async def list_loans(
    page:        int = Query(1, ge=1),
    per_page:    int = Query(20, ge=1, le=100),
    loan_status: Optional[LoanStatus] = Query(None),
    borrower_id: Optional[int] = Query(None),
    db:          Session = Depends(get_db),
    _:           User    = Depends(get_current_user),
):
    """List loans with pagination and optional filters."""
    q = db.query(Loan).filter(Loan.is_deleted == False)
    if loan_status:
        q = q.filter(Loan.status == loan_status)
    if borrower_id:
        q = q.filter(Loan.borrower_id == borrower_id)

    loans = q.order_by(Loan.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    results = []
    for loan in loans:
        monthly = _calculate_monthly_payment(loan.amount, loan.interest_rate, loan.term_months)
        total_paid = sum(p.amount for p in loan.payments if p.status == "confirmed")
        outstanding = max(Decimal("0"), loan.amount - total_paid)
        results.append({**loan.__dict__, "monthly_payment": monthly,
                        "total_paid": total_paid, "outstanding_balance": outstanding})
    return results


@router.post("/", response_model=LoanResponse, status_code=status.HTTP_201_CREATED)
async def create_loan(
    body: LoanCreate,
    db:   Session = Depends(get_db),
    _:    User    = Depends(require_role("admin", "officer")),
):
    """Create a new loan application (starts in PENDING status)."""
    # Verify borrower exists
    borrower = db.query(Borrower).filter(Borrower.id == body.borrower_id, Borrower.is_active == True).first()
    if not borrower:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrower not found")

    loan = Loan(
        **body.dict(),
        status=LoanStatus.PENDING,
        is_deleted=False,
    )
    db.add(loan)
    db.commit()
    db.refresh(loan)
    log.info("loan_created", loan_id=loan.id, borrower_id=loan.borrower_id, amount=str(loan.amount))
    return loan


@router.get("/{loan_id}", response_model=LoanResponse)
async def get_loan(
    loan_id: int,
    db:      Session = Depends(get_db),
    _:       User    = Depends(get_current_user),
):
    """Get a single loan by ID."""
    return _get_loan_or_404(loan_id, db)


@router.patch("/{loan_id}", response_model=LoanResponse)
async def update_loan(
    loan_id: int,
    body:    LoanUpdate,
    db:      Session = Depends(get_db),
    _:       User    = Depends(require_role("admin", "officer")),
):
    """Update editable loan fields. Only allowed while loan is PENDING."""
    loan = _get_loan_or_404(loan_id, db)
    if loan.status != LoanStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot edit a loan in '{loan.status}' status. Only PENDING loans can be edited.",
        )
    for field, value in body.dict(exclude_unset=True).items():
        setattr(loan, field, value)
    db.commit()
    db.refresh(loan)
    return loan


@router.patch("/{loan_id}/status", response_model=LoanResponse)
async def update_loan_status(
    loan_id: int,
    body:    LoanStatusUpdate,
    db:      Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "officer")),
):
    """
    Transition a loan to a new status.
    FIXED: Enforces a state machine — invalid transitions are rejected.
    """
    loan = _get_loan_or_404(loan_id, db)
    current = LoanStatus(loan.status)
    target  = body.status

    if target not in VALID_TRANSITIONS.get(current, set()):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot transition loan from '{current}' to '{target}'. "
                   f"Allowed next states: {[s.value for s in VALID_TRANSITIONS[current]]}",
        )

    loan.status = target
    if body.notes:
        loan.notes = (loan.notes or "") + f"\n[{current} → {target}] {body.notes}"

    db.commit()
    db.refresh(loan)
    log.info("loan_status_changed", loan_id=loan_id, from_status=current, to_status=target,
             changed_by=current_user.id)
    return loan


@router.delete("/{loan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_loan(
    loan_id: int,
    db:      Session = Depends(get_db),
    _:       User    = Depends(require_role("admin")),
):
    """Soft-delete a loan. Only PENDING or REJECTED loans can be deleted."""
    loan = _get_loan_or_404(loan_id, db)
    if loan.status not in (LoanStatus.PENDING, LoanStatus.REJECTED):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only PENDING or REJECTED loans can be deleted.",
        )
    loan.is_deleted = True
    db.commit()
    log.info("loan_soft_deleted", loan_id=loan_id)
    return None


@router.get("/{loan_id}/schedule")
async def get_repayment_schedule(
    loan_id: int,
    db:      Session = Depends(get_db),
    _:       User    = Depends(get_current_user),
):
    """Generate the full amortisation schedule for a loan."""
    loan = _get_loan_or_404(loan_id, db)
    monthly = _calculate_monthly_payment(loan.amount, loan.interest_rate, loan.term_months)
    balance = loan.amount
    schedule = []
    r = loan.interest_rate / 100 / 12

    for month in range(1, loan.term_months + 1):
        interest = round(balance * r, 2)
        principal = round(monthly - interest, 2)
        balance   = max(Decimal("0"), round(balance - principal, 2))
        schedule.append({
            "month":           month,
            "payment":         monthly,
            "principal":       principal,
            "interest":        interest,
            "remaining_balance": balance,
        })

    return {"loan_id": loan_id, "monthly_payment": monthly, "schedule": schedule}
