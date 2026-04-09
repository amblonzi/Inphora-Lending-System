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
import json
from datetime import date, datetime
logging.basicConfig(level=logging.WARNING)
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Client, Loan

def default_serializer(o):
    if isinstance(o, (date, datetime)): return o.isoformat()
    return str(o)

try:
    db = SessionLocal()
    
    print("\nLOAN SCHEMA:")
    loan_keys = Loan.__table__.columns.keys()
    print(", ".join(loan_keys))

    print("\nFirst 2 Loans:")
    for l in db.query(Loan).limit(2):
        d = {k: getattr(l, k) for k in loan_keys}
        print(json.dumps(d, default=default_serializer, indent=2))
        
    print("\nCLIENT SCHEMA:")
    client_keys = Client.__table__.columns.keys()
    print(", ".join(client_keys))

    print("\nFirst 2 Clients:")
    for c in db.query(Client).limit(2):
        d = {k: getattr(c, k) for k in client_keys}
        print(json.dumps(d, default=default_serializer, indent=2))
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
"""

with open("tmp/inspect_detailed.py", "w") as f:
    f.write(python_script)

sftp = ssh.open_sftp()
sftp.put("tmp/inspect_detailed.py", "/opt/inphora/inspect_detailed.py")
sftp.close()

commands = [
    "docker cp /opt/inphora/inspect_detailed.py backend_tytahj:/app/inspect_detailed.py",
    "docker exec backend_tytahj python inspect_detailed.py"
]

with open("tmp/tytahj_detailed_dump.txt", "w") as out_f:
    for cmd in commands:
        stdin, stdout, stderr = ssh.exec_command(cmd)
        out = stdout.read().decode()
        err = stderr.read().decode()
        if out: out_f.write(out + "\n")
        if err: out_f.write("ERROR: " + err + "\n")

ssh.close()
