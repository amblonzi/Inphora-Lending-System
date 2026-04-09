import os
import secrets
import paramiko

# 1. Generate local .env
env_lines = [
    "ENVIRONMENT=production",
    "DB_ROOT_PASSWORD=" + secrets.token_hex(16),
    "DB_USER=inphora_user",
    "DB_NAME_TYTAHJ=tytahjdb",
    "DB_PASSWORD_TYTAHJ=" + secrets.token_hex(16),
    "DB_NAME_AMARIFLOW=amaridb",
    "DB_PASSWORD_AMARIFLOW=" + secrets.token_hex(16),
    "DB_NAME_IL=ildb",
    "DB_PASSWORD_IL=" + secrets.token_hex(16),
    "SECRET_KEY_TYTAHJ=" + secrets.token_hex(32),
    "SECRET_KEY_AMARIFLOW=" + secrets.token_hex(32),
    "SECRET_KEY_IL=" + secrets.token_hex(32),
    "ACCESS_TOKEN_EXPIRE_MINUTES=1440",
    "REFRESH_TOKEN_EXPIRE_DAYS=7",
    "DOMAIN_TYTAHJ=tytahj.inphora.net",
    "DOMAIN_AMARIFLOW=amariflow.inphora.net",
    "DOMAIN_IL=il.inphora.net",
    "REDIS_PASSWORD=" + secrets.token_hex(16),
]

local_env_path = r"c:\Users\Tesla\Desktop\Inphora Workbench\Inphora Systems\Inphora-Lending-System\tmp\.env.deploy"
with open(local_env_path, "w") as f:
    f.write("\n".join(env_lines) + "\n")

print(f"Generated {local_env_path}")

# 2. Upload and restart
host = "138.68.241.97"
user = "root"
password = "ControL.4028s"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password, timeout=30)
print("Connected to SSH.")

sftp = ssh.open_sftp()
sftp.put(local_env_path, "/opt/inphora/.env")
sftp.close()
print("Uploaded .env")

commands = [
    "cd /opt/inphora && docker-compose down",
    "cd /opt/inphora && docker-compose up -d --build",
]

for cmd in commands:
    print(f"Running: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    exit_status = stdout.channel.recv_exit_status()
    print("STDOUT:", stdout.read().decode().strip())
    print("STDERR:", stderr.read().decode().strip())

# 3. Wait 10 seconds for DB start
print("Waiting for databases to initialize...")
import time
time.sleep(20)

# 4. Run migrations
tenants = ["backend_il", "backend_amariflow", "backend_tytahj"]
for tenant in tenants:
    cmd = f"cd /opt/inphora && docker-compose exec -T {tenant} alembic upgrade head"
    print(f"Running: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    exit_status = stdout.channel.recv_exit_status()
    print("STDOUT:", stdout.read().decode().strip())
    print("STDERR:", stderr.read().decode().strip())
    print(f"Exit Status {tenant}: {exit_status}\n")

ssh.close()
print("Done.")
