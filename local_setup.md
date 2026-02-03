# Inphora Lending System - Local Development Configuration

## Option 1: Docker Compose (Easy & Isolated)

This is the recommended way to run the system with all its dependencies (MariaDB).

### 1. Create a local environment file
Copy `.env.example.production` to `.env.local` and set some simple passwords.

### 2. Run Docker Compose
```bash
docker compose -f docker-compose.local.yml up -d
```

### 3. Initialize Databases
```bash
./init_databases_local.sh
```

## Option 2: Native Development (Manual)

Best if you want to work on one part of the system directly.

### Backend
1. Install requirements: `pip install -r backend/requirements.txt`
2. Run backend: `python backend/main.py` (Default port: 8000)

### Frontend
1. Install dependencies: `cd frontend && npm install`
2. Run frontend: `npm run dev` (Default port: 5173)

---

## Multiple Database Setup Localy

To test the multi-tenant feature locally:
1. Map `tytahj.localhost` and `amariflow.localhost` in your `C:\Windows\System32\drivers\etc\hosts` to `127.0.0.1`.
2. Use the local Nginx container (included in `docker-compose.local.yml`).
