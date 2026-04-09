import paramiko

host = "138.68.241.97"
user = "root"
password = "ControL.4028s"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password, timeout=10)

python_script = r"""
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import User, Client, LoanProduct, Loan, Repayment, MpesaIncomingTransaction, LoanApproval
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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
    
    print("Wiping existing non-compliant rows safely...")
    db.query(MpesaIncomingTransaction).delete()
    db.query(Repayment).delete()
    db.query(LoanApproval).delete()
    db.query(Loan).delete()
    db.query(Client).delete()
    db.commit()
    print("Data purged successfully.")

    print("Checking users...")
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
            print(f"Created user {name}")
        officers[name] = u.id

    prod = db.query(LoanProduct).filter(LoanProduct.name == "Product One").first()
    if not prod:
        prod = LoanProduct(
            name="Product One", 
            interest_rate=12.0, 
            min_amount=1000, 
            max_amount=500000, 
            min_period_months=1, 
            max_period_months=12,
            processing_fee_percent=0.0
        )
        db.add(prod)
        db.commit()
        db.refresh(prod)

    print("Inserting formatted verified rows...")

    for row in data:
        loan_no, cust_name, l_type, l_prod, l_seq, amount, proc_fee, repayable, repaid, applied_by, d_created, status = row
        
        parts = cust_name.split(" ", 1)
        fname = parts[0]
        lname = parts[1] if len(parts) > 1 else ""
        
        d_obj = datetime.strptime(d_created, '%d/%m/%Y').date()
        db_status = "active" if status.lower() == "disbursed" else "approved"
        user_id = officers.get(applied_by)
        
        c = db.query(Client).filter(Client.first_name == fname, Client.last_name == lname).first()
        if not c:
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
            db.commit()
            db.refresh(c)
            
        dur_unit_map = {"Monthly": "months", "Weekly": "weeks", "Daily": "days"}
        db_dur_unit = dur_unit_map.get(l_seq, "months")
        
        if db_dur_unit == "months":
            e_date = d_obj + timedelta(days=30)
        elif db_dur_unit == "weeks":
            e_date = d_obj + timedelta(days=28)
        else:
            e_date = d_obj + timedelta(days=30)
            
        # FIXED: Removed 'total_cost_of_credit' since it's not present in the active remote schema yet
        l = Loan(
            client_id=c.id,
            product_id=prod.id,
            amount=amount,
            interest_rate=0,
            duration_months=1,  
            start_date=d_obj,
            end_date=e_date,
            repayment_frequency=l_seq,
            processing_fee=proc_fee,
            duration_unit=db_dur_unit,
            status=db_status,
            current_approval_level=3,
            approved_by=user_id
        )
        db.add(l)
        db.commit()
        db.refresh(l)
        
        if repaid > 0:
            rep = Repayment(
                loan_id=l.id,
                amount=repaid,
                payment_date=d_obj,
                notes=f"Synced from historical data snapshot",
                payment_method="manual"
            )
            db.add(rep)
            if repaid >= repayable and db_status == "active":
                l.status = "completed"
            db.commit()

    print("Data alignment and normalized insertion SUCCESS!")

except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
"""

with open("tmp/seed_data_tytahj.py", "w") as f:
    f.write(python_script)

sftp = ssh.open_sftp()
sftp.put("tmp/seed_data_tytahj.py", "/opt/inphora/seed_data_tytahj.py")
sftp.close()

commands = [
    "docker cp /opt/inphora/seed_data_tytahj.py backend_tytahj:/app/seed_data_tytahj.py",
    "docker exec backend_tytahj python seed_data_tytahj.py"
]

out_acc = ""
for cmd in commands:
    print("RUN:", cmd)
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out: 
        print("STDOUT:", out)
        out_acc += out + "\n"
    if err: 
        print("STDERR:", err)
        out_acc += err + "\n"

with open("tmp/seed_logs.txt", "w") as f:
    f.write(out_acc)

ssh.close()
