# Core Application - Docker Deployment Guide

Complete deployment documentation for containerized deployment of the Core Application.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Environment](#development-environment)
- [Production Deployment](#production-deployment)
- [Configuration Reference](#configuration-reference)
- [Service Details](#service-details)
- [Operations Guide](#operations-guide)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Core Application is a full-stack application consisting of:

| Component | Technology | Description |
|-----------|------------|-------------|
| **Frontend** | React 18 + Vite + Nginx | Single Page Application with responsive design |
| **Backend API** | NestJS 10 (Node.js 20) | RESTful API with JWT authentication, MFA, RBAC |
| **Database** | PostgreSQL 15 | Primary data store with migrations |
| **Cache/Queue** | Redis 7 | Session management, email queue, rate limiting |
| **Object Storage** | MinIO | S3-compatible file storage |

### Port Allocation

| Service | Development | Docker (Internal) | Docker (External) |
|---------|-------------|-------------------|-------------------|
| Frontend | 3000 | 80/443 | 14100 |
| Backend API | 14102 | 14102 | 14102 |
| PostgreSQL | 5432 | 5432 | 14101 |
| Redis | 6379 | 6379 | 14103 |
| MinIO API | 9000 | 9000 | 14104 |
| MinIO Console | 9001 | 9001 | 14105 |
| Adminer (dev) | - | 8080 | 14106 |
| Redis Commander (dev) | - | 8081 | 14107 |

---

## Architecture

```
                                    ┌─────────────────────────────────────────────────────────┐
                                    │                     Docker Network                      │
                                    │                   core-app-network                      │
                                    │                                                         │
    ┌──────────┐                    │   ┌───────────┐       ┌──────────────┐                 │
    │  Users   │───HTTP/HTTPS──────▶│   │  Nginx    │──────▶│  NestJS API  │                 │
    │          │                    │   │  Frontend │       │  (14102)     │                 │
    └──────────┘                    │   │  (80/443) │       └──────┬───────┘                 │
                                    │   └───────────┘              │                         │
                                    │                              │                         │
                                    │         ┌────────────────────┼────────────────────┐   │
                                    │         │                    │                    │   │
                                    │         ▼                    ▼                    ▼   │
                                    │   ┌───────────┐       ┌───────────┐       ┌─────────┐│
                                    │   │PostgreSQL │       │   Redis   │       │  MinIO  ││
                                    │   │  (5432)   │       │  (6379)   │       │(9000/01)││
                                    │   └───────────┘       └───────────┘       └─────────┘│
                                    │                                                       │
                                    └───────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Required Software

- **Docker** 20.10+ ([Install Docker](https://docs.docker.com/get-docker/))
- **Docker Compose** 2.0+ ([Install Docker Compose](https://docs.docker.com/compose/install/))
- **Git** (for cloning and version control)

### Verify Installation

```bash
docker --version          # Should be 20.10+
docker-compose --version  # Should be 2.0+
```

### System Requirements

| Environment | CPU | RAM | Disk |
|-------------|-----|-----|------|
| Development | 2 cores | 4GB | 10GB |
| Production | 4+ cores | 8GB+ | 50GB+ |

---

## Quick Start

### Development (5 minutes)

```bash
# 1. Clone the repository
cd core-api-infrastructure

# 2. Start development environment
./docker/scripts/dev.sh start

# 3. Access the application
# API:          http://localhost:14102/api/v1
# API Docs:     http://localhost:14102/api/docs
# Health Check: http://localhost:14102/api/health

# 4. Start frontend separately (hot reload)
cd frontend && npm install && npm run dev
# Frontend:     http://localhost:3000
```

### Production (15 minutes)

```bash
# 1. Configure environment
cp .env.docker.example .env
# Edit .env with production values (see Configuration Reference)

# 2. Generate SSL certificates (or use Let's Encrypt)
./docker/ssl/generate-ssl.sh yourdomain.com

# 3. Deploy
./docker/scripts/deploy.sh deploy

# 4. Verify health
./docker/scripts/deploy.sh health
```

---

## Development Environment

### Starting Development Services

```bash
# Start all services (PostgreSQL, Redis, MinIO, API)
./docker/scripts/dev.sh start

# Or use docker-compose directly
docker-compose -f docker-compose.dev.yml up -d
```

### Development Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| API | http://localhost:14102/api/v1 | - |
| API Docs (Swagger) | http://localhost:14102/api/docs | - |
| Health Check | http://localhost:14102/api/health | - |
| MinIO Console | http://localhost:14105 | minioadmin / minioadmin |
| Adminer (DB UI) | http://localhost:14106 | postgres / devpassword123 |
| Redis Commander | http://localhost:14107 | - |

### Development Commands

```bash
# View logs
./docker/scripts/dev.sh logs         # All services
./docker/scripts/dev.sh logs-api     # API only

# Database operations
./docker/scripts/dev.sh migrate      # Run migrations
./docker/scripts/dev.sh seed         # Run seeds
./docker/scripts/dev.sh reset-db     # Reset database

# Shell access
./docker/scripts/dev.sh shell        # API container shell
./docker/scripts/dev.sh db           # PostgreSQL shell
./docker/scripts/dev.sh redis        # Redis CLI

# Service management
./docker/scripts/dev.sh stop         # Stop services
./docker/scripts/dev.sh restart      # Restart services
./docker/scripts/dev.sh status       # Show status
./docker/scripts/dev.sh clean        # Remove all containers/volumes
```

### Frontend Development

The frontend runs separately for hot module replacement (HMR):

```bash
cd frontend
npm install
npm run dev
# Access: http://localhost:3000
```

### Development Features

- **Hot Reload**: Code changes in `backend/src/` are automatically detected
- **Debug Port**: Node.js debugger available on port 9229
- **Swagger**: API documentation enabled at `/api/docs`
- **Verbose Logging**: Debug-level logs for easier development
- **Relaxed Rate Limits**: 1000 requests/minute (vs 100 in production)

---

## Production Deployment

### Step 1: Configure Environment

```bash
# Copy example environment file
cp .env.docker.example .env

# Edit with production values
nano .env
```

**Required Environment Variables:**

```env
# SECURITY - REQUIRED (generate with: openssl rand -base64 32)
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_here
DB_PASSWORD=your_secure_database_password

# EMAIL - REQUIRED for email functionality
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM_ADDRESS=noreply@yourdomain.com

# STORAGE - REQUIRED (change from defaults!)
MINIO_ACCESS_KEY=your_minio_access_key
MINIO_SECRET_KEY=your_minio_secret_key
```

### Step 2: SSL Certificates

#### Option A: Self-Signed (Testing)

```bash
./docker/ssl/generate-ssl.sh yourdomain.com
```

#### Option B: Let's Encrypt (Production)

```bash
# Using certbot
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/ssl/key.pem
chmod 644 docker/ssl/cert.pem
chmod 600 docker/ssl/key.pem
```

See `docker/ssl/README.md` for detailed SSL configuration options.

### Step 3: Deploy

```bash
# Full deployment (build, migrate, start)
./docker/scripts/deploy.sh deploy
```

### Step 4: Verify Deployment

```bash
# Check all service health
./docker/scripts/deploy.sh health

# Check service status
./docker/scripts/deploy.sh status

# View logs
./docker/scripts/deploy.sh logs
```

### Production Commands

```bash
# Deployment
./docker/scripts/deploy.sh deploy     # Full deployment
./docker/scripts/deploy.sh update     # Update application (git pull, rebuild, migrate)
./docker/scripts/deploy.sh restart    # Zero-downtime restart

# Operations
./docker/scripts/deploy.sh start      # Start services
./docker/scripts/deploy.sh stop       # Stop services (graceful)
./docker/scripts/deploy.sh status     # Show status and health
./docker/scripts/deploy.sh health     # Health check only

# Backup & Recovery
./docker/scripts/deploy.sh backup     # Create backup
./docker/scripts/deploy.sh rollback   # Rollback from backup

# SSL
./docker/scripts/deploy.sh ssl-check  # Check certificate status
```

---

## Configuration Reference

### Complete Environment Variables

```env
# =====================================
# APPLICATION
# =====================================
NODE_ENV=production                    # development | staging | production
APP_PORT=14102                         # Internal API port
APP_URL=http://localhost:14102         # External API URL
FRONTEND_URL=http://localhost:14100    # Frontend URL for CORS

# =====================================
# DATABASE (PostgreSQL)
# =====================================
DB_USER=postgres
DB_PASSWORD=your_secure_password       # REQUIRED - change this!
DB_NAME=core_app
DB_SSL=false                           # Enable for production with SSL
DB_POOL_MAX=20                         # Max connection pool size
DB_POOL_IDLE_TIMEOUT_MS=30000
DB_POOL_CONNECTION_TIMEOUT_MS=2000
DB_EXTERNAL_PORT=14101                 # External access port

# =====================================
# JWT AUTHENTICATION
# =====================================
JWT_SECRET=minimum_32_characters_here  # REQUIRED - generate with: openssl rand -base64 32
JWT_EXPIRES_IN=24h                     # Access token expiry
JWT_REFRESH_EXPIRES_IN=30d             # Refresh token expiry
JWT_ACCESS_EXPIRY=15m                  # Short-lived access (with Remember Me)
JWT_REFRESH_EXPIRY_SHORT=24h           # Without Remember Me
JWT_REFRESH_EXPIRY_LONG=30d            # With Remember Me

# =====================================
# PASSWORD SECURITY
# =====================================
BCRYPT_ROUNDS=12                       # 10-14 recommended (higher = slower)

# =====================================
# EMAIL (Resend.com)
# =====================================
RESEND_API_KEY=re_your_api_key         # REQUIRED for emails
EMAIL_FROM_NAME=Core Application
EMAIL_FROM_ADDRESS=noreply@domain.com  # REQUIRED - your verified domain
SUPPORT_EMAIL=support@domain.com

# Email Queue
EMAIL_QUEUE_ENABLED=true
EMAIL_QUEUE_PROCESS_INTERVAL=5000      # Process every 5 seconds
EMAIL_RETRY_MAX=3
EMAIL_RATE_LIMIT=60                    # Max emails per minute

# =====================================
# RATE LIMITING
# =====================================
RATE_LIMIT_MAX=100                     # Requests per window
RATE_LIMIT_WINDOW_MS=60000             # Window size (1 minute)

# =====================================
# MINIO OBJECT STORAGE
# =====================================
MINIO_ACCESS_KEY=your_access_key       # REQUIRED - change from default!
MINIO_SECRET_KEY=your_secret_key       # REQUIRED - change from default!
MINIO_USE_SSL=false
MINIO_BUCKET_UPLOADS=uploads
MINIO_BUCKET_LOGOS=logos
MINIO_BUCKET_FEEDBACK=feedback

# =====================================
# LOGGING
# =====================================
LOG_LEVEL=info                         # debug | info | warn | error
LOG_MAX_FILES=30d                      # Retention period
LOG_MAX_SIZE=50m                       # Max file size

# =====================================
# MFA (Multi-Factor Authentication)
# =====================================
MFA_ISSUER=CoreApp                     # Shown in authenticator apps
MFA_TEMP_TOKEN_EXPIRY=300              # 5 minutes for MFA verification
MFA_LOCKOUT_DURATION=900               # 15 minutes after failed attempts
MFA_MAX_ATTEMPTS=5

# =====================================
# SWAGGER
# =====================================
SWAGGER_ENABLED=false                  # Disable in production

# =====================================
# AUDIT & FEATURES
# =====================================
AUDIT_LOG_ENABLED=true
AUDIT_LOG_API_REQUESTS=false           # Enable for detailed logging
FEATURE_CACHE_TTL_MS=60000             # Feature toggle cache
SETTINGS_CACHE_TTL_MS=60000            # Settings cache

# =====================================
# BACKUP
# =====================================
BACKUP_RETENTION_DAYS=30               # How long to keep backups
```

---

## Service Details

### Frontend (React + Nginx)

**Dockerfile**: `frontend/Dockerfile` (multi-stage)
- **Build stage**: Node.js 20 Alpine, Vite build
- **Production stage**: Nginx Alpine with SPA configuration

**Configuration files**:
- `frontend/nginx.conf` - Development nginx config
- `docker/nginx/nginx.prod.conf` - Production nginx config with SSL

**Features**:
- Gzip compression
- Static asset caching (1 year)
- Security headers (X-Frame-Options, CSP, etc.)
- SPA routing fallback
- Rate limiting (10 req/s general, 30 req/s API)

### Backend API (NestJS)

**Dockerfile**: `backend/Dockerfile` (multi-stage)
- **Build stage**: TypeScript compilation with NestJS CLI
- **Production stage**: Node.js 20 Alpine, non-root user

**Dockerfile.dev**: `backend/Dockerfile.dev`
- Hot reload with ts-node-dev
- Debug port 9229 exposed

**Key modules**:
- Authentication (JWT, MFA, Password Reset)
- User Management (CRUD, Roles, Permissions)
- Email Service (Resend.com, Queue)
- File Storage (MinIO)
- Settings (Theme, Security, Features)

### PostgreSQL

**Image**: `postgres:15-alpine`
**Configuration**: `docker/postgres/postgresql.conf`

**Key settings**:
- `max_connections = 200`
- `shared_buffers = 512MB`
- `effective_cache_size = 1536MB`
- Autovacuum enabled
- Logging for slow queries (>1s)

### Redis

**Image**: `redis:7-alpine`
**Configuration**: `docker/redis/redis.conf`

**Key settings**:
- `maxmemory = 512mb`
- `maxmemory-policy = allkeys-lru`
- AOF persistence enabled
- RDB snapshots

### MinIO

**Image**: `minio/minio:latest`

**Buckets**:
- `uploads` - User file uploads
- `logos` - Company/app logos
- `feedback` - Feedback attachments

---

## Operations Guide

### Backup & Restore

#### Automated Backups

```bash
# Full backup (database + files)
./docker/scripts/backup.sh full

# Database only
./docker/scripts/backup.sh db

# Files only (MinIO)
./docker/scripts/backup.sh files

# List available backups
./docker/scripts/backup.sh list

# Show backup status
./docker/scripts/backup.sh status
```

#### Schedule Automated Backups

```bash
# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /path/to/core-api-infrastructure/docker/scripts/backup.sh full
```

#### Restore from Backup

```bash
# Restore database
./docker/scripts/backup.sh restore-db

# Or restore specific backup
./docker/scripts/backup.sh restore-db db_20241212_020000.sql.gz
```

### Database Migrations

```bash
# Production migrations
docker-compose -f docker-compose.prod.yml exec resource-api npm run db:migrate:prod

# Check migration status
docker-compose -f docker-compose.prod.yml exec resource-api npm run db:status:prod

# Rollback last migration
docker-compose -f docker-compose.prod.yml exec resource-api npm run db:rollback:prod

# Seed database
docker-compose -f docker-compose.prod.yml exec resource-api npm run db:seed:prod
```

### Monitoring

#### Health Checks

All services include Docker health checks:

```bash
# API health endpoint
curl http://localhost:14102/api/health

# Response example:
{
  "status": "ok",
  "timestamp": "2024-12-12T12:00:00.000Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "email": "healthy",
    "storage": "healthy"
  }
}
```

#### Log Aggregation

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service
docker-compose -f docker-compose.prod.yml logs -f resource-api

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs -f --tail=100
```

### SSL Certificate Management

```bash
# Check certificate status
./docker/scripts/deploy.sh ssl-check

# Renew Let's Encrypt certificate
certbot renew --quiet
docker-compose -f docker-compose.prod.yml restart frontend
```

---

## Troubleshooting

### Common Issues

#### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs resource-api

# Check if ports are in use
netstat -tulpn | grep -E '14100|14101|14102|14103|14104'

# Restart service
docker-compose -f docker-compose.prod.yml restart resource-api
```

#### Database Connection Failed

```bash
# Check PostgreSQL status
docker exec core-app-postgres-prod pg_isready -U postgres

# Check connection from API container
docker exec core-app-api-prod node -e "require('pg').Client().connect()"

# View PostgreSQL logs
docker logs core-app-postgres-prod
```

#### API Health Check Failing

```bash
# Direct health check
curl -v http://localhost:14102/api/health

# Check internal connectivity
docker exec core-app-api-prod wget -qO- http://localhost:14102/api/health

# Restart API
docker-compose -f docker-compose.prod.yml restart resource-api
```

#### Permission Denied Errors

```bash
# Fix log directory permissions
sudo chown -R 1001:1001 logs/

# Fix SSL permissions
chmod 644 docker/ssl/cert.pem
chmod 600 docker/ssl/key.pem
```

### Debug Mode

```bash
# Enable debug logging
# Edit .env and set:
LOG_LEVEL=debug

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build resource-api
```

### Reset Everything

```bash
# WARNING: This deletes all data!
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d
```

---

## File Structure

```
core-api-infrastructure/
├── backend/
│   ├── Dockerfile           # Production multi-stage build
│   ├── Dockerfile.dev       # Development with hot reload
│   ├── src/                 # NestJS source code
│   ├── templates/           # Email templates
│   └── locales/             # i18n translations
├── frontend/
│   ├── Dockerfile           # Production multi-stage build
│   ├── nginx.conf           # Development nginx config
│   └── src/                 # React source code
├── docker/
│   ├── nginx/
│   │   └── nginx.prod.conf  # Production nginx with SSL
│   ├── postgres/
│   │   └── postgresql.conf  # PostgreSQL tuning
│   ├── redis/
│   │   └── redis.conf       # Redis configuration
│   ├── ssl/
│   │   ├── generate-ssl.sh  # Self-signed cert generator
│   │   └── README.md        # SSL documentation
│   └── scripts/
│       ├── dev.sh           # Development helper script
│       ├── deploy.sh        # Production deployment script
│       └── backup.sh        # Backup/restore script
├── docker-compose.yml       # Main compose file
├── docker-compose.dev.yml   # Development overrides
├── docker-compose.prod.yml  # Production configuration
├── .env.docker.example      # Environment template
└── DEPLOYMENT.md            # This file
```

---

## Security Checklist

Before going to production, ensure:

- [ ] Changed `DB_PASSWORD` from default
- [ ] Generated strong `JWT_SECRET` (32+ characters)
- [ ] Changed `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY`
- [ ] Configured valid `RESEND_API_KEY`
- [ ] Set `SWAGGER_ENABLED=false`
- [ ] Configured SSL certificates
- [ ] Set `NODE_ENV=production`
- [ ] Reviewed rate limiting settings
- [ ] Configured backup schedule
- [ ] Set up log rotation
- [ ] Configured firewall rules

---

## Support

- **Health Check**: http://localhost:14102/api/health
- **API Documentation**: http://localhost:14102/api/docs (dev only)
- **Logs**: `./docker/scripts/deploy.sh logs`

For issues, check the troubleshooting section or review service logs.
