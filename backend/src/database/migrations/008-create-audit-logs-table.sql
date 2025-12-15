-- Migration: Create Audit Logs Table
-- STORY-028: System Logging (Audit Trail)
-- Version: 008
--
-- This table stores all audit events for system monitoring and compliance.
-- Features:
-- - User activity tracking (login, logout, registration)
-- - System configuration changes
-- - API request logging (configurable)
-- - Flexible JSONB details field for extended context
-- - IPv4 and IPv6 support (VARCHAR 45)

-- UP
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100),
  resource_id INTEGER,
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  request_id VARCHAR(36),
  log_level VARCHAR(10) DEFAULT 'info' CHECK (log_level IN ('info', 'warn', 'error')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit_logs table
-- Index on user_id for user activity queries
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);

-- Index on action for filtering by event type
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Index on created_at for time-based queries and log rotation
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Index on resource for resource-specific queries
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource);

-- Index on log_level for filtering by severity
CREATE INDEX idx_audit_logs_log_level ON audit_logs(log_level);

-- Composite index for common query pattern: user + action + time
CREATE INDEX idx_audit_logs_user_action_time ON audit_logs(user_id, action, created_at DESC);

-- Comment on table
COMMENT ON TABLE audit_logs IS 'Stores audit trail events for system monitoring - STORY-028';
COMMENT ON COLUMN audit_logs.user_id IS 'Reference to the user who performed the action (nullable for system events)';
COMMENT ON COLUMN audit_logs.action IS 'Type of action performed (e.g., USER_LOGIN, USER_LOGOUT, SETTINGS_CHANGE)';
COMMENT ON COLUMN audit_logs.resource IS 'Type of resource affected (e.g., user, settings, role)';
COMMENT ON COLUMN audit_logs.resource_id IS 'ID of the specific resource affected';
COMMENT ON COLUMN audit_logs.details IS 'JSONB field for flexible additional context';
COMMENT ON COLUMN audit_logs.ip_address IS 'Client IP address (supports IPv4 and IPv6)';
COMMENT ON COLUMN audit_logs.user_agent IS 'Client User-Agent header';
COMMENT ON COLUMN audit_logs.request_id IS 'UUID for request tracing (from RequestIdMiddleware)';
COMMENT ON COLUMN audit_logs.log_level IS 'Severity level: info, warn, or error';

-- DOWN
DROP INDEX IF EXISTS idx_audit_logs_user_action_time;
DROP INDEX IF EXISTS idx_audit_logs_log_level;
DROP INDEX IF EXISTS idx_audit_logs_resource;
DROP INDEX IF EXISTS idx_audit_logs_created_at;
DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP TABLE IF EXISTS audit_logs;
