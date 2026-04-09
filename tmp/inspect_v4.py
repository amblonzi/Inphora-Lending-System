import paramiko
import sys

host = "138.68.241.97"
user = "root"
password = "ControL.4028s"

def run_ssh_command(ssh, command):
    print(f"RUN: {command}")
    stdin, stdout, stderr = ssh.exec_command(command)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, timeout=15)
    
    # 1. Check if .env has content and find DB pass
    out, err = run_ssh_command(ssh, "ls -la /opt/inphora/.env")
    print(f"ENV STAT: {out}")
    
    out, err = run_ssh_command(ssh, "cat /opt/inphora/.env | grep -E 'ROOT|PASSWORD'")
    print(f"ENV GREP: {out}")
    
    # 2. Try to get password from container env directly
    out, err = run_ssh_command(ssh, "docker exec mariadb env | grep MYSQL_ROOT_PASSWORD")
    print(f"DOCKER ENV: {out}")
    
    db_pass = "root" # Default
    if "MYSQL_ROOT_PASSWORD=" in out:
        db_pass = out.split("=")[1]
    
    print(f"USING DB PASS: {db_pass}")
    
    # 3. Inspect Schema
    cmd = f"docker exec mariadb mysql -u root -p{db_pass} -e 'DESCRIBE tytahjdb.loans;'"
    out, err = run_ssh_command(ssh, cmd)
    print(f"SCHEMA:\n{out}")
    if err: print(f"SCHEMA ERR: {err}")
    
    # 4. Inspect Sample Data
    cmd = f"docker exec mariadb mysql -u root -p{db_pass} -e 'SELECT * FROM tytahjdb.loans LIMIT 3;'"
    out, err = run_ssh_command(ssh, cmd)
    print(f"DATA:\n{out}")
    
    ssh.close()
except Exception as e:
    print(f"FAILED: {e}")
    sys.exit(1)
