-- Migration: Add assigned_by to User Roles Table
-- STORY-007B: User Role Assignment
-- Version: 016
--
-- Adds assigned_by field to track who assigned the role to a user

-- UP
ALTER TABLE user_roles
ADD COLUMN IF NOT EXISTS assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Create index for assigned_by lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_assigned_by ON user_roles(assigned_by);

-- DOWN
DROP INDEX IF EXISTS idx_user_roles_assigned_by;
ALTER TABLE user_roles DROP COLUMN IF EXISTS assigned_by;
