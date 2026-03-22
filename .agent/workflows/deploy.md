---
description: Procedure to package and upload Inphora Lending System to the cloud.
---

### 1. Build & Package (Local Machine)
Ensure the frontend is built before packaging:
```powershell
cd frontend
npm run build
cd ..
```

Run the packaging script to create `deploy_package.zip`:
```powershell
./package_for_deploy.ps1
```

### 2. Upload to Server
Use SCP to upload the package to the server:
```powershell
scp deploy_package.zip root@138.68.241.97:/opt/inphora
```

### 3. Deploy (Remote Server)
SSH into the server and extract the package:
```bash
ssh root@138.68.241.97
cd /opt/inphora
unzip -o deploy_package.zip
```

Ensure `.env` matches your production requirements, then rebuild and restart the containers:
```bash
docker-compose up -d --build
```

### 4. Verify
Check the logs to ensure everything is running correctly:
```bash
docker-compose logs -f
```
