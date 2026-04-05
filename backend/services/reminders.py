from sqlalchemy.orm import Session
from datetime import date, timedelta
import models
from routers.sms import get_sms_service
from services.sms_service import SmsService
import logging

logger = logging.getLogger(__name__)

def process_loan_reminders(db: Session):
    """
    Check active loans and send reminders sequences:
    D-3, D-1, Due Date, D+1 (Escalation)
    """
    today = date.today()
    sms = get_sms_service(db)
    
    # helper for balance calculation
    def get_remaining_balance(loan):
        principal = loan.amount
        interest = (principal * (loan.interest_rate or 0)) / 100
        total_due = principal + interest
        paid = sum([r.amount for r in loan.repayments])
        return max(0, total_due - paid)

    # 1. D-3 Reminder
    d3_date = today + timedelta(days=3)
    d3_loans = db.query(models.Loan).filter(models.Loan.status == "active", models.Loan.end_date == d3_date).all()
    for loan in d3_loans:
        rem = get_remaining_balance(loan)
        if rem > 0:
            msg = f"Habari {loan.client.first_name}, mkopo wako wa KES {rem:,.2f} unapaswa kulipwa tarehe {loan.end_date}. / Reminder: Your loan is due in 3 days."
            sms.send_sms(SmsService.format_phone(loan.client.phone), msg)

    # 2. D-1 Reminder
    d1_date = today + timedelta(days=1)
    d1_loans = db.query(models.Loan).filter(models.Loan.status == "active", models.Loan.end_date == d1_date).all()
    for loan in d1_loans:
        rem = get_remaining_balance(loan)
        if rem > 0:
            msg = f"Mkopo wako wa KES {rem:,.2f} unalipwa KESHO. Tafadhali lipa ili kuepuka faini. / Your loan is due TOMORROW. Pay to avoid penalties."
            sms.send_sms(SmsService.format_phone(loan.client.phone), msg)

    # 3. Due Date Reminder
    due_loans = db.query(models.Loan).filter(models.Loan.status == "active", models.Loan.end_date == today).all()
    for loan in due_loans:
        rem = get_remaining_balance(loan)
        if rem > 0:
            msg = f"Mkopo wako unalipwa LEO. Lipa KES {rem:,.2f} sasa kupitia Paybill 174379. / Your loan is due TODAY. Pay via Paybill 174379."
            sms.send_sms(SmsService.format_phone(loan.client.phone), msg)

    # 4. D+1 Overdue (Escalation)
    overdue_date = today - timedelta(days=1)
    overdue_loans = db.query(models.Loan).filter(models.Loan.status == "active", models.Loan.end_date == overdue_date).all()
    for loan in overdue_loans:
        rem = get_remaining_balance(loan)
        if rem > 0:
            msg = f"Mkopo wako wa KES {rem:,.2f} umepitwa na wakati! Tafadhali lipa SASA ili kuzuia hatua zaidi. / Your loan is OVERDUE! Pay now to prevent further action."
            sms.send_sms(SmsService.format_phone(loan.client.phone), msg)

    return {"processed": len(d3_loans) + len(d1_loans) + len(due_loans) + len(overdue_loans)}
