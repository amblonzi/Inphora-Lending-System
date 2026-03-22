#!/bin/bash

echo "--- Aggressive Port Cleanup ---"

# 1. Stop host services
sudo systemctl stop nginx apache2 2>/dev/null
sudo systemctl disable nginx apache2 2>/dev/null

# 2. Kill all processes holding port 80 or 443
echo "Killing processes on 80 and 443..."
sudo fuser -k 80/tcp 2>/dev/null
sudo fuser -k 443/tcp 2>/dev/null
sudo fuser -k 80/udp 2>/dev/null
sudo fuser -k 443/udp 2>/dev/null

# 3. Check for any remaining holders
echo "Checking for remaining holders..."
sudo lsof -i :80
sudo lsof -i :443

# 4. Clear Docker bridge (sometimes binds get stuck here)
echo "Restarting Docker service to clear network hooks..."
sudo systemctl restart docker

# 5. Check DNS propagation
echo "Checking DNS for your domains..."
domains=("tytaj.inphora.net" "amariflow.inphora.net" "il.inphora.net")
for domain in "${domains[@]}"; do
    if host $domain > /dev/null; then
        echo "✅ $domain is pointing to $(host $domain | awk '{print $NF}')"
    else
        echo "❌ $domain NOT FOUND (NXDOMAIN). You must fix this in your DNS provider."
    fi
done

echo "--- Cleanup Complete ---"
