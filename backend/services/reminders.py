from sqlalchemy.orm import Session
from datetime import date, timedelta
import models
from routers.sms import get_sms_service
from services.sms_service import SmsService
import logging

logger = logging.getLogger(__name__)

def process_loan_reminders(db: Session):
    """
    Check active loans and send reminders/defaulting notifications.
    """
    today = date.today()
    
    # 1. Upcoming Reminders (3 days before end_date)
    reminder_date = today + timedelta(days=3)
    upcoming_loans = db.query(models.Loan).filter(
        models.Loan.status == "active",
        models.Loan.end_date == reminder_date
    ).all()
    
    for loan in upcoming_loans:
        try:
            sms = get_sms_service(db)
            client = loan.client
            formatted_phone = SmsService.format_phone(client.phone)
            
            # Calculate balance
            principal = loan.amount
            interest = (principal * (loan.interest_rate or 0)) / 100
            total_due = principal + interest
            paid = sum([r.amount for r in loan.repayments])
            remaining = max(0, total_due - paid)
            
            if remaining > 0:
                message = f"Hello {client.first_name}, this is a reminder for your Loan #{loan.id}. Remaining balance: KES {remaining:,.2f} is due in 3 days ({loan.end_date}). Please clear to avoid penalties."
                sms.send_sms(formatted_phone, message)
                logger.info(f"Sent upcoming reminder for Loan #{loan.id} to {formatted_phone}")
        except Exception as e:
            logger.error(f"Failed to send reminder for Loan #{loan.id}: {e}")

    # 2. Defaulting Notifications (1 day after end_date)
    default_date = today - timedelta(days=1)
    overdue_loans = db.query(models.Loan).filter(
        models.Loan.status == "active",
        models.Loan.end_date == default_date
    ).all()
    
    for loan in overdue_loans:
        try:
            sms = get_sms_service(db)
            client = loan.client
            formatted_phone = SmsService.format_phone(client.phone)
            
            # Calculate balance
            principal = loan.amount
            interest = (principal * (loan.interest_rate or 0)) / 100
            total_due = principal + interest
            paid = sum([r.amount for r in loan.repayments])
            remaining = max(0, total_due - paid)
            
            if remaining > 0:
                message = f"Hello {client.first_name}, your Loan #{loan.id} is now OVERDUE as of {loan.end_date}. Outstanding balance: KES {remaining:,.2f}. Penalties will start accruing. Please pay immediately."
                sms.send_sms(formatted_phone, message)
                logger.info(f"Sent defaulting notification for Loan #{loan.id} to {formatted_phone}")
        except Exception as e:
            logger.error(f"Failed to send defaulting notification for Loan #{loan.id}: {e}")

    return {"processed_reminders": len(upcoming_loans), "processed_defaulting": len(overdue_loans)}
