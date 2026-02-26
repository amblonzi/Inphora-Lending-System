# 🏗️ Build and Upload Commands
# Inphora Lending System - Production Deployment

## 📦 Build Commands

### 1. Build Docker Images Locally
```bash
# Navigate to project directory
cd "c:\Users\Tesla\Desktop\Inphora Workbench\Inphora Systems\Inphora-Lending-System"

# Build all images
docker-compose -f docker-compose.production.yml build --no-cache

# Build specific services
docker-compose -f docker-compose.production.yml build backend_il
docker-compose -f docker-compose.production.yml build backend_amari
docker-compose -f docker-compose.production.yml build backend_tytahj
docker-compose -f docker-compose.production.yml build frontend
```

### 2. Test Build Locally
```bash
# Start services for testing
docker-compose -f docker-compose.production.yml up -d

# Check if all services start correctly
docker-compose -f docker-compose.production.yml ps

# Test API endpoints
curl http://localhost:8001/api/health
curl http://localhost:8002/api/health
curl http://localhost:8003/api/health

# Stop test services
docker-compose -f docker-compose.production.yml down
```

### 3. Create Production Build Archive
```bash
# Create deployment package
tar -czf inphora-production-$(date +%Y%m%d_%H%M%S).tar.gz \
    docker-compose.production.yml \
    env.production.example \
    nginx/conf.d/production.conf \
    deploy.sh \
    DEPLOYMENT_GUIDE.md \
    QUICK_COMMANDS.md \
    backend/ \
    frontend/ \
    db_config/

# List created archive
ls -la *.tar.gz
```

## 🚀 Upload Commands

### Option 1: Git Upload (Recommended)
```bash
# Stage all files
git add .

# Commit with descriptive message
git commit -m "build: Production build ready for deployment

🏗️ Build Components:
• Docker images built and tested
• Production configuration validated
• All services health-checked
• SSL configuration prepared

📦 Build Archive: inphora-production-$(date +%Y%m%d_%H%M%S).tar.gz"

# Push to GitHub
git push origin main

# Verify push
git log --oneline -n 3
```

### Option 2: Direct File Upload
```bash
# Using SCP (Secure Copy)
scp inphora-production-*.tar.gz root@138.68.241.97:/opt/

# Using SFTP
sftp root@138.68.241.97
put inphora-production-*.tar.gz /opt/
exit

# Using rsync (for large files)
rsync -avz --progress \
    docker-compose.production.yml \
    env.production.example \
    nginx/conf.d/production.conf \
    deploy.sh \
    root@138.68.241.97:/opt/Inphora-Lending-System/
```

### Option 3: GitHub Actions CI/CD
```bash
# Create .github/workflows/deploy.yml
mkdir -p .github/workflows

# Deployment workflow will automatically:
# 1. Build Docker images
# 2. Run tests
# 3. Push to registry
# 4. Deploy to production
```

## 📋 Upload Verification

### 1. Verify Files on Server
```bash
# SSH into Digital Ocean
ssh root@138.68.241.97

# Check uploaded files
cd /opt/Inphora-Lending-System
ls -la

# Verify file integrity
md5sum docker-compose.production.yml
md5sum env.production.example
md5sum deploy.sh
```

### 2. Extract Archive (if using tar.gz)
```bash
# Extract production package
cd /opt
tar -xzf inphora-production-*.tar.gz

# Set permissions
chmod +x Inphora-Lending-System/deploy.sh
chown -R root:root Inphora-Lending-System/
```

## 🔧 Pre-Deployment Setup

### 1. Environment Configuration
```bash
# Copy environment template
cp env.production.example .env.production

# Edit with secure values
nano .env.production

# Verify environment variables
cat .env.production | grep -v '^#' | grep -v '^$'
```

### 2. Create Required Directories
```bash
# Create directories
mkdir -p certbot/conf certbot/www
mkdir -p /opt/backups
mkdir -p /var/log

# Set permissions
chmod 755 certbot/conf certbot/www
chmod 755 /opt/backups
chmod 755 /var/log
```

### 3. System Preparation
```bash
# Update system packages
apt update && apt upgrade -y

# Install Docker (if not installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable docker
systemctl start docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Configure firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

## 🚀 Final Deployment Commands

### 1. Execute Deployment
```bash
# Navigate to project directory
cd /opt/Inphora-Lending-System

# Run automated deployment
./deploy.sh deploy

# Monitor deployment progress
tail -f /var/log/inphora-deployment.log
```

### 2. Post-Deployment Verification
```bash
# Check service status
./deploy.sh status

# Verify health endpoints
curl https://il.inphora.net/api/health
curl https://amariflow.inphora.net/api/health
curl https://tytahj.inphora.net/api/health

# Check SSL certificates
curl -I https://il.inphora.net
curl -I https://amariflow.inphora.net
curl -I https://tytahj.inphora.net
```

## 🔄 Update and Rebuild Commands

### 1. Update Code
```bash
# Pull latest changes
git pull origin main

# Rebuild images
docker-compose -f docker-compose.production.yml build --no-cache

# Redeploy
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d
```

### 2. Update Specific Service
```bash
# Update backend only
docker-compose -f docker-compose.production.yml up -d --build backend_il

# Update frontend only
docker-compose -f docker-compose.production.yml up -d --build frontend

# Update nginx configuration
docker-compose -f docker-compose.production.yml exec nginx nginx -s reload
```

## 📊 Build Optimization Commands

### 1. Multi-stage Build Optimization
```bash
# Build with optimization
docker-compose -f docker-compose.production.yml build \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    --parallel

# Clean up old images
docker image prune -f
docker volume prune -f
```

### 2. Production Build Verification
```bash
# Test build in staging environment
docker-compose -f docker-compose.production.yml -f docker-compose.staging.yml build

# Run integration tests
docker-compose -f docker-compose.production.yml run --rm backend_il python -m pytest

# Security scan
docker scan inphora_backend_il
docker scan inphora_backend_amari
docker scan inphora_backend_tytahj
```

## 🎯 Quick Deployment Checklist

### Pre-Build Checklist
- [ ] All code committed to Git
- [ ] Environment variables configured
- [ ] SSL certificates ready
- [ ] Database backups created
- [ ] System requirements verified

### Post-Build Checklist
- [ ] Docker images built successfully
- [ ] All services pass health checks
- [ ] SSL certificates installed
- [ ] API endpoints accessible
- [ ] Database connections working
- [ ] Monitoring enabled

### Production Ready Checklist
- [ ] All three sites accessible via HTTPS
- [ ] Load balancer working correctly
- [ ] Database replication (if applicable)
- [ ] Backup automation configured
- [ ] Monitoring and alerting setup
- [ ] Security hardening completed

---

**Save this guide for your build and deployment workflow!**
