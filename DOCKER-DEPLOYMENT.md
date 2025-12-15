# Docker Deployment Guide

Complete guide for deploying the Core Application using Docker.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [Configuration](#configuration)
- [Service Architecture](#service-architecture)
- [Port Reference](#port-reference)
- [Health Checks](#health-checks)
- [Backup & Restore](#backup--restore)
- [Monitoring & Logs](#monitoring--logs)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

## Prerequisites

### Required Software

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- OpenSSL (for SSL certificate generation)

### System Requirements

| Environment | CPU | RAM | Storage |
|-------------|-----|-----|---------|
| Development | 2 cores | 4 GB | 10 GB |
| Production | 4+ cores | 8+ GB | 50+ GB |

### Verify Installation

```bash
docker --version
docker-compose --version
```

## Quick Start

### Development (Fastest)

```bash
# 1. Clone repository
git clone <repository-url>
cd core-api-infrastructure

# 2. Start development environment
docker-compose -f docker-compose.dev.yml up -d

# 3. Run migrations
docker-compose -f docker-compose.dev.yml exec resource-api npm run db:migrate

# 4. Seed database
docker-compose -f docker-compose.dev.yml exec resource-api npm run db:seed

# 5. Access services
# API:      http://localhost:14102/api/v1
# Swagger:  http://localhost:14102/api/docs
# Adminer:  http://localhost:14106
```

### Production

```bash
# 1. Configure environment
cp .env.docker.example .env
# Edit .env with production values

# 2. Generate SSL certificates
./docker/ssl/generate-ssl.sh yourdomain.com

# 3. Deploy
./docker/scripts/deploy.sh deploy
```

## Development Setup

### Using Development Compose File

The development configuration includes:
- Hot reloading for API changes
- Debug port (9229) for Node.js debugging
- Adminer (database UI)
- Redis Commander (Redis UI)
- Relaxed rate limits

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f resource-api

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### Using Development Script

```bash
# Start
./docker/scripts/dev.sh start

# Available commands
./docker/scripts/dev.sh status    # Show service status
./docker/scripts/dev.sh logs      # View all logs
./docker/scripts/dev.sh logs-api  # View API logs only
./docker/scripts/dev.sh shell     # Open API container shell
./docker/scripts/dev.sh db        # Open PostgreSQL shell
./docker/scripts/dev.sh redis     # Open Redis CLI
./docker/scripts/dev.sh migrate   # Run migrations
./docker/scripts/dev.sh seed      # Run database seeds
./docker/scripts/dev.sh reset-db  # Reset database
./docker/scripts/dev.sh clean     # Remove all containers/volumes
```

### Frontend Development

The frontend runs locally for faster development:

```bash
cd frontend
npm install
npm run dev
# Access at http://localhost:3000
```

## Production Deployment

### 1. Configure Environment

```bash
# Copy example configuration
cp .env.docker.example .env

# Edit with production values
nano .env
```

**Required Production Settings:**

```env
# REQUIRED - Database
DB_PASSWORD=<strong-password>

# REQUIRED - JWT
JWT_SECRET=<minimum-32-character-secret>

# REQUIRED - Email
RESEND_API_KEY=re_<your-api-key>
EMAIL_FROM_ADDRESS=noreply@yourdomain.com

# REQUIRED - MinIO
MINIO_ACCESS_KEY=<strong-access-key>
MINIO_SECRET_KEY=<strong-secret-key>

# Production settings
NODE_ENV=production
SWAGGER_ENABLED=false
AUDIT_LOG_API_REQUESTS=false
```

### 2. SSL Certificates

**Option A: Self-signed (testing)**

```bash
./docker/ssl/generate-ssl.sh yourdomain.com
```

**Option B: Let's Encrypt (production)**

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Link certificates
sudo ln -sf /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/ssl/cert.pem
sudo ln -sf /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/ssl/key.pem
```

### 3. Deploy

```bash
# Full deployment
./docker/scripts/deploy.sh deploy

# Or step by step
./docker/scripts/deploy.sh backup   # Create backup first
./docker/scripts/deploy.sh start    # Start services
./docker/scripts/deploy.sh health   # Verify health
```

### 4. Verify Deployment

```bash
# Check service status
./docker/scripts/deploy.sh status

# Check health endpoints
curl http://localhost:14102/api/health
curl https://yourdomain.com/health

# View logs
./docker/scripts/deploy.sh logs
```

## Configuration

### Environment Variables

See `.env.docker.example` for all available options. Key categories:

| Category | Variables | Description |
|----------|-----------|-------------|
| Database | `DB_USER`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL credentials |
| JWT | `JWT_SECRET`, `JWT_EXPIRES_IN` | Authentication tokens |
| Email | `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS` | Email service |
| MinIO | `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` | Object storage |
| Logging | `LOG_LEVEL`, `LOG_MAX_FILES` | Log configuration |
| MFA | `MFA_ISSUER`, `MFA_TEMP_TOKEN_EXPIRY` | Multi-factor auth |

### Docker Compose Files

| File | Purpose | Use Case |
|------|---------|----------|
| `docker-compose.yml` | Standard development | General use |
| `docker-compose.dev.yml` | Development with extras | Hot reload, debug |
| `docker-compose.prod.yml` | Production optimized | Deployment |

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        External Traffic                          │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Nginx (14100)  │
                    │  Frontend + SSL │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │   API       │  │  PostgreSQL │  │    Redis    │
    │  (14102)    │──│   (14101)   │──│   (14103)   │
    │   NestJS    │  │             │  │             │
    └──────┬──────┘  └─────────────┘  └─────────────┘
           │
           ▼
    ┌─────────────┐
    │    MinIO    │
    │  (14104/05) │
    │   Storage   │
    └─────────────┘
```

### Service Dependencies

```
frontend
  └── resource-api (healthy)
        ├── postgres (healthy)
        ├── redis (healthy)
        └── minio (healthy)
```

## Port Reference

| Service | Internal | External | URL |
|---------|----------|----------|-----|
| Frontend (HTTP) | 80 | 14100 | http://localhost:14100 |
| Frontend (HTTPS) | 443 | 443 | https://localhost |
| API | 14102 | 14102 | http://localhost:14102/api/v1 |
| PostgreSQL | 5432 | 14101 | localhost:14101 |
| Redis | 6379 | 14103 | localhost:14103 |
| MinIO API | 9000 | 14104 | http://localhost:14104 |
| MinIO Console | 9001 | 14105 | http://localhost:14105 |
| Adminer (dev) | 8080 | 14106 | http://localhost:14106 |
| Redis Commander (dev) | 8081 | 14107 | http://localhost:14107 |

## Health Checks

### API Health Endpoint

```bash
curl http://localhost:14102/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "minio": "healthy"
  }
}
```

### Container Health

```bash
# Check all containers
docker-compose -f docker-compose.prod.yml ps

# Check specific service
docker inspect --format='{{.State.Health.Status}}' core-app-api-prod
```

### Automated Health Checks

All containers include built-in health checks:

| Service | Check | Interval | Timeout |
|---------|-------|----------|---------|
| API | HTTP /api/health | 30s | 10s |
| PostgreSQL | pg_isready | 10s | 5s |
| Redis | redis-cli ping | 10s | 5s |
| MinIO | HTTP /minio/health/live | 30s | 20s |
| Frontend | HTTP /health | 30s | 10s |

## Backup & Restore

### Automated Backups

```bash
# Full backup (database + files)
./docker/scripts/backup.sh full

# Database only
./docker/scripts/backup.sh db

# MinIO files only
./docker/scripts/backup.sh files

# List backups
./docker/scripts/backup.sh list

# Show backup status
./docker/scripts/backup.sh status
```

### Scheduled Backups (Cron)

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/core-api-infrastructure/docker/scripts/backup.sh full
```

### Restore from Backup

```bash
# List available backups
./docker/scripts/backup.sh list

# Restore database
./docker/scripts/backup.sh restore-db db_20240115_020000.sql.gz
```

### Backup Retention

Default retention is 30 days. Configure with:

```bash
export BACKUP_RETENTION_DAYS=60
./docker/scripts/backup.sh cleanup
```

## Monitoring & Logs

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f resource-api

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 resource-api
```

### Application Logs

Application logs are stored in `./logs/`:

```bash
# View combined log
tail -f logs/combined-*.log

# View error log
tail -f logs/error-*.log
```

### Resource Monitoring

```bash
# Container stats
docker stats

# Specific container
docker stats core-app-api-prod
```

## Troubleshooting

### Common Issues

#### 1. Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs resource-api

# Check health
docker inspect core-app-api-prod | grep -A 20 Health
```

#### 2. Database Connection Failed

```bash
# Verify PostgreSQL is running
docker-compose -f docker-compose.prod.yml ps postgres

# Test connection
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Check credentials
docker-compose -f docker-compose.prod.yml exec resource-api printenv | grep DB_
```

#### 3. Port Already in Use

```bash
# Find process using port
lsof -i :14102

# Kill process or change port in .env
```

#### 4. Permission Denied

```bash
# Fix log directory permissions
sudo chown -R $USER:$USER logs/
chmod 755 logs/
```

#### 5. Out of Disk Space

```bash
# Check Docker disk usage
docker system df

# Clean up
docker system prune -a --volumes
```

### Debug Mode

Enable debug logging:

```bash
# In .env
LOG_LEVEL=debug
AUDIT_LOG_API_REQUESTS=true

# Restart
docker-compose -f docker-compose.prod.yml restart resource-api
```

### Reset Everything

```bash
# Stop and remove all containers, volumes, networks
docker-compose -f docker-compose.prod.yml down -v --remove-orphans

# Remove images
docker-compose -f docker-compose.prod.yml down --rmi all

# Fresh start
./docker/scripts/deploy.sh deploy
```

## Security Best Practices

### 1. Secrets Management

- Never commit `.env` file
- Use strong, unique passwords
- Rotate credentials periodically
- Consider using Docker secrets for production

### 2. Network Security

- Use firewall to restrict port access
- Only expose necessary ports
- Use SSL/TLS for all external traffic

### 3. Container Security

- Run containers as non-root user
- Keep images updated
- Scan images for vulnerabilities
- Use read-only file systems where possible

### 4. Database Security

- Use strong passwords (20+ characters)
- Enable SSL for database connections
- Regular backups with encryption
- Limit database user permissions

### 5. Monitoring

- Enable audit logging
- Monitor failed login attempts
- Set up alerts for anomalies
- Regular security audits

### Firewall Rules (UFW Example)

```bash
# Allow SSH
sudo ufw allow 22

# Allow HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Deny direct database access (optional)
sudo ufw deny 14101
sudo ufw deny 14103
sudo ufw deny 14104

# Enable firewall
sudo ufw enable
```

---

## Support

For issues or questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review container logs
3. Check the health endpoints
4. Open an issue on GitHub

## License

This project is licensed under the MIT License.
