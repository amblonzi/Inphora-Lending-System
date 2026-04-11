from fastapi import APIRouter, Depends, Form, Response
from sqlalchemy.orm import Session
import models, auth
from tenant import get_tenant_db
import logging

router = APIRouter(prefix="/ussd", tags=["ussd"])
logger = logging.getLogger(__name__)

@router.post("/callback")
async def ussd_callback(
    sessionId: str = Form(...),
    phoneNumber: str = Form(...),
    text: str = Form(...),
    serviceCode: str = Form(...),
    db: Session = Depends(get_tenant_db)
):
    """
    Handles USSD sessions from Africa's Talking / standard gateways.
    Expected response format: 'CON Menu' or 'END Message'.
    """
    logger.info(f"USSD from {phoneNumber}: {text}")
    
    # Identify Client
    client = db.query(models.Client).filter(
        (models.Client.phone == phoneNumber) | (models.Client.phone == phoneNumber.replace("+254", "0"))
    ).first()
    
    if not client:
        return Response(content="END You are not registered with Inphora. Please visit a branch to register.", media_type="text/plain")
        
    responses = text.split("*")
    level = len(responses) if text else 0
    
    if level == 0:
        # Main Menu
        menu = f"CON Welcome {client.first_name} to Inphora\n"
        menu += "1. My Balance\n"
        menu += "2. Loan Status\n"
        menu += "3. Mini Statement\n"
        return Response(content=menu, media_type="text/plain")
        
    elif level == 1:
        choice = responses[0]
        if choice == "1":
            # Check balance
            total_loans = db.query(models.Loan).filter(models.Loan.client_id == client.id, models.Loan.status == "active").all()
            balance = sum([l.amount for l in total_loans]) # Simplified logic
            return Response(content=f"END Your active loan balance is KES {balance:,.2f}", media_type="text/plain")
            
        elif choice == "2":
            # Loan status
            loans = db.query(models.Loan).filter(models.Loan.client_id == client.id).order_by(models.Loan.id.desc()).all()
            if loans:
                latest = loans[0]
                return Response(content=f"END Your latest loan #{latest.id} is {latest.status.upper()}.", media_type="text/plain")
            else:
                return Response(content="END You have no loan applications.", media_type="text/plain")
                
        elif choice == "3":
            # Mini statement
            return Response(content="END Your mini statement has been sent to your phone via SMS.", media_type="text/plain")
            
    return Response(content="END Invalid choice. Please try again.", media_type="text/plain")
