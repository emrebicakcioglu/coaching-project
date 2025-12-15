#!/bin/bash
# ======================================
# Core Application - Backup Script
# ======================================
# Automated backup script for production data
#
# Usage:
#   ./docker/scripts/backup.sh [command]
#
# Commands:
#   full        - Full backup (database + files)
#   db          - Database backup only
#   files       - MinIO files backup only
#   restore-db  - Restore database from backup
#   list        - List available backups
#   cleanup     - Remove old backups (keep last N)
#
# Schedule with cron:
#   0 2 * * * /path/to/backup.sh full
#
# ======================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_ROOT="$PROJECT_ROOT/backups"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

# Container names
POSTGRES_CONTAINER="core-app-postgres-prod"
MINIO_CONTAINER="core-app-minio-prod"

# Database settings (loaded from .env)
if [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env"
fi

DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-core_app}

# Logging
LOG_FILE="$BACKUP_ROOT/backup.log"
mkdir -p "$BACKUP_ROOT"

log() {
    local level=$1
    shift
    local message="$@"
    local ts=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${ts} [${level}] ${message}" | tee -a "$LOG_FILE"
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

# Check if container is running
check_container() {
    local container=$1
    if ! docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        print_error "Container $container is not running"
        return 1
    fi
    return 0
}

# Backup PostgreSQL database
backup_database() {
    print_info "Starting PostgreSQL backup..."

    local backup_dir="$BACKUP_ROOT/postgres"
    mkdir -p "$backup_dir"

    local backup_file="${backup_dir}/db_${TIMESTAMP}.sql"

    if ! check_container "$POSTGRES_CONTAINER"; then
        return 1
    fi

    # Create dump
    print_info "Creating database dump..."
    docker exec -t "$POSTGRES_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" \
        --clean --if-exists --no-owner --no-acl > "$backup_file"

    # Compress
    print_info "Compressing backup..."
    gzip "$backup_file"

    local final_file="${backup_file}.gz"
    local size=$(du -h "$final_file" | cut -f1)

    print_status "Database backup created: $(basename $final_file) ($size)"
    log "INFO" "Database backup: $final_file ($size)"

    return 0
}

# Backup MinIO files
backup_files() {
    print_info "Starting MinIO files backup..."

    local backup_dir="$BACKUP_ROOT/minio"
    mkdir -p "$backup_dir"

    local backup_file="${backup_dir}/files_${TIMESTAMP}.tar"

    if ! check_container "$MINIO_CONTAINER"; then
        return 1
    fi

    # Get MinIO data volume
    local volume_path=$(docker inspect "$MINIO_CONTAINER" --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Source}}{{end}}{{end}}')

    if [ -z "$volume_path" ]; then
        print_warning "Could not determine MinIO data volume path"
        print_info "Using docker cp fallback..."

        # Fallback: copy from container
        docker cp "$MINIO_CONTAINER:/data" "${backup_dir}/minio_data_${TIMESTAMP}"
        tar -cf "$backup_file" -C "${backup_dir}" "minio_data_${TIMESTAMP}"
        rm -rf "${backup_dir}/minio_data_${TIMESTAMP}"
    else
        # Direct volume backup (faster)
        print_info "Backing up from volume: $volume_path"
        tar -cf "$backup_file" -C "$(dirname $volume_path)" "$(basename $volume_path)"
    fi

    # Compress
    print_info "Compressing backup..."
    gzip "$backup_file"

    local final_file="${backup_file}.gz"
    local size=$(du -h "$final_file" | cut -f1)

    print_status "Files backup created: $(basename $final_file) ($size)"
    log "INFO" "Files backup: $final_file ($size)"

    return 0
}

# Full backup
full_backup() {
    print_info "Starting full backup..."
    local start_time=$(date +%s)

    backup_database
    backup_files

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    print_status "Full backup completed in ${duration}s"
    log "INFO" "Full backup completed in ${duration}s"

    # Cleanup old backups
    cleanup_old_backups
}

# Restore database
restore_database() {
    local backup_file=$1

    if [ -z "$backup_file" ]; then
        print_info "Available database backups:"
        echo ""
        list_backups_db
        echo ""
        read -p "Enter backup filename to restore: " backup_file
    fi

    local full_path="$BACKUP_ROOT/postgres/$backup_file"

    if [ ! -f "$full_path" ]; then
        print_error "Backup file not found: $full_path"
        return 1
    fi

    print_warning "This will REPLACE the current database!"
    read -p "Are you sure you want to continue? (y/N) " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Restore cancelled"
        return 0
    fi

    if ! check_container "$POSTGRES_CONTAINER"; then
        return 1
    fi

    print_info "Restoring database from: $backup_file"

    # Decompress and restore
    if [[ "$backup_file" == *.gz ]]; then
        gunzip -c "$full_path" | docker exec -i "$POSTGRES_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME"
    else
        docker exec -i "$POSTGRES_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$full_path"
    fi

    print_status "Database restored successfully"
    log "INFO" "Database restored from: $backup_file"
}

# List available backups
list_backups() {
    print_info "Available backups:"
    echo ""

    echo "=== Database Backups ==="
    list_backups_db
    echo ""

    echo "=== File Backups ==="
    list_backups_files
    echo ""
}

list_backups_db() {
    if [ -d "$BACKUP_ROOT/postgres" ]; then
        ls -lah "$BACKUP_ROOT/postgres"/*.sql.gz 2>/dev/null | awk '{print $9, $5}' | while read file size; do
            echo "  $(basename $file) - $size"
        done
    else
        echo "  No database backups found"
    fi
}

list_backups_files() {
    if [ -d "$BACKUP_ROOT/minio" ]; then
        ls -lah "$BACKUP_ROOT/minio"/*.tar.gz 2>/dev/null | awk '{print $9, $5}' | while read file size; do
            echo "  $(basename $file) - $size"
        done
    else
        echo "  No file backups found"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    print_info "Cleaning up backups older than ${RETENTION_DAYS} days..."

    # Cleanup database backups
    if [ -d "$BACKUP_ROOT/postgres" ]; then
        find "$BACKUP_ROOT/postgres" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete 2>/dev/null
    fi

    # Cleanup file backups
    if [ -d "$BACKUP_ROOT/minio" ]; then
        find "$BACKUP_ROOT/minio" -name "*.tar.gz" -mtime +${RETENTION_DAYS} -delete 2>/dev/null
    fi

    print_status "Cleanup completed"
}

# Show backup status/summary
show_status() {
    print_info "Backup Status"
    echo ""

    echo "Backup Directory: $BACKUP_ROOT"
    echo "Retention Days: $RETENTION_DAYS"
    echo ""

    local db_count=$(ls "$BACKUP_ROOT/postgres"/*.sql.gz 2>/dev/null | wc -l)
    local files_count=$(ls "$BACKUP_ROOT/minio"/*.tar.gz 2>/dev/null | wc -l)
    local total_size=$(du -sh "$BACKUP_ROOT" 2>/dev/null | cut -f1)

    echo "Database backups: $db_count"
    echo "File backups: $files_count"
    echo "Total size: $total_size"
    echo ""

    if [ "$db_count" -gt 0 ]; then
        echo "Latest database backup:"
        ls -t "$BACKUP_ROOT/postgres"/*.sql.gz 2>/dev/null | head -1 | xargs -r basename
    fi

    if [ "$files_count" -gt 0 ]; then
        echo "Latest files backup:"
        ls -t "$BACKUP_ROOT/minio"/*.tar.gz 2>/dev/null | head -1 | xargs -r basename
    fi
}

# Show help
show_help() {
    echo "Core Application - Backup Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  full        - Full backup (database + files)"
    echo "  db          - Database backup only"
    echo "  files       - MinIO files backup only"
    echo "  restore-db  - Restore database from backup"
    echo "  list        - List available backups"
    echo "  cleanup     - Remove old backups"
    echo "  status      - Show backup status"
    echo "  help        - Show this help"
    echo ""
    echo "Environment Variables:"
    echo "  BACKUP_RETENTION_DAYS  - Days to keep backups (default: 30)"
    echo ""
    echo "Cron Example (daily at 2 AM):"
    echo "  0 2 * * * $0 full"
    echo ""
}

# Main
case "${1:-help}" in
    full)
        full_backup
        ;;
    db|database)
        backup_database
        ;;
    files|minio)
        backup_files
        ;;
    restore-db|restore)
        restore_database "$2"
        ;;
    list)
        list_backups
        ;;
    cleanup)
        cleanup_old_backups
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
