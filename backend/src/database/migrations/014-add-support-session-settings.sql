-- Migration: Add Support Email and Session Timeout Settings
-- STORY-035: Support-E-Mail & Session-Timeout
-- Version: 014
--
-- Adds support email and session timeout configuration to app_settings table
-- These settings allow administrators to:
-- 1. Configure a support email address shown in footer and used in feedback emails
-- 2. Set session timeout in minutes for automatic user logout
-- 3. Enable/disable timeout warning before session expiry

-- UP
-- Add support email column
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS support_email VARCHAR(255);

-- Add session timeout column (in minutes, default 30 minutes)
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS session_timeout_minutes INTEGER DEFAULT 30;

-- Add timeout warning settings
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS show_timeout_warning BOOLEAN DEFAULT TRUE;

-- Add warning threshold (minutes before timeout to show warning)
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS warning_before_timeout_minutes INTEGER DEFAULT 5;

-- Add constraint to ensure session_timeout_minutes is positive
ALTER TABLE app_settings ADD CONSTRAINT chk_session_timeout_positive CHECK (session_timeout_minutes > 0);

-- Add constraint to ensure warning_before_timeout_minutes is positive and less than session_timeout
ALTER TABLE app_settings ADD CONSTRAINT chk_warning_before_timeout CHECK (
  warning_before_timeout_minutes > 0 AND
  warning_before_timeout_minutes < session_timeout_minutes
);

-- Add last_updated_by column to track who made the changes
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS last_updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Update existing row with default values
UPDATE app_settings SET
  session_timeout_minutes = COALESCE(session_timeout_minutes, 30),
  show_timeout_warning = COALESCE(show_timeout_warning, TRUE),
  warning_before_timeout_minutes = COALESCE(warning_before_timeout_minutes, 5)
WHERE id = 1;

-- Create index on support_email for potential lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_support_email ON app_settings(support_email);

-- Add comment documentation
COMMENT ON COLUMN app_settings.support_email IS 'Support email address displayed in footer and used for feedback (STORY-035)';
COMMENT ON COLUMN app_settings.session_timeout_minutes IS 'Session inactivity timeout in minutes before auto-logout (STORY-035)';
COMMENT ON COLUMN app_settings.show_timeout_warning IS 'Whether to show warning before session expires (STORY-035)';
COMMENT ON COLUMN app_settings.warning_before_timeout_minutes IS 'Minutes before timeout to show warning notification (STORY-035)';
COMMENT ON COLUMN app_settings.last_updated_by IS 'User ID who last updated the settings (STORY-035)';

-- DOWN
-- Remove the constraint first
ALTER TABLE app_settings DROP CONSTRAINT IF EXISTS chk_warning_before_timeout;
ALTER TABLE app_settings DROP CONSTRAINT IF EXISTS chk_session_timeout_positive;

-- Remove the index
DROP INDEX IF EXISTS idx_app_settings_support_email;

-- Remove the columns
ALTER TABLE app_settings DROP COLUMN IF EXISTS support_email;
ALTER TABLE app_settings DROP COLUMN IF EXISTS session_timeout_minutes;
ALTER TABLE app_settings DROP COLUMN IF EXISTS show_timeout_warning;
ALTER TABLE app_settings DROP COLUMN IF EXISTS warning_before_timeout_minutes;
ALTER TABLE app_settings DROP COLUMN IF EXISTS last_updated_by;
