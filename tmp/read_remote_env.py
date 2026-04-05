import paramiko
import sys

def read_env():
    host = "138.68.241.97"
    user = "root"
    password = "ControL.4028s"
    
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(host, username=user, password=password, timeout=10)
        
        stdin, stdout, stderr = client.exec_command("cat /opt/inphora/.env")
        out = stdout.read().decode().strip()
        print(out)
            
        client.close()
    except Exception as e:
        print(f"FAILED to read .env: {e}")
        sys.exit(1)

if __name__ == "__main__":
    read_env()
