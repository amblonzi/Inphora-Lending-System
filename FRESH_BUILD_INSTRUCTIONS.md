# 🚀 Fresh Build & Deployment Instructions
## Inphora Lending System - Multi-Client Production Setup
## DigitalOcean Server Upload & Initialization

*Last Updated: March 19, 2026*

---

## 📋 Overview

This guide provides **fresh, updated instructions** for building the Inphora Lending System locally, packaging it for upload, deploying to DigitalOcean (DO) server, initializing databases, and getting the system running. These instructions incorporate recent fixes for:

- ✅ **Idempotent Alembic migrations** (won't fail on duplicate columns)
- ✅ **Robust SPA handling** (backend won't crash when frontend build is missing)
- ✅ **Streamlined deployment process**
- ✅ **Full Windows compatibility**
- ✅ **Server data wipe procedures**

## 🏗️ Architecture

```
DigitalOcean Droplet (138.68.241.97)
├── Multi-Tenant Backend (Port 8000)
│   ├── Client A: il.inphora.net (Database: db_il, Port 3306, Redis DB: 0)
│   ├── Client B: amariflow.inphora.net (Database: db_amari, Port 3307, Redis DB: 1)
│   └── Client C: tytahj.inphora.net (Database: db_tytahj, Port 3308, Redis DB: 2)
└── Shared Services
    ├── MariaDB (Ports 3306-3308)
    ├── Redis (Port 6379)
    ├── Nginx (Ports 80, 443)
    └── Certbot (SSL certificates)
```

---

## 📦 Prerequisites

### Local Development Machine
- **OS**: Windows 10+/Linux/macOS
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Git**: Latest version
- **SSH client** (OpenSSH for Windows)
- **PowerShell**: Version 5.1+ (pre-installed on Windows)

### DigitalOcean Server Requirements
- **Droplet**: Ubuntu 20.04+ (2GB RAM minimum, 4GB recommended)
- **IP**: 138.68.241.97 (existing droplet)
- **Domains**: `il.inphora.net`, `amariflow.inphora.net`, `tytahj.inphora.net` pointing to the IP
- **SSH Access**: Root or sudo user access

---

## 🔧 Step 1: Local Build & Package

### 1.1 Clone & Prepare Repository
```powershell
# Clone the repository
git clone https://github.com/amblonzi/Inphora-Lending-System.git
cd Inphora-Lending-System

# Ensure you're on the latest main branch
git checkout main
git pull origin main

# Scripts are executable by default on Windows
# No chmod needed
```

### 1.2 Configure Environment Variables
```powershell
# Copy production environment template
Copy-Item env.production.example .env.production

# Edit with secure values (generate strong passwords)
# Windows options:
notepad .env.production
# Or if VS Code is installed:
code .env.production
```

**Required environment variables:**
```bash
# Database Root Passwords (for MariaDB root access)
IL_DB_ROOT_PASSWORD=your_secure_il_root_password
AMARI_DB_ROOT_PASSWORD=your_secure_amari_root_password
TYTAHJ_DB_ROOT_PASSWORD=your_secure_tytahj_root_password

# Database User Passwords (for application access)
IL_DB_PASSWORD=your_secure_il_user_password
AMARI_DB_PASSWORD=your_secure_amari_user_password
TYTAHJ_DB_PASSWORD=your_secure_tytahj_user_password

# JWT Secret Key (single key for all tenants)
SECRET_KEY=your_256_bit_secret_key_here
ALGORITHM=HS256

# Redis Configuration
REDIS_PASSWORD=your_secure_redis_password

# Domain settings
ALLOWED_ORIGINS=https://il.inphora.net,https://amariflow.inphora.net,https://tytahj.inphora.net
```

### 1.3 Build Docker Images Locally
```powershell
# Build all services (this may take 5-10 minutes)
docker-compose -f docker-compose.production.yml build --no-cache

# Verify images were built
docker images | Select-String inphora
```

### 1.4 Test Local Build (Optional)
```powershell
# IMPORTANT: Stop any existing local development containers first
docker-compose -f docker-compose.local.yml down

# Copy your configured environment file
Copy-Item .env.production .env

# Start services locally for testing
docker-compose -f docker-compose.production.yml up -d

# Check health
Invoke-WebRequest http://localhost:8000/api/health

# Expected response: Status "degraded" is normal (Redis uses in-memory fallback when not connected)
# Status "healthy" means all services are fully operational

# Stop test
docker-compose -f docker-compose.production.yml down
```

### 1.5 Package for Upload
```powershell
# Create deployment package (exclude unnecessary and sensitive files)
Compress-Archive -Path . -DestinationPath "inphora-deployment-$(Get-Date -Format 'yyyyMMdd').zip" -Exclude @('.git','node_modules','.env*','*.log','__pycache__','*.pyc')

# Note: .env files are excluded for security - they will be created on the server
# Verify package size
Get-Item inphora-deployment-*.zip | Select-Object Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB,2)}}
```

---

## 📤 Step 2: Upload to DigitalOcean Server

### 2.1 Connect to Server
```powershell
# SSH into your DigitalOcean droplet (from Windows PowerShell)
ssh root@138.68.241.97
# or
ssh your_user@138.68.241.97
```

### 2.2 Prepare Server Environment & Wipe Existing Data
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git htop unzip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# CRITICAL: WIPE ALL EXISTING DOCKER DATA AND CONTAINERS
echo "🧹 Wiping all existing Docker containers, images, volumes, and networks..."
sudo docker stop $(sudo docker ps -aq) 2>/dev/null || true
sudo docker rm $(sudo docker ps -aq) 2>/dev/null || true
sudo docker rmi $(sudo docker images -q) 2>/dev/null || true
sudo docker volume rm $(sudo docker volume ls -q) 2>/dev/null || true
sudo docker network rm $(sudo docker network ls -q) 2>/dev/null || true
sudo docker system prune -a -f --volumes

# WIPE EXISTING APPLICATION DATA
echo "🗑️ Wiping existing application data..."
sudo rm -rf /var/lib/inphora* 2>/dev/null || true
sudo rm -rf ~/Inphora* 2>/dev/null || true
sudo rm -rf /opt/inphora* 2>/dev/null || true
sudo rm -rf /etc/nginx/sites-enabled/inphora* 2>/dev/null || true
sudo rm -rf /etc/letsencrypt/live/inphora* 2>/dev/null || true

# WIPE DATABASE DATA (if any external volumes exist)
echo "💾 Wiping database volumes..."
sudo rm -rf /var/lib/mysql* 2>/dev/null || true
sudo rm -rf /data/mysql* 2>/dev/null || true

# CLEAN UP SYSTEM
echo "🧽 System cleanup..."
sudo apt autoremove -y
sudo apt autoclean

echo "✅ Server wipe complete. All existing data has been removed."

# Logout and login again for Docker group to take effect
exit
ssh root@138.68.241.97
```

### 2.3 Upload Package
```powershell
# From your local machine, upload the package (Windows PowerShell)
scp inphora-deployment-20260319.zip root@138.68.241.97:~/

# Or if using a different user:
scp inphora-deployment-20260319.zip your_user@138.68.241.97:~/
```

### 2.4 Extract and Configure Environment
```bash
# On the server
cd ~

# Verify the deployment package exists
ls -la inphora-deployment-20260319.zip

# If the file is missing, upload it from your local machine:
# scp inphora-deployment-20260319.zip root@<server-ip>:~/
# Then re-run the ls command until the file appears.

# Extract the package
unzip inphora-deployment-20260319.zip

cd Inphora-Lending-System

# Create the .env file with your production environment variables
cat > .env << 'EOF'
# ============================================
# Production Environment Variables
# Digital Ocean Deployment - 138.68.241.97
# ============================================

# Database Root Passwords (for MariaDB root access)
IL_DB_ROOT_PASSWORD=SuperSecureILRoot123!
AMARI_DB_ROOT_PASSWORD=SuperSecureAmariRoot456!
TYTAHJ_DB_ROOT_PASSWORD=SuperSecureTytahjRoot789!

# Database User Passwords (for application access)
IL_DB_PASSWORD=ILUserPass123!
AMARI_DB_PASSWORD=AmariUserPass456!
TYTAHJ_DB_PASSWORD=TytahjUserPass789!

# JWT Secret Key (single key for all tenants)
SECRET_KEY=Your256BitSecretKeyHereMakeItVeryLongAndSecureForProduction123456789!
ALGORITHM=HS256

# Redis Configuration
REDIS_PASSWORD=RedisSecurePass999!

# Domain settings
ALLOWED_ORIGINS=https://il.inphora.net,https://amariflow.inphora.net,https://tytahj.inphora.net

# SSL Certificate Email (for Let's Encrypt)
CERTBOT_EMAIL=admin@inphora.net

# Production Settings
ENVIRONMENT=production
SQL_ECHO=false
NODE_ENV=production
PYTHON_ENV=production
EOF

# Verify the .env file was created
ls -la .env
```

---

## 🚀 Step 3: Deploy & Initialize

### 3.1 Run Deployment Script
```bash
# Make deployment script executable
chmod +x deploy.sh

# Run deployment (this will take 10-15 minutes)
# NOTE: deploy.sh requires a command; use "deploy" to run the full deployment.
sudo ./deploy.sh deploy
```

**What the script does:**
1. ✅ Checks prerequisites (Docker, ports, etc.)
2. ✅ Creates backups of existing data (though server was wiped)
3. ✅ Builds Docker images
4. ✅ Starts all services
5. ✅ Waits for services to be healthy
6. ✅ Runs database migrations (idempotent)
7. ✅ Sets up SSL certificates
8. ✅ Configures Nginx

### 3.2 Monitor Deployment
```bash
# Watch deployment logs
tail -f /var/log/inphora-deployment.log

# Check service status
docker ps

# Check service health
# If DNS is not configured yet, use localhost + Host header:
# curl -H "Host: il.inphora.net" http://localhost/api/health
# curl -H "Host: amariflow.inphora.net" http://localhost/api/health
# curl -H "Host: tytahj.inphora.net" http://localhost/api/health

# Once DNS is configured, use:
# curl -k https://il.inphora.net/api/health
# curl -k https://amariflow.inphora.net/api/health
# curl -k https://tytahj.inphora.net/api/health
```
### 3.3 Initialize Databases (if needed)
```bash
# If databases need manual initialization
docker exec -it inphora_backend_il python init_db.py
docker exec -it inphora_backend_amariflow python init_db.py
docker exec -it inphora_backend_tytahj python init_db.py

# Or run seed scripts
docker exec -it inphora_backend_il python seed_admin.py
```

---

## ✅ Step 4: Verification & Testing

### 4.1 Verify Services
```bash
# Check all containers are running
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Test API endpoints
curl https://il.inphora.net/api/health
curl https://amariflow.inphora.net/api/health
curl https://tytahj.inphora.net/api/health

# Test web interfaces
curl -I https://il.inphora.net/
curl -I https://amariflow.inphora.net/
curl -I https://tytahj.inphora.net/
```

### 4.2 SSL Certificate Verification
```bash
# Check SSL certificates
docker exec inphora_certbot certbot certificates

# Test SSL renewal
docker exec inphora_certbot certbot renew --dry-run
```

### 4.3 Database Verification
```bash
# Check database connections
docker exec inphora_backend_il python -c "
import os
from database import engine
try:
    with engine.connect() as conn:
        result = conn.execute('SELECT 1')
        print('IL Database: OK')
except Exception as e:
    print(f'IL Database: ERROR - {e}')
"

# Repeat for other databases
docker exec inphora_backend_amariflow python -c "
import os
from database import engine
try:
    with engine.connect() as conn:
        result = conn.execute('SELECT 1')
        print('Amariflow Database: OK')
except Exception as e:
    print(f'Amariflow Database: ERROR - {e}')
"

docker exec inphora_backend_tytahj python -c "
import os
from database import engine
try:
    with engine.connect() as conn:
        result = conn.execute('SELECT 1')
        print('Tytahj Database: OK')
except Exception as e:
    print(f'Tytahj Database: ERROR - {e}')
"
```

---

## 🔄 Step 5: Updates & Maintenance

### 5.1 Update Deployment
```bash
# On server, pull latest changes
cd ~/Inphora-Lending-System
git pull origin main

# Rebuild and redeploy
sudo ./deploy.sh
```

### 5.2 Backup Strategy
```bash
# Manual backup
sudo ./tools/backup_databases.sh

# Automated backups (add to crontab)
# Edit crontab: crontab -e
# Add: 0 2 * * * /home/user/Inphora-Lending-System/tools/backup_databases.sh
```

### 5.3 Monitoring
```bash
# Check logs
docker logs inphora_backend_il --tail 50
docker logs nginx --tail 50

# Monitor resources
htop
docker stats
```

---

## 🐛 Troubleshooting

### Common Issues

**1. Port conflicts:**
```bash
# Check what's using ports
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :3306
sudo lsof -i :3307
sudo lsof -i :3308
sudo lsof -i :6379
```

**2. SSL certificate issues:**
```bash
# Renew certificates manually
docker exec inphora_certbot certbot renew
docker exec nginx nginx -s reload
```

**3. Database migration failures:**
```bash
# Check migration status
docker exec inphora_backend_il alembic current

# Force migration (if needed)
docker exec inphora_backend_il alembic upgrade head
```

**4. Service not healthy:**
```bash
# Check service logs
docker logs inphora_backend_il --tail 100

# Restart service
docker restart inphora_backend_il
```

**5. Windows-specific issues:**
```powershell
# If running locally on Windows and having issues:
# Check Docker Desktop is running
Get-Service *docker*

# Restart Docker service
Restart-Service *docker*

# Clear Docker cache
docker system prune -f
```

**6. Server data wipe verification:**
```bash
# Verify all data was wiped
docker ps -a  # Should show no containers
docker images  # Should show no images (except base)
docker volume ls  # Should show no volumes
ls -la /var/lib/  # Should not have mysql or inphora directories
```

---

## 📞 Support

If you encounter issues:
1. Check `/var/log/inphora-deployment.log`
2. Review Docker container logs: `docker logs <container_name>`
3. Verify environment variables in `.env`
4. Ensure domains are properly configured
5. **For Windows users**: Check that Docker Desktop is running and PowerShell has administrator privileges

**Contact:** Your development team or system administrator

---

*These instructions are current as of March 19, 2026. Always check for updates in the repository.*