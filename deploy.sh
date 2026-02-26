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
    
    # Backup databases
    if docker ps | grep -q "inphora_db"; then
        local backup_file="$BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).sql"
        
        # Backup IL database
        if docker ps | grep -q "inphora_db_il"; then
            docker exec inphora_db_il mysqldump -u root -p$IL_DB_ROOT_PASSWORD ildb > "$backup_file.il.sql"
            log "IL database backed up to $backup_file.il.sql"
        fi
        
        # Backup Amari database
        if docker ps | grep -q "inphora_db_amari"; then
            docker exec inphora_db_amari mysqldump -u root -p$AMARI_DB_ROOT_PASSWORD amaridb > "$backup_file.amari.sql"
            log "Amari database backed up to $backup_file.amari.sql"
        fi
        
        # Backup Tytahj database
        if docker ps | grep -q "inphora_db_tytahj"; then
            docker exec inphora_db_tytahj mysqldump -u root -p$TYTAHJ_DB_ROOT_PASSWORD tytahjdb > "$backup_file.tytahj.sql"
            log "Tytahj database backed up to $backup_file.tytahj.sql"
        fi
    fi
    
    # Backup Docker volumes
    docker run --rm -v inphora_db_il_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/il_db_data_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
    docker run --rm -v inphora_db_amari_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/amari_db_data_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
    docker run --rm -v inphora_db_tytahj_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/tytahj_db_data_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
    docker run --rm -v inphora_redis_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/redis_data_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
    
    log "Data backup completed"
}

# Stop existing services
stop_services() {
    log "Stopping existing services..."
    
    # Stop and remove existing containers
    if docker-compose -f docker-compose.production.yml ps -q | grep -q .; then
        docker-compose -f docker-compose.production.yml down
    fi
    
    # Remove orphaned containers
    docker container prune -f
    
    log "Services stopped"
}

# Pull latest code
update_code() {
    log "Updating application code..."
    
    # Pull latest changes from Git
    if [ -d ".git" ]; then
        git pull origin main
        log "Code updated from Git repository"
    else
        warning "Not a Git repository, skipping code update"
    fi
}

# Build and start services
deploy_services() {
    log "Building and starting services..."
    
    # Build images
    docker-compose -f docker-compose.production.yml build --no-cache
    
    # Start services
    docker-compose -f docker-compose.production.yml up -d
    
    log "Services deployed"
}

# Wait for services to be healthy
wait_for_health() {
    log "Waiting for services to be healthy..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        local healthy=true
        
        # Check databases
        if ! docker exec inphora_db_il mysqladmin ping -h localhost --silent; then
            healthy=false
        fi
        
        if ! docker exec inphora_db_amari mysqladmin ping -h localhost --silent; then
            healthy=false
        fi
        
        if ! docker exec inphora_db_tytahj mysqladmin ping -h localhost --silent; then
            healthy=false
        fi
        
        # Check Redis
        if ! docker exec inphora_redis redis-cli ping | grep -q "PONG"; then
            healthy=false
        fi
        
        # Check backends
        if ! curl -f http://localhost:8001/api/health > /dev/null 2>&1; then
            healthy=false
        fi
        
        if ! curl -f http://localhost:8002/api/health > /dev/null 2>&1; then
            healthy=false
        fi
        
        if ! curl -f http://localhost:8003/api/health > /dev/null 2>&1; then
            healthy=false
        fi
        
        if [ "$healthy" = true ]; then
            log "All services are healthy"
            return 0
        fi
        
        info "Attempt $attempt/$max_attempts: Services not ready yet, waiting..."
        sleep 10
        ((attempt++))
    done
    
    error "Services failed to become healthy within expected time"
}

# Setup SSL certificates
setup_ssl() {
    log "Setting up SSL certificates..."
    
    # Get SSL certificates for all domains
    local domains="il.inphora.net amariflow.inphora.net tytahj.inphora.net"
    
    for domain in $domains; do
        if [ ! -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]; then
            log "Obtaining SSL certificate for $domain"
            
            # Stop nginx temporarily
            docker stop inphora_nginx || true
            
            # Get certificate
            docker run --rm \
                -v ./certbot/conf:/etc/letsencrypt \
                -v ./certbot/www:/var/www/certbot \
                -p 80:80 \
                certbot/certbot certonly \
                --standalone \
                --email $CERTBOT_EMAIL \
                --agree-tos \
                --no-eff-email \
                -d $domain
            
            # Start nginx
            docker start inphora_nginx || true
        else
            log "SSL certificate for $domain already exists"
        fi
    done
    
    log "SSL certificates setup completed"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Run migrations for each client
    docker exec inphora_backend_il alembic upgrade head
    docker exec inphora_backend_amari alembic upgrade head
    docker exec inphora_backend_tytahj alembic upgrade head
    
    log "Database migrations completed"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Check if all containers are running
    local containers=("inphora_db_il" "inphora_db_amari" "inphora_db_tytahj" "inphora_redis" "inphora_backend_il" "inphora_backend_amari" "inphora_backend_tytahj" "inphora_frontend" "inphora_nginx")
    
    for container in "${containers[@]}"; do
        if ! docker ps | grep -q $container; then
            error "Container $container is not running"
        fi
    done
    
    # Test API endpoints
    local endpoints=(
        "http://il.inphora.net/api/health"
        "http://amariflow.inphora.net/api/health"
        "http://tytahj.inphora.net/api/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if ! curl -f $endpoint > /dev/null 2>&1; then
            error "Endpoint $endpoint is not responding"
        fi
    done
    
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
    
    # Load environment variables
    if [ -f ".env.production" ]; then
        export $(cat .env.production | grep -v '^#' | xargs)
        log "Environment variables loaded"
    else
        error ".env.production file not found"
    fi
    
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
        backup_data
        ;;
    "deploy")
        main
        ;;
    "stop")
        stop_services
        ;;
    "logs")
        docker-compose -f docker-compose.production.yml logs -f
        ;;
    "status")
        docker-compose -f docker-compose.production.yml ps
        ;;
    "health")
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
        echo "  status  - Show service status"
        echo "  health  - Check service health"
        exit 1
        ;;
esac
