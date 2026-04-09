import paramiko
import os

def test_upload():
    host = "138.68.241.97"
    user = "root"
    password = "ControL.4028s"
    local_file = "deploy_package_v2.zip"
    remote_file = "/opt/inphora/deploy_package_v2.zip"

    if not os.path.exists(local_file):
        print(f"LOCAL ERROR: {local_file} not found in {os.getcwd()}")
        return

    try:
        print(f"Connecting to {host}...")
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(host, username=user, password=password)

        print("Checking remote directory...")
        ssh.exec_command("mkdir -p /opt/inphora")

        print(f"Uploading {local_file} to {remote_file}...")
        sftp = ssh.open_sftp()
        sftp.put(local_file, remote_file)
        sftp.close()
        print("Upload successful!")
        
        ssh.close()
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    test_upload()
