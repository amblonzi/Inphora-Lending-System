import paramiko
import sys

def inspect():
    host = "138.68.241.97"
    user = "root"
    password = "ControL.4028s"
    
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(host, username=user, password=password, timeout=10)
        
        commands = [
            "uname -a",
            "ls -la /opt/inphora",
            "docker ps -a",
            "docker-compose --version || docker compose version",
            "unzip --v | head -n 1",
            "df -h /",
            "netstat -tulpn | grep LISTEN"
        ]
        
        for cmd in commands:
            print(f"--- Running: {cmd} ---")
            stdin, stdout, stderr = client.exec_command(cmd)
            out = stdout.read().decode().strip()
            err = stderr.read().decode().strip()
            if out: print(out)
            if err: print(f"Error: {err}")
            print("\n")
            
        client.close()
    except Exception as e:
        print(f"FAILED to connect: {e}")
        sys.exit(1)

if __name__ == "__main__":
    inspect()
