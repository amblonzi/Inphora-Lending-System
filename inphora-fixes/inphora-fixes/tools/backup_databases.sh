#!/bin/bash
# tools/backup_databases.sh — NEW (WARN-07)
# Backs up all tenant databases to compressed files
# Recommended: run daily via cron or a Compose service

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/opt/inphora/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"

if [[ -z "${DB_ROOT_PASSWORD:-}" ]]; then
  echo "ERROR: DB_ROOT_PASSWORD not set"
  exit 1
fi

DATABASES=("tytahjdb" "amaridb" "ildb")

echo "[${TIMESTAMP}] Starting database backup..."

for DB in "${DATABASES[@]}"; do
  OUTFILE="${BACKUP_DIR}/${DB}_${TIMESTAMP}.sql.gz"

  docker exec mariadb mysqldump \
    -u root -p"${DB_ROOT_PASSWORD}" \
    --single-transaction \
    --routines \
    --triggers \
    --hex-blob \
    "${DB}" | gzip > "$OUTFILE"

  SIZE=$(du -h "$OUTFILE" | cut -f1)
  echo "  ✓ ${DB} → ${OUTFILE} (${SIZE})"
done

# ── Prune old backups ──────────────────────────────────────────────────────
echo "Pruning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
echo "Done. Backup directory: $BACKUP_DIR"

# ── Optional: copy to DigitalOcean Spaces / S3 ────────────────────────────
# Uncomment and configure s3cmd or rclone:
# rclone copy "$BACKUP_DIR" spaces:inphora-backups/$(date +%Y/%m) --min-age 0h
