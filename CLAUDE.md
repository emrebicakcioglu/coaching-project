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

## Design System - CSS Variables

This application uses a dynamic theming system with CSS custom properties. **NEVER use hardcoded Tailwind color classes** like `bg-primary-600`, `text-neutral-300`, `border-red-200`, etc. Always use CSS variables via Tailwind's arbitrary value syntax.

### Available CSS Variables

#### Colors
| Variable | Description |
|----------|-------------|
| `--color-primary` | Primary brand color |
| `--color-primary-hover` | Primary color hover state |
| `--color-primary-light` | Light variant of primary |
| `--color-secondary` | Secondary brand color |
| `--color-accent` | Accent color |

#### Backgrounds
| Variable | Description |
|----------|-------------|
| `--color-background-page` | Page background |
| `--color-background-card` | Card/panel background |
| `--color-background-sidebar` | Sidebar background |
| `--color-background-modal` | Modal background |
| `--color-background-input` | Input field background |
| `--color-background-surface` | Surface/hover background |

#### Text Colors
| Variable | Description |
|----------|-------------|
| `--color-text-primary` | Primary text color |
| `--color-text-secondary` | Secondary text color |
| `--color-text-muted` | Muted/placeholder text |
| `--color-text-inverse` | Inverse text (for buttons) |
| `--color-text-link` | Link text color |
| `--color-text-tertiary` | Tertiary/subtle text |

#### Status Colors
| Variable | Description |
|----------|-------------|
| `--color-success` | Success state |
| `--color-warning` | Warning state |
| `--color-error` | Error state |
| `--color-info` | Info state |
| `--color-status-error-light` | Light error background |

#### Borders
| Variable | Description |
|----------|-------------|
| `--color-border-light` | Light border |
| `--color-border-default` | Default border |
| `--color-border-dark` | Dark border |

### Usage Examples

#### Input Fields
```tsx
// CORRECT - Using CSS variables
<input className="w-full px-3 py-2 bg-[var(--color-background-input)] text-[var(--color-text-primary)] border border-[var(--color-border-default)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] placeholder:text-[var(--color-text-muted)]" />

// WRONG - Using hardcoded Tailwind classes
<input className="border border-neutral-300 focus:ring-primary-500 focus:border-primary-500" />
```

#### Buttons
```tsx
// Primary Button - CORRECT
<button className="bg-[var(--color-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-hover)]">
  Save
</button>

// Cancel/Secondary Button - CORRECT
<button className="text-[var(--color-text-secondary)] hover:bg-[var(--color-background-surface)]">
  Cancel
</button>

// Danger Button - Use status colors
<button className="bg-[var(--color-error)] text-[var(--color-text-inverse)] hover:opacity-90">
  Delete
</button>

// WRONG - Hardcoded colors
<button className="bg-primary-600 hover:bg-primary-700 text-white">Save</button>
```

#### Text
```tsx
// CORRECT
<h1 className="text-[var(--color-text-primary)]">Title</h1>
<p className="text-[var(--color-text-secondary)]">Description</p>
<span className="text-[var(--color-text-muted)]">Hint text</span>

// WRONG
<h1 className="text-neutral-900">Title</h1>
```

#### Containers/Cards
```tsx
// CORRECT - Using inline style for background (required for dynamic updates)
<div style={{ backgroundColor: 'var(--color-background-card)' }} className="rounded-xl p-6 border border-[var(--color-border-default)]">
  Content
</div>

// CORRECT - Using Tailwind arbitrary value
<div className="bg-[var(--color-background-card)] rounded-xl p-6">
  Content
</div>
```

#### Fallback Values
For critical styling, provide fallback values:
```tsx
// With fallback
<div className="text-[var(--color-primary,#3b82f6)]">Text</div>
<div className="bg-[var(--color-status-error-light,#fef2f2)]">Error</div>
```

### Important Notes

1. **Never use hardcoded Tailwind color utilities** like `bg-blue-500`, `text-gray-700`, `border-red-300`
2. **Always use CSS variables** via `var(--color-xxx)` syntax
3. **Use Tailwind's arbitrary value syntax** `[var(--color-xxx)]` for dynamic theming
4. **Backgrounds that need live updates** should use inline `style={{ backgroundColor: 'var(--color-xxx)' }}`
5. **Provide fallback values** for critical UI elements: `var(--color-primary, #3b82f6)`
6. **Focus states** should use `focus:ring-[var(--color-primary)]` and `focus:border-[var(--color-primary)]`
