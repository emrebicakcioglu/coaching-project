-- Migration: Add Session Management Columns to Refresh Tokens Table
-- STORY-008: Session Management mit "Remember Me"
-- Version: 011
--
-- This migration adds the following columns to support session management:
-- - browser: Parsed browser name from user-agent
-- - location: Optional location based on IP geolocation
-- - last_used_at: Timestamp of last token usage (for session activity tracking)
-- - remember_me: Boolean flag indicating if "Remember Me" was checked during login

-- UP
ALTER TABLE refresh_tokens
ADD COLUMN IF NOT EXISTS browser VARCHAR(255),
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS remember_me BOOLEAN DEFAULT FALSE;

-- Create index for last_used_at to optimize session queries
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_last_used_at ON refresh_tokens(last_used_at);

-- Create index for active sessions query optimization (user_id + revoked_at + expires_at)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active_sessions
ON refresh_tokens(user_id, revoked_at, expires_at)
WHERE revoked_at IS NULL AND device_info != 'PASSWORD_RESET';

-- DOWN
DROP INDEX IF EXISTS idx_refresh_tokens_active_sessions;
DROP INDEX IF EXISTS idx_refresh_tokens_last_used_at;
ALTER TABLE refresh_tokens
DROP COLUMN IF EXISTS browser,
DROP COLUMN IF EXISTS location,
DROP COLUMN IF EXISTS last_used_at,
DROP COLUMN IF EXISTS remember_me;
