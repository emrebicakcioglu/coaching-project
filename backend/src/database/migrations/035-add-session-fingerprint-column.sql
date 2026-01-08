-- Migration: 035-add-session-fingerprint-column
-- STORY-107: Session Management Improvements
-- Adds fingerprint column for session reuse detection

-- Add fingerprint column to refresh_tokens table
ALTER TABLE refresh_tokens
ADD COLUMN IF NOT EXISTS fingerprint VARCHAR(64);

-- Add index for faster fingerprint lookup (without time-based predicate since NOW() is not immutable)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_fingerprint
ON refresh_tokens (user_id, fingerprint)
WHERE revoked_at IS NULL;

-- Comment for documentation
COMMENT ON COLUMN refresh_tokens.fingerprint IS 'SHA256 hash of user-agent + IP for session reuse detection (STORY-107)';
