from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, timedelta, timezone
from dateutil.relativedelta import relativedelta
import math
import models, schemas, auth
from tenant import get_tenant_db
from pagination import paginate, PaginatedResponse
from utils import log_activity, create_notification, calculate_apr
from services.pdf_service import generate_loan_statement_pdf, generate_loan_offer_letter_pdf

router = APIRouter(prefix="/loans", tags=["loans"])

@router.post("/", response_model=schemas.Loan)
def create_loan(
    loan: schemas.LoanCreate,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Get product to snapshot interest rate
    product = db.query(models.LoanProduct).filter(models.LoanProduct.id == loan.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Loan product not found")
    
    # Calculate end date based on duration unit
    duration = loan.duration_count if loan.duration_count else loan.duration_months
    unit = loan.duration_unit
    
    # Ensure start_date is a date object
    start_date_obj = loan.start_date
    if isinstance(start_date_obj, str):
        start_date_obj = date.fromisoformat(start_date_obj)
    
    if unit == "weeks":
        end_date = start_date_obj + timedelta(weeks=duration)
    elif unit == "days":
        end_date = start_date_obj + timedelta(days=duration)
    else: # Default to months
        end_date = start_date_obj + relativedelta(months=duration) # FIXED: Use relativedelta for calendar months
    
    # Snapshot fees
    processing_fee = 0.0
    if not loan.is_processing_fee_waived:
        # Use fixed fee if present, otherwise calculate from percent
        if product.processing_fee_fixed > 0:
            processing_fee = product.processing_fee_fixed
        else:
            processing_fee = (loan.amount * product.processing_fee_percent) / 100
            
    # Create main Loan record
    loan_data = loan.dict(exclude={"guarantors", "collateral", "referees", "financial_analysis", "duration_count", "duration_unit", "is_processing_fee_waived", "start_date"})
    
    db_loan = models.Loan(
        **loan_data,
        start_date=start_date_obj,
        interest_rate=product.interest_rate,
        end_date=end_date,
        duration_unit=unit,
        status="pending",
        created_by_id=current_user.id, # FIXED: Store who submitted
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
    
    # Calculate APR and Total Cost of Credit for disclosure
    # Sum upfront fees
    upfront_fees = (db_loan.processing_fee or 0.0) + (db_loan.insurance_fee or 0.0) + (db_loan.valuation_fee or 0.0) + (db_loan.registration_fee or 0.0)
    
    # Simple Interest Total Cost (Approx for disclosure)
    total_interest = (db_loan.amount * (db_loan.interest_rate or 0.0) * db_loan.duration_months / 100)
    db_loan.total_cost_of_credit = total_interest + upfront_fees
    
    # Calculate APR
    db_loan.apr_at_offered = calculate_apr(
        db_loan.amount, 
        (db_loan.interest_rate or 0.0) / 100, 
        db_loan.duration_months, 
        upfront_fees,
        db_loan.duration_unit or "months"
    )
    
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

    # Notify Client via SMS
    try:
        from routers.sms import get_sms_service
        from services.sms_service import SmsService
        sms = get_sms_service(db)
        client = db.query(models.Client).filter(models.Client.id == db_loan.client_id).first()
        if client and client.phone:
            formatted_phone = SmsService.format_phone(client.phone)
            message = f"Hello {client.first_name}, your application for Loan #{db_loan.id} of KES {db_loan.amount:,.2f} has been received and is under review. Thank you."
            sms.send_sms(formatted_phone, message)
    except Exception as e:
        print(f"Failed to send application SMS: {e}")

    return db_loan

@router.get("/", response_model=schemas.PaginatedResponse[schemas.Loan])
def list_loans(
    page: int = 1,
    size: int = 50,
    status: Optional[str] = None,
    client_id: Optional[int] = None,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    query = db.query(models.Loan)
    if status:
        query = query.filter(models.Loan.status == status)
    if client_id:
        query = query.filter(models.Loan.client_id == client_id)
    
    total = query.count()
    pages = math.ceil(total / size) if total > 0 else 0
    loans = query.offset((page - 1) * size).limit(size).all()

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
        total_fees = (loan.processing_fee or 0.0) + (loan.insurance_fee or 0.0) + (loan.valuation_fee or 0.0) + (loan.registration_fee or 0.0)
        loan.outstanding_balance = round(loan.amount + ((loan.amount * loan.interest_rate)/100) + accrued_penalties + total_fees - total_repaid, 2)
    
    return PaginatedResponse(
        items=loans,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.get("/{loan_id}", response_model=schemas.Loan)
def get_loan(
    loan_id: int,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    principal = loan.amount
    interest = (principal * loan.interest_rate) / 100
    total_repaid = sum([r.amount for r in loan.repayments])
    
    accrued_penalties = 0.0
    today = date.today()
    if loan.status == "active" and today > loan.end_date:
        days_overdue = (today - loan.end_date).days
        penalty_rate = loan.product.interest_rate_7_days_plus or 0.0
        remaining_principal = max(0, principal - total_repaid)
        accrued_penalties = (remaining_principal * (penalty_rate / 100)) * (days_overdue / 30)
    
    loan.accrued_penalties = round(accrued_penalties, 2)
    total_fees = (loan.processing_fee or 0.0) + (loan.insurance_fee or 0.0) + (loan.valuation_fee or 0.0) + (loan.registration_fee or 0.0)
    loan.outstanding_balance = round(principal + interest + accrued_penalties + total_fees - total_repaid, 2)
    
    return loan

@router.post("/{loan_id}/approve")
def approve_loan(
    loan_id: int,
    approval: schemas.LoanApprovalRequest,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    if loan.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending loans can be approved/rejected")

    # FIXED: Role required per level: Level 1 = loan_officer or above, Level 2+ = admin or manager
    LEVEL_ROLES = {
        1: ["loan_officer", "admin", "manager"],
        2: ["admin", "manager"],
    }
    required_roles = LEVEL_ROLES.get(loan.current_approval_level, ["admin"])
    if current_user.role not in required_roles:
        raise HTTPException(
            status_code=403,
            detail=f"Level {loan.current_approval_level} approval requires role: {required_roles}"
        )

    # Prevent self-approval: block if the loan was created by the current user
    if hasattr(loan, "created_by_id") and loan.created_by_id == current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You cannot approve a loan you submitted."
        )

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
        loan.rejected_at = datetime.now(timezone.utc)
        loan.rejection_reason = approval.notes
    elif approval.action == "approve":
        if loan.current_approval_level == 1:
            loan.current_approval_level = 2
        elif loan.current_approval_level >= 2:
            loan.status = "approved"
            loan.approved_by = current_user.id
            loan.approved_at = datetime.now(timezone.utc)
            loan.rejection_reason = None
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    db.commit()
    log_activity(db, current_user.id, approval.action, "loan", loan.id, {"notes": approval.notes, "level": loan.current_approval_level})
    
    create_notification(
        db,
        current_user.id,
        f"Loan {loan.status.title()} (Level {loan.current_approval_level})",
        f"Loan #{loan.id} has been {loan.status} at Level {loan.current_approval_level}.",
        "success" if approval.action == "approve" else "error"
    )

    # Notify Client via SMS on final outcome
    if loan.status in ["approved", "rejected"]:
        try:
            from routers.sms import get_sms_service
            from services.sms_service import SmsService
            sms = get_sms_service(db)
            db.refresh(loan)
            formatted_phone = SmsService.format_phone(loan.client.phone)
            if loan.status == "approved":
                message = f"Congratulations {loan.client.first_name}! Your Loan #{loan.id} for KES {loan.amount:,.2f} has been approved. You will receive the funds shortly."
            else:
                message = f"Hello {loan.client.first_name}, we regret to inform you that your application for Loan #{loan.id} was not successful. Reason: {approval.notes}"
            sms.send_sms(formatted_phone, message)
        except Exception as e:
            print(f"Failed to send approval/rejection SMS: {e}")

    return {"message": f"Loan {loan.status}", "current_level": loan.current_approval_level}

@router.put("/{loan_id}/disburse")
def disburse_loan_legacy(
    loan_id: int,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.require_admin)
):
    """Legacy endpoint. Use POST /api/disbursements/loans/{id}/disburse/manual instead."""
    import warnings
    print(f"WARNING: Deprecated endpoint PUT /api/loans/{loan_id}/disburse called. Use /api/disbursements/loans/{loan_id}/disburse/manual")
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan.status != "approved":
        raise HTTPException(status_code=400, detail="Loan must be approved before disbursement")
    loan.status = "active"
    db.commit()
    log_activity(db, current_user.id, "disburse", "loan", loan.id, {"amount": loan.amount, "method": "legacy_manual"})
    return {"message": "Loan disbursed (legacy). Consider using /api/disbursements/loans/{id}/disburse/manual for full audit trail."}

@router.post("/{loan_id}/disburse") # Keep the POST as well if it was planned
def disburse_loan(
    loan_id: int,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.require_admin)
):
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    if loan.status != "approved":
        raise HTTPException(status_code=400, detail="Loan must be approved before disbursement")
    
    loan.status = "active"
    db.commit()
    log_activity(db, current_user.id, "disburse", "loan", loan.id, {"amount": loan.amount, "method": "manual"})
    
    create_notification(
        db, 
        current_user.id, 
        "Loan Disbursed", 
        f"Loan #{loan.id} has been manually disbursed.", 
        "success"
    )

    # Notify Client via SMS
    try:
        from routers.sms import get_sms_service
        from services.sms_service import SmsService
        sms = get_sms_service(db)
        db.refresh(loan) # Ensure client relationship is loaded
        formatted_phone = SmsService.format_phone(loan.client.phone)
        message = f"Hello {loan.client.first_name}, KES {loan.amount:,.2f} for Loan #{loan.id} has been disbursed to your account. Thank you."
        sms.send_sms(formatted_phone, message)
    except Exception as e:
        print(f"Failed to send disbursement SMS: {e}")

    return {"message": "Loan disbursed"}

@router.get("/{loan_id}/schedule")
def get_loan_schedule(
    loan_id: int,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    principal = loan.amount
    total_interest = (principal * loan.interest_rate) / 100
    total_fees = (
        (loan.processing_fee or 0.0) +
        (loan.insurance_fee or 0.0) +
        (loan.valuation_fee or 0.0) +
        (loan.registration_fee or 0.0)
    )
    total_due = principal + total_interest + total_fees
    
    duration_count = loan.duration_months
    unit = loan.duration_unit or "months"
    
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
        fees_part = total_fees / num_installments
        principal_part = principal / num_installments
        interest_part = total_interest / num_installments
        
        schedule.append({
            "installment_number": i,
            "due_date": payment_date,
            "amount_due": round(installment_amount, 2),
            "principal_amount": round(principal_part, 2),
            "interest_amount": round(interest_part, 2),
            "fees_amount": round(fees_part, 2),
            "balance": round(max(0, balance), 2)
        })
    
    return schedule

@router.post("/{loan_id}/repayments", response_model=schemas.Repayment)
def create_repayment(
    loan_id: int,
    repayment_data: schemas.RepaymentCreate,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    try:
        loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
        if not loan:
            raise HTTPException(status_code=404, detail="Loan not found")
        
        if loan.status != "active":
            raise HTTPException(
                status_code=400,
                detail=f"Repayments can only be added to active loans (current status: {loan.status})"
            )
        
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
        
        current_repayments = sum([(r.amount or 0) for r in loan.repayments])
        total_repaid_so_far = current_repayments + amount
        
        principal = loan.amount
        fixed_interest = (principal * (loan.interest_rate or 0)) / 100
        
        accrued_penalties = 0.0
        today = date.today()
        grace_period = loan.product.grace_period_days or 0
        penalty_start_date = loan.end_date + timedelta(days=grace_period)

        if loan.status == "active" and today > penalty_start_date:
            days_overdue = (today - penalty_start_date).days
            penalty_rate = loan.product.interest_rate_7_days_plus or 0.0
            remaining_principal = max(0, principal - current_repayments)
            accrued_penalties = (remaining_principal * (penalty_rate / 100)) * (days_overdue / 30)
            
        total_due = principal + fixed_interest + accrued_penalties
        
        if total_repaid_so_far >= total_due:
            loan.status = "completed"
        
        db.commit()
        db.refresh(repayment)

        try:
            from routers.sms import get_sms_service
            sms_service = get_sms_service(db)
            formatted_phone = SmsService.format_phone(loan.client.phone)
            receipt_msg = f"Payment Received: KES {amount:,.2f} for Loan #{loan.id}. Remaining Balance: KES {max(0, total_due - total_repaid_so_far):,.2f}. Thank you."
            sms_service.send_sms(formatted_phone, receipt_msg)
        except Exception as sms_err:
            print(f"Failed to send SMS receipt: {sms_err}")

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

@router.get("/{loan_id}/repayments", response_model=schemas.PaginatedResponse[schemas.Repayment])
def list_repayments(
    loan_id: int,
    page: int = 1,
    size: int = 50,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    query = db.query(models.Repayment).filter(models.Repayment.loan_id == loan_id)
    return paginate(query, page, size, schemas.Repayment)

@router.get("/{loan_id}/statement")
def export_loan_statement(
    loan_id: int,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    org_config = db.query(models.OrganizationConfig).first()
    if not org_config:
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

@router.get("/{loan_id}/offer-letter")
def export_loan_offer_letter(
    loan_id: int,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Generates the printable Loan Offer Letter with APR disclosure."""
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
        
    org_config = db.query(models.OrganizationConfig).first()
    if not org_config:
        org_config = models.OrganizationConfig(organization_name="Inphora Lending System")
        
    pdf_buffer = generate_loan_offer_letter_pdf(org_config, loan.client, loan)
    
    filename = f"Offer_Letter_Loan_{loan.id}_{loan.client.last_name}.pdf"
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.post("/{loan_id}/rollover")
def rollover_loan(
    loan_id: int,
    rollover_data: schemas.LoanRolloverBase,
    db: Session = Depends(get_tenant_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Extends a loan's duration. Max 2 rollovers allowed.
    """
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
        
    # Check rollover count
    existing_count = db.query(models.LoanRollover).filter(models.LoanRollover.loan_id == loan_id).count()
    if existing_count >= 2:
        raise HTTPException(status_code=400, detail="Maximum of 2 rollovers allowed per loan")
        
    # Update Loan
    loan.end_date = rollover_data.new_end_date
    
    # Create Rollover record
    db_rollover = models.LoanRollover(
        loan_id=loan_id,
        rollover_number=existing_count + 1,
        new_end_date=rollover_data.new_end_date,
        additional_interest=rollover_data.additional_interest,
        reason=rollover_data.reason,
        authorized_by=current_user.id
    )
    db.add(db_rollover)
    db.commit()
    
    log_activity(db, current_user.id, "rollover", "loan", loan_id, {"rollover_number": existing_count+1})
    
    return {"message": f"Loan rolled over successfully. Rollover #{existing_count+1}"}