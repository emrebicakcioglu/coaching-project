# Database Schema Documentation

**STORY-024B: PostgreSQL Schema & Migrations**

This document describes the database schema for the Core Application.

## Overview

The database uses PostgreSQL 16+ with a normalized relational design.

## Tables

### Core Tables

#### `users`

Stores user account information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing user ID |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User's email address |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt password hash |
| name | VARCHAR(255) | NOT NULL | User's display name |
| status | VARCHAR(20) | DEFAULT 'active' | User status: active, inactive, suspended |
| mfa_enabled | BOOLEAN | DEFAULT FALSE | Whether MFA is enabled |
| mfa_secret | VARCHAR(255) | NULL | MFA secret key (encrypted) |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update timestamp (auto-updated) |
| last_login | TIMESTAMP | NULL | Last login timestamp |

**Indexes:**
- `idx_users_email` on `email`
- `idx_users_status` on `status`
- `idx_users_created_at` on `created_at`

**Triggers:**
- `update_users_updated_at` - Automatically updates `updated_at` on row modification

---

#### `roles`

Defines roles that can be assigned to users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing role ID |
| name | VARCHAR(100) | UNIQUE, NOT NULL | Role name (e.g., 'admin', 'user') |
| description | TEXT | NULL | Role description |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Indexes:**
- `idx_roles_name` on `name`

---

#### `permissions`

Defines granular permissions that can be assigned to roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing permission ID |
| name | VARCHAR(100) | UNIQUE, NOT NULL | Permission name (e.g., 'users.create') |
| description | TEXT | NULL | Permission description |
| category | VARCHAR(50) | NULL | Permission category for grouping |

**Indexes:**
- `idx_permissions_name` on `name`
- `idx_permissions_category` on `category`

---

#### `app_settings`

Singleton table for application-wide settings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY DEFAULT 1, CHECK (id = 1) | Always 1 (singleton) |
| company_name | VARCHAR(100) | DEFAULT 'Core App' | Company name |
| app_title | VARCHAR(100) | DEFAULT 'Core Application' | Application title |
| logo_url | VARCHAR(255) | NULL | Logo URL |
| theme_colors | JSONB | DEFAULT '{"primary": "#3B82F6"}' | Theme color configuration |
| features | JSONB | DEFAULT '{"mfa_enabled": true}' | Feature flags |
| maintenance | JSONB | DEFAULT '{"enabled": false}' | Maintenance mode settings |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Constraints:**
- `app_settings_singleton` CHECK (id = 1) - Ensures only one row exists

**Triggers:**
- `update_app_settings_updated_at` - Automatically updates `updated_at` on row modification

---

#### `refresh_tokens`

Stores refresh tokens for JWT authentication.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing token ID |
| user_id | INTEGER | NOT NULL, FK users(id) ON DELETE CASCADE | Associated user |
| token_hash | VARCHAR(255) | NOT NULL | SHA-256 hash of the token |
| expires_at | TIMESTAMP | NOT NULL | Token expiration time |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| revoked_at | TIMESTAMP | NULL | Revocation timestamp (if revoked) |
| device_info | VARCHAR(500) | NULL | Device information |
| ip_address | VARCHAR(45) | NULL | Client IP address |

**Indexes:**
- `idx_refresh_tokens_user_id` on `user_id`
- `idx_refresh_tokens_token_hash` on `token_hash`
- `idx_refresh_tokens_expires_at` on `expires_at`
- `idx_refresh_tokens_revoked_at` on `revoked_at`

---

### Junction Tables

#### `user_roles`

Many-to-many relationship between users and roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | INTEGER | NOT NULL, FK users(id) ON DELETE CASCADE | User ID |
| role_id | INTEGER | NOT NULL, FK roles(id) ON DELETE CASCADE | Role ID |
| assigned_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Assignment timestamp |

**Primary Key:** (user_id, role_id)

**Indexes:**
- `idx_user_roles_user_id` on `user_id`
- `idx_user_roles_role_id` on `role_id`

---

#### `role_permissions`

Many-to-many relationship between roles and permissions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| role_id | INTEGER | NOT NULL, FK roles(id) ON DELETE CASCADE | Role ID |
| permission_id | INTEGER | NOT NULL, FK permissions(id) ON DELETE CASCADE | Permission ID |

**Primary Key:** (role_id, permission_id)

**Indexes:**
- `idx_role_permissions_role_id` on `role_id`
- `idx_role_permissions_permission_id` on `permission_id`

---

## Migrations

Migrations are stored in `src/database/migrations/` and follow the naming convention:

```
NNN-description.sql
```

Where NNN is a 3-digit version number (e.g., 001, 002).

### Migration Files

1. `001-create-users-table.sql` - Users table with indexes and triggers
2. `002-create-roles-table.sql` - Roles table
3. `003-create-permissions-table.sql` - Permissions table
4. `004-create-user-roles-table.sql` - User-Roles junction table
5. `005-create-role-permissions-table.sql` - Role-Permissions junction table
6. `006-create-app-settings-table.sql` - App Settings singleton table
7. `007-create-refresh-tokens-table.sql` - Refresh Tokens table

### Migration Commands

```bash
# Run pending migrations
npm run db:migrate

# Rollback last migration
npm run db:rollback

# Rollback N migrations
npm run db:rollback 3

# Reset database (rollback all)
npm run db:reset

# Fresh database (reset + migrate + seed)
npm run db:fresh

# Show migration status
npm run db:status
```

---

## Seeding

The seeder provides test data for development and testing.

### Default Seed Data

**Permissions (19 total):**
- User management: users.create, users.read, users.update, users.delete, users.list
- Role management: roles.create, roles.read, roles.update, roles.delete, roles.list, roles.assign
- Permission management: permissions.read, permissions.list, permissions.assign
- Settings: settings.read, settings.update
- System: system.admin, system.audit, system.maintenance

**Roles (4 total):**
- admin - Full system administrator
- manager - User and content manager
- user - Standard user
- viewer - Read-only access

**Test Users (5 total):**
| Email | Role | Status |
|-------|------|--------|
| admin@example.com | admin | active |
| manager@example.com | manager | active |
| user@example.com | user | active |
| viewer@example.com | viewer | active |
| inactive@example.com | user | inactive |

**Default Password:** `TestPassword123!`

### Seed Commands

```bash
# Seed database with test data
npm run db:seed

# Fresh database (reset + migrate + seed)
npm run db:fresh
```

---

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌──────────────┐
│   users     │       │ user_roles  │       │    roles     │
├─────────────┤       ├─────────────┤       ├──────────────┤
│ id (PK)     │───┐   │ user_id (FK)│───────│ id (PK)      │
│ email       │   └───│ role_id (FK)│───┐   │ name         │
│ password_   │       │ assigned_at │   │   │ description  │
│   hash      │       └─────────────┘   │   │ created_at   │
│ name        │                         │   └──────────────┘
│ status      │                         │          │
│ mfa_enabled │                         │          │
│ ...         │                         │   ┌──────┴─────────┐
└─────────────┘                         │   │role_permissions│
      │                                 │   ├────────────────┤
      │                                 └───│ role_id (FK)   │
      │                                     │ permission_id  │
┌─────┴───────────┐                         │   (FK)         │
│ refresh_tokens  │                         └────────┬───────┘
├─────────────────┤                                  │
│ id (PK)         │                         ┌────────┴───────┐
│ user_id (FK)    │                         │  permissions   │
│ token_hash      │                         ├────────────────┤
│ expires_at      │                         │ id (PK)        │
│ revoked_at      │                         │ name           │
│ device_info     │                         │ description    │
│ ip_address      │                         │ category       │
└─────────────────┘                         └────────────────┘

┌────────────────┐
│  app_settings  │
├────────────────┤
│ id (PK) = 1    │  (Singleton)
│ company_name   │
│ app_title      │
│ logo_url       │
│ theme_colors   │  (JSONB)
│ features       │  (JSONB)
│ maintenance    │  (JSONB)
│ updated_at     │
└────────────────┘
```

---

## Type Definitions

TypeScript types are defined in `src/database/types/index.ts`:

- `User`, `UserInsert`, `UserUpdate`
- `Role`, `RoleInsert`, `RoleUpdate`
- `Permission`, `PermissionInsert`, `PermissionUpdate`
- `UserRole`, `RolePermission`
- `AppSettings`, `AppSettingsUpdate`
- `RefreshToken`, `RefreshTokenInsert`
- `ThemeColors`, `FeatureFlags`, `MaintenanceSettings`

---

## Best Practices

1. **Always use parameterized queries** to prevent SQL injection
2. **Use transactions** for multi-table operations
3. **Check constraints** are enforced at the database level
4. **Cascading deletes** maintain referential integrity
5. **Indexes** are optimized for common query patterns
6. **JSONB columns** provide flexible schema for settings

---

## Future Enhancements

Out of scope for STORY-024B:
- Audit logging tables
- Soft delete implementation
- Table partitioning for large datasets
- Read replicas configuration
