#!/bin/bash

echo "========================================"
echo "Inphora Lending System - Deploy"
echo "========================================"
echo

# Navigate to project directory
cd /opt/Inphora-Lending-System

# Stop existing services
echo "[1/4] Stopping existing services..."
docker-compose -f docker-compose.production.yml down

# Pull latest updates
echo "[2/4] Pulling latest updates..."
git pull origin main

# Build and start services
echo "[3/4] Building and starting services..."
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d

# Wait for services to start
echo "[4/4] Waiting for services to start..."
sleep 30

# Test health endpoints
echo "Testing health endpoints..."
curl -f http://localhost:8001/api/health && echo "✓ il.inphora.net - OK" || echo "✗ il.inphora.net - Failed"
curl -f http://localhost:8002/api/health && echo "✓ amariflow.inphora.net - OK" || echo "✗ amariflow.inphora.net - Failed"
curl -f http://localhost:8003/api/health && echo "✓ tytahj.inphora.net - OK" || echo "✗ tytahj.inphora.net - Failed"

echo
echo "========================================"
echo "DEPLOYMENT COMPLETED!"
echo "========================================"
echo
echo "Services:"
echo "- il.inphora.net: https://il.inphora.net"
echo "- amariflow.inphora.net: https://amariflow.inphora.net"
echo "- tytahj.inphora.net: https://tytahj.inphora.net"
echo
echo "Check status: docker-compose -f docker-compose.production.yml ps"
echo "View logs: docker-compose -f docker-compose.production.yml logs -f"
