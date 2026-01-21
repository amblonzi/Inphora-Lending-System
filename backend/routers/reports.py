from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, datetime, timedelta
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/profit-loss")
def get_profit_loss(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    try:
        # Default range: last 30 days if not provided
        if not end_date:
            end_date = date.today()
        if not start_date:
            start_date = end_date - timedelta(days=30)

        # 1. Revenue: Interest from repayments in this period
        # Note: Simplistic approach - interest is a portion of each repayment.
        # In a real system, interest is recognized when earned.
        # Here we'll sum interest portions calculated in the schedule if we had it stored, 
        # but for now, let's estimate or use a simplified logic: 
        # Total Revenue = sum(repayments) * (avg_interest_rate / (100 + avg_interest_rate)) ? No.
        
        # Better: Revenue = sum(interest_earned_on_active_loans) + processing_fees + insurance_fees...
        
        # Let's sum processing fees and other fees from loans created in this period
        loans_in_period = db.query(models.Loan).filter(
            models.Loan.start_date >= start_date,
            models.Loan.start_date <= end_date + timedelta(days=1)
        ).all()
        
        fee_income = sum([
            (l.processing_fee or 0) + (l.insurance_fee or 0) + (l.valuation_fee or 0)
            for l in loans_in_period
        ])
        
        # Let's sum interest from repayments made in this period
        # Simplified: Assume fixed interest split for now
        repayments = db.query(models.Repayment).filter(
            models.Repayment.payment_date >= start_date,
            models.Repayment.payment_date <= end_date
        ).all()
        
        interest_income = 0
        for r in repayments:
            loan = r.loan
            if loan:
                # Interest % of total loan cost
                # Handle potential None values safely
                l_amount = loan.amount or 0
                l_rate = loan.interest_rate or 0
                
                if l_amount > 0:
                    total_cost = l_amount * (1 + (l_rate / 100))
                    # Prevent division by zero just in case
                    if total_cost > 0:
                        interest_ratio = (l_amount * l_rate / 100) / total_cost
                        interest_income += (r.amount or 0) * interest_ratio
                    else:
                        # Should technically not happen if amount > 0
                        pass

        total_income = fee_income + interest_income

        # 2. Expenses: All expenses in this period
        expenses = db.query(models.Expense).filter(
            models.Expense.date >= start_date,
            models.Expense.date <= end_date
        ).all()
        
        total_expenses = sum([(e.amount or 0) for e in expenses])
        
        net_profit = total_income - total_expenses

        return {
            "start_date": start_date,
            "end_date": end_date,
            "fee_income": round(fee_income, 2),
            "interest_income": round(interest_income, 2),
            "total_income": round(total_income, 2),
            "total_expenses": round(total_expenses, 2),
            "net_profit": round(net_profit, 2),
            "expense_breakdown": [
                {"category": e.category or "Other", "amount": e.amount, "description": e.description}
                for e in expenses
            ]
        }
    except Exception as e:
        print(f"Error in profit-loss report: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.get("/portfolio-at-risk")
def get_portfolio_at_risk(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # PAR logic: Analyze active loans
    # 1. Total Active Portfolio
    active_loans = db.query(models.Loan).filter(models.Loan.status == "active").all()
    total_portfolio_value = sum([l.amount for l in active_loans])
    
    par_stats = {
        "current": 0,    # Paid on time or <= 1 day late
        "par_30": 0,     # 1-30 days late
        "par_60": 0,     # 31-60 days late
        "par_90": 0,     # 61-90 days late
        "par_90plus": 0  # > 90 days late
    }
    
    today = date.today()
    
    for loan in active_loans:
        # Calculate amount due vs amount paid
        total_paid = sum([r.amount for r in loan.repayments])
        
        # Determine schedule 
        # (This is duplicated logic from loans router, maybe should be a utility)
        num_installments = 0
        interval = 0
        if loan.repayment_frequency == "daily":
            num_installments = loan.duration_months * 30
            interval = 1
        elif loan.repayment_frequency == "weekly":
            num_installments = loan.duration_months * 4
            interval = 7
        else:
            num_installments = loan.duration_months
            interval = 30
            
        total_due = loan.amount * (1 + (loan.interest_rate / 100))
        installment_amount = total_due / num_installments
        
        # Find expected balance today
        installments_passed = 0
        current_date_in_loop = loan.start_date
        while current_date_in_loop <= today and installments_passed < num_installments:
            current_date_in_loop += timedelta(days=interval)
            if current_date_in_loop <= today:
                installments_passed += 1
        
        expected_paid = installments_passed * installment_amount
        
        if total_paid >= expected_paid:
            par_stats["current"] += loan.amount
        else:
            # Overdue! Calculate days since first missed payment
            # A bit complex to find the EXACT day without stored schedule, 
            # let's estimate based on amount gap
            amount_overdue = expected_paid - total_paid
            installments_overdue = amount_overdue / installment_amount
            days_overdue = int(installments_overdue * interval)
            
            if days_overdue <= 30:
                par_stats["par_30"] += loan.amount
            elif days_overdue <= 60:
                par_stats["par_60"] += loan.amount
            elif days_overdue <= 90:
                par_stats["par_90"] += loan.amount
            else:
                par_stats["par_90plus"] += loan.amount
                
    return {
        "as_of_date": today,
        "total_active_portfolio": round(total_portfolio_value, 2),
        "par_distribution": par_stats,
        "par_ratios": {
            k: round((v / total_portfolio_value * 100 if total_portfolio_value > 0 else 0), 2)
            for k, v in par_stats.items()
        }
    }

@router.get("/portfolio-health")
def get_portfolio_health(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Detailed portfolio health analytics including product performance distribution."""
    # 1. Product Performance
    products = db.query(models.LoanProduct).all()
    product_stats = []
    for p in products:
        loans = db.query(models.Loan).filter(models.Loan.product_id == p.id).all()
        total_disbursed = sum([l.amount for l in loans])
        active_loans = [l for l in loans if l.status == "active"]
        outstanding_principal = sum([l.amount for l in active_loans])
        
        product_stats.append({
            "name": p.name,
            "disbursed": float(total_disbursed),
            "outstanding": float(outstanding_principal),
            "count": len(loans),
            "active_count": len(active_loans)
        })

    # 2. Re-use PAR logic but return more detailed for charts
    par_data = get_portfolio_at_risk(db, current_user)
    
    return {
        "product_performance": product_stats,
        "par_summary": par_data
    }

@router.get("/client-trends")
def get_client_trends(
    months: int = 12,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Monthly client acquisition trends."""
    from dateutil.relativedelta import relativedelta
    today = date.today()
    trends = []
    
    for i in range(months - 1, -1, -1):
        target_month = today - relativedelta(months=i)
        start_date = datetime(target_month.year, target_month.month, 1)
        end_date = start_date + relativedelta(months=1) - timedelta(seconds=1)
        
        count = db.query(func.count(models.Client.id)).filter(
            models.Client.created_at >= start_date,
            models.Client.created_at <= end_date
        ).scalar() or 0
        
        trends.append({
            "month": start_date.strftime("%b %Y"),
            "count": count
        })
        
    return trends
