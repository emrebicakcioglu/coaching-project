# Core Application - Claude Code Reference

## Quick Start

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

## Services & Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 14100 | http://localhost:14100 |
| PostgreSQL | 14101 | - |
| Backend API | 14102 | http://localhost:14102/api/v1 |
| Redis | 14103 | - |
| MinIO API | 14104 | - |
| MinIO Console | 14105 | http://localhost:14105 |

## Login Credentials

### Test Users (Seeded)

| User | Email | Password | Role | Status |
|------|-------|----------|------|--------|
| Admin | `admin@example.com` | `TestPassword123!` | admin | active |
| Manager | `manager@example.com` | `TestPassword123!` | manager | active |
| Standard User | `user@example.com` | `TestPassword123!` | user | active |
| Viewer | `viewer@example.com` | `TestPassword123!` | viewer | active |
| Inactive | `inactive@example.com` | `TestPassword123!` | user | inactive |

### MinIO Console
- **User:** `minioadmin`
- **Password:** `minioadmin`

### PostgreSQL
- **User:** `postgres`
- **Password:** `your_secure_password_here`
- **Database:** `core_app`

## API Documentation

- **Swagger UI:** http://localhost:14102/api/docs
- **OpenAPI JSON:** http://localhost:14102/api/docs-json

## Frontend Pages

| Route | Description |
|-------|-------------|
| `/login` | Login page |
| `/register` | User registration |
| `/dashboard` | Main dashboard (protected) |
| `/users` | User management (protected) |
| `/roles` | Roles & permissions (protected) |
| `/settings` | User settings (protected) |
| `/settings/security/mfa` | MFA setup (protected) |
| `/help` | Help page (protected) |
| `/forbidden` | Access denied page |

## Development Commands

### Frontend (local development)
```bash
cd frontend
npm install
npm run dev          # Start dev server (port 3000)
npm run build        # Build for production
npm run test         # Run unit tests
npm run test:e2e     # Run Playwright E2E tests
```

### Backend
```bash
cd backend
npm install
npm run start:dev    # Start dev server
npm run build        # Build for production
npm run test         # Run tests
```

### Database Migrations
```bash
docker-compose exec resource-api npm run db:migrate:prod
docker-compose exec resource-api npm run db:seed:prod
docker-compose exec resource-api npm run db:status:prod
```

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Backend:** NestJS, TypeScript
- **Database:** PostgreSQL 15
- **Cache/Queue:** Redis 7
- **Object Storage:** MinIO
- **Container:** Docker, nginx
