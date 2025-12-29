#!/bin/bash
# ======================================
# Core Application - Production Deployment Script
# ======================================
# Automated deployment script for production environment
#
# Usage:
#   ./docker/scripts/deploy.sh [command]
#
# Commands:
#   deploy      - Full deployment (build, migrate, start)
#   start       - Start production services
#   stop        - Stop all services (graceful)
#   restart     - Zero-downtime restart
#   update      - Update application (pull, build, migrate, restart)
#   rollback    - Rollback to previous version
#   status      - Show service status and health
#   logs        - View production logs
#   backup      - Create backup before deployment
#   health      - Check all service health
#   ssl-check   - Check SSL certificate status
#
# Environment:
#   Requires .env file with production credentials
#
# ======================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.prod.yml"
BACKUP_DIR="$PROJECT_ROOT/backups"
LOG_FILE="$PROJECT_ROOT/logs/deploy.log"

# Ensure log directory exists
mkdir -p "$PROJECT_ROOT/logs"

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

print_banner() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║           Core Application - Production Deploy               ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
    log "INFO" "$1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
    log "WARN" "$1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
    log "ERROR" "$1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
    log "INFO" "$1"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."

    # Check for docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi

    # Check for docker-compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi

    # Check for .env file
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        print_error ".env file not found. Copy .env.docker.example to .env and configure."
        exit 1
    fi

    # Validate required environment variables
    source "$PROJECT_ROOT/.env"

    if [ -z "$DB_PASSWORD" ]; then
        print_error "DB_PASSWORD is not set in .env"
        exit 1
    fi

    if [ -z "$JWT_SECRET" ]; then
        print_error "JWT_SECRET is not set in .env"
        exit 1
    fi

    if [ ${#JWT_SECRET} -lt 32 ]; then
        print_error "JWT_SECRET must be at least 32 characters"
        exit 1
    fi

    print_status "Prerequisites check passed"
}

# Create backup before deployment
create_backup() {
    print_info "Creating pre-deployment backup..."

    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_name="pre_deploy_${timestamp}"

    mkdir -p "$BACKUP_DIR/postgres"

    # Backup database if container is running
    if docker ps | grep -q "core-app-postgres-prod"; then
        print_info "Backing up PostgreSQL database..."
        docker exec core-app-postgres-prod pg_dump -U postgres core_app > "$BACKUP_DIR/postgres/${backup_name}.sql"
        gzip "$BACKUP_DIR/postgres/${backup_name}.sql"
        print_status "Database backup created: ${backup_name}.sql.gz"
    else
        print_warning "PostgreSQL container not running, skipping database backup"
    fi

    # Keep only last 5 backups
    cd "$BACKUP_DIR/postgres"
    ls -t *.sql.gz 2>/dev/null | tail -n +6 | xargs -r rm --

    print_status "Backup completed"
}

# Build images
build_images() {
    print_info "Building Docker images..."
    cd "$PROJECT_ROOT"

    # Get git info for build
    export GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    export BUILD_NUMBER=$(date '+%Y%m%d%H%M%S')

    docker-compose -f "$COMPOSE_FILE" build --no-cache

    print_status "Images built successfully"
}

# Run database migrations
run_migrations() {
    print_info "Running database migrations..."
    cd "$PROJECT_ROOT"

    # Wait for database to be ready
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U postgres -d core_app > /dev/null 2>&1; then
            break
        fi
        sleep 2
        attempt=$((attempt + 1))
    done

    if [ $attempt -eq $max_attempts ]; then
        print_error "Database not ready after $max_attempts attempts"
        exit 1
    fi

    docker-compose -f "$COMPOSE_FILE" exec -T resource-api npm run db:migrate:prod

    print_status "Migrations completed"
}

# Start services
start_services() {
    print_info "Starting production services..."
    cd "$PROJECT_ROOT"

    docker-compose -f "$COMPOSE_FILE" up -d

    print_info "Waiting for services to be healthy..."
    sleep 10

    # Check health
    check_health

    print_status "Services started successfully"
    print_service_urls
}

# Stop services gracefully
stop_services() {
    print_info "Stopping services gracefully..."
    cd "$PROJECT_ROOT"

    # Graceful shutdown with timeout
    docker-compose -f "$COMPOSE_FILE" stop -t 30

    print_status "Services stopped"
}

# Zero-downtime restart
restart_services() {
    print_info "Performing zero-downtime restart..."
    cd "$PROJECT_ROOT"

    # Restart API first
    docker-compose -f "$COMPOSE_FILE" restart resource-api
    sleep 10

    # Check API health
    if ! check_api_health; then
        print_error "API health check failed after restart"
        exit 1
    fi

    # Restart frontend
    docker-compose -f "$COMPOSE_FILE" restart frontend

    print_status "Restart completed"
}

# Full deployment
deploy() {
    print_banner
    print_info "Starting production deployment..."

    check_prerequisites
    create_backup
    build_images

    # Start infrastructure services first
    print_info "Starting infrastructure services..."
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" up -d postgres redis minio

    # Wait for infrastructure
    print_info "Waiting for infrastructure services..."
    sleep 15

    # Run migrations
    run_migrations

    # Start application services
    print_info "Starting application services..."
    docker-compose -f "$COMPOSE_FILE" up -d resource-api frontend

    # Wait and check health
    sleep 15
    check_health

    print_status "Deployment completed successfully!"
    print_service_urls

    log "INFO" "Deployment completed successfully"
}

# Update application
update() {
    print_banner
    print_info "Starting application update..."

    check_prerequisites
    create_backup

    # Pull latest changes (if using git)
    if [ -d "$PROJECT_ROOT/.git" ]; then
        print_info "Pulling latest changes..."
        cd "$PROJECT_ROOT"
        git pull
    fi

    # Rebuild images
    build_images

    # Run migrations
    run_migrations

    # Zero-downtime restart
    restart_services

    print_status "Update completed successfully!"
    log "INFO" "Update completed successfully"
}

# Rollback to previous version
rollback() {
    print_warning "Rollback functionality - restore from backup"

    # List available backups
    echo ""
    echo "Available backups:"
    ls -la "$BACKUP_DIR/postgres/"*.sql.gz 2>/dev/null | tail -5
    echo ""

    read -p "Enter backup filename to restore (without path): " backup_file

    if [ -z "$backup_file" ]; then
        print_error "No backup file specified"
        exit 1
    fi

    local backup_path="$BACKUP_DIR/postgres/$backup_file"

    if [ ! -f "$backup_path" ]; then
        print_error "Backup file not found: $backup_path"
        exit 1
    fi

    print_warning "This will replace the current database with the backup!"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Restoring database from backup..."

        # Decompress and restore
        gunzip -c "$backup_path" | docker exec -i core-app-postgres-prod psql -U postgres -d core_app

        print_status "Database restored from backup"
    else
        print_info "Rollback cancelled"
    fi
}

# Check service health
check_health() {
    print_info "Checking service health..."
    local all_healthy=true

    # Check API
    if check_api_health; then
        print_status "API: Healthy"
    else
        print_error "API: Unhealthy"
        all_healthy=false
    fi

    # Check PostgreSQL
    if docker exec core-app-postgres-prod pg_isready -U postgres -d core_app > /dev/null 2>&1; then
        print_status "PostgreSQL: Healthy"
    else
        print_error "PostgreSQL: Unhealthy"
        all_healthy=false
    fi

    # Check Redis
    if docker exec core-app-redis-prod redis-cli ping > /dev/null 2>&1; then
        print_status "Redis: Healthy"
    else
        print_error "Redis: Unhealthy"
        all_healthy=false
    fi

    # Check MinIO
    if curl -sf http://localhost:14104/minio/health/live > /dev/null 2>&1; then
        print_status "MinIO: Healthy"
    else
        print_error "MinIO: Unhealthy"
        all_healthy=false
    fi

    if [ "$all_healthy" = false ]; then
        return 1
    fi
    return 0
}

check_api_health() {
    # Use readiness endpoint for comprehensive health check (002-REWORK-002)
    local response=$(curl -sf http://localhost:14102/api/health/ready 2>/dev/null)
    if [ $? -eq 0 ]; then
        return 0
    fi
    return 1
}

check_api_liveness() {
    # Use liveness endpoint for fast health check (002-REWORK-002)
    local response=$(curl -sf http://localhost:14102/api/health/live 2>/dev/null)
    if [ $? -eq 0 ]; then
        return 0
    fi
    return 1
}

# Print service URLs
print_service_urls() {
    echo ""
    print_info "Service URLs:"
    echo "  - Frontend:        http://localhost (or configured domain)"
    echo "  - API:             http://localhost:14102/api/v1"
    echo "  - API Health:      http://localhost:14102/api/health"
    echo "  - API Liveness:    http://localhost:14102/api/health/live"
    echo "  - API Readiness:   http://localhost:14102/api/health/ready"
    echo "  - MinIO Console:   http://localhost:14105"
    echo ""
}

# Show status
show_status() {
    print_banner
    cd "$PROJECT_ROOT"

    echo ""
    print_info "Container Status:"
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""

    check_health
}

# View logs
view_logs() {
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" logs -f --tail=100
}

# Check SSL certificate
check_ssl() {
    local ssl_cert="$PROJECT_ROOT/docker/ssl/cert.pem"

    if [ ! -f "$ssl_cert" ]; then
        print_warning "SSL certificate not found at $ssl_cert"
        print_info "Generate certificates with: ./docker/scripts/generate-ssl.sh"
        return 1
    fi

    print_info "SSL Certificate Info:"
    openssl x509 -in "$ssl_cert" -noout -subject -dates 2>/dev/null

    # Check expiry
    local expiry=$(openssl x509 -in "$ssl_cert" -noout -enddate 2>/dev/null | cut -d= -f2)
    local expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null)
    local now_epoch=$(date +%s)
    local days_left=$(( (expiry_epoch - now_epoch) / 86400 ))

    if [ $days_left -lt 30 ]; then
        print_warning "SSL certificate expires in $days_left days!"
    else
        print_status "SSL certificate valid for $days_left days"
    fi
}

# Show help
show_help() {
    echo "Core Application - Production Deployment Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  deploy      - Full deployment (build, migrate, start)"
    echo "  start       - Start production services"
    echo "  stop        - Stop all services (graceful)"
    echo "  restart     - Zero-downtime restart"
    echo "  update      - Update application (pull, build, migrate, restart)"
    echo "  rollback    - Rollback to previous version"
    echo "  status      - Show service status and health"
    echo "  logs        - View production logs"
    echo "  backup      - Create backup"
    echo "  health      - Check all service health"
    echo "  ssl-check   - Check SSL certificate status"
    echo "  help        - Show this help"
    echo ""
}

# Main
case "${1:-help}" in
    deploy)
        deploy
        ;;
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    update)
        update
        ;;
    rollback)
        rollback
        ;;
    status)
        show_status
        ;;
    logs)
        view_logs
        ;;
    backup)
        create_backup
        ;;
    health)
        check_health
        ;;
    ssl-check)
        check_ssl
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
