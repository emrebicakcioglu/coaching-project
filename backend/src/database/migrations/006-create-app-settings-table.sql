-- Migration: Create App Settings Table
-- STORY-024B: PostgreSQL Schema & Migrations
-- Version: 006

-- UP
CREATE TABLE app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  company_name VARCHAR(100) DEFAULT 'Core App',
  app_title VARCHAR(100) DEFAULT 'Core Application',
  logo_url VARCHAR(255),
  theme_colors JSONB DEFAULT '{"primary": "#3B82F6", "secondary": "#6B7280"}'::jsonb,
  features JSONB DEFAULT '{"mfa_enabled": true, "registration_enabled": true}'::jsonb,
  maintenance JSONB DEFAULT '{"enabled": false}'::jsonb,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Ensure only one row can exist (singleton pattern)
  CONSTRAINT app_settings_singleton CHECK (id = 1)
);

-- Create trigger for app_settings table
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings row
INSERT INTO app_settings (id) VALUES (1);

-- DOWN
DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
DROP TABLE IF EXISTS app_settings;
