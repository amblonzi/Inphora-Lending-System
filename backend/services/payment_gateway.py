from sqlalchemy.orm import Session
import models
from services.mpesa_service import MpesaService
import logging

logger = logging.getLogger(__name__)

class PaymentGateway:
    def __init__(self, db: Session):
        self.db = db

    def get_mpesa_service(self, branch_id: int) -> MpesaService:
        """
        Instantiates MpesaService using branch-specific credentials.
        Falls back to system settings if branch credentials are missing.
        """
        branch = self.db.query(models.Branch).filter(models.Branch.id == branch_id).first()
        
        # Branch specific credentials
        if branch and branch.mpesa_shortcode and branch.mpesa_consumer_key:
            return MpesaService(
                consumer_key=branch.mpesa_consumer_key,
                consumer_secret=branch.mpesa_consumer_secret,
                shortcode=branch.mpesa_shortcode,
                passkey=branch.mpesa_passkey,
                env="sandbox" # Should be configurable
            )
        
        # Fallback to system settings or some default
        # (This logic can be expanded to read from SystemSettings table)
        return None

    def trigger_stk_push(self, loan_id: int, amount: int, phone: str):
        """
        Triggers an STK push for a specific loan.
        """
        loan = self.db.query(models.Loan).filter(models.Loan.id == loan_id).first()
        if not loan:
            return {"success": False, "message": "Loan not found"}
            
        mpesa = self.get_mpesa_service(loan.client.branch_id)
        if not mpesa:
            return {"success": False, "message": "Payment gateway not configured for this branch"}
            
        # Clean phone number (remove +, ensures 254...)
        clean_phone = phone.replace("+", "")
        if clean_phone.startswith("0"):
            clean_phone = "254" + clean_phone[1:]
            
        callback_url = f"https://your-domain.com/api/mpesa/callback/stk/{loan_id}"
        
        result = mpesa.stk_push(
            phone=clean_phone,
            amount=int(amount),
            callback_url=callback_url,
            reference=f"L{loan_id}",
            description=f"Repayment for Loan {loan_id}"
        )
        
        return result

    def process_reconciliation(self, transaction_data: dict):
        """
        Auto-reconciliation logic:
        Matches an incoming M-Pesa transaction (C2B or STK via callback) to a loan.
        """
        # Logic to be implemented in mpesa.py router as well
        pass
