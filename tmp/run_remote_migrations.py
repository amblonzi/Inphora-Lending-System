import paramiko
import sys

host = "138.68.241.97"
user = "root"
password = "ControL.4028s"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print(f"Connecting to {host}...")
    ssh.connect(host, username=user, password=password, timeout=30)
    print("Connected.")
except Exception as e:
    print(f"Failed to connect: {e}")
    sys.exit(1)

tenants = ["backend_il", "backend_amariflow", "backend_tytahj"]
for tenant in tenants:
    cmd = f"cd /opt/inphora && docker-compose exec -T {tenant} alembic upgrade head"
    print(f"Running: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    
    if out: print("STDOUT:", out)
    if err: print("STDERR:", err)
    print(f"Exit Status for {tenant}: {exit_status}\n")

ssh.close()
print("Migrations completed.")
