"""
routers/borrowers.py — FIXED
- Proper pagination, search/filter
- Duplicate detection (same NID/phone)
- Soft-delete pattern
- Role-based write access
"""

from typing import List, Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, validator
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Borrower
from ..routers.auth import get_current_user, require_role
from ..models import User

log = structlog.get_logger()
router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────
class BorrowerCreate(BaseModel):
    full_name:      str
    national_id:    str
    phone:          str
    email:          Optional[EmailStr]
    address:        Optional[str]
    date_of_birth:  Optional[str]
    employer:       Optional[str]
    monthly_income: Optional[float]

    @validator("national_id")
    def nid_not_empty(cls, v):
        if not v.strip():
            raise ValueError("national_id cannot be blank")
        return v.strip()

    @validator("phone")
    def phone_digits(cls, v):
        digits = v.replace("+", "").replace(" ", "").replace("-", "")
        if not digits.isdigit() or len(digits) < 7:
            raise ValueError("Invalid phone number")
        return v


class BorrowerUpdate(BaseModel):
    full_name:      Optional[str]
    phone:          Optional[str]
    email:          Optional[EmailStr]
    address:        Optional[str]
    employer:       Optional[str]
    monthly_income: Optional[float]


class BorrowerResponse(BaseModel):
    id:             int
    full_name:      str
    national_id:    str
    phone:          str
    email:          Optional[str]
    address:        Optional[str]
    employer:       Optional[str]
    monthly_income: Optional[float]
    is_active:      bool
    loan_count:     Optional[int]

    class Config:
        orm_mode = True


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[BorrowerResponse])
async def list_borrowers(
    page:    int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search:  Optional[str] = Query(None, description="Search by name, NID, or phone"),
    db:      Session = Depends(get_db),
    _:       User    = Depends(get_current_user),
):
    q = db.query(Borrower).filter(Borrower.is_active == True)
    if search:
        term = f"%{search}%"
        q = q.filter(or_(
            Borrower.full_name.ilike(term),
            Borrower.national_id.ilike(term),
            Borrower.phone.ilike(term),
        ))
    borrowers = q.order_by(Borrower.full_name).offset((page - 1) * per_page).limit(per_page).all()

    results = []
    for b in borrowers:
        d = b.__dict__.copy()
        d["loan_count"] = len(b.loans) if hasattr(b, "loans") else 0
        results.append(d)
    return results


@router.post("/", response_model=BorrowerResponse, status_code=status.HTTP_201_CREATED)
async def create_borrower(
    body: BorrowerCreate,
    db:   Session = Depends(get_db),
    _:    User    = Depends(require_role("admin", "officer")),
):
    # FIXED: Duplicate detection before insert
    existing = db.query(Borrower).filter(
        or_(
            Borrower.national_id == body.national_id,
            Borrower.phone       == body.phone,
        ),
        Borrower.is_active == True,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A borrower with this National ID or phone number already exists",
        )

    borrower = Borrower(**body.dict(), is_active=True)
    db.add(borrower)
    db.commit()
    db.refresh(borrower)
    log.info("borrower_created", borrower_id=borrower.id, name=borrower.full_name)
    return borrower


@router.get("/{borrower_id}", response_model=BorrowerResponse)
async def get_borrower(
    borrower_id: int,
    db:          Session = Depends(get_db),
    _:           User    = Depends(get_current_user),
):
    b = db.query(Borrower).filter(Borrower.id == borrower_id, Borrower.is_active == True).first()
    if not b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrower not found")
    return b


@router.patch("/{borrower_id}", response_model=BorrowerResponse)
async def update_borrower(
    borrower_id: int,
    body:        BorrowerUpdate,
    db:          Session = Depends(get_db),
    _:           User    = Depends(require_role("admin", "officer")),
):
    b = db.query(Borrower).filter(Borrower.id == borrower_id, Borrower.is_active == True).first()
    if not b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrower not found")

    for field, value in body.dict(exclude_unset=True).items():
        setattr(b, field, value)
    db.commit()
    db.refresh(b)
    return b


@router.delete("/{borrower_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_borrower(
    borrower_id: int,
    db:          Session = Depends(get_db),
    _:           User    = Depends(require_role("admin")),
):
    b = db.query(Borrower).filter(Borrower.id == borrower_id, Borrower.is_active == True).first()
    if not b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrower not found")

    # FIXED: Block deactivation if borrower has active loans
    active_loans = [l for l in b.loans if l.status in ("active", "disbursed", "approved")]
    if active_loans:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot deactivate borrower with {len(active_loans)} active loan(s)",
        )

    b.is_active = False
    db.commit()
    log.info("borrower_deactivated", borrower_id=borrower_id)
    return None
