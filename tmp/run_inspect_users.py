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
logging.basicConfig(level=logging.WARNING)
from sqlalchemy.orm import Session
from database import SessionLocal
from models import User

try:
    db = SessionLocal()
    users = db.query(User).all()
    print("USERS:")
    for u in users:
        print(f"ID {u.id}: {u.full_name} ({u.email}) - {u.role}")

except Exception as e:
    pass
finally:
    db.close()
"""

with open("tmp/inspect_users.py", "w") as f:
    f.write(python_script)

sftp = ssh.open_sftp()
sftp.put("tmp/inspect_users.py", "/opt/inphora/inspect_users.py")
sftp.close()

commands = [
    "docker cp /opt/inphora/inspect_users.py backend_tytahj:/app/inspect_users.py",
    "docker exec backend_tytahj python inspect_users.py"
]

with open("tmp/tytahj_users_dump.txt", "w") as out_f:
    for cmd in commands:
        stdin, stdout, stderr = ssh.exec_command(cmd)
        out = stdout.read().decode()
        if out: out_f.write(out + "\n")

ssh.close()
