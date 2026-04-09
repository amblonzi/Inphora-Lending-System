import paramiko
import sys

host = "138.68.241.97"
user = "root"
password = "ControL.4028s"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password, timeout=10)

# Check running containers
stdin, stdout, stderr = ssh.exec_command("docker ps")
print("--- DOCKER PS ---")
print(stdout.read().decode())

# Inspect Loans table schema and sample data
inspect_script = r"""
import pymysql
import os

# Usually DB_ROOT_PASSWORD is root or from .env
# We'll try to find it from docker compose or common ones
# But we can just use the db_local root from the compose file we saw earlier?
# Wait, let's check the remote .env first if possible.
"""

# Actually, let's just try to describe the table via docker exec
db_inspect_cmd = "docker exec mariadb mysql -u root -proot -e 'DESCRIBE tytahjdb.loans; SELECT count(*) FROM tytahjdb.loans; SELECT * FROM tytahjdb.loans LIMIT 5;'"
stdin, stdout, stderr = ssh.exec_command(db_inspect_cmd)

print("--- DB INSPECTION ---")
out = stdout.read().decode()
err = stderr.read().decode()
if out: print(out)
if err: print("ERROR:", err)

ssh.close()
