# ⚡ Quick Deployment Commands
# Inphora Lending System - Digital Ocean Production

## 🚀 One-Click Deployment
```bash
# Complete deployment (run this on Digital Ocean droplet)
git clone https://github.com/amblonzi/Inphora-Lending-System.git
cd Inphora-Lending-System
chmod +x deploy.sh
cp env.production.example .env.production
# Edit .env.production with your secure passwords
sudo ./deploy.sh deploy
```

## 📋 Essential Commands

### Service Management
```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# Stop all services
docker-compose -f docker-compose.production.yml down

# View service status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f

# Restart specific service
docker restart inphora_backend_il
```

### Database Operations
```bash
# Access IL database
docker exec -it inphora_db_il mysql -u root -p

# Access Amari database
docker exec -it inphora_db_amari mysql -u root -p

# Access Tytahj database
docker exec -it inphora_db_tytahj mysql -u root -p

# Run migrations
docker exec inphora_backend_il alembic upgrade head
docker exec inphora_backend_amari alembic upgrade head
docker exec inphora_backend_tytahj alembic upgrade head
```

### Redis Operations
```bash
# Access Redis CLI
docker exec -it inphora_redis redis-cli

# Check Redis status
docker exec inphora_redis redis-cli ping

# Clear all keys (emergency only)
docker exec inphora_redis redis-cli flushall
```

### Health Checks
```bash
# Check API health
curl https://il.inphora.net/api/health
curl https://amariflow.inphora.net/api/health
curl https://tytahj.inphora.net/api/health

# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### SSL Certificate Management
```bash
# Renew certificates
docker run --rm -v ./certbot/conf:/etc/letsencrypt -v ./certbot/www:/var/www/certbot -p 80:80 certbot/certbot renew

# Check certificate status
docker run --rm -v ./certbot/conf:/etc/letsencrypt certbot/certbot certificates
```

### Backup Operations
```bash
# Create backup
sudo ./deploy.sh backup

# Manual database backup
docker exec inphora_db_il mysqldump -u root -pPASSWORD ildb > backup_il.sql
docker exec inphora_db_amari mysqldump -u root -pPASSWORD amaridb > backup_amari.sql
docker exec inphora_db_tytahj mysqldump -u root -pPASSWORD tytahjdb > backup_tytahj.sql
```

## 🔧 Troubleshooting

### Common Issues
```bash
# If services won't start
docker-compose -f docker-compose.production.yml down
docker system prune -f
docker-compose -f docker-compose.production.yml up -d

# If SSL certificates fail
docker stop inphora_nginx
docker run --rm -v ./certbot/conf:/etc/letsencrypt -v ./certbot/www:/var/www/certbot -p 80:80 certbot/certbot certonly --standalone -d il.inphora.net
docker start inphora_nginx

# If database connection fails
docker exec inphora_db_il mysqladmin ping -h localhost
docker restart inphora_db_il
```

### Log Analysis
```bash
# View specific service logs
docker logs inphora_backend_il --tail 100
docker logs inphora_nginx --tail 100
docker logs inphora_redis --tail 100

# View deployment log
tail -f /var/log/inphora-deployment.log
```

## 📊 Monitoring
```bash
# System resources
htop
df -h
docker stats

# Network connections
netstat -tulpn | grep :80
netstat -tulpn | grep :443
```

## 🔄 Updates
```bash
# Update application
git pull origin main
sudo ./deploy.sh deploy

# Update Docker images
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d
```

## 🚨 Emergency Commands
```bash
# Emergency stop
docker-compose -f docker-compose.production.yml down

# Emergency restart
docker-compose -f docker-compose.production.yml restart

# Full system reset
docker-compose -f docker-compose.production.yml down
docker system prune -a --volumes
docker-compose -f docker-compose.production.yml up -d
```

## 📱 Service URLs
- **IL Client**: https://il.inphora.net
- **Amari Client**: https://amariflow.inphora.net
- **Tytahj Client**: https://tytahj.inphora.net

## 🔐 Port Mapping
| Service | Internal Port | External Port |
|---------|----------------|---------------|
| IL Backend | 8000 | 8001 |
| Amari Backend | 8000 | 8002 |
| Tytahj Backend | 8000 | 8003 |
| IL Database | 3306 | 3306 |
| Amari Database | 3306 | 3307 |
| Tytahj Database | 3306 | 3308 |
| Redis | 6379 | 6379 |
| Nginx HTTP | 80 | 80 |
| Nginx HTTPS | 443 | 443 |

---
**Save this file for quick reference during deployment and maintenance!**
