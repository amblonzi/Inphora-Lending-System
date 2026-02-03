#!/bin/bash

# Local Database Initialization Script
# This script creates the tytahjdb database and admin user locally

echo "==================================="
echo "Local Database Initialization"
echo "==================================="

# Function to create database and admin
init_local_db() {
    echo "Waiting for MariaDB to be ready..."
    # Wait for MySQL to be reachable
    until docker exec inphora_db_local mariadb-admin ping -proot --silent; do
        sleep 2
    done

    echo "Creating database tytahjdb..."
    docker exec inphora_db_local mariadb -proot -e "CREATE DATABASE IF NOT EXISTS tytahjdb;"

    echo "Running admin creation script..."
    docker exec inphora_backend_tytahj_local python create_admin.py
}

init_local_db

echo ""
echo "==================================="
echo "Local setup complete!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "==================================="
