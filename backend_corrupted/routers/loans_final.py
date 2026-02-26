from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta, datetime
import models, schemas, auth
from database import get_db
from utils import log_activity, create_notification
from services.pdf_service import generate_loan_statement_pdf
from services.sms_service import SmsService
import math

router = APIRouter(prefix="/loans", tags=["loans"])

@router.post("/", response_model=schemas.Loan)
def create_loan(
    loan: schemas.LoanCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Get product to snapshot interest rate
    product = db.query(models.LoanProduct).filter(models.LoanProduct.id == loan.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Loan product not found")
    
    # Calculate end date based on duration unit
    duration = loan.duration_count if loan.duration_count else loan.duration_months
    unit = loan.duration_unit
    
    if unit == "weeks":
        end_date = loan.start_date + timedelta(weeks=duration)
    elif unit == "days":
        end_date = loan.start_date + timedelta(days=duration)
    else: # Default to months
        end_date = loan.start_date + timedelta(days=duration * 30)
    
    # Snapshot fees
    processing_fee = 0.0
    if not loan.is_processing_fee_waived:
        # Use fixed fee if present, otherwise calculate from percent
        if product.processing_fee_fixed > 0:
            processing_fee = product.processing_fee_fixed
        else:
            processing_fee = (loan.amount * product.processing_fee_percent) / 100
            
    # Create main Loan record
    loan_data = loan.dict(exclude={"guarantors", "collateral", "referees", "financial_analysis", "duration_count", "duration_unit"})
    
    db_loan = models.Loan(
        **loan_data,
        interest_rate=product.interest_rate,
        end_date=end_date,
        duration_unit=unit,
        status="pending",
        # Snapshot fees
        insurance_fee=product.insurance_fee or 0.0,
        processing_fee=processing_fee,
        valuation_fee=product.valuation_fee or 0.0,
        registration_fee=product.registration_fee or 0.0,
        is_processing_fee_waived=loan.is_processing_fee_waived
    )
    db.add(db_loan)
    db.commit()
    db.refresh(db_loan)
    
    # Create Guarantors
    for g in loan.guarantors:
        db_g = models.LoanGuarantor(**g.dict(), loan_id=db_loan.id)
        db.add(db_g)
        
    # Create Collateral
    for c in loan.collateral:
        db_c = models.LoanCollateral(**c.dict(), loan_id=db_loan.id)
        db.add(db_c)
        
    # Create Referees
    for r in loan.referees:
        db_r = models.LoanReferee(**r.dict(), loan_id=db_loan.id)
        db.add(db_r)
        
    # Create Financial Analysis
    if loan.financial_analysis:
        db_fa = models.LoanFinancialAnalysis(**loan.financial_analysis.dict(), loan_id=db_loan.id)
        db.add(db_fa)
        
    db.commit()
    db.refresh(db_loan)
    # Log activity
    log_activity(db, current_user.id, "apply", "loan", db_loan.id, {"amount": db_loan.amount, "client_id": db_loan.client_id})
    
    create_notification(
        db, 
        current_user.id, 
        "New Loan Application", 
        f"Loan Application #{db_loan.id} for KES {db_loan.amount:,.2f} initiated.", 
        "info"
    )
    return db_loan

@router.get("/", response_model=List[schemas.Loan])
def list_loans(
    status: Optional[str] = None,
    client_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    query = db.query(models.Loan)
    if status:
        query = query.filter(models.Loan.status == status)
    if client_id:
        query = query.filter(models.Loan.client_id == client_id)
    loans = query.all()
    for loan in loans:
        total_repaid = sum([r.amount for r in loan.repayments])
        accrued_penalties = 0.0
        today = date.today()
        if loan.status == "active" and today > loan.end_date:
            days_overdue = (today - loan.end_date).days
            penalty_rate = loan.product.interest_rate_7_days_plus or 0.0
            remaining_principal = max(0, loan.amount - total_repaid)
            accrued_penalties = (remaining_principal * (penalty_rate / 100)) * (days_overdue / 30)
        
        loan.accrued_penalties = round(accrued_penalties, 2)
        # Factor in fees: principal + interest + penalties + fees - repaid
        total_fees = (loan.processing_fee or 0.0) + (loan.insurance_fee or 0.0) + (loan.valuation_fee or 0.0) + (loan.registration_fee or 0.0)
        loan.outstanding_balance = round(loan.amount + ((loan.amount * loan.interest_rate)/100) + accrued_penalties + total_fees - total_repaid, 2)
    return loans

@router.get("/{loan_id}", response_model=schemas.Loan)
def get_loan(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    # Calculate balance dynamically
    principal = loan.amount
    interest = (principal * loan.interest_rate) / 100
    total_repaid = sum([r.amount for r in loan.repayments])
    
    # Check for penalties
    accrued_penalties = 0.0
    today = date.today()
    if loan.status == "active" and today > loan.end_date:
        days_overdue = (today - loan.end_date).days
        # Use penalty rate from product
        penalty_rate = loan.product.interest_rate_7_days_plus or 0.0
        # Simple daily penalty: (Remaining Principal * rate/100) * days
        remaining_principal = max(0, principal - total_repaid)
        accrued_penalties = (remaining_principal * (penalty_rate / 100)) * (days_overdue / 30) # Pro-rated monthly rate
        # Or if it's a flat rate per day, adjust accordingly. 
        # For now, let's assume interest_rate_7_days_plus is a MONTHLY rate for late payment.
    
    loan.accrued_penalties = round(accrued_penalties, 2)
    # Factor in fees in total balance
    total_fees = (loan.processing_fee or 0.0) + (loan.insurance_fee or 0.0) + (loan.valuation_fee or 0.0) + (loan.registration_fee or 0.0)
    loan.outstanding_balance = round(principal + interest + accrued_penalties + total_fees - total_repaid, 2)
    
    return loan

@router.put("/{loan_id}/approve")
def approve_loan(
    loan_id: int,
    approval: schemas.LoanApprovalRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    if loan.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending loans can be approved/rejected")

    # Record the approval/rejection
    db_approval = models.LoanApproval(
        loan_id=loan.id,
        user_id=current_user.id,
        level=loan.current_approval_level,
        status=approval.action,
        notes=approval.notes
    )
    db.add(db_approval)

    if approval.action == "reject":
        loan.status = "rejected"
        loan.rejected_at = datetime.utcnow()
        loan.rejection_reason = approval.notes
    elif approval.action == "approve":
        if loan.current_approval_level == 1:
            # Advance to Manager Level (Level 2)
            loan.current_approval_level = 2
            # Stays "pending"
        elif loan.current_approval_level >= 2:
            # Final Approval
            loan.status = "approved"
            loan.approved_by = current_user.id
            loan.approved_at = datetime.utcnow()
            loan.rejection_reason = None
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    db.commit()
    # Log activity
    log_activity(db, current_user.id, approval.action, "loan", loan.id, {"notes": approval.notes, "level": loan.current_approval_level})
    
    create_notification(
        db,
        current_user.id,
        f"Loan {loan.status.title()} (Level {loan.current_approval_level})",
        f"Loan #{loan.id} has been {loan.status} at Level {loan.current_approval_level}.",
        "success" if approval.action == "approve" else "error"
    )
    return {"message": f"Loan {loan.status}", "current_level": loan.current_approval_level}

@router.put("/{loan_id}/disburse")
def disburse_loan(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin)
):
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    if loan.status != "approved":
        raise HTTPException(status_code=400, detail="Loan must be approved before disbursement")
    
    loan.status = "active"
    # Set actual start date to disbursement date if needed
    # loan.start_date = date.today() 
    db.commit()
    # Log activity
    log_activity(db, current_user.id, "disburse", "loan", loan.id, {"amount": loan.amount, "method": "manual"})
    
    create_notification(
        db, 
        current_user.id, 
        "Loan Disbursed", 
        f"Loan #{loan.id} has been manually disbursed.", 
        "success"
    )
    return {"message": "Loan disbursed"}

# Repayment Schedule
@router.get("/{loan_id}/schedule")
def get_loan_schedule(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    # Schedule Parameters
    principal = loan.amount
    # Interest calculation - simplistic flat rate for now as per previous logic
    # Real systems might use reducing balance
    total_interest = (principal * loan.interest_rate) / 100
    total_due = principal + total_interest
    
    # Calculate duration in days for easier installment calculation
    duration_count = loan.duration_months # Fallback
    # Check if there's a duration_count in the DB or if we use months
    # Actually, we added duration_unit to the model. We should use it.
    unit = loan.duration_unit or "months"
    
    # Total duration in days
    if unit == "weeks":
        total_days = duration_count * 7
    elif unit == "days":
        total_days = duration_count
    else: # months
        total_days = duration_count * 30
        
    frequency = loan.repayment_frequency
    
    if frequency == "daily":
        num_installments = total_days
        interval_days = 1
    elif frequency == "weekly":
        num_installments = max(1, total_days // 7)
        interval_days = 7
    elif frequency == "monthly":
        num_installments = max(1, total_days // 30)
        interval_days = 30
    else:
        num_installments = max(1, total_days // 30)
        interval_days = 30
        
    installment_amount = total_due / num_installments
    
    schedule = []
    current_date = loan.start_date
    balance = total_due
    
    for i in range(1, num_installments + 1):
        payment_date = current_date + timedelta(days=interval_days * i)
        balance -= installment_amount
        
        # Proportional principal/interest split for display
        # Simplistic equal split per installment
        principal_part = principal / num_installments
        interest_part = total_interest / num_installments
        
        schedule.append({
            "installment_number": i,
            "due_date": payment_date,
            "amount_due": round(installment_amount, 2),
            "principal_amount": round(principal_part, 2),
            "interest_amount": round(interest_part, 2),
            "balance": round(max(0, balance), 2)
        })
    
    return schedule


# Repayments
@router.post("/{loan_id}/repayments", response_model=schemas.Repayment)
def create_repayment(
    loan_id: int,
    repayment_data: schemas.RepaymentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    try:
        loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
        if not loan:
            raise HTTPException(status_code=404, detail="Loan not found")
        
        amount = repayment_data.amount
        payment_date = repayment_data.payment_date
        notes = repayment_data.notes
        
        repayment = models.Repayment(
            loan_id=loan_id,
            amount=amount,
            payment_date=payment_date,
            notes=notes,
            mpesa_transaction_id=repayment_data.mpesa_transaction_id,
            payment_method=repayment_data.payment_method
        )
        db.add(repayment)
        
        # Check if loan is fully repaid
        current_repayments = sum([(r.amount or 0) for r in loan.repayments])
        total_repaid_so_far = current_repayments + amount
        
        # Calculate Current Total Due (Principal + Fixed Interest + Accrued Penalties)
        principal = loan.amount
        fixed_interest = (principal * (loan.interest_rate or 0)) / 100
        
        accrued_penalties = 0.0
        today = date.today()
        grace_period = loan.product.grace_period_days or 0
        penalty_start_date = loan.end_date + timedelta(days=grace_period)

        if loan.status == "active" and today > penalty_start_date:
            days_overdue = (today - penalty_start_date).days
            penalty_rate = loan.product.interest_rate_7_days_plus or 0.0
            # Use total_repaid (before this payment) to find current remaining principal for penalty calc
            remaining_principal = max(0, principal - current_repayments)
            # Simple daily interest for overdue amount
            accrued_penalties = (remaining_principal * (penalty_rate / 100)) * (days_overdue / 30)
            
        total_due = principal + fixed_interest + accrued_penalties
        
        if total_repaid_so_far >= total_due:
            loan.status = "completed"
        
        db.commit()
        db.refresh(repayment)

        # Send SMS Receipt
        try:
            from routers.sms import get_sms_service
            sms_service = get_sms_service(db)
            formatted_phone = SmsService.format_phone(loan.client.phone)
            receipt_msg = f"Payment Received: KES {amount:,.2f} for Loan #{loan.id}. Remaining Balance: KES {max(0, total_due - total_repaid_so_far):,.2f}. Thank you."
            sms_service.send_sms(formatted_phone, receipt_msg)
        except Exception as sms_err:
            print(f"Failed to send SMS receipt: {sms_err}")

        # Log activity
        log_activity(db, current_user.id, "repayment", "loan", loan.id, {"amount": amount})
        
        create_notification(
            db,
            current_user.id,
            "Payment Received",
            f"Payment of KES {amount:,.2f} received for Loan #{loan.id}.",
            "success"
        )
        return repayment
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Server Error: {str(e)}")

@router.get("/{loan_id}/repayments")
def list_repayments(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    return loan.repayments

@router.get("/{loan_id}/statement")
def export_loan_statement(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    org_config = db.query(models.OrganizationConfig).first()
    if not org_config:
        # Provide default if none exists
        org_config = models.OrganizationConfig(
            organization_name="Inphora Lending System"
        )
        
    pdf_buffer = generate_loan_statement_pdf(org_config, loan.client, loan, loan.repayments)
    
    filename = f"Statement_Loan_{loan.id}_{loan.client.last_name}.pdf"
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
