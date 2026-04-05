import paramiko
import os
import time

def deploy():
    host = "138.68.241.97"
    user = "root"
    password = "ControL.4028s"
    # Use absolute path for local file
    local_dir = r"c:\Users\Tesla\Desktop\Inphora Workbench\Inphora Systems\Inphora-Lending-System"
    local_zip_name = "deploy_package_v2.zip"
    local_zip = os.path.join(local_dir, local_zip_name)
    
    remote_dir = "/opt/inphora"
    remote_zip = f"{remote_dir}/{local_zip_name}"

    if not os.path.exists(local_zip):
        print(f"ERROR: Local zip file not found at {local_zip}")
        return

    try:
        print(f"Connecting to {host}...")
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(host, username=user, password=password)

        # 1. Upload the file
        print(f"Uploading {local_zip} to {remote_zip}...")
        sftp = ssh.open_sftp()
        sftp.put(local_zip, remote_zip)
        sftp.close()
        print("Upload complete.")

        # 2. Extract and Deploy
        commands = [
            f"cd {remote_dir} && [ -f .env ] && cp .env .env.bak || touch .env.bak",
            f"cd {remote_dir} && unzip -o {local_zip_name}",
            f"cd {remote_dir} && [ -f .env.bak ] && mv .env.bak .env || echo 'No backup to restore'", 
            f"cd {remote_dir} && docker-compose down",
            f"cd {remote_dir} && docker-compose up -d --build"
        ]

        for cmd in commands:
            print(f"Executing: {cmd}")
            stdin, stdout, stderr = ssh.exec_command(cmd)
            exit_status = stdout.channel.recv_exit_status()
            if exit_status != 0:
                print(f"Command failed with status {exit_status}")
                err_text = stderr.read().decode()
                if err_text: print(err_text)
            else:
                out_text = stdout.read().decode()
                if out_text: print(out_text)

        print("Waiting 20 seconds for containers to start...")
        time.sleep(20)

        print("Checking container status...")
        stdin, stdout, stderr = ssh.exec_command(f"cd {remote_dir} && docker-compose ps")
        print(stdout.read().decode())

        print("Fetching last 50 lines of logs...")
        stdin, stdout, stderr = ssh.exec_command(f"cd {remote_dir} && docker-compose logs --tail 20")
        print(stdout.read().decode())

        ssh.close()
        print("Deployment finished successfully!")

    except Exception as e:
        print(f"Deployment failed: {e}")

if __name__ == "__main__":
    deploy()
