import paramiko

host = "138.68.241.97"
user = "root"
password = "ControL.4028s"

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, timeout=15)
    
    # Check containers
    stdin, stdout, stderr = ssh.exec_command("docker ps --format 'table {{.Names}}\t{{.Status}}'")
    print("--- DOCKER CONTAINERS ---")
    print(stdout.read().decode())
    
    # Get database schema for tytahjdb.loans
    # We use 'mariadb' as the service name based on what we saw in the production init script earlier
    db_cmd = "docker exec mariadb mysql -u root -proot -e 'DESCRIBE tytahjdb.loans;'"
    stdin, stdout, stderr = ssh.exec_command(db_cmd)
    print("--- LOANS SCHEMA ---")
    print(stdout.read().decode())
    err = stderr.read().decode()
    if err: print("DB ERROR:", err)
    
    ssh.close()
except Exception as e:
    print(f"FAILED: {e}")
