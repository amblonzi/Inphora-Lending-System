#!/bin/bash

# Cleanup Server Script for Clean Deployment
# WARNING: This will stop all containers and remove all persistent data!

echo "==================================="
echo "Server Cleanup for Clean Release"
echo "==================================="

# 1. Stop and remove containers and volumes
echo "Stopping containers and removing volumes..."
docker-compose down -v

# 2. Cleanup old deployment folders
echo "Removing old source folders..."
# We only remove directories we are about to re-recreate via unzip
rm -rf backend frontend nginx dist

echo "Clean state achieved."
echo "CRITICAL: Now run 'unzip -o deploy_package_v2.zip' BEFORE docker-compose"
