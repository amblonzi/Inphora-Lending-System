# Docker Setup & Deployment Guide

## ✅ Issues Fixed

### Critical Blocking Issues Resolved

1. **Missing `.env` File** ✅
   - Created `.env` with all required variables
   - Contains database passwords, JWT secrets, Redis config
   - Environment defaults to `development` mode

2. **Network Connectivity** ✅
   - Fixed Nginx to be on both `internal` and `frontend_net` networks
   - Backends now properly exposed internally
   - Frontend can communicate with backends

3. **Frontend Build Args** ✅
   - Added `VITE_API_URL` to frontend Dockerfile build args
   - Frontend now receives correct API endpoint during build
   - Defaults to `http://localhost:8000`

4. **Database Initialization** ✅
   - Created `init_sql/` directory with proper schemas
   - Script `00-create-databases.sql` creates all tenant databases
   - Script `01-create-users-table.sql` creates required tables
   - Automatic initialization on first container startup

5. **Backend Configuration** ✅
   - Added proper `DATABASE_URL` with PyMySQL connection string
   - Configured all environment variables for multi-tenant support
   - Each backend exposed on separate port (8000, 8001, 8002)

6. **Nginx Configuration** ✅
   - Created `nginx/conf.d/local.conf` for local development
   - Works without SSL certificates
   - Routes to all three tenant backends
   - Supports localhost vhosts: `tytahj.localhost`, `amariflow.localhost`, `il.localhost`

7. **SSL/Certbot** ✅
   - Disabled Certbot service for local development
   - Ready to enable for production with proper SSL setup
   - No interruptions from missing certificates

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose installed
- Windows PowerShell or Linux/Mac bash
- Port availability: 80, 443, 5173, 8000, 8001, 8002

### Step 1: Start the Docker Stack

```bash
cd c:\Users\Tesla\Desktop\Inphora\ Workbench\Inphora\ Systems\Inphora-Lending-System

# Build and start all services
docker-compose up -d --build
```

**Expected Output:**
```
Creating network "inphora-lending-system_internal" with driver "bridge"
Creating network "inphora-lending-system_frontend_net" with driver "bridge"
Creating mariadb ... done
Creating redis ... done
Creating backend_il ... done
Creating backend_tytahj ... done
Creating backend_amariflow ... done
Creating frontend ... done
Creating nginx ... done
```

### Step 2: Monitor Startup Status

```bash
# Check that all containers are healthy (wait 30-60 seconds)
docker-compose ps

# NAME                  STATUS
# mariadb              Up (healthy)
# redis                Up (healthy)
# backend_il           Up (healthy)
# backend_tytahj       Up (healthy)
# backend_amariflow    Up (healthy)
# frontend             Up
# nginx                Up
```

### Step 3: Initialize Databases

```bash
# Create admin user for IL tenant
docker-compose exec backend_il python create_admin.py

# Create admin user for Tytahj tenant
docker-compose exec backend_tytahj python create_admin.py

# Create admin user for AmariFlow tenant
docker-compose exec backend_amariflow python create_admin.py
```

### Step 4: Access the Application

#### Frontend (React UI)
- **URL:** `http://localhost:5173`
- **Direct Nginx:** `http://localhost` or `http://localhost:80`

#### API Endpoints
- **IL Backend:** `http://localhost:8000/api`
- **Tytahj Backend:** `http://localhost:8001/api`
- **AmariFlow Backend:** `http://localhost:8002/api`

#### Multi-Tenant Access (via Nginx)
- **IL:** `http://il.localhost` → `http://localhost:8000/api`
- **Tytahj:** `http://tytahj.localhost` → `http://localhost:8001/api`
- **AmariFlow:** `http://amariflow.localhost` → `http://localhost:8002/api`

#### Credentials
```
Email: admin@inphora.net
Password: (generated during create_admin.py - check terminal output)
```

---

## 📋 Service Port Mapping

| Service | Port(s) | Purpose |
|---------|---------|---------|
| Frontend (Nginx) | 80, 443 | Web UI access |
| Frontend (Dev) | 5173 | Direct Vite dev server |
| Backend IL | 8000 | Main tenant API |
| Backend Tytahj | 8001 | Tytahj tenant API |
| Backend AmariFlow | 8002 | AmariFlow tenant API |
| MariaDB | 3306 (internal) | Database (not exposed to host) |
| Redis | 6379 (internal) | Cache (not exposed to host) |

---

## 🔧 Common Commands

### View All Logs
```bash
docker-compose logs -f
```

### View Specific Service Logs
```bash
docker-compose logs -f backend_il
docker-compose logs -f frontend
docker-compose logs -f nginx
```

### Stop All Services
```bash
docker-compose down
```

### Stop and Remove Volumes (Full Reset)
```bash
docker-compose down -v
```

### Rebuild Services
```bash
docker-compose up -d --build --force-recreate
```

### Execute Command in Container
```bash
# Run Python script in backend
docker-compose exec backend_il python create_admin.py

# Connect to MySQL
docker-compose exec mariadb mysql -u root -p${DB_ROOT_PASSWORD}

# Check Redis connection
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD} ping
```

---

## 🗄️ Database Credentials

Environment variables in `.env`:

```ini
# Root Access
MYSQL_ROOT_PASSWORD=dev_root_secure_password_2024

# Tytahj Tenant
DB_NAME_TYTAHJ=tytahjdb
DB_USER_TYTAHJ=tytahj_user
DB_PASSWORD_TYTAHJ=tytahj_secure_pass_2024

# AmariFlow Tenant
DB_NAME_AMARIFLOW=amaridb
DB_USER_AMARIFLOW=amari_user
DB_PASSWORD_AMARIFLOW=amari_secure_pass_2024

# Inphora Logic (IL) Tenant
DB_NAME_IL=ildb
DB_USER_IL=il_user
DB_PASSWORD_IL=il_secure_pass_2024

# Redis
REDIS_PASSWORD=redis_secure_pass_2024
```

---

## 🔒 Security Notes for Production

### Before Deploying to Production:

1. **Change ALL Passwords** in `.env`
2. **Set `ENVIRONMENT=production`** in `.env`
3. **Enable HTTPS** by renaming `docker-compose.yml` to use production config
4. **Enable Certbot** for SSL certificate management
5. **Use strong JWT secrets** (min 32 characters)
6. **Restrict `ALLOWED_ORIGINS`** to your actual domains
7. **Don't expose MariaDB/Redis** ports to host
8. **Use environment-specific configs** (separate production vs development)

### Production Deployment

```bash
# Use production docker-compose
cp docker-compose.yml docker-compose.dev.yml
cp docker-compose.production.yml docker-compose.yml

# Copy production env file
cp .env.production .env

# (Edit .env with production values)

# Deploy
docker-compose up -d --build
```

---

## 📊 Architecture

```
┌─────────────────────── User Browser ────────────────────────┐
│                                                               │
├──────────────────── Docker Host (localhost) ─────────────────┤
│                                                               │
│  ┌────────────────────── Frontend (Nginx) ──────────────────┐ │
│  │ Port 80, 443                                             │ │
│  │ Serves React UI                                         │ │
│  │ Routes API requests to backends                         │ │
│  └────────────────────────────────────────────────────────┘ │
│           │                      │                      │    │
│           ▼                      ▼                      ▼    │
│  ┌─────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  │ Backend IL      │ │ Backend Tytahj   │ │ Backend AmariFlow│
│  │ Port 8000       │ │ Port 8001        │ │ Port 8002        │
│  │ FastAPI Server  │ │ FastAPI Server   │ │ FastAPI Server   │
│  └─────────────────┘ └──────────────────┘ └──────────────────┘
│           │                      │                      │    │
│           └──────────────────────┼──────────────────────┘    │
│                                  ▼                           │
│                        ┌────────────────┐                    │
│                        │  MariaDB       │                    │
│                        │  (Databases)   │                    │
│                        └────────────────┘                    │
│                                  ▲                           │
│                                  │                           │
│                        ┌────────────────┐                    │
│                        │  Redis Cache   │                    │
│                        │  (Session/Rate)│                    │
│                        └────────────────┘                    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## ✅ Verification Checklist

After startup, verify everything works:

- [ ] All containers are healthy: `docker-compose ps`
- [ ] Frontend loads: `http://localhost:5173`
- [ ] API responds: `curl http://localhost:8000/api/health`
- [ ] Can login with admin credentials
- [ ] Can create a client
- [ ] Can create a loan
- [ ] No errors in `docker-compose logs`

---

## 🗑️ Cleanup

To completely remove the Docker setup:

```bash
# Remove all containers and volumes
docker-compose down -v

# Remove unused images
docker image prune -f

# Clear build cache
docker builder prune -a -f
```

---

## 📝 Troubleshooting

### Port Already in Use
```bash
# Find process using port 80
lsof -i :80
# Kill it
kill -9 <PID>
```

### Database Won't Initialize
```bash
# Check MariaDB logs
docker-compose logs mariadb

# Reset database completely
docker-compose down -v
docker-compose up -d --build
```

### Backend Can't Connect to Database
```bash
# Check environment variables
docker-compose exec backend_il env | grep DB_

# Test MySQL connection
docker-compose exec mariadb mysql -h localhost -u root -p${DB_ROOT_PASSWORD}
```

### Frontend Can't Reach Backend
```bash
# Verify API URL in frontend
docker-compose exec frontend env | grep VITE_API

# Check Nginx routing
curl -v http://localhost/api/health
```

---

**Last Updated:** 2026-04-12
**Status:** Ready for Local Docker Development ✅
