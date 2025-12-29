-- Migration: Add Performance Optimization Indexes
-- Version: 029
-- Purpose: Add partial and composite indexes for improved query performance
--
-- These indexes optimize common query patterns:
-- 1. Active session lookups (token validation)
-- 2. User session listing
-- 3. Session cleanup operations

-- @up

-- Partial index for active tokens only (revoked_at IS NULL)
-- Significantly improves token validation queries by only indexing non-revoked tokens
-- Query pattern: SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked_at IS NULL
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active_token
ON refresh_tokens(token_hash)
WHERE revoked_at IS NULL;

-- Composite index for user session queries
-- Optimizes: SELECT * FROM refresh_tokens WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_active_sessions
ON refresh_tokens(user_id, expires_at DESC)
WHERE revoked_at IS NULL;

-- Index for cleanup operations
-- Optimizes: DELETE FROM refresh_tokens WHERE expires_at < NOW()
-- Note: Using simple index on expires_at for cleanup queries
-- (Cannot use partial index with CURRENT_TIMESTAMP as it's not IMMUTABLE)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expired
ON refresh_tokens(expires_at);

-- Composite index for user role lookup with assignment timestamp
-- Optimizes role history and recent assignment queries
CREATE INDEX IF NOT EXISTS idx_user_roles_user_assigned
ON user_roles(user_id, assigned_at DESC);

-- Comment on indexes
COMMENT ON INDEX idx_refresh_tokens_active_token IS 'Partial index for fast token validation (only non-revoked tokens)';
COMMENT ON INDEX idx_refresh_tokens_user_active_sessions IS 'Composite index for user session listing';
COMMENT ON INDEX idx_refresh_tokens_expired IS 'Index for expired token cleanup queries';
COMMENT ON INDEX idx_user_roles_user_assigned IS 'Composite index for user role history queries';

-- @down
DROP INDEX IF EXISTS idx_user_roles_user_assigned;
DROP INDEX IF EXISTS idx_refresh_tokens_expired;
DROP INDEX IF EXISTS idx_refresh_tokens_user_active_sessions;
DROP INDEX IF EXISTS idx_refresh_tokens_active_token;
