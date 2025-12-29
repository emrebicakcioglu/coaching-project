# Core Application - Docker Deployment Guide

Complete Docker containerization and deployment guide for the Core Application.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Docker Network                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐        │
│  │   Frontend   │     │   Backend    │     │  PostgreSQL  │        │
│  │   (Nginx)    │────▶│   (NestJS)   │────▶│     15       │        │
│  │   :80/443    │     │   :14102     │     │   :14101     │        │
│  └──────────────┘     └──────────────┘     └──────────────┘        │
│                              │                                       │
│                              │                                       │
│                       ┌──────┴──────┐                               │
│                       │             │                                │
│                       ▼             ▼                                │
│              ┌──────────────┐ ┌──────────────┐                      │
│              │    Redis     │ │    MinIO     │                      │
│              │      7       │ │   (S3)       │                      │
│              │   :14103     │ │ :14104/14105 │                      │
│              └──────────────┘ └──────────────┘                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Component | Technology | Version | Port (External) |
|-----------|------------|---------|-----------------|
| Frontend | React + Vite + Nginx | 18.2 / 5.0 | 80/443 (prod), 14100 (dev) |
| Backend | NestJS + Node.js | 10.3 / 20 | 14102 |
| Database | PostgreSQL | 15 | 14101 |
| Cache/Queue | Redis | 7 | 14103 |
| Object Storage | MinIO (S3) | latest | 14104 (API), 14105 (Console) |
| DB Admin | Adminer | latest | 14106 (dev only) |
| Redis Admin | Redis Commander | latest | 14107 (dev only) |

## Quick Start

### Development Environment

```bash
# 1. Start all development services
./docker/scripts/dev.sh start

# 2. View logs
./docker/scripts/dev.sh logs

# 3. Run frontend separately (for hot reloading)
cd frontend && npm run dev
```

### Production Deployment

```bash
# 1. Copy and configure environment
cp .env.docker.example .env
# Edit .env with production values (see Configuration section)

# 2. Generate SSL certificates (if needed)
./docker/ssl/generate-ssl.sh

# 3. Deploy
./docker/scripts/deploy.sh deploy
```

## Docker Files

### Dockerfiles

| File | Purpose | Base Image |
|------|---------|------------|
| `backend/Dockerfile` | Production backend | `node:20-alpine` (multi-stage) |
| `backend/Dockerfile.dev` | Development backend with hot reload | `node:20-alpine` |
| `frontend/Dockerfile` | Production frontend | `node:20-alpine` + `nginx:alpine` |

### Docker Compose Files

| File | Environment | Usage |
|------|-------------|-------|
| `docker-compose.dev.yml` | Development | Hot reloading, debug ports, admin tools |
| `docker-compose.prod.yml` | Production | Optimized, SSL, resource limits |
| `docker-compose.yml` | Legacy/Combined | Full stack with all services |

## Health Check Endpoints

The application provides three health check endpoints for container orchestration:

### Endpoints

| Endpoint | Purpose | Response Time | HTTP Codes |
|----------|---------|---------------|------------|
| `GET /api/health` | Full health check | ~100-500ms | 200, 503 |
| `GET /api/health/live` | Liveness probe | < 10ms | 200 |
| `GET /api/health/ready` | Readiness probe | ~50-200ms | 200, 503 |

### Liveness Probe (`/api/health/live`)

Minimal check indicating the application is running. Does **not** check dependencies.

```bash
curl http://localhost:14102/api/health/live
# Response: {"status":"ok"}
```

**Kubernetes Usage:**
```yaml
livenessProbe:
  httpGet:
    path: /api/health/live
    port: 14102
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### Readiness Probe (`/api/health/ready`)

Checks if all critical dependencies (database) are reachable.

```bash
curl http://localhost:14102/api/health/ready
# Response: {"status":"ok","checks":{"database":{"status":"healthy"}}}
```

**Kubernetes Usage:**
```yaml
readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 14102
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 10
  failureThreshold: 3
```

### Full Health Check (`/api/health`)

Comprehensive check including all services.

```bash
curl http://localhost:14102/api/health
# Response:
# {
#   "status": "healthy",
#   "timestamp": "2025-12-28T10:00:00.000Z",
#   "uptime": 3600,
#   "checks": {
#     "database": {"status": "healthy", "responseTime": 5},
#     "smtp": {"status": "healthy", "responseTime": 120},
#     "storage": {"status": "healthy", "responseTime": 15}
#   }
# }
```

## Configuration

### Required Environment Variables

These variables **MUST** be set in production:

```bash
# Database
DB_PASSWORD=<strong-password-min-8-chars>

# JWT Authentication
JWT_SECRET=<random-string-min-32-chars>

# Email (Resend.com)
RESEND_API_KEY=re_<your-api-key>
EMAIL_FROM_ADDRESS=noreply@yourdomain.com

# MinIO Storage
MINIO_ACCESS_KEY=<your-access-key>
MINIO_SECRET_KEY=<your-secret-key>
```

### Complete Environment Reference

See `.env.docker.example` for all available configuration options with descriptions.

#### Generate Secure Values

```bash
# Generate JWT secret (32+ characters)
openssl rand -base64 32

# Generate database password
openssl rand -base64 16

# Generate MinIO keys
openssl rand -base64 20
```

## Deployment Scripts

### `./docker/scripts/dev.sh`

Development environment management.

```bash
./docker/scripts/dev.sh [command]

Commands:
  start     - Start all development services
  stop      - Stop all services
  restart   - Restart all services
  logs      - View logs (follow mode)
  logs-api  - View API logs only
  shell     - Open shell in API container
  db        - Open psql shell in database
  redis     - Open redis-cli
  migrate   - Run database migrations
  seed      - Run database seeds
  reset-db  - Reset database (drop, create, migrate, seed)
  clean     - Stop and remove all containers/volumes
  status    - Show service status
```

### `./docker/scripts/deploy.sh`

Production deployment automation.

```bash
./docker/scripts/deploy.sh [command]

Commands:
  deploy      - Full deployment (build, migrate, start)
  start       - Start production services
  stop        - Stop all services (graceful)
  restart     - Zero-downtime restart
  update      - Update application (pull, build, migrate, restart)
  rollback    - Rollback to previous version
  status      - Show service status and health
  logs        - View production logs
  backup      - Create backup before deployment
  health      - Check all service health
  ssl-check   - Check SSL certificate status
```

### `./docker/scripts/backup.sh`

Backup management.

```bash
./docker/scripts/backup.sh [command]

Commands:
  full        - Full backup (database + files)
  db          - Database backup only
  files       - MinIO files backup only
  restore-db  - Restore database from backup
  list        - List available backups
  cleanup     - Remove old backups (keep last N)
  status      - Show backup status
```

**Cron Example (daily at 2 AM):**
```bash
0 2 * * * /path/to/docker/scripts/backup.sh full
```

## SSL/TLS Configuration

### Self-Signed Certificates (Development)

```bash
./docker/ssl/generate-ssl.sh
```

### Production Certificates

Place your certificates in `./docker/ssl/`:
- `cert.pem` - SSL certificate
- `key.pem` - Private key
- `chain.pem` - Certificate chain (optional, for OCSP stapling)

### Let's Encrypt (Recommended)

```bash
# Using certbot
certbot certonly --standalone -d yourdomain.com

# Copy certificates
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./docker/ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./docker/ssl/key.pem
```

## Database Management

### Migrations

```bash
# Development
./docker/scripts/dev.sh migrate

# Production (inside container)
docker exec -it core-app-api-prod npm run db:migrate:prod

# Check migration status
docker exec -it core-app-api-prod npm run db:status
```

### Backup and Restore

```bash
# Create backup
./docker/scripts/backup.sh db

# List backups
./docker/scripts/backup.sh list

# Restore from backup
./docker/scripts/backup.sh restore-db <backup-filename>
```

## Monitoring

### Service Health

```bash
# Check all services
./docker/scripts/deploy.sh health

# Individual checks
curl http://localhost:14102/api/health/live    # Liveness
curl http://localhost:14102/api/health/ready   # Readiness
curl http://localhost:14102/api/health         # Full health
```

### Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f resource-api
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### Resource Usage

```bash
docker stats
```

## Troubleshooting

### Common Issues

#### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs resource-api

# Verify environment
docker-compose -f docker-compose.prod.yml config

# Check dependencies
./docker/scripts/deploy.sh health
```

#### Database Connection Failed

```bash
# Verify PostgreSQL is running
docker exec core-app-postgres-prod pg_isready -U postgres

# Check connection from API container
docker exec core-app-api-prod node -e "
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.query('SELECT 1').then(() => console.log('OK')).catch(console.error);
"
```

#### Health Check Failing

```bash
# Test endpoints directly
curl -v http://localhost:14102/api/health/live
curl -v http://localhost:14102/api/health/ready

# Check container health
docker inspect --format='{{json .State.Health}}' core-app-api-prod
```

### Container Access

```bash
# API container shell
docker exec -it core-app-api-prod sh

# Database shell
docker exec -it core-app-postgres-prod psql -U postgres -d core_app

# Redis CLI
docker exec -it core-app-redis-prod redis-cli
```

## Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` as template
2. **Use strong passwords** - Minimum 16 characters for production
3. **Rotate JWT secrets** - Change periodically in production
4. **Enable SSL** - Always use HTTPS in production
5. **Limit network exposure** - Only expose necessary ports
6. **Regular backups** - Automate with cron
7. **Keep images updated** - Regular security patches
8. **Resource limits** - Prevent DoS through resource exhaustion

## Resource Limits

Production resource limits (defined in `docker-compose.prod.yml`):

| Service | CPU Limit | Memory Limit | CPU Reserved | Memory Reserved |
|---------|-----------|--------------|--------------|-----------------|
| Frontend | 0.5 | 256M | 0.1 | 64M |
| Backend | 2.0 | 1G | 0.5 | 256M |
| PostgreSQL | 2.0 | 2G | 0.5 | 512M |
| Redis | 1.0 | 512M | 0.1 | 64M |
| MinIO | 1.0 | 1G | 0.2 | 256M |

Adjust based on your workload and available resources.

## Service URLs

### Development

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 (npm run dev) |
| API | http://localhost:14102/api/v1 |
| API Docs | http://localhost:14102/api/docs |
| Health | http://localhost:14102/api/health |
| Liveness | http://localhost:14102/api/health/live |
| Readiness | http://localhost:14102/api/health/ready |
| PostgreSQL | localhost:14101 |
| Redis | localhost:14103 |
| MinIO Console | http://localhost:14105 |
| Adminer | http://localhost:14106 |
| Redis Commander | http://localhost:14107 |

### Production

| Service | URL |
|---------|-----|
| Frontend | https://yourdomain.com |
| API | https://yourdomain.com:14102/api/v1 |
| MinIO Console | https://yourdomain.com:14105 |

---

For more information, see:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment guide
- [DOCKER-DEPLOYMENT.md](./DOCKER-DEPLOYMENT.md) - Docker-specific deployment
- [Backend README](./backend/README.md) - Backend documentation
- [Frontend README](./frontend/README.md) - Frontend documentation
