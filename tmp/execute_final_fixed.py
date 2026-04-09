import paramiko
import time

host = "138.68.241.97"
user = "root"
password = "ControL.4028s"

def execute_remote():
    try:
        print(f"Connecting to {host}...")
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(host, username=user, password=password, timeout=15)
        
        print("Uploading seed script...")
        sftp = ssh.open_sftp()
        sftp.put("tmp/seed_clients_final.py", "/opt/inphora/seed_clients_final.py")
        sftp.close()
        
        print("Executing wipe and reload...")
        commands = [
            "docker cp /opt/inphora/seed_clients_final.py backend_tytahj:/app/seed_clients_final.py",
            "docker exec backend_tytahj python seed_clients_final.py"
        ]
        
        for cmd in commands:
            print(f"RUN: {cmd}")
            stdin, stdout, stderr = ssh.exec_command(cmd)
            # Read streams to prevent hanging
            out = stdout.read().decode()
            err = stderr.read().decode()
            if out: print(f"STDOUT: {out}")
            if err: print(f"STDERR: {err}")
            
        ssh.close()
        print("DONE.")
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    execute_remote()
