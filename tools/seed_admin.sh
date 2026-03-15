#!/bin/bash
# tools/seed_admin.sh
# Run this on the production server to create/reset admin users in all tenants.
#
# Usage:
#   bash tools/seed_admin.sh
#
# To set a custom admin password (recommended):
#   ADMIN_DEFAULT_PASSWORD="MyStr0ngPass!" bash tools/seed_admin.sh

set -euo pipefail

TENANTS=("backend_tytahj" "backend_amariflow" "backend_il")

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║       Inphora — Seed Admin Users (All Tenants)       ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

for container in "${TENANTS[@]}"; do
    echo "──────────────────────────────────────────────────────"
    echo "  Tenant container: $container"
    echo "──────────────────────────────────────────────────────"

    # Check if container is running
    if ! docker compose ps --status running "$container" 2>/dev/null | grep -q "$container"; then
        echo "  SKIP: Container '$container' is not running."
        echo ""
        continue
    fi

    docker compose exec \
        -e ADMIN_DEFAULT_PASSWORD="${ADMIN_DEFAULT_PASSWORD:-Admin@Inphora2025!}" \
        "$container" \
        python seed_admin.py
done

echo ""
echo "Done. Use the credentials above to log in."
echo "Change all admin passwords immediately after first login."
