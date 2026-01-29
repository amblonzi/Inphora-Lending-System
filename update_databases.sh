#!/bin/bash

# Multi-Tenant Schema Update Script
# Updates all databases with the latest schema changes (e.g., 2FA fields)

echo "==================================="
echo "Updating Database Schemas"
echo "==================================="

CLIENTS=("tytahj" "amari" "il")

for client in "${CLIENTS[@]}"; do
    container="inphora_backend_$client"
    echo ""
    echo "🔄 Updating $client schema in $container..."
    
    # Run the python update script inside the container
    docker compose exec -T "$container" python update_schema.py
    
    if [ $? -eq 0 ]; then
        echo "✓ $client schema updated successfully"
    else
        echo "✗ Failed to update $client schema"
    fi
done

echo ""
echo "==================================="
echo "All updates complete!"
echo "==================================="
