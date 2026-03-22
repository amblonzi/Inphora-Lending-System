# 🚀 Production Deployment Guide
# Inphora Lending System - Multi-Client Setup
# Digital Ocean - 138.68.241.97

## 📋 Overview

This guide covers deploying the Inphora Lending System for three clients on a single Digital Ocean droplet using Docker containers with separate databases and shared services.

## 🏗️ Architecture

```
Digital Ocean Droplet (138.68.241.97)
├── Client A: il.inphora.net
│   ├── Container: backend_il (Port 8001)
│   ├── Database: db_il (Port 3306)
│   └── Redis DB: 0
├── Client B: amariflow.inphora.net
│   ├── Container: backend_amari (Port 8002)
│   ├── Database: db_amari (Port 3307)
│   └── Redis DB: 1
├── Client C: tytahj.inphora.net
│   ├── Container: backend_tytahj (Port 8003)
│   ├── Database: db_tytahj (Port 3308)
│   └── Redis DB: 2
└── Shared Services
    ├── Redis Server (Port 6379)
    ├── Frontend (Port 3000)
    ├── Nginx (Ports 80, 443)
    └── SSL Certificates (Let's Encrypt)
```

## 📦 Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04+ or CentOS 8+
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 50GB SSD
- **CPU**: Minimum 2 cores, Recommended 4 cores

### Software Requirements
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git (if not installed)
sudo apt update && sudo apt install git -y
```

### Domain Configuration
Ensure these domains point to your Digital Ocean IP (138.68.241.97):
- `il.inphora.net` (Client A)
- `amariflow.inphora.net` (Client B)
- `tytahj.inphora.net` (Client C)

## 🔧 Setup Instructions

### 1. Clone Repository
```bash
# Navigate to your home directory
cd ~

# Clone the repository
git clone https://github.com/amblonzi/Inphora-Lending-System.git
cd Inphora-Lending-System

# Make deployment script executable
chmod +x deploy.sh
```

### 2. Configure Environment Variables
```bash
# Copy environment template
cp env.production.example .env.production

# Edit environment file
nano .env.production
```

**Important: Replace all placeholder values with secure passwords:**
```bash
# Generate secure passwords
openssl rand -base64 32  # For each secret key
openssl rand -base64 16  # For each database password
```

### 3. Create Required Directories
```bash
# Create directories for SSL certificates
mkdir -p certbot/conf certbot/www

# Create backup directory
sudo mkdir -p /opt/backups
sudo chown $USER:$USER /opt/backups

# Create log directory
sudo mkdir -p /var/log
sudo touch /var/log/inphora-deployment.log
sudo chown $USER:$USER /var/log/inphora-deployment.log
```

### 4. Configure Firewall
```bash
# Allow necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

## 🚀 Deployment Commands

### Full Deployment (Recommended)
```bash
# Run complete deployment process
sudo ./deploy.sh deploy
```

### Individual Operations
```bash
# Backup existing data
sudo ./deploy.sh backup

# Stop all services
sudo ./deploy.sh stop

# Check service status
sudo ./deploy.sh status

# View logs
sudo ./deploy.sh logs

# Check health
sudo ./deploy.sh health
```

## 📊 Service Management

### Docker Compose Commands
```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# Stop all services
docker-compose -f docker-compose.production.yml down

# View running containers
docker-compose -f docker-compose.production.yml ps

# View logs for specific service
docker-compose -f docker-compose.production.yml logs -f backend_il

# Rebuild specific service
docker-compose -f docker-compose.production.yml up -d --build backend_il
```

### Database Management
```bash
# Access IL database
docker exec -it inphora_db_il mysql -u root -p

# Access Amari database
docker exec -it inphora_db_amari mysql -u root -p

# Access Tytahj database
docker exec -it inphora_db_tytahj mysql -u root -p

# Run migrations manually
docker exec inphora_backend_il alembic upgrade head
docker exec inphora_backend_amari alembic upgrade head
docker exec inphora_backend_tytahj alembic upgrade head
```

### Redis Management
```bash
# Access Redis CLI
docker exec -it inphora_redis redis-cli

# Check Redis status
docker exec inphora_redis redis-cli ping

# Monitor Redis
docker exec inphora_redis redis-cli monitor
```

## 🔍 Monitoring and Troubleshooting

### Health Checks
```bash
# Check API health endpoints
curl https://il.inphora.net/api/health
curl https://amariflow.inphora.net/api/health
curl https://tytahj.inphora.net/api/health

# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Log Management
```bash
# View all logs
docker-compose -f docker-compose.production.yml logs

# View specific service logs
docker logs inphora_backend_il
docker logs inphora_nginx

# Follow logs in real-time
docker logs -f inphora_backend_il
```

### Common Issues and Solutions

#### SSL Certificate Issues
```bash
# Renew certificates manually
docker run --rm \
  -v ./certbot/conf:/etc/letsencrypt \
  -v ./certbot/www:/var/www/certbot \
  -p 80:80 \
  certbot/certbot renew

# Check certificate status
docker run --rm \
  -v ./certbot/conf:/etc/letsencrypt \
  certbot/certbot certificates
```

#### Database Connection Issues
```bash
# Check database status
docker exec inphora_db_il mysqladmin ping -h localhost

# Reset database password
docker exec -it inphora_db_il mysql -u root -p
ALTER USER 'il_user'@'%' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
```

#### Performance Issues
```bash
# Check system resources
docker stats
htop
df -h

# Restart specific services
docker restart inphora_backend_il
docker restart inphora_redis
```

## 🔄 Update Process

### Update Application Code
```bash
# Pull latest changes
git pull origin main

# Redeploy services
sudo ./deploy.sh deploy
```

### Update Environment Variables
```bash
# Edit environment file
nano .env.production

# Restart services with new environment
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d
```

### Scale Services
```bash
# Scale backend services
docker-compose -f docker-compose.production.yml up -d --scale backend_il=2

# Update nginx upstream configuration accordingly
```

## 📈 Performance Optimization

### Database Optimization
```bash
# Access database configuration
docker exec -it inphora_db_il mysql -u root -p

# Optimize tables
OPTIMIZE TABLE clients;
OPTIMIZE TABLE loans;

# Check slow queries
SHOW VARIABLES LIKE 'slow_query_log';
```

### Redis Optimization
```bash
# Check Redis memory usage
docker exec inphora_redis redis-cli info memory

# Clear expired keys
docker exec inphora_redis redis-cli --scan --pattern "session:*" | xargs redis-cli del
```

### Nginx Optimization
```bash
# Test Nginx configuration
docker exec inphora_nginx nginx -t

# Reload Nginx configuration
docker exec inphora_nginx nginx -s reload
```

## 🔒 Security Considerations

### Regular Security Tasks
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose -f docker-compose.production.yml pull

# Scan for vulnerabilities
docker scan inphora_backend_il
```

### Access Control
```bash
# Review container permissions
docker inspect inphora_backend_il | grep -i user

# Limit container resources
# Update docker-compose.yml with resource limits
```

## 📞 Support and Maintenance

### Backup Strategy
```bash
# Automated daily backups (add to crontab)
0 2 * * * /path/to/Inphora-Lending-System/deploy.sh backup

# Weekly full system backup
0 3 * * 0 docker system prune -a && docker volume prune -f
```

### Monitoring Setup
```bash
# Install monitoring tools (optional)
sudo apt install htop iotop nethogs

# Set up log rotation
sudo nano /etc/logrotate.d/inphora
```

## 🎯 Success Criteria

Your deployment is successful when:
- ✅ All three domains resolve to HTTPS sites
- ✅ API health endpoints return 200 OK
- ✅ Database connections work for all clients
- ✅ Redis is accessible and functional
- ✅ SSL certificates are valid and auto-renewing
- ✅ Nginx properly routes traffic to correct backends

## 📞 Emergency Procedures

### Complete System Recovery
```bash
# Stop all services
docker-compose -f docker-compose.production.yml down

# Restore from backup
# (See backup files in /opt/backups)

# Restart services
sudo ./deploy.sh deploy
```

### Individual Service Recovery
```bash
# Restart specific service
docker restart inphora_backend_il

# Rebuild service
docker-compose -f docker-compose.production.yml up -d --build backend_il
```

---

**Deployment completed!** Your Inphora Lending System is now running for all three clients with enterprise-grade security and scalability.

For support, check the logs at `/var/log/inphora-deployment.log` or contact your system administrator.
