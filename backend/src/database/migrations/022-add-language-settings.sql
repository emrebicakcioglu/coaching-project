-- Migration: Add Language Settings
-- STORY-018A: Standard-Sprache Backend (i18n Setup)
-- Version: 022

-- UP

-- Add language preference column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en';
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_format VARCHAR(50) DEFAULT 'YYYY-MM-DD';
ALTER TABLE users ADD COLUMN IF NOT EXISTS number_format VARCHAR(50) DEFAULT 'en-US';

-- Add language settings to app_settings table
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS default_language VARCHAR(5) DEFAULT 'en';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS supported_languages JSONB DEFAULT '["en", "de"]'::jsonb;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS fallback_language VARCHAR(5) DEFAULT 'en';

-- Create index on user language for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_language ON users(language);

-- Update app_settings with default language values if not already set
UPDATE app_settings
SET default_language = COALESCE(default_language, 'en'),
    supported_languages = COALESCE(supported_languages, '["en", "de"]'::jsonb),
    fallback_language = COALESCE(fallback_language, 'en')
WHERE id = 1;

-- Add comment for documentation
COMMENT ON COLUMN users.language IS 'User preferred language code (e.g., en, de)';
COMMENT ON COLUMN users.date_format IS 'User preferred date format pattern';
COMMENT ON COLUMN users.number_format IS 'User preferred number format locale';
COMMENT ON COLUMN app_settings.default_language IS 'Default language for new users';
COMMENT ON COLUMN app_settings.supported_languages IS 'List of supported language codes';
COMMENT ON COLUMN app_settings.fallback_language IS 'Fallback language when requested language is unavailable';

-- DOWN
DROP INDEX IF EXISTS idx_users_language;
ALTER TABLE users DROP COLUMN IF EXISTS language;
ALTER TABLE users DROP COLUMN IF EXISTS date_format;
ALTER TABLE users DROP COLUMN IF EXISTS number_format;
ALTER TABLE app_settings DROP COLUMN IF EXISTS default_language;
ALTER TABLE app_settings DROP COLUMN IF EXISTS supported_languages;
ALTER TABLE app_settings DROP COLUMN IF EXISTS fallback_language;
