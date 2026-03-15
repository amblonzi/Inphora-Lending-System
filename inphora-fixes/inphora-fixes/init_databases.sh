#!/bin/bash
# init_databases.sh — FIXED (CRIT-01)
# Generates random admin passwords instead of hardcoded "admin123"
# Creates all tenant databases and schemas

set -euo pipefail

# ── Guard: refuse to run if ENVIRONMENT is not set ───────────────────────────
if [[ -z "${ENVIRONMENT:-}" ]]; then
  echo "ERROR: ENVIRONMENT variable is not set. Aborting."
  exit 1
fi

# ── Require root DB password ──────────────────────────────────────────────────
if [[ -z "${DB_ROOT_PASSWORD:-}" ]]; then
  echo "ERROR: DB_ROOT_PASSWORD is not set."
  exit 1
fi

MYSQL_CMD="mysql -h 127.0.0.1 -u root -p${DB_ROOT_PASSWORD}"

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
echo "║  Tytahj Express   admin password: ${TYTAHJ_ADMIN_PASS}  ║"
echo "║  AmariFlow        admin password: ${AMARIFLOW_ADMIN_PASS}  ║"
echo "║  Inphora Logic    admin password: ${IL_ADMIN_PASS}  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Also write credentials to a local file (NOT committed to git)
CREDS_FILE="./initial_credentials_$(date +%Y%m%d_%H%M%S).txt"
cat > "$CREDS_FILE" << EOF
Inphora Initial Admin Credentials — $(date)
============================================================
Tytahj Express:
  Admin Username: admin
  Admin Password: ${TYTAHJ_ADMIN_PASS}
  DB Password:    ${TYTAHJ_DB_PASS}

AmariFlow:
  Admin Username: admin
  Admin Password: ${AMARIFLOW_ADMIN_PASS}
  DB Password:    ${AMARIFLOW_DB_PASS}

Inphora Logic:
  Admin Username: admin
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
  GRANT ALL PRIVILEGES ON tytahjdb.* TO 'tytahj_user'@'%';

  -- AmariFlow
  CREATE DATABASE IF NOT EXISTS amaridb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'amari_user'@'%' IDENTIFIED BY '${AMARIFLOW_DB_PASS}';
  GRANT ALL PRIVILEGES ON amaridb.* TO 'amari_user'@'%';

  -- Inphora Logic
  CREATE DATABASE IF NOT EXISTS ildb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'il_user'@'%' IDENTIFIED BY '${IL_DB_PASS}';
  GRANT ALL PRIVILEGES ON ildb.* TO 'il_user'@'%';

  FLUSH PRIVILEGES;
SQL

echo "Databases created."

# ── Seed admin users using bcrypt hashes (via Python) ────────────────────────
echo "Creating admin users..."

python3 - <<PYEOF
import subprocess, sys

try:
    from passlib.context import CryptContext
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "passlib[bcrypt]", "-q"])
    from passlib.context import CryptContext

ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_pw(pw):
    return ctx.hash(pw)

# Admin user inserts — hashed passwords, no plaintext stored
configs = [
    ("tytahjdb",  "tytahj_user",  "${TYTAHJ_DB_PASS}",    hash_pw("${TYTAHJ_ADMIN_PASS}"),   "Tytahj Express Admin"),
    ("amaridb",   "amari_user",   "${AMARIFLOW_DB_PASS}",  hash_pw("${AMARIFLOW_ADMIN_PASS}"), "AmariFlow Admin"),
    ("ildb",      "il_user",      "${IL_DB_PASS}",         hash_pw("${IL_ADMIN_PASS}"),        "Inphora Logic Admin"),
]

import pymysql

for db_name, db_user, db_pass, hashed_pw, full_name in configs:
    conn = pymysql.connect(host="127.0.0.1", user=db_user, password=db_pass, database=db_name)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            full_name VARCHAR(100) NOT NULL,
            email VARCHAR(100),
            hashed_password VARCHAR(255) NOT NULL,
            role VARCHAR(20) NOT NULL DEFAULT 'officer',
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)
    cursor.execute(
        "INSERT IGNORE INTO users (username, full_name, role, hashed_password) VALUES (%s, %s, 'admin', %s)",
        ("admin", full_name, hashed_pw)
    )
    conn.commit()
    conn.close()
    print(f"  Admin user created in {db_name}")

print("Done.")
PYEOF

# Update .env files with generated DB passwords
echo ""
echo "Update your .env with these DB passwords:"
echo "  DB_PASSWORD_TYTAHJ=${TYTAHJ_DB_PASS}"
echo "  DB_PASSWORD_AMARIFLOW=${AMARIFLOW_DB_PASS}"
echo "  DB_PASSWORD_IL=${IL_DB_PASS}"
echo ""
echo "Setup complete. Change admin passwords after first login."
