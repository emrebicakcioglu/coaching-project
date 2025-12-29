-- ======================================
-- Migration 032: Add integrations column to app_settings
-- STORY-041D: Jira Settings API
-- ======================================
-- Adds integrations JSONB column to store third-party integration
-- settings (Jira, etc.) for the feedback system.
-- ======================================

-- UP

-- Add integrations JSONB column to app_settings table
-- This column stores configuration for third-party integrations like Jira
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS integrations JSONB DEFAULT '{}'::jsonb;

-- Create index for faster JSONB queries on integrations
CREATE INDEX IF NOT EXISTS idx_app_settings_integrations
ON app_settings USING GIN (integrations);

-- Add column comment for documentation
COMMENT ON COLUMN app_settings.integrations IS 'STORY-041D: JSONB column for third-party integrations (Jira, etc.)';

-- ======================================
-- DOWN
-- ======================================
DROP INDEX IF EXISTS idx_app_settings_integrations;
ALTER TABLE app_settings DROP COLUMN IF EXISTS integrations;
