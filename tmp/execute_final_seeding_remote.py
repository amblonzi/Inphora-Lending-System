import paramiko
import sys

host = "138.68.241.97"
user = "root"
password = "ControL.4028s"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password, timeout=10)

python_script = r"""
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import User, Client, LoanProduct, Loan, Repayment, MpesaIncomingTransaction, LoanApproval, DisbursementTransaction, LoanGuarantor, LoanCollateral, LoanReferee, SavingsAccount, SavingsTransaction, CustomerGroup
from passlib.context import CryptContext
import bcrypt

# FIXED: passlib compatibility with bcrypt 4.1.x
if not hasattr(bcrypt, "__about__"):
    bcrypt.__about__ = type('about', (object,), {'__version__': bcrypt.__version__})

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Data transcribed from the provided screenshot
clients_data = [
    ("Sophia Munuve", "sophiemunuve@gmail.com", "254722655641", "None", "04/04/2026"),
    ("Stephen Kirira", "stephennkirira@gmail.com", "254759462046", "None", "30/03/2026"),
    ("Jennings Obongo", "jennings@gmail.com", "254715257187", "None", "18/03/2026"),
    ("Gideon Mokaya", "gxmokaya@gmail.com", "254722851846", "None", "13/03/2026"),
    ("Christine Ndombi", "ndombipriscah@gmail.com", "254722853394", "None", "09/03/2026"),
    ("MADINA HASSAN", "madinashakila2017@gmail.com", "254721172892", "Working Capital", "04/03/2026"),
    ("Fredrick Okall", "fredokall24@gmail.com", "254703171684", "Working Capital", "04/03/2026"),
    ("Dishon Maliga", "dishonokiya@gmail.com", "254720685033", "None", "28/02/2026"),
    ("Martin Makio", "makio.martin@gmail.com", "254717979179", "None", "07/02/2026"),
    ("Nicolus Serum", "serum@gmail.com", "254721416299", "None", "23/12/2025"),
    ("Simon Mugoma", "simon@yahoo.com", "254728119896", "None", "09/12/2025"),
    ("Ochoya Washuka", "viviank@gmail.com", "254708756135", "None", "18/11/2025"),
    ("Lilian Kioko", "lilianndanu@gmail.com", "254711337495", "None", "30/10/2025"),
    ("Betty Kipse", "betty@gmail.com", "254722283695", "None", "27/10/2025"),
    ("Reuben Kibet", "reuben@gmail.com", "254722720518", "None", "03/10/2025"),
    ("Chris Gitonye", "chrisgitonye@gmail.com", "254712345678", "Salaried", "18/09/2025"),
    ("Harison Ogollah", "harison@gmail.com", "254725424720", "None", "19/06/2025"),
    ("Stephen Otieno", "stephen@gmail.com", "254712821285", "None", "16/06/2025"),
    ("Nelson Mbugua", "nelson@gmail.com", "254713181667", "None", "03/06/2025"),
    ("Jacob Chepyegon", "jacob@gmail.com", "254723104666", "None", "12/05/2025"),
    ("Emily Cherogony", "emily@gmail.com", "254711884072", "None", "03/05/2025"),
    ("Antony Kiunjuri", "kiunjuri@gmail.com", "254721464582", "None", "17/04/2025"),
    ("Susan Kimani", "susan@gmail.com", "254721527359", "None", "08/04/2025"),
    ("Nehemiah Orucha", "nehemiah@gmail.com", "254722643801", "None", "30/03/2025"),
    ("David Kahugu", "david@gmail.com", "254723345652", "None", "10/03/2025"),
    ("Caroline Mwangi", "caroline@gmail.com", "254758999528", "None", "04/03/2025"),
    ("Test1 test1", "test1@gmail.com", "254722548056", "Working Capital", "28/02/2025"),
    ("Salim Omukuya", "salim@gmail.com", "254721883350", "None", "28/02/2025"),
    ("Geoffrey Baraza", "baraza@gmail.com", "254725402594", "None", "20/02/2025"),
    ("Esther Wesonga", "esther@gmail.com", "2547222971787", "None", "17/02/2025"),
    ("Kenneth Muthoni", "kenneth@gmail.com", "254725945848", "None", "15/02/2025"),
    ("Edith Ibayo", "edith@gmail.com", "254714509685", "None", "14/02/2025"),
    ("Grace Ogot", "graceatieno@gmail.co", "254722245672", "None", "08/02/2025"),
    ("Joan Ngare", "joanwanjiku@gmail.com", "254725292419", "None", "01/02/2025"),
    ("Anne Wanjiru", "annewanjiru@gmail.com", "254722728168", "None", "24/01/2025"),
    ("Daniel Karanja", "danielkaranja@gmail.com", "254722645434", "None", "21/01/2025"),
    ("Felix Otara", "otarafelix@gmail.com", "254728921888", "None", "17/01/2025"),
    ("Joan Wambui", "joanwambui@gmail.com", "254722719442", "None", "13/01/2025"),
    ("Anastacia Ngigi", "", "254722782488", "None", "11/01/2025"),
    ("Catherine Musyoki", "", "254721559213", "None", "11/01/2025"),
    ("Nancy Ngovi", "", "254722421615", "None", "11/01/2025"),
    ("Joseph Obok", "", "254725055348", "None", "11/01/2025"),
    ("Charity Kinya", "charitykinya@gmail.com", "254701328858", "None", "11/01/2025"),
    ("Zipporah Mogoi", "", "254729602906", "None", "11/01/2025"),
    ("Weldon Rotich", "", "254712859506", "None", "11/01/2025"),
    ("Josephine Siwa", "", "254721314992", "None", "11/01/2025"),
    ("Stella Kulundu", "", "254714728266", "None", "11/01/2025"),
    ("Dominic Onyango", "", "254725860736", "None", "11/01/2025"),
    ("Alex Waweru", "alexwaweru@gmail.com", "254711875446", "None", "11/01/2025"),
    ("Rhoda Vwosi", "", "254722679775", "None", "11/01/2025"),
    ("Belindah Ofula", "belindah@gmail.com", "254722229198", "None", "11/01/2025"),
    ("Malcolm Juma", "malcolmoduor@gmail.com", "254714037688", "None", "11/01/2025"),
    ("Gaudencia Makokha", "gaudencia@gmail.com", "254741558463", "None", "11/01/2025"),
    ("Patrick Mutira", "patrickmutira@gmail.com", "254722420027", "None", "11/01/2025"),
    ("Margaret Mutolo", "", "254754568206", "None", "11/01/2025"),
    ("Japheth Kinyua", "", "254722582717", "None", "11/01/2025"),
    ("Lilian Nabutola", "lilian@gmail.com", "254721522228", "None", "11/01/2025"),
    ("Wilfred Chebor", "chebor@gmail.com", "254722365114", "None", "11/01/2025"),
    ("Sheila Karugu", "sheilajoy@gmail.com", "254703290268", "None", "11/01/2025"),
    ("Daniel Kimagut", "danielkimagut@gmail.com", "254724151475", "None", "11/01/2025"),
    ("Bonphase Moseti", "bonphase.moseti@kpc.co.ke", "254721744270", "None", "10/01/2025"),
    ("Bruce Riungu", "kinzriungu@gmail.com", "254720799252", "None", "10/01/2025"),
    ("Mercy Mugo", "mercy munee@gmail.com", "254722989535", "None", "07/01/2025"),
    ("Bernice Mugo", "bee254@gmail.com", "254729428769", "None", "07/01/2025"),
    ("JANET JOHN", "info@cliffskenya.com", "254702955052", "None", "07/01/2025")
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
    # We keep CustomerGroups but can clear them if we want fresh start, but IGNORE is safer
    db.commit()
    print("Data purged successfully.")

    # Ensure groups exist
    print("Ensuring Customer Groups exist...")
    groups = {}
    for g_name in ["None", "Working Capital", "Salaried"]:
        g = db.query(CustomerGroup).filter(CustomerGroup.name == g_name).first()
        if not g:
            g = CustomerGroup(name=g_name, description=f"{g_name} Group")
            db.add(g)
            db.commit()
            db.refresh(g)
        groups[g_name] = g.id

    # Get a default officer for creation
    officer = db.query(User).filter(User.role == 'loan_officer').first()
    officer_id = officer.id if officer else 1

    print("Onboarding clients afresh from image data...")
    inserted = 0
    for name, email, phone, group_name, d_created in clients_data:
        parts = name.split(" ", 1)
        fname = parts[0]
        lname = parts[1] if len(parts) > 1 else ""
        
        group_id = groups.get(group_name)
        
        c = Client(
            first_name=fname,
            last_name=lname,
            email=email if email else None,
            phone=phone,
            id_number=f"TBD-{phone[-4:]}", # Placeholder as requested to add rest later
            status="active",
            customer_group_id=group_id,
            created_by_id=officer_id,
            created_at=datetime.strptime(d_created, '%d/%m/%Y')
        )
        db.add(c)
        inserted += 1

    db.commit()
    print(f"Successfully onboarded {inserted} clients.")

except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
"""

with open("tmp/seed_clients_final.py", "w") as f:
    f.write(python_script)

print("Uploading finalized script to remote...")
sftp = ssh.open_sftp()
sftp.put("tmp/seed_clients_final.py", "/opt/inphora/seed_clients_final.py")
sftp.close()

print("Executing finalized wipe and reload on remote...")
commands = [
    "docker cp /opt/inphora/seed_clients_final.py backend_tytahj:/app/seed_clients_final.py",
    "docker exec backend_tytahj python seed_clients_final.py"
]

for cmd in commands:
    print(f"RUN: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out: print("STDOUT:", out)
    if err: print("STDERR:", err)

ssh.close()
