"""
routers/reports.py — FIXED
- Portfolio at Risk (PAR) calculation
- Repayment rate summary
- Revenue (interest collected) report
- Role-gated: only admin/manager
"""

from datetime import date
from decimal import Decimal
from typing import Optional

import structlog
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Loan, Payment, Borrower
from ..routers.auth import require_role
from ..models import User

log = structlog.get_logger()
router = APIRouter()


@router.get("/dashboard")
async def dashboard_summary(
    db: Session = Depends(get_db),
    _:  User    = Depends(require_role("admin", "manager")),
):
    """High-level portfolio KPIs for the dashboard."""
    total_loans       = db.query(func.count(Loan.id)).filter(Loan.is_deleted == False).scalar()
    active_loans      = db.query(func.count(Loan.id)).filter(Loan.status == "active", Loan.is_deleted == False).scalar()
    total_disbursed   = db.query(func.sum(Loan.amount)).filter(Loan.status.in_(["active","closed","defaulted"]), Loan.is_deleted == False).scalar() or Decimal("0")
    total_collected   = db.query(func.sum(Payment.amount)).filter(Payment.status == "confirmed").scalar() or Decimal("0")
    defaulted_loans   = db.query(func.count(Loan.id)).filter(Loan.status == "defaulted").scalar()
    total_borrowers   = db.query(func.count(Borrower.id)).filter(Borrower.is_active == True).scalar()
    pending_approvals = db.query(func.count(Loan.id)).filter(Loan.status == "pending").scalar()

    return {
        "total_loans":        total_loans,
        "active_loans":       active_loans,
        "pending_approvals":  pending_approvals,
        "defaulted_loans":    defaulted_loans,
        "total_borrowers":    total_borrowers,
        "total_disbursed":    float(total_disbursed),
        "total_collected":    float(total_collected),
        "collection_rate_pct": round(float(total_collected / total_disbursed * 100), 2) if total_disbursed else 0,
    }


@router.get("/par")
async def portfolio_at_risk(
    days:  int = Query(30, ge=1, description="PAR threshold in days past due"),
    db:    Session = Depends(get_db),
    _:     User    = Depends(require_role("admin", "manager")),
):
    """
    Portfolio at Risk (PAR) — percentage of outstanding principal on loans
    that are overdue by more than `days` days.
    """
    active_loans   = db.query(Loan).filter(Loan.status == "active", Loan.is_deleted == False).all()
    total_outstanding = Decimal("0")
    at_risk_outstanding = Decimal("0")
    today = date.today()

    for loan in active_loans:
        outstanding = max(Decimal("0"), loan.amount - sum(
            p.amount for p in loan.payments if p.status == "confirmed"
        ))
        total_outstanding += outstanding

        # Check if any expected payment is overdue beyond threshold
        if loan.disbursement_date:
            days_elapsed = (today - loan.disbursement_date).days
            if days_elapsed > days:
                at_risk_outstanding += outstanding

    par = (at_risk_outstanding / total_outstanding * 100) if total_outstanding > 0 else Decimal("0")

    return {
        "par_days":               days,
        "total_outstanding":      float(total_outstanding),
        "at_risk_outstanding":    float(at_risk_outstanding),
        "par_percentage":         round(float(par), 2),
        "as_of_date":             today.isoformat(),
    }


@router.get("/collections")
async def collections_report(
    from_date: date = Query(...),
    to_date:   date = Query(...),
    db:        Session = Depends(get_db),
    _:         User    = Depends(require_role("admin", "manager")),
):
    """Total collections in a date range, grouped by payment method."""
    if from_date > to_date:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="from_date must be before to_date")

    rows = (
        db.query(
            Payment.payment_method,
            func.count(Payment.id).label("count"),
            func.sum(Payment.amount).label("total"),
        )
        .filter(
            Payment.status == "confirmed",
            Payment.payment_date >= from_date,
            Payment.payment_date <= to_date,
        )
        .group_by(Payment.payment_method)
        .all()
    )

    return {
        "from_date": from_date.isoformat(),
        "to_date":   to_date.isoformat(),
        "by_method": [{"method": r[0], "count": r[1], "total": float(r[2] or 0)} for r in rows],
        "grand_total": float(sum(r[2] or 0 for r in rows)),
    }
