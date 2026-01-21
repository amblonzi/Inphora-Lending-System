from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import models, auth
from database import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Total loans disbursed (sum of active and completed loans)
    total_disbursed = db.query(func.sum(models.Loan.amount)).filter(
        models.Loan.status.in_(["active", "completed"])
    ).scalar() or 0
    
    # Active clients count
    active_clients = db.query(func.count(models.Client.id)).scalar() or 0
    
    # Total revenue (interest from active and completed loans)
    total_revenue = db.query(
        func.sum(models.Loan.amount * models.Loan.interest_rate / 100)
    ).filter(
        models.Loan.status.in_(["active", "completed"])
    ).scalar() or 0
    
    # Total expenses
    total_expenses = db.query(func.sum(models.Expense.amount)).scalar() or 0
    
    # Active loans count
    active_loans = db.query(func.count(models.Loan.id)).filter(
        models.Loan.status == "active"
    ).scalar() or 0
    
    return {
        "total_disbursed": float(total_disbursed),
        "active_clients": active_clients,
        "total_revenue": float(total_revenue),
        "total_expenses": float(total_expenses),
        "active_loans": active_loans,
    }

@router.get("/trends")
def get_dashboard_trends(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    from datetime import date, timedelta
    from dateutil.relativedelta import relativedelta
    
    today = date.today()
    trends = []
    
    # Last 12 months
    for i in range(11, -1, -1):
        target_month = today - relativedelta(months=i)
        start_date = date(target_month.year, target_month.month, 1)
        end_date = start_date + relativedelta(months=1) - timedelta(days=1)
        
        # Disbursed
        disbursed = db.query(func.sum(models.Loan.amount)).filter(
            models.Loan.start_date >= start_date,
            models.Loan.start_date <= end_date,
            models.Loan.status.in_(["active", "completed"])
        ).scalar() or 0
        
        # Repayments
        repayments = db.query(func.sum(models.Repayment.amount)).filter(
            models.Repayment.payment_date >= start_date,
            models.Repayment.payment_date <= end_date
        ).scalar() or 0
        
        # Expenses
        expenses = db.query(func.sum(models.Expense.amount)).filter(
            models.Expense.date >= start_date,
            models.Expense.date <= end_date
        ).scalar() or 0
        
        # New Clients
        new_clients = db.query(func.count(models.Client.id)).filter(
            models.Client.created_at >= datetime(start_date.year, start_date.month, start_date.day),
            models.Client.created_at <= datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59)
        ).scalar() or 0
        
        trends.append({
            "month": start_date.strftime("%b %Y"),
            "disbursed": float(disbursed),
            "repayments": float(repayments),
            "expenses": float(expenses),
            "clients": new_clients
        })
        
    return trends
