import paramiko

host = "138.68.241.97"
user = "root"
password = "ControL.4028s"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password, timeout=10)

python_script = """
import logging
logging.basicConfig(level=logging.WARNING)
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Client, Loan

try:
    db = SessionLocal()
    clients = db.query(Client).count()
    loans = db.query(Loan).count()
    print(f"Total clients (customers): {clients}")
    print(f"Total loans: {loans}")

    print("\\nClients (first 5):")
    for c in db.query(Client).limit(5):
        print(f"- {c.id}: {c.first_name} {c.last_name}")

    print("\\nLoans (first 5):")
    for l in db.query(Loan).limit(5):
        print(f"- {l.id}: Client {l.client_id}, Amount {l.amount}, Status {l.status}")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
"""

with open("tmp/remote_query.py", "w") as f:
    f.write(python_script)

sftp = ssh.open_sftp()
sftp.put("tmp/remote_query.py", "/opt/inphora/remote_query.py")
sftp.close()

commands = [
    "docker cp /opt/inphora/remote_query.py backend_tytahj:/app/remote_query.py",
    "docker exec backend_tytahj python remote_query.py"
]

for cmd in commands:
    print("RUN:", cmd)
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("STDOUT:")
    print(stdout.read().decode())
    print("STDERR:")
    print(stderr.read().decode())

ssh.close()
