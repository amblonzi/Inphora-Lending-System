#!/bin/bash

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=7

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

echo "=========================================="
echo "Starting Inphora Backup: $TIMESTAMP"
echo "=========================================="

# List of database containers and their internal DB names
# Format: "container_name:db_name:db_password_env_var"
# Note: We use env vars inside the container, but for `docker exec` we often need the root password.
# Assuming standard passwords from .env are available or we use the root password from .env for mysqldump.
# For simplicity, we'll try to use `docker exec` with the configured user/password inside the container.

# 1. Main System DB
echo "Backing up Main System (Inphora)..."
docker exec inphora_db_inphora mysqldump -u inphora_user -p"$INPHORA_DB_PASSWORD" inphoradb | gzip > "$BACKUP_DIR/inphora_main_$TIMESTAMP.sql.gz"

# 2. Tytahj Client
echo "Backing up Tytahj Client..."
docker exec inphora_db_tytahj mysqldump -u tytahj_user -p"$TYTAHJ_DB_PASSWORD" tytahjdb | gzip > "$BACKUP_DIR/tytahj_$TIMESTAMP.sql.gz"

# 3. Amari Client
echo "Backing up Amari Client..."
docker exec inphora_db_amari mysqldump -u amari_user -p"$AMARI_DB_PASSWORD" amaridb | gzip > "$BACKUP_DIR/amari_$TIMESTAMP.sql.gz"

# 4. IL Client
echo "Backing up IL Client..."
docker exec inphora_db_il mysqldump -u il_user -p"$IL_DB_PASSWORD" ildb | gzip > "$BACKUP_DIR/il_$TIMESTAMP.sql.gz"

echo "=========================================="
echo "Backup Complete. Cleaning up old files..."
echo "=========================================="

# Delete backups older than RETENTION_DAYS
find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +$RETENTION_DAYS -exec rm {} \;
echo "Deleted backups older than $RETENTION_DAYS days."

echo "Done."
