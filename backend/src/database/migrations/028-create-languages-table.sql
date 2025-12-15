-- Migration: Create Languages Table
-- Multi-Language Management System
-- Version: 028

-- UP

-- Create languages table for managing available languages
CREATE TABLE IF NOT EXISTS languages (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  native_name VARCHAR(100) NOT NULL,
  emoji_flag VARCHAR(10) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_languages_code ON languages(code);
CREATE INDEX IF NOT EXISTS idx_languages_active ON languages(is_active);
CREATE INDEX IF NOT EXISTS idx_languages_sort_order ON languages(sort_order);

-- Insert German as default language (always exists, cannot be deleted)
INSERT INTO languages (code, name, native_name, emoji_flag, is_default, sort_order)
VALUES ('de', 'German', 'Deutsch', '🇩🇪', true, 0)
ON CONFLICT (code) DO NOTHING;

-- Insert English as secondary language
INSERT INTO languages (code, name, native_name, emoji_flag, is_default, sort_order)
VALUES ('en', 'English', 'English', '🇬🇧', false, 1)
ON CONFLICT (code) DO NOTHING;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_languages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS languages_updated_at ON languages;
CREATE TRIGGER languages_updated_at
  BEFORE UPDATE ON languages
  FOR EACH ROW
  EXECUTE FUNCTION update_languages_updated_at();

-- Add comments for documentation
COMMENT ON TABLE languages IS 'Available languages for the application i18n system';
COMMENT ON COLUMN languages.code IS 'ISO 639-1 language code (e.g., de, en, fr)';
COMMENT ON COLUMN languages.name IS 'English name of the language';
COMMENT ON COLUMN languages.native_name IS 'Native name of the language (e.g., Deutsch for German)';
COMMENT ON COLUMN languages.emoji_flag IS 'Emoji flag for visual identification';
COMMENT ON COLUMN languages.is_default IS 'Whether this is the default/fallback language (only one should be true)';
COMMENT ON COLUMN languages.is_active IS 'Whether this language is currently active and available';
COMMENT ON COLUMN languages.sort_order IS 'Display order in language selectors';

-- DOWN
DROP TRIGGER IF EXISTS languages_updated_at ON languages;
DROP FUNCTION IF EXISTS update_languages_updated_at();
DROP INDEX IF EXISTS idx_languages_sort_order;
DROP INDEX IF EXISTS idx_languages_active;
DROP INDEX IF EXISTS idx_languages_code;
DROP TABLE IF EXISTS languages;
