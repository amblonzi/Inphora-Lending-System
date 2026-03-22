#!/bin/bash
# init_databases.sh — FIXED (CRIT-01)
# Generates random admin passwords instead of hardcoded "admin123"
# Creates all tenant databases and schemas

set -euo pipefail

# ── Detect Docker network with retry mechanism ──────────────────────────────
# Docker Compose creates networks as: <project>_<network_name>
# The docker-compose.yml defines networks: internal, frontend_net
# So we expect: inphora-lending-system_internal

DOCKER_NETWORK=""
MAX_ATTEMPTS=10
ATTEMPT=0

# Automatically source .env.production if it exists to support standalone execution
if [ -f ".env.production" ]; then
    echo "Sourcing .env.production..."
    # Export all variables from .env.production
    set -a
    source .env.production
    set +a
fi

echo "Detecting Docker Compose network..."
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  # Try to find a network ending in '_internal' or '_default' or similar
  # Or look for common project prefixes
  # Prioritize networks ending in '_internal' (our production DB network)
  DOCKER_NETWORK=$(docker network ls --format "{{.Name}}" | grep -E "_internal$" | head -n 1 || echo "")
  
  # Fallback to other variants if not found
  if [ -z "$DOCKER_NETWORK" ]; then
    DOCKER_NETWORK=$(docker network ls --format "{{.Name}}" | grep -E "(_app_network|inphora|_default)" | head -n 1 || echo "")
  fi
  
  if [ -n "$DOCKER_NETWORK" ] && docker network inspect "$DOCKER_NETWORK" >/dev/null 2>&1; then
    # Verify that 'mariadb' is actually on this network
    if docker network inspect "$DOCKER_NETWORK" | grep -q "mariadb"; then
      break
    fi
  fi
  
  echo "  Attempt $((ATTEMPT+1))/$MAX_ATTEMPTS: Correct network (with mariadb) not yet found, waiting..."
  sleep 2
  ATTEMPT=$((ATTEMPT + 1))
done

echo "✓ Using Docker network: $DOCKER_NETWORK"

# ── Guard: refuse to run if ENVIRONMENT is not set ───────────────────────────
if [[ -z "${ENVIRONMENT:-}" ]]; then
  echo "ERROR: ENVIRONMENT variable is not set. Aborting."
  exit 1
fi

# Function to log messages
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# ── Require root DB password ──────────────────────────────────────────────────
if [[ -z "${DB_ROOT_PASSWORD:-}" ]]; then
  echo "ERROR: DB_ROOT_PASSWORD is not set."
  exit 1
fi

MYSQL_CMD="docker exec -i mariadb mysql -u root -p${DB_ROOT_PASSWORD}"

log "Waiting for MariaDB to be ready for initialization..."
while :; do
  if docker exec mariadb mariadb-admin ping -h localhost --silent 2>/dev/null; then
    break
  fi
  sleep 2
done
log "MariaDB is ready."

# ── FIXED CRIT-01: Generate secure random passwords ──────────────────────────
gen_password() {
  openssl rand -base64 24 | tr -d '/+=' | head -c 32
}

TYTAHJ_ADMIN_PASS=$(gen_password)
AMARIFLOW_ADMIN_PASS=$(gen_password)
IL_ADMIN_PASS=$(gen_password)

TYTAHJ_DB_PASS=$(gen_password)
AMARIFLOW_DB_PASS=$(gen_password)
IL_DB_PASS=$(gen_password)

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        INPHORA — INITIAL SETUP CREDENTIALS                   ║"
echo "║  SAVE THESE NOW — they will not be shown again               ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Tytahj Express                                              ║"
echo "║    Email:    admin@tytahj.inphora.net                        ║"
echo "║    Password: ${TYTAHJ_ADMIN_PASS}          ║"
echo "╠──────────────────────────────────────────────────────────────╣"
echo "║  AmariFlow                                                   ║"
echo "║    Email:    admin@amariflow.inphora.net                     ║"
echo "║    Password: ${AMARIFLOW_ADMIN_PASS}          ║"
echo "╠──────────────────────────────────────────────────────────────╣"
echo "║  Inphora Logic                                               ║"
echo "║    Email:    admin@il.inphora.net                            ║"
echo "║    Password: ${IL_ADMIN_PASS}          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Also write credentials to a local file (NOT committed to git)
CREDS_FILE="./initial_credentials_$(date +%Y%m%d_%H%M%S).txt"
cat > "$CREDS_FILE" << EOF
Inphora Initial Admin Credentials — $(date)
============================================================
Tytahj Express:
  Admin Email:    admin@tytahj.inphora.net
  Admin Password: ${TYTAHJ_ADMIN_PASS}
  DB Password:    ${TYTAHJ_DB_PASS}

AmariFlow:
  Admin Email:    admin@amariflow.inphora.net
  Admin Password: ${AMARIFLOW_ADMIN_PASS}
  DB Password:    ${AMARIFLOW_DB_PASS}

Inphora Logic:
  Admin Email:    admin@il.inphora.net
  Admin Password: ${IL_ADMIN_PASS}
  DB Password:    ${IL_DB_PASS}

IMPORTANT: Delete this file after saving passwords to a password manager.
EOF
chmod 600 "$CREDS_FILE"
echo "Credentials saved to: $CREDS_FILE (chmod 600)"

# ── Create databases and users ────────────────────────────────────────────────
echo "Creating databases..."

$MYSQL_CMD <<-SQL
  -- Tytahj Express
  CREATE DATABASE IF NOT EXISTS tytahjdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'tytahj_user'@'%' IDENTIFIED BY '${TYTAHJ_DB_PASS}';
  ALTER USER 'tytahj_user'@'%' IDENTIFIED BY '${TYTAHJ_DB_PASS}';
  GRANT ALL PRIVILEGES ON tytahjdb.* TO 'tytahj_user'@'%';

  -- AmariFlow
  CREATE DATABASE IF NOT EXISTS amaridb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'amari_user'@'%' IDENTIFIED BY '${AMARIFLOW_DB_PASS}';
  ALTER USER 'amari_user'@'%' IDENTIFIED BY '${AMARIFLOW_DB_PASS}';
  GRANT ALL PRIVILEGES ON amaridb.* TO 'amari_user'@'%';

  -- Inphora Logic
  CREATE DATABASE IF NOT EXISTS ildb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'il_user'@'%' IDENTIFIED BY '${IL_DB_PASS}';
  ALTER USER 'il_user'@'%' IDENTIFIED BY '${IL_DB_PASS}';
  GRANT ALL PRIVILEGES ON ildb.* TO 'il_user'@'%';

  FLUSH PRIVILEGES;
SQL

echo "Databases and users updated."

# ── Seed admin users and create all tables (via SQLAlchemy) ────────────────
echo "Synchronizing database schemas and creating admin users..."

docker run --rm -i --network "$DOCKER_NETWORK" --entrypoint python inphora-backend_il - <<PYEOF
import sys
import os
import bcrypt
from sqlalchemy import create_engine
import urllib.parse

# FIXED: passlib compatibility with bcrypt 4.1.x
if not hasattr(bcrypt, "__about__"):
    bcrypt.__about__ = type('about', (object,), {'__version__': bcrypt.__version__})

# Inside docker, Mariadb is accessible via the hostname 'mariadb' on the internal network
# We set a dummy DATABASE_URL to suppress the SQLite fallback warning during import
os.environ["DATABASE_URL"] = "mysql+pymysql://user:pass@localhost/dummy"

from passlib.context import CryptContext
from database import Base
import models  # Import all models to register them with Base

ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_pw(pw):
    return ctx.hash(pw)

# Admin user inserts
# Using unique emails for each tenant as 'email' is the unique identifier
configs = [
    ("tytahjdb",  "tytahj_user",  "${TYTAHJ_DB_PASS}",    hash_pw("${TYTAHJ_ADMIN_PASS}"),   "Tytahj Express Admin",   "admin@tytahj.inphora.net"),
    ("amaridb",   "amari_user",   "${AMARIFLOW_DB_PASS}",  hash_pw("${AMARIFLOW_ADMIN_PASS}"), "AmariFlow Admin",        "admin@amariflow.inphora.net"),
    ("ildb",      "il_user",      "${IL_DB_PASS}",         hash_pw("${IL_ADMIN_PASS}"),        "Inphora Logic Admin",    "admin@il.inphora.net"),
]

import pymysql

for db_name, db_user, db_pass, hashed_pw, full_name, admin_email in configs:
    # 1. Create all tables using SQLAlchemy
    encoded_pass = urllib.parse.quote_plus(db_pass)
    db_url = f"mysql+pymysql://{db_user}:{encoded_pass}@mariadb:3306/{db_name}?charset=utf8mb4"
    engine = create_engine(db_url)
    
    print(f"  Creating tables in {db_name}...")
    Base.metadata.create_all(bind=engine)
    
    # 2. Seed admin user
    conn = pymysql.connect(host="mariadb", port=3306, user=db_user, password=db_pass, database=db_name)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT IGNORE INTO users (email, full_name, role, hashed_password) VALUES (%s, %s, 'admin', %s)",
        (admin_email, full_name, hashed_pw)
    )
    conn.commit()
    conn.close()
    print(f"  Admin user ({admin_email}) created/verified in {db_name}")

print("Database synchronization done.")
PYEOF

# ── Write generated passwords back to .env.production ───────────────────────
echo ""
echo "Writing generated DB passwords to .env.production..."

if [ -f ".env.production" ]; then
    # Update existing entries if present, otherwise append
    update_env() {
        local key="$1"
        local val="$2"
        if grep -q "^${key}=" .env.production; then
            sed -i "s|^${key}=.*|${key}=${val}|" .env.production
        else
            echo "${key}=${val}" >> .env.production
        fi
    }

    update_env "DB_NAME_TYTAHJ"     "tytahjdb"
    update_env "DB_PASSWORD_TYTAHJ" "${TYTAHJ_DB_PASS}"
    update_env "DB_USER_TYTAHJ"     "tytahj_user"

    update_env "DB_NAME_AMARIFLOW"     "amaridb"
    update_env "DB_PASSWORD_AMARIFLOW" "${AMARIFLOW_DB_PASS}"
    update_env "DB_USER_AMARIFLOW"     "amari_user"

    update_env "DB_NAME_IL"     "ildb"
    update_env "DB_PASSWORD_IL" "${IL_DB_PASS}"
    update_env "DB_USER_IL"     "il_user"

    echo ".env.production updated with new DB passwords."
else
    echo "WARNING: .env.production not found — passwords only saved to $CREDS_FILE"
fi

# Setup complete. New credentials will be applied when application services start.
echo "Setup complete. Change admin passwords after first login."
