from sqlalchemy.orm import Session
from sqlalchemy import func
import models
from datetime import datetime, timedelta, timezone
import pandas as pd
import io
import os

def generate_cbk_monthly_return(db: Session, month: int, year: int, report_type: str = "DCP"):
    """
    Generate the monthly statutory return for the Central Bank of Kenya.
    
    :param db: Database session
    :param month: Month (1-12)
    :param year: Year (e.g., 2024)
    :param report_type: 'DCP' or 'MFI'
    :return: BytesIO buffer containing the Excel report
    """
    
    # Range for the month
    start_date = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)
        
    # 1. Aggregation: Portfolio Summary
    total_loans = db.query(models.Loan).filter(models.Loan.status.in_(["active", "defaulted"])).count()
    total_disbursed_value = db.query(func.sum(models.Loan.amount)).filter(models.Loan.status.in_(["active", "completed", "defaulted"])).scalar() or 0.0
    
    # 2. Monthly Activity
    monthly_disbursements = db.query(func.sum(models.Loan.amount)).filter(
        models.Loan.start_date >= start_date.date(),
        models.Loan.start_date < end_date.date()
    ).scalar() or 0.0
    
    monthly_repayments = db.query(func.sum(models.Repayment.amount)).filter(
        models.Repayment.payment_date >= start_date.date(),
        models.Repayment.payment_date < end_date.date()
    ).scalar() or 0.0

    # 3. PAR Analysis (Simplified)
    # In a real system, we iterate over all active loans and calculate days past due
    active_loans = db.query(models.Loan).filter(models.Loan.status == "active").all()
    
    par_0_30 = 0.0
    par_31_60 = 0.0
    par_61_90 = 0.0
    par_90_plus = 0.0
    
    today = datetime.now(timezone.utc).date()
    
    for loan in active_loans:
        # Check if overdue
        # Simplification: If loan end_date is past, it's overdue
        if loan.end_date < today:
            overdue_days = (today - loan.end_date).days
            if overdue_days <= 30:
                par_0_30 += loan.amount # Principal approach
            elif overdue_days <= 60:
                par_31_60 += loan.amount
            elif overdue_days <= 90:
                par_61_90 += loan.amount
            else:
                par_90_plus += loan.amount
    
    # 4. Create Dataframes
    summary_data = {
        "Metric": [
            "Total Registered Borrowers",
            "Total Active Loans",
            "Monthly Disbursements (KES)",
            "Monthly Repayments (KES)",
            "Portfolio At Risk (PAR) 1-30 Days",
            "Portfolio At Risk (PAR) 31-60 Days",
            "Portfolio At Risk (PAR) 61-90 Days",
            "Portfolio At Risk (PAR) 90+ Days",
            "Non-Performing Loan (NPL) Ratio (%)"
        ],
        "Value": [
            db.query(models.Client).count(),
            len(active_loans),
            monthly_disbursements,
            monthly_repayments,
            par_0_30,
            par_31_60,
            par_61_90,
            par_90_plus,
            round((par_90_plus / total_disbursed_value * 100), 2) if total_disbursed_value > 0 else 0.0
        ]
    }
    
    # Details: Individual Loan Listing
    loans_list = []
    for l in active_loans:
        loans_list.append({
            "Loan ID": l.id,
            "Client": f"{l.client.first_name} {l.client.last_name}",
            "ID Number": l.client.id_number,
            "Principal": l.amount,
            "Interest Rate": l.interest_rate,
            "Start Date": l.start_date,
            "End Date": l.end_date,
            "Status": l.status
        })
    
    df_summary = pd.DataFrame(summary_data)
    df_loans = pd.DataFrame(loans_list)
    
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        df_summary.to_excel(writer, sheet_name="Summary", index=False)
        df_loans.to_excel(writer, sheet_name="Loan Details", index=False)
        
    buffer.seek(0)
    return buffer
