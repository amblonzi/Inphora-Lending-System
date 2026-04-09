import paramiko

host = "138.68.241.97"
user = "root"
password = "ControL.4028s"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password, timeout=10)

cmd = "cd /opt/inphora && docker-compose exec -T mariadb mysql -u root -e 'SHOW DATABASES; USE tytahjdb; SHOW TABLES; SELECT COUNT(*) FROM loans; SELECT COUNT(*) FROM customers; SELECT * FROM customers LIMIT 5; SELECT * FROM loans LIMIT 5;'"
stdin, stdout, stderr = ssh.exec_command(cmd)

print("STDOUT:")
print(stdout.read().decode())
print("STDERR:")
print(stderr.read().decode())
ssh.close()
