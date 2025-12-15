-- Migration: Add Soft Delete to Users Table
-- STORY-003A: User CRUD Backend API
-- Version: 009
--
-- Adds deleted_at column for soft delete functionality (GDPR compliance)
-- When a user is "deleted", they are actually marked with a timestamp
-- instead of being physically removed from the database.

-- UP
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

-- Create index for soft delete queries (filter active users)
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

-- Update status check constraint to include 'deleted' status
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check
  CHECK (status IN ('active', 'inactive', 'suspended', 'deleted'));

-- DOWN
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check
  CHECK (status IN ('active', 'inactive', 'suspended'));
DROP INDEX IF EXISTS idx_users_deleted_at;
ALTER TABLE users DROP COLUMN IF EXISTS deleted_at;
