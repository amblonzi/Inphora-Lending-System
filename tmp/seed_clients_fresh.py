
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import User, Client, LoanProduct, Loan, Repayment, MpesaIncomingTransaction, LoanApproval, DisbursementTransaction, LoanGuarantor, LoanCollateral, LoanReferee, SavingsAccount, SavingsTransaction
from passlib.context import CryptContext
import bcrypt

# FIXED: passlib compatibility with bcrypt 4.1.x
if not hasattr(bcrypt, "__about__"):
    bcrypt.__about__ = type('about', (object,), {'__version__': bcrypt.__version__})

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Data from previous script (Client records essentially)
data = [
    ("05265", "Sophia Munuve", "Normal", "Product One", "Daily", 47000.0, 940.0, 51700.0, 51700.0, "Tshaka", "04/04/2026", "Disbursed"),
    ("75616", "Sheila Karugu", "Normal", "Product One", "Monthly", 30000.0, 600.0, 33000.0, 0.0, "ian", "31/03/2026", "Disbursed"),
    ("53268", "Nicolus Serum", "Normal", "Product One", "Monthly", 20000.0, 400.0, 24000.0, 0.0, "ian", "27/03/2026", "Disbursed"),
    ("21392", "Patrick Mutira", "Normal", "Product One", "Monthly", 40000.0, 800.0, 48000.0, 0.0, "ian", "23/03/2026", "Disbursed"),
    ("77978", "Jennings Obongo", "Normal", "Product One", "Monthly", 20000.0, 400.0, 22000.0, 22000.0, "ian", "18/03/2026", "Disbursed"),
    ("31345", "Lilian Nabutola", "Normal", "Product One", "Weekly", 108000.0, 2160.0, 129600.0, 0.0, "ian", "16/03/2026", "Disbursed"),
    ("22287", "Dishon Maliga", "Normal", "Product One", "Monthly", 15000.0, 300.0, 18000.0, 0.0, "Tshaka", "14/03/2026", "Disbursed"),
    ("05539", "Joan Wambui", "Normal", "Product One", "Monthly", 12000.0, 240.0, 14400.0, 14000.0, "ian", "13/03/2026", "Disbursed"),
    ("87714", "Christine Ndombi", "Normal", "Product One", "Monthly", 65000.0, 1300.0, 78000.0, 0.0, "Tshaka", "09/03/2026", "Disbursed"),
    ("39341", "MADINA HASSAN", "Normal", "Product One", "Monthly", 50000.0, 1000.0, 60000.0, 60000.0, "Tshaka", "04/03/2026", "Disbursed"),
    ("24655", "Fredrick Okall", "Normal", "Product One", "Monthly", 25000.0, 500.0, 27500.0, 27500.0, "Tshaka", "04/03/2026", "Disbursed"),
    ("58783", "Patrick Mutira", "Normal", "Product One", "Monthly", 40000.0, 800.0, 48000.0, 48000.0, "ian", "20/02/2026", "Disbursed"),
    ("07671", "Esther Wesonga", "Normal", "Product One", "Monthly", 10000.0, 200.0, 12000.0, 0.0, "Tshaka", "20/02/2026", "Disbursed"),
    ("22054", "Sheila Karugu", "Normal", "Product One", "Monthly", 60000.0, 1200.0, 72000.0, 36000.0, "Tshaka", "18/02/2026", "Disbursed"),
    ("26602", "Belindah Ofula", "Normal", "Product One", "Monthly", 10000.0, 200.0, 12000.0, 0.0, "Tshaka", "15/02/2026", "Disbursed"),
    ("82359", "Lilian Nabutola", "Normal", "Product One", "Daily", 60000.0, 1200.0, 72000.0, 70000.0, "Tshaka", "13/02/2026", "Disbursed"),
    ("28270", "Martin Makio", "Normal", "Product One", "Monthly", 8000.0, 160.0, 9600.0, 9500.0, "ian", "07/02/2026", "Disbursed"),
    ("83095", "Betty Kipse", "Normal", "Product One", "Monthly", 20000.0, 400.0, 24000.0, 24000.0, "ian", "05/02/2026", "Disbursed"),
    ("86592", "Daniel Kimagut", "Normal", "Product One", "Monthly", 30000.0, 600.0, 36000.0, 0.0, "ian", "05/02/2026", "Disbursed"),
    ("09577", "Belindah Ofula", "Normal", "Product One", "Monthly", 30000.0, 600.0, 36000.0, 0.0, "ian", "03/02/2026", "Disbursed"),
    ("91371", "Lilian Nabutola", "Normal", "Product One", "Monthly", 20000.0, 400.0, 24000.0, 24000.0, "ian", "31/01/2026", "Disbursed"),
    ("62903", "Lilian Nabutola", "Normal", "Product One", "Monthly", 50000.0, 1000.0, 60000.0, 60000.0, "ian", "30/01/2026", "Disbursed"),
    ("68873", "Wilfred Chebor", "Normal", "Product One", "Monthly", 20000.0, 400.0, 24000.0, 4000.0, "ian", "25/01/2026", "Disbursed"),
    ("78167", "Patrick Mutira", "Normal", "Product One", "Monthly", 40000.0, 800.0, 48000.0, 48000.0, "ian", "24/01/2026", "Disbursed"),
    ("75449", "Daniel Kimagut", "Normal", "Product One", "Daily", 10000.0, 200.0, 12000.0, 12000.0, "ian", "13/01/2026", "Disbursed"),
    ("33394", "Joan Wambui", "Normal", "Product One", "Monthly", 12000.0, 240.0, 14400.0, 14400.0, "ian", "07/01/2026", "Disbursed"),
    ("61097", "Charity Kinya", "Normal", "Product One", "Monthly", 20000.0, 400.0, 22000.0, 0.0, "ian", "06/01/2026", "Approved"),
    ("16076", "Sheila Karugu", "Normal", "Product One", "Daily", 30000.0, 600.0, 36000.0, 0.0, "ian", "05/01/2026", "Disbursed")
]

try:
    db = SessionLocal()
    
    print("Wiping existing Tytahj database tables...")
    # Safe delete order for foreign keys
    db.query(SavingsTransaction).delete()
    db.query(SavingsAccount).delete()
    db.query(DisbursementTransaction).delete()
    db.query(MpesaIncomingTransaction).delete()
    db.query(Repayment).delete()
    db.query(LoanApproval).delete()
    db.query(LoanGuarantor).delete()
    db.query(LoanCollateral).delete()
    db.query(LoanReferee).delete()
    db.query(Loan).delete()
    db.query(Client).delete()
    db.commit()
    print("Clients, Loans, and Repayments purged successfully.")

    # Ensure officers exist for attribution
    print("Ensuring users (ian, Tshaka) exist...")
    officers = {}
    for name in ["ian", "Tshaka"]:
        u = db.query(User).filter(User.full_name == name).first()
        if not u:
            email = f"{name.lower()}@tytahj.inphora.net"
            u = User(
                email=email,
                full_name=name,
                hashed_password=pwd_context.hash("password123"),
                role="loan_officer",
                is_active=True
            )
            db.add(u)
            db.commit()
            db.refresh(u)
            print(f"Created officer: {name}")
        officers[name] = u.id

    print("Onboarding clients afresh...")
    inserted_clients = 0
    unique_clients = set()

    for row in data:
        loan_no, cust_name, l_type, l_prod, l_seq, amount, proc_fee, repayable, repaid, applied_by, d_created, status = row
        
        parts = cust_name.split(" ", 1)
        fname = parts[0]
        lname = parts[1] if len(parts) > 1 else ""
        
        # Avoid duplicate clients (same name) for this fresh start
        client_key = (fname, lname)
        if client_key in unique_clients:
            continue
            
        user_id = officers.get(applied_by)
        
        c = Client(
            first_name=fname,
            last_name=lname,
            phone=f"MISSING-{loan_no}",
            id_number=f"ID-{loan_no}",
            status="active",
            created_by_id=user_id,
            created_at=datetime.strptime(d_created, '%d/%m/%Y')
        )
        db.add(c)
        unique_clients.add(client_key)
        inserted_clients += 1

    db.commit()
    print(f"Successfully onboarded {inserted_clients} clients.")

except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
