import paramiko
import os
import sys

host = "138.68.241.97"
user = "root"
password = "ControL.4028s"
local_zip = r"c:\Users\Tesla\Desktop\Inphora Workbench\Inphora Systems\Inphora-Lending-System\deploy_package_v2.zip"
remote_dir = "/opt/inphora"
remote_zip = f"{remote_dir}/deploy_package_v2.zip"

print(f"Checking for {local_zip}...")
if not os.path.exists(local_zip):
    print("FATAL: Zip file not found!")
    sys.exit(1)
print("File exists, size:", os.path.getsize(local_zip))

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

print("Connecting SSH...")
try:
    ssh.connect(host, username=user, password=password, timeout=10)
    print("Connected.")
except Exception as e:
    print(f"SSH connect failed: {e}")
    sys.exit(1)

print("Creating remote dir...")
ssh.exec_command(f"mkdir -p {remote_dir}")

print("Opening SFTP...")
sftp = ssh.open_sftp()
print("Uploading...")
try:
    sftp.put(local_zip, remote_zip)
    print("Upload complete!")
except Exception as e:
    print(f"Failed to upload: {e}")

print("Executing deploy commands...")
commands = [
    f"cd {remote_dir} && [ -f .env ] && cp .env .env.bak || touch .env.bak",
    f"cd {remote_dir} && unzip -o deploy_package_v2.zip",
    f"cd {remote_dir} && [ -f .env.bak ] && mv .env.bak .env || echo 'No env to restore'", 
    f"cd {remote_dir} && docker-compose down",
    f"cd {remote_dir} && docker-compose up -d --build"
]

for cmd in commands:
    print(f"RUN: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print("  >>", out)
    if err: print("  >>", err)

ssh.close()
print("Done.")
