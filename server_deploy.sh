#!/bin/bash

# server_deploy.sh
# Run this on the Digital Ocean Droplet to update the application

APP_DIR="/opt/inphora"

echo "Starting deployment at $(date)..."

cd $APP_DIR

if [ -f "deploy_package.zip" ]; then
    echo "Found deployment package. Unzipping..."
    unzip -o deploy_package.zip
    rm deploy_package.zip
else
    echo "No deploy_package.zip found. Assuming files are already in place."
fi

echo "Detailed Status:"
docker compose ps

echo "Pulling and rebuilding..."
# Stop containers first to ensure clean state (optional but safer for DB migrations if any)
# docker compose down 

# Build and start in detached mode
docker compose up --build -d

echo "Pruning unused images to save space..."
docker system prune -f

echo "Deployment complete at $(date)."
docker compose ps
