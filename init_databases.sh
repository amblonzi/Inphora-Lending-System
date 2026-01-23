#!/bin/bash

# Database Initialization Script for Multi-Tenant Setup
# This script creates admin users for each client database

echo "==================================="
echo "Multi-Tenant Database Initialization"
echo "==================================="

# Function to create admin user
create_admin() {
    local client_name=$1
    local container_name=$2
    local db_name=$3
    local db_user=$4
    local db_password=$5
    
    echo ""
    echo "Initializing $client_name database..."
    
    # Wait for database to be ready
    echo "Waiting for $container_name to be ready..."
    sleep 5
    
    # Run create_admin.py in the backend container
    docker compose exec backend_${client_name,,} python create_admin.py
    
    if [ $? -eq 0 ]; then
        echo "✓ $client_name admin user created successfully"
    else
        echo "✗ Failed to create $client_name admin user"
    fi
}

# Create admin for each client
create_admin "tytaj" "inphora_backend_tytaj" "tytajdb" "tytaj_user" "$TYTAJ_DB_PASSWORD"
create_admin "amari" "inphora_backend_amari" "amaridb" "amari_user" "$AMARI_DB_PASSWORD"
create_admin "il" "inphora_backend_il" "ildb" "il_user" "$IL_DB_PASSWORD"

echo ""
echo "==================================="
echo "Database initialization complete!"
echo "==================================="
echo ""
echo "Access credentials:"
echo "-----------------------------------"
echo "Tytaj:      https://tytahj.inphora.net"
echo "AmariFlow:  https://amariflow.inphora.net"
echo "IL:         https://il.inphora.net"
echo ""
echo "Default admin credentials for all:"
echo "Email: admin@inphora.net"
echo "Password: (check create_admin.py)"
echo "==================================="
