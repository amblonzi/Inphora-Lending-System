# Inphora Production Deployment Instructions
**Server IP**: `138.68.241.97`

Follow these steps to deploy the application on your Digital Ocean droplet.

## 0. Create Deployment File Locally
Run the packaging script in PowerShell from the project root:

```powershell
.\package_for_deploy.ps1
```
This generates `deploy_package_v2.zip`.

## 1. Upload the Package
From your local machine, run the following command to upload the deployment package (ensure you are in the project root):

```powershell
scp deploy_package_v2.zip root@138.68.241.97:/opt/inphora/
```

## 2. Connect to the Server
SSH into the droplet:

```bash
ssh root@138.68.241.97
```

## 3. Extract and Setup
Once on the server, navigate to the project directory and extract the files:

```bash
# Create directory if it doesn't exist
mkdir -p /opt/inphora
cd /opt/inphora

# Unzip the package (ensure unzip is installed: apt update && apt install unzip)
unzip -o deploy_package_v2.zip

# OPTIONAL: If you see Git conflicts, remove the old .git folder
# rm -rf .git

# CRITICAL: Fix Windows line endings if packaged on Windows
find . -type f -name "*.sh" -exec sed -i 's/\r$//' {} +
sed -i 's/\r$//' .env.production 2>/dev/null || true

# Ensure the deployment shell script is executable
chmod +x deploy.sh
```

## 4. Environment Configuration
Ensure your `.env.production` file is up to date with the correct production credentials.
The system expects this file to exist to load environment variables.

If you need to create a new one, you can copy the updated example:
```bash
cp env.production.example .env.production
nano .env.production
```
> [!IMPORTANT]
> Ensure the variable names match the names in `env.production.example` (e.g., `DB_PASSWORD_TYTAHJ` instead of `TYTAHJ_DB_PASSWORD`).

## 5. Deploy Services
Run the full deployment script to handle builds, and initial setup:

```bash
./deploy.sh deploy
```

Alternatively, if you prefer manual Docker commands:
```bash
docker compose -f docker-compose.yml up -d --build
```

## 6. Create Admin User
After the services are up, seed the initial admin account:

```bash
# Seed admin for Tytahj tenant
docker exec -it backend_tytahj python seed_admin.py

# Seed admin for Amari tenant
docker exec -it backend_amariflow python seed_admin.py

# Seed admin for IL tenant
docker exec -it backend_il python seed_admin.py
```

## 7. Post-Deployment
Verify all services are running:
```bash
./deploy.sh status
```
Access your tenants at:
- **IL**: https://il.inphora.net
- **Amari**: https://amariflow.inphora.net
- **Tytahj**: https://tytahj.inphora.net

> [!TIP]
> Use the seeded credentials: `admin@inphora.net` / `Admin@Inphora2025!`
