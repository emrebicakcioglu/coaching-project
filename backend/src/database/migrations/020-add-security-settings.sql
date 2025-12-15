-- Migration: Add Security Settings to App Settings
-- STORY-013A: In-App Settings Backend
-- Version: 020
--
-- Adds security settings columns to the app_settings table:
-- - max_login_attempts: Maximum failed login attempts before lockout
-- - password_min_length: Minimum password length
-- - password_require_uppercase: Require uppercase letters in password
-- - password_require_lowercase: Require lowercase letters in password
-- - password_require_numbers: Require numbers in password
-- - password_require_special_chars: Require special characters in password
-- - session_inactivity_timeout: Session timeout after inactivity (minutes)
-- - default_language: Default application language
-- - pagination_size: Default items per page

-- UP
-- Add security settings columns
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS max_login_attempts INTEGER DEFAULT 5
  CHECK (max_login_attempts >= 1 AND max_login_attempts <= 100),
ADD COLUMN IF NOT EXISTS password_min_length INTEGER DEFAULT 8
  CHECK (password_min_length >= 6 AND password_min_length <= 128),
ADD COLUMN IF NOT EXISTS password_require_uppercase BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS password_require_lowercase BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS password_require_numbers BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS password_require_special_chars BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS session_inactivity_timeout INTEGER DEFAULT 15
  CHECK (session_inactivity_timeout >= 1 AND session_inactivity_timeout <= 1440);

-- Add general settings columns
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS default_language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS pagination_size INTEGER DEFAULT 20
  CHECK (pagination_size >= 5 AND pagination_size <= 100);

-- Add email settings column (JSONB for flexibility)
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS email_settings JSONB DEFAULT '{"signature": "Best regards,\nYour Team"}'::jsonb;

-- Update existing row with defaults
UPDATE app_settings SET
  max_login_attempts = COALESCE(max_login_attempts, 5),
  password_min_length = COALESCE(password_min_length, 8),
  password_require_uppercase = COALESCE(password_require_uppercase, true),
  password_require_lowercase = COALESCE(password_require_lowercase, true),
  password_require_numbers = COALESCE(password_require_numbers, true),
  password_require_special_chars = COALESCE(password_require_special_chars, true),
  session_inactivity_timeout = COALESCE(session_inactivity_timeout, 15),
  default_language = COALESCE(default_language, 'en'),
  pagination_size = COALESCE(pagination_size, 20),
  email_settings = COALESCE(email_settings, '{"signature": "Best regards,\nYour Team"}'::jsonb)
WHERE id = 1;

-- Comments
COMMENT ON COLUMN app_settings.max_login_attempts IS 'Maximum failed login attempts before account lockout (1-100)';
COMMENT ON COLUMN app_settings.password_min_length IS 'Minimum password length (6-128)';
COMMENT ON COLUMN app_settings.password_require_uppercase IS 'Require at least one uppercase letter in passwords';
COMMENT ON COLUMN app_settings.password_require_lowercase IS 'Require at least one lowercase letter in passwords';
COMMENT ON COLUMN app_settings.password_require_numbers IS 'Require at least one number in passwords';
COMMENT ON COLUMN app_settings.password_require_special_chars IS 'Require at least one special character in passwords';
COMMENT ON COLUMN app_settings.session_inactivity_timeout IS 'Session timeout after inactivity in minutes (1-1440)';
COMMENT ON COLUMN app_settings.default_language IS 'Default application language code (e.g., en, de, fr)';
COMMENT ON COLUMN app_settings.pagination_size IS 'Default number of items per page (5-100)';
COMMENT ON COLUMN app_settings.email_settings IS 'JSONB email configuration (signature, templates config)';

-- DOWN
ALTER TABLE app_settings
DROP COLUMN IF EXISTS max_login_attempts,
DROP COLUMN IF EXISTS password_min_length,
DROP COLUMN IF EXISTS password_require_uppercase,
DROP COLUMN IF EXISTS password_require_lowercase,
DROP COLUMN IF EXISTS password_require_numbers,
DROP COLUMN IF EXISTS password_require_special_chars,
DROP COLUMN IF EXISTS session_inactivity_timeout,
DROP COLUMN IF EXISTS default_language,
DROP COLUMN IF EXISTS pagination_size,
DROP COLUMN IF EXISTS email_settings;
