-- Migration: Add is_system column to roles table
-- STORY-007A: Rollen-Management Backend
-- Version: 015
--
-- Adds is_system flag to prevent deletion of system-defined roles
-- Also updates existing roles to be marked as system roles
-- Adds Guest role as required by the story

-- UP

-- Add is_system column to roles table
ALTER TABLE roles
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;

-- Create index for is_system queries
CREATE INDEX IF NOT EXISTS idx_roles_is_system ON roles(is_system);

-- Mark existing standard roles as system roles
UPDATE roles SET is_system = TRUE WHERE name IN ('admin', 'user', 'viewer', 'manager');

-- Insert Guest role if it doesn't exist (required by STORY-007A)
INSERT INTO roles (name, description, is_system)
VALUES ('guest', 'Read-only guest access', TRUE)
ON CONFLICT (name) DO UPDATE SET is_system = TRUE;

-- DOWN
-- Note: We don't remove the column on rollback to preserve data
-- ALTER TABLE roles DROP COLUMN IF EXISTS is_system;
-- DROP INDEX IF EXISTS idx_roles_is_system;
