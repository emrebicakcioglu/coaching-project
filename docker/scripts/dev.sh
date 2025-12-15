#!/bin/bash
# ======================================
# Core Application - Development Script
# ======================================
# Quick start script for development environment
#
# Usage:
#   ./docker/scripts/dev.sh [command]
#
# Commands:
#   start     - Start all development services
#   stop      - Stop all services
#   restart   - Restart all services
#   logs      - View logs (follow mode)
#   logs-api  - View API logs only
#   shell     - Open shell in API container
#   db        - Open psql shell in database
#   redis     - Open redis-cli
#   migrate   - Run database migrations
#   seed      - Run database seeds
#   reset-db  - Reset database (drop, create, migrate, seed)
#   clean     - Stop and remove all containers/volumes
#   status    - Show service status
#
# ======================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Docker compose file
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.dev.yml"

# Functions
print_header() {
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}  Core Application - Development${NC}"
    echo -e "${BLUE}======================================${NC}"
}

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

wait_for_healthy() {
    local service=$1
    local max_attempts=60
    local attempt=0

    print_status "Waiting for $service to be healthy..."

    while [ $attempt -lt $max_attempts ]; do
        if docker-compose -f "$COMPOSE_FILE" ps | grep -q "$service.*healthy"; then
            print_status "$service is healthy!"
            return 0
        fi
        sleep 2
        attempt=$((attempt + 1))
        echo -n "."
    done

    print_error "$service failed to become healthy after $max_attempts attempts"
    return 1
}

start_services() {
    print_header
    print_status "Starting development services..."

    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" up -d

    echo ""
    print_status "Services starting. Waiting for health checks..."
    sleep 5

    echo ""
    print_status "Service URLs:"
    echo "  - API:             http://localhost:14102/api/v1"
    echo "  - API Docs:        http://localhost:14102/api/docs"
    echo "  - API Health:      http://localhost:14102/api/health"
    echo "  - Frontend (dev):  http://localhost:3000 (run 'cd frontend && npm run dev')"
    echo "  - PostgreSQL:      localhost:14101"
    echo "  - Redis:           localhost:14103"
    echo "  - MinIO Console:   http://localhost:14105 (minioadmin/minioadmin)"
    echo "  - Adminer (DB UI): http://localhost:14106"
    echo "  - Redis Commander: http://localhost:14107"
    echo ""
    print_status "Run './docker/scripts/dev.sh logs' to view logs"
}

stop_services() {
    print_status "Stopping services..."
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" stop
    print_status "Services stopped"
}

restart_services() {
    print_status "Restarting services..."
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" restart
    print_status "Services restarted"
}

view_logs() {
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" logs -f
}

view_api_logs() {
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" logs -f resource-api
}

open_shell() {
    print_status "Opening shell in API container..."
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" exec resource-api sh
}

open_db() {
    print_status "Opening PostgreSQL shell..."
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" exec postgres psql -U postgres -d core_app_dev
}

open_redis() {
    print_status "Opening Redis CLI..."
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" exec redis redis-cli
}

run_migrations() {
    print_status "Running database migrations..."
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" exec resource-api npm run db:migrate
    print_status "Migrations complete"
}

run_seeds() {
    print_status "Running database seeds..."
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" exec resource-api npm run db:seed
    print_status "Seeds complete"
}

reset_database() {
    print_warning "This will DELETE all data in the development database!"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Resetting database..."
        cd "$PROJECT_ROOT"
        docker-compose -f "$COMPOSE_FILE" exec resource-api npm run db:reset
        print_status "Database reset complete"
    else
        print_status "Cancelled"
    fi
}

clean_all() {
    print_warning "This will remove all containers, volumes, and data!"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleaning up..."
        cd "$PROJECT_ROOT"
        docker-compose -f "$COMPOSE_FILE" down -v --remove-orphans
        print_status "Cleanup complete"
    else
        print_status "Cancelled"
    fi
}

show_status() {
    cd "$PROJECT_ROOT"
    echo ""
    print_status "Service Status:"
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""
}

show_help() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start     - Start all development services"
    echo "  stop      - Stop all services"
    echo "  restart   - Restart all services"
    echo "  logs      - View logs (follow mode)"
    echo "  logs-api  - View API logs only"
    echo "  shell     - Open shell in API container"
    echo "  db        - Open psql shell in database"
    echo "  redis     - Open redis-cli"
    echo "  migrate   - Run database migrations"
    echo "  seed      - Run database seeds"
    echo "  reset-db  - Reset database (drop, create, migrate, seed)"
    echo "  clean     - Stop and remove all containers/volumes"
    echo "  status    - Show service status"
    echo ""
}

# Main
case "${1:-start}" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    logs)
        view_logs
        ;;
    logs-api)
        view_api_logs
        ;;
    shell)
        open_shell
        ;;
    db)
        open_db
        ;;
    redis)
        open_redis
        ;;
    migrate)
        run_migrations
        ;;
    seed)
        run_seeds
        ;;
    reset-db)
        reset_database
        ;;
    clean)
        clean_all
        ;;
    status)
        show_status
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
