-- Migration: Create Settings History Table
-- STORY-013A: In-App Settings Backend
-- Version: 019
--
-- This table stores all settings changes for audit trail and compliance.
-- Features:
-- - Category-based tracking (general, security, email, branding, features)
-- - Before/after snapshots in JSONB format
-- - User attribution for all changes
-- - Timestamp for compliance reporting

-- UP
CREATE TABLE settings_history (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  old_value JSONB DEFAULT '{}',
  new_value JSONB DEFAULT '{}',
  changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  request_id VARCHAR(36)
);

-- Create indexes for settings_history table
-- Index on category for filtering by settings type
CREATE INDEX idx_settings_history_category ON settings_history(category);

-- Index on changed_by for user-specific queries
CREATE INDEX idx_settings_history_changed_by ON settings_history(changed_by);

-- Index on changed_at for time-based queries and cleanup
CREATE INDEX idx_settings_history_changed_at ON settings_history(changed_at);

-- Composite index for common query: category + time
CREATE INDEX idx_settings_history_category_time ON settings_history(category, changed_at DESC);

-- Comments
COMMENT ON TABLE settings_history IS 'Stores settings change history for audit trail - STORY-013A';
COMMENT ON COLUMN settings_history.category IS 'Settings category: general, security, email, branding, features';
COMMENT ON COLUMN settings_history.old_value IS 'JSONB snapshot of settings before change';
COMMENT ON COLUMN settings_history.new_value IS 'JSONB snapshot of settings after change';
COMMENT ON COLUMN settings_history.changed_by IS 'Reference to the user who made the change';
COMMENT ON COLUMN settings_history.changed_at IS 'Timestamp when the change was made';
COMMENT ON COLUMN settings_history.ip_address IS 'Client IP address (supports IPv4 and IPv6)';
COMMENT ON COLUMN settings_history.user_agent IS 'Client User-Agent header';
COMMENT ON COLUMN settings_history.request_id IS 'UUID for request tracing';

-- DOWN
DROP INDEX IF EXISTS idx_settings_history_category_time;
DROP INDEX IF EXISTS idx_settings_history_changed_at;
DROP INDEX IF EXISTS idx_settings_history_changed_by;
DROP INDEX IF EXISTS idx_settings_history_category;
DROP TABLE IF EXISTS settings_history;
