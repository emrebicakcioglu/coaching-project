-- Migration: Create User Roles Junction Table
-- STORY-024B: PostgreSQL Schema & Migrations
-- Version: 004

-- UP
CREATE TABLE user_roles (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id)
);

-- Create indexes for user_roles table
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- DOWN
DROP INDEX IF EXISTS idx_user_roles_role_id;
DROP INDEX IF EXISTS idx_user_roles_user_id;
DROP TABLE IF EXISTS user_roles;
