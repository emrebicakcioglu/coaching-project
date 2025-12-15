-- Migration: Create Role Permissions Junction Table
-- STORY-024B: PostgreSQL Schema & Migrations
-- Version: 005

-- UP
CREATE TABLE role_permissions (
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Create indexes for role_permissions table
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- DOWN
DROP INDEX IF EXISTS idx_role_permissions_permission_id;
DROP INDEX IF EXISTS idx_role_permissions_role_id;
DROP TABLE IF EXISTS role_permissions;
