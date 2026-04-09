import paramiko
import sys

host = "138.68.241.97"
user = "root"
password = "ControL.4028s"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password, timeout=10)

# Check docker logs for the backend around these endpoints
log_cmd = "docker logs backend_tytahj --tail 100"
stdin, stdout, stderr = ssh.exec_command(log_cmd)
out = stdout.read().decode()

print('--- BACKEND LOGS ---')
for line in out.splitlines():
    if "401" in line or "customer-groups" in line or "notifications" in line or "Exception" in line or "Error" in line:
        print(line)

ssh.close()
