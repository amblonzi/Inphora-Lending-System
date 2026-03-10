#!/bin/bash
# tools/dev_cleanup_local.sh — FIXED (WARN-08)
# Renamed from cleanup_server.sh → tools/dev_cleanup_local.sh
# FIXED: Production guard prevents accidental execution on live server

set -euo pipefail

# ── FIXED WARN-08: Hard block in production ───────────────────────────────
if [[ "${ENVIRONMENT:-}" == "production" ]]; then
  echo "╔══════════════════════════════════════════════════╗"
  echo "║  ERROR: Refusing to run cleanup in production!    ║"
  echo "║  This script is for LOCAL DEVELOPMENT only.       ║"
  echo "╚══════════════════════════════════════════════════╝"
  exit 1
fi

echo "⚠️  This will DESTROY all local Docker volumes and containers."
echo "   This is a development-only cleanup tool."
read -rp "Type 'yes-delete-local' to confirm: " CONFIRM

if [[ "$CONFIRM" != "yes-delete-local" ]]; then
  echo "Aborted."
  exit 0
fi

echo "Stopping containers..."
docker compose down -v --remove-orphans

echo "Removing local build cache..."
docker builder prune -f

echo "Cleanup complete. Run 'docker compose up --build' to restart fresh."
