# Redis Setup Guide for Inphora Lending System

## Overview
Redis is used for session management, token blacklisting, rate limiting, and caching. This guide covers installation and configuration.

## Windows Setup

### Option 1: Using Docker (Recommended)
```bash
# Install Docker Desktop first
# Then run Redis container
docker run --name inphora-redis -p 6379:6379 -d redis:latest

# Or with persistence
docker run --name inphora-redis -p 6379:6379 -v redis-data:/data -d redis:latest redis-server --appendonly yes
```

### Option 2: Using WSL2 with Redis
```bash
# Install WSL2 if not already installed
wsl --install

# Update package list
sudo apt update

# Install Redis
sudo apt install redis-server

# Start Redis service
sudo service redis-server start

# Enable on boot
sudo systemctl enable redis-server

# Check status
sudo service redis-server status
```

### Option 3: Windows Native Redis
1. Download Redis for Windows from: https://github.com/microsoftarchive/redis/releases
2. Extract to `C:\redis`
3. Run `redis-server.exe` from the extracted directory
4. Run `redis-cli.exe` to test connection

## Configuration

### Environment Variables
Copy `.env.redis` to `.env` and update:
```bash
REDIS_URL=redis://localhost:6379/0
REDIS_PASSWORD=
REDIS_DB=0
REDIS_MAX_CONNECTIONS=20
SESSION_TTL=1800
TOKEN_BLACKLIST_TTL=86400
RATE_LIMIT_WINDOW=60
RATE_LIMIT_MAX_REQUESTS=100
CACHE_TTL=3600
CACHE_PREFIX=inphora:
```

### Production Configuration
```bash
# Production Redis settings
REDIS_URL=redis://your-redis-host:6379/0
REDIS_PASSWORD=your-secure-password
REDIS_SSL=true
REDIS_SSL_CERT_REQS=required
```

## Testing Redis Connection

### Test with Python
```python
from services.redis_service import redis_service

# Check connection
health = redis_service.health_check()
print(health)

# Test basic operations
redis_service.set_cache("test_key", "test_value", 60)
value = redis_service.get_cache("test_key")
print(f"Test value: {value}")
```

### Test with Redis CLI
```bash
# Connect to Redis
redis-cli

# Test basic commands
ping
set test "hello world"
get test
del test
```

## Redis Operations

### Common Commands
```bash
# Start Redis service
docker start inphora-redis

# Stop Redis service
docker stop inphora-redis

# View logs
docker logs inphora-redis

# Connect to Redis CLI
docker exec -it inphora-redis redis-cli
```

### Monitoring
```bash
# Check Redis info
info

# Check memory usage
info memory

# Check connected clients
info clients

# Monitor real-time commands
monitor
```

## Security Best Practices

### 1. Use Password Authentication
```bash
# In redis.conf
requirepass your-secure-password

# Update environment
REDIS_PASSWORD=your-secure-password
```

### 2. Network Security
```bash
# Bind to localhost only
bind 127.0.0.1

# Or use specific IP
bind 10.0.0.5
```

### 3. SSL/TLS (Production)
```bash
# Enable SSL in production
REDIS_SSL=true
REDIS_SSL_CERT_REQS=required
```

## Performance Tuning

### Memory Optimization
```bash
# Set max memory
maxmemory 256mb

# Set eviction policy
maxmemory-policy allkeys-lru
```

### Persistence Settings
```bash
# Enable AOF persistence
appendonly yes
appendfsync everysec

# Set snapshot intervals
save 900 1
save 300 10
save 60 10000
```

## Troubleshooting

### Common Issues

#### 1. Connection Refused
```bash
# Check if Redis is running
redis-cli ping

# Start Redis if not running
docker start inphora-redis
```

#### 2. Authentication Errors
```bash
# Check password
redis-cli -a your-password ping

# Update environment variables
REDIS_PASSWORD=your-password
```

#### 3. Memory Issues
```bash
# Check memory usage
info memory

# Clear all keys (use with caution)
flushall
```

#### 4. Performance Issues
```bash
# Check slow log
slowlog get 10

# Monitor commands
monitor
```

## Backup and Recovery

### Backup Redis Data
```bash
# Create snapshot
docker exec inphora-redis redis-cli BGSAVE

# Copy RDB file
docker cp inphora-redis:/data/dump.rdb ./backup/
```

### Restore from Backup
```bash
# Stop Redis
docker stop inphora-redis

# Copy backup file
docker cp ./backup/dump.rdb inphora-redis:/data/dump.rdb

# Start Redis
docker start inphora-redis
```

## Monitoring and Alerts

### Health Check Endpoint
```bash
# Check system health
curl http://localhost:8000/api/health
```

### Expected Response
```json
{
  "status": "healthy",
  "timestamp": "2024-02-26T12:00:00.000Z",
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "authentication": "healthy"
  },
  "redis_info": {
    "connected": true,
    "version": "7.0.0",
    "used_memory": "1.5M",
    "connected_clients": 3
  }
}
```

## Production Deployment

### Docker Compose Example
```yaml
version: '3.8'
services:
  redis:
    image: redis:latest
    container_name: inphora-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    restart: unless-stopped

volumes:
  redis-data:
```

### Kubernetes Example
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:latest
        ports:
        - containerPort: 6379
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: password
```

## Maintenance

### Regular Tasks
1. Monitor memory usage weekly
2. Check slow logs monthly
3. Update Redis version quarterly
4. Backup data before major changes
5. Review security settings regularly

### Cleanup Commands
```bash
# Clear expired sessions
redis-cli --scan --pattern "session:*" | xargs redis-cli del

# Clear old rate limits
redis-cli --scan --pattern "rate_limit:*" | xargs redis-cli del

# Clear cache (if needed)
redis-cli --scan --pattern "inphora:*" | xargs redis-cli del
```

---

**Note**: Redis is optional for development but highly recommended for production. The system will function without Redis but with limited functionality (no token blacklisting, no distributed rate limiting, no session persistence).
