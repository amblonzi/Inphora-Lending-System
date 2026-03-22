#!/bin/bash

# ============================================
# Inphora Lending System - Production Deployment
# Digital Ocean - 138.68.241.97
# Multi-Client Deployment Script
# ============================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="inphora-lending-system"
BACKUP_DIR="/opt/backups"
LOG_FILE="/var/log/inphora-deployment.log"

# Function to log messages
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a $LOG_FILE
    exit 1
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a $LOG_FILE
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a $LOG_FILE
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
    fi
    
    # Check if ports are available
    local ports=(80 443 3306 3307 3308 6379 8001 8002 8003)
    for port in "${ports[@]}"; do
        if lsof -i :$port &> /dev/null; then
            warning "Port $port is already in use"
        fi
    done
    
    log "Prerequisites check completed"
}

# Backup existing data
backup_data() {
    log "Creating backup of existing data..."
    
    # Create backup directory
    mkdir -p $BACKUP_DIR
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/db_backup_$timestamp.sql"
    
    # ── Legacy Multi-Container Backup ──────────────────────────────────────────
    # Backup IL database
    if docker ps --format '{{.Names}}' | grep -q "inphora_db_il"; then
        log "Backing up legacy IL database..."
        docker exec inphora_db_il mysqldump -u root -p"${IL_DB_ROOT_PASSWORD:-}" ildb > "$backup_file.il.sql" 2>/dev/null || warning "Failed to backup legacy IL database (check IL_DB_ROOT_PASSWORD)"
    fi
    
    # Backup Amari database
    if docker ps --format '{{.Names}}' | grep -q "inphora_db_amari"; then
        log "Backing up legacy Amari database..."
        docker exec inphora_db_amari mysqldump -u root -p"${AMARI_DB_ROOT_PASSWORD:-}" amaridb > "$backup_file.amari.sql" 2>/dev/null || warning "Failed to backup legacy Amari database (check AMARI_DB_ROOT_PASSWORD)"
    fi
    
    # Backup Tytahj database
    if docker ps --format '{{.Names}}' | grep -q "inphora_db_tytahj"; then
        log "Backing up legacy Tytahj database..."
        docker exec inphora_db_tytahj mysqldump -u root -p"${TYTAHJ_DB_ROOT_PASSWORD:-}" tytahjdb > "$backup_file.tytahj.sql" 2>/dev/null || warning "Failed to backup legacy Tytahj database (check TYTAHJ_DB_ROOT_PASSWORD)"
    fi

    # ── New Architecture (Shared MariaDB) Backup ──────────────────────────────
    if docker ps --format '{{.Names}}' | grep -q "mariadb"; then
        log "Backing up shared MariaDB..."
        docker exec mariadb mysqldump -u root -p"${DB_ROOT_PASSWORD:-}" --all-databases > "$backup_file.all.sql" 2>/dev/null || warning "Failed to backup shared MariaDB (check DB_ROOT_PASSWORD)"
    fi
    
    log "Data backup process finished (check $BACKUP_DIR for results)"
}

# Stop existing services
stop_services() {
    log "Stopping existing services..."
    
    # Stop and remove existing containers using the current compose file
    if [ -f "docker-compose.yml" ]; then
        docker-compose --env-file .env.production down || true
    fi

    # Aggressively stop any legacy containers to free up ports
    log "Cleaning up potential legacy containers..."
    local legacy_containers=("inphora_db_il" "inphora_db_amari" "inphora_db_tytahj" "inphora_redis" "inphora_backend_il" "inphora_backend_amari" "inphora_backend_tytahj" "inphora_frontend" "inphora_nginx")
    for container in "${legacy_containers[@]}"; do
        if docker ps -a --format '{{.Names}}' | grep -q "^$container$"; then
            info "Stopping legacy container: $container"
            docker stop $container || true
            docker rm $container || true
        fi
    done
    
    # Remove orphaned containers
    docker container prune -f
    
    log "Services stopped and cleaned"
}

# Load and sanitize environment variables
load_env() {
    if [ -f ".env.production" ]; then
        # Create a sanitized version of the env file (remove CRLF)
        sed -i 's/\r$//' .env.production
        
        # Also generate a CLEAN .env file for Docker Compose (removes irregular spaces)
        log "Generating clean .env file for Docker Compose..."
        : > .env
        while IFS='=' read -r key value || [[ -n "$key" ]]; do
            key=$(echo "$key" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
            [[ -z "$key" || "$key" == "#"* ]] && continue
            value=$(echo "$value" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//;s/\r$//')
            echo "$key=$value" >> .env
            export "$key=$value"
        done < ".env.production"
        
        # Ensure critical defaults
        export DB_USER="${DB_USER:-inphora_user}"
        echo "DB_USER=$DB_USER" >> .env
        export ENVIRONMENT="${ENVIRONMENT:-production}"
        echo "ENVIRONMENT=$ENVIRONMENT" >> .env
        
        log "Applied sanitized .env.production to shell and generated clean .env"
    else
        error ".env.production file not found. Please create it from env.production.example"
    fi
}

# Pull latest code
update_code() {
    log "Preparing deployment environment..."
    
    # Environment is now loaded at the very start of main()
    
    # Fix line endings on all shell scripts
    find . -type f -name "*.sh" -exec sed -i 's/\r$//' {} +
    
    log "Environment ready"
}

# Build and start services
deploy_services() {
    log "Building and starting services..."
    
    # Detect docker-compose command
    local dccommand="docker-compose"
    if docker compose version >/dev/null 2>&1; then
        dccommand="docker compose"
    fi
    
    # ── Stage 1: Build core backend and Start MariaDB/Redis ──────────────────
    log "Starting database and cache services..."
    # Build backend_il first so it's available for init_databases.sh
    log "Building core backend image..."
    $dccommand --env-file .env.production -f docker-compose.yml build backend_il
    
    $dccommand --env-file .env.production -f docker-compose.yml up -d mariadb redis
    
    # Wait for MariaDB to be ready
    log "Waiting for MariaDB to be ready (may take up to 2 minutes on first run)..."
    local attempts=0
    local ready=false
    
    while [ $attempts -lt 30 ]; do
        if docker exec mariadb mariadb-admin ping -h localhost --silent 2>/dev/null; then
            ready=true
            break
        fi
        sleep 5
        attempts=$((attempts + 1))
        info "  Waiting for MariaDB... (Attempt $attempts/30)"
    done
    
    if [ "$ready" != "true" ]; then
        error "MariaDB failed to become ready for connections"
    fi
    log "MariaDB is ready."
    
    # ── Stage 2: Initialize Databases ─────────────────────────────────────────
    if [ -f "./init_databases.sh" ]; then
        log "Initializing databases and users..."
        chmod +x init_databases.sh
        ./init_databases.sh
        # Re-load environment as init_databases.sh might have updated .env.production
        load_env
    else
        warning "init_databases.sh not found, skipping initialization"
    fi
    
    # ── Stage 3: Start everything else ────────────────────────────────────────
    log "Starting application services..."
    $dccommand --env-file .env.production -f docker-compose.yml up -d --build --remove-orphans
    
    log "Services deployed"
}

# Wait for services to be healthy
wait_for_health() {
    log "Waiting for services to be healthy..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        local healthy=true
        
        # Check database (vibrant check)
        if ! docker exec mariadb mariadb-admin ping -h localhost --silent; then
            healthy=false
            info "  - Database: Still initializing..."
        else
            info "  - Database: HEALTHY"
        fi
        
        # Check Redis (Handle password case)
        if docker exec redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
            info "  - Redis: HEALTHY"
        elif docker exec redis redis-cli -a "${REDIS_PASSWORD:-}" ping 2>/dev/null | grep -q "PONG"; then
            info "  - Redis: HEALTHY (Auth)"
        else
            healthy=false
            info "  - Redis: AUTH error or initializing..."
            # Diagnostic: show why AUTH failed if relevant
            # docker exec redis redis-cli ping
        fi
        
        # Check Backends
        for service in "backend_il" "backend_amariflow" "backend_tytahj"; do
            if ! docker exec "$service" curl -s -f http://localhost:8000/api/health >/dev/null 2>&1; then
                healthy=false
                info "  - $service: Waiting..."
                # Diagnostic: show last few lines of logs for the failing service
                echo -e "${RED}--- $service Logs ---${NC}"
                docker logs --tail 20 "$service" || true
                echo -e "${RED}----------------------${NC}"
            else
                info "  - $service: HEALTHY"
            fi
        done
        
        if [ "$healthy" = true ]; then
            log "All services are healthy"
            return 0
        fi
        
        info "Attempt $attempt/$max_attempts: Services not ready yet, waiting..."
        sleep 10
        attempt=$((attempt + 1))
    done
    
    error "Services failed to become healthy within expected time"
}

# Setup SSL certificates
setup_ssl() {
    log "Setting up SSL certificates..."
    
    local domains="il.inphora.net amariflow.inphora.net tytahj.inphora.net"
    local email_to_use="${CERTBOT_EMAIL:-admin@inphora.net}"
    
    for domain in $domains; do
        if [ ! -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]; then
            log "Obtaining initial SSL certificate for $domain (standalone mode)..."
            
            # Stop Nginx if it's holding port 80 to allow standalone mode
            docker stop nginx || true
            
            docker run --rm \
                -p 80:80 \
                -v ./certbot/conf:/etc/letsencrypt \
                -v ./certbot/www:/var/www/certbot \
                certbot/certbot certonly \
                --standalone \
                --non-interactive \
                --agree-tos \
                --email "$email_to_use" \
                --no-eff-email \
                -d "$domain"
            
            # Restart Nginx
            log "Starting Nginx..."
            docker start nginx || true
        else
            log "SSL certificate for $domain already exists"
        fi
    done
    
    log "SSL certificates setup completed"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Run migrations for each client with guards
    for service in "backend_il" "backend_amariflow" "backend_tytahj"; do
        if docker exec "$service" test -f alembic.ini; then
            log "Migrating $service..."
            docker exec "$service" /opt/venv/bin/alembic upgrade head || warning "Migration failed for $service"
        else
            warning "Alembic not configured for $service, skipping..."
        fi
    done
    
    log "Database migrations completed"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."

    # Check if all containers are running
    local containers=("mariadb" "redis" "backend_il" "backend_amariflow" "backend_tytahj" "frontend" "nginx")
    local failed_containers=0

    for container in "${containers[@]}"; do
        if ! docker ps --format '{{.Names}}' | grep -q "^$container$"; then
            warning "Container $container is NOT running"
            failed_containers=$((failed_containers + 1))
        else
            info "  - Container $container: RUNNING"
        fi
    done

    if [ $failed_containers -gt 0 ]; then
        error "$failed_containers container(s) are not running — check 'docker ps -a' for details"
    fi

    # Test API endpoints via Nginx locally (127.0.0.1) with Host headers to avoid DNS issues
    local endpoints=(
        "il.inphora.net"
        "amariflow.inphora.net"
        "tytahj.inphora.net"
    )
    local failed_endpoints=0

    for domain in "${endpoints[@]}"; do
        info "  - Testing $domain (via local Nginx)..."
        # Try HTTP first (Nginx should redirect or respond if health check is before redirect)
        if curl -sf -H "Host: $domain" "http://127.0.0.1/api/health" > /dev/null 2>&1; then
            info "    ✓ Response: OK"
        else
            warning "    ✗ Endpoint $domain is not responding locally (check Nginx/Backend logs)"
            failed_endpoints=$((failed_endpoints + 1))
        fi
    done

    if [ $failed_endpoints -gt 0 ]; then
        error "$failed_endpoints endpoint(s) are not responding — check nginx and backend logs"
    fi

    log "Deployment verification completed successfully"
}

# Cleanup old images and containers
cleanup() {
    log "Cleaning up old Docker resources..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused containers
    docker container prune -f
    
    # Remove unused networks
    docker network prune -f
    
    log "Cleanup completed"
}

# Main deployment function
main() {
    log "Starting Inphora Lending System deployment..."
    
    check_root
    check_prerequisites
    load_env
    
    backup_data
    stop_services
    update_code
    deploy_services
    wait_for_health
    setup_ssl
    run_migrations
    verify_deployment
    cleanup
    
    log "Deployment completed successfully!"
    log "Services are available at:"
    log "  - IL: https://il.inphora.net"
    log "  - Amari: https://amariflow.inphora.net"
    log "  - Tytahj: https://tytahj.inphora.net"
}

# Handle script arguments
case "${1:-}" in
    "backup")
        load_env
        backup_data
        ;;
    "deploy")
        main
        ;;
    "stop")
        load_env
        stop_services
        ;;
    "logs")
        docker-compose -f docker-compose.production.yml logs -f
        ;;
    "health")
        load_env
        wait_for_health
        ;;
    *)
        echo "Usage: $0 {backup|deploy|stop|logs|status|health}"
        echo ""
        echo "Commands:"
        echo "  backup  - Backup existing data"
        echo "  deploy  - Full deployment process"
        echo "  stop    - Stop all services"
        echo "  logs    - Show service logs"
        echo "  status  - Show service status (using docker-compose.yml)"
        echo "  health  - Check service health"
        exit 1
        ;;
esac
