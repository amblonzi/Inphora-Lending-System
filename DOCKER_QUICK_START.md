# Docker Testing Quick Reference

## 🚀 Start Docker System

```bash
cd /path/to/Inphora-Lending-System
docker-compose up -d --build
```

**Wait 30-60 seconds for services to be healthy**

---

## ✅ Verify Services

```bash
# Check all containers are running
docker-compose ps

# Should show all GREEN (healthy) status
```

---

## 🔑 Create Admin Users

```bash
# IL Tenant
docker-compose exec backend_il python create_admin.py

# Tytahj Tenant
docker-compose exec backend_tytahj python create_admin.py

# AmariFlow Tenant
docker-compose exec backend_amariflow python create_admin.py

# Note the generated passwords - you'll need them to log in
```

---

## 🌐 Access Application

### Frontend
```
http://localhost:5173    (Direct Vite dev server)
http://localhost         (Via Nginx)
http://localhost:80      (Via Nginx explicit port)
```

### API Endpoints (Direct)
```
http://localhost:8000    (IL Tenant)
http://localhost:8001    (Tytahj Tenant)
http://localhost:8002    (AmariFlow Tenant)
```

### Multi-Tenant Via Nginx
```
http://il.localhost          → backend_il:8000
http://tytahj.localhost      → backend_tytahj:8001
http://amariflow.localhost   → backend_amariflow:8002
```

---

## 🧪 Quick Health Checks

```bash
# Backend health endpoints
curl http://localhost:8000/api/health
curl http://localhost:8001/api/health
curl http://localhost:8002/api/health

# Response should be: {"status":"ok"} or similar

# Nginx health
curl http://localhost/_health

# Database connectivity
docker-compose exec mariadb mysql -u root -pdev_root_secure_password_2024 -e "SELECT 1;"

# Redis connectivity
docker-compose exec redis redis-cli -a redis_secure_pass_2024 ping
```

---

## 📊 View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend_il
docker-compose logs -f frontend
docker-compose logs -f nginx
docker-compose logs -f mariadb

# Last 50 lines
docker-compose logs -n 50
```

---

## 🛑 Stop/Restart

```bash
# Stop all services (keep data)
docker-compose stop

# Start again
docker-compose start

# Restart specific service
docker-compose restart backend_il

# Full reset (removes all data!)
docker-compose down -v
docker-compose up -d --build
```

---

## 🔍 Debug

```bash
# Enter container shell
docker-compose exec backend_il bash

# Check environment variables
docker-compose exec backend_il env | grep DB_

# Check database connection
docker-compose exec backend_il python
>>> from backend.database import engine
>>> engine.connect()  # Should work without error

# Run migrations
docker-compose exec backend_il python -m alembic upgrade head
```

---

## 🗑️ Cleanup

```bash
# Remove everything
docker-compose down -v

# Prune unused images
docker image prune -f

# Prune build cache
docker builder prune -a -f
```

---

## 📋 Common Issues & Fixes

### Port Already in Use
```bash
# Kill process using port
fuser -k 80/tcp
fuser -k 8000/tcp
```

### Database Won't Start
```bash
# Check MariaDB logs
docker-compose logs mariadb

# Reset database
docker-compose down -v
docker-compose up -d mariadb redis
docker-compose up -d
```

### Frontend Can't Reach Backend
```bash
# Check API URL in container
docker-compose exec frontend env | grep VITE_API

# Verify Nginx routing
curl -v http://localhost/api/health
```

### Backend Can't Connect to Database
```bash
# Check MySQL from inside backend container
docker-compose exec backend_il mysql -h mariadb -u il_user -p${DB_PASSWORD_IL} -e "USE ildb; SHOW TABLES;"
```

---

## 📝 Default Credentials

```
Email:    admin@inphora.net
Password: (from create_admin.py output)
Role:     admin
```

---

**Status: Ready for Testing** ✅
