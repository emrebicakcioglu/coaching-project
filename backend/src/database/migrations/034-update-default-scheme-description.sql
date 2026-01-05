-- Migration: Update Default Color Scheme Description
-- BUG-004: Translate Default color scheme description to German
-- Version: 034
--
-- The Default color scheme was created with an English description in migration 026.
-- Since the application's primary language is German, we update it to German.
-- This also adds a description_key field for i18n-based translations.

-- UP

-- Add description_key column for i18n support if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'color_schemes' AND column_name = 'description_key'
  ) THEN
    ALTER TABLE color_schemes ADD COLUMN description_key VARCHAR(100);
  END IF;
END
$$;

-- Update the default scheme's description to German and set its translation key
UPDATE color_schemes
SET
  description = 'Standard-Farbschema mit blauen Primärfarben',
  description_key = 'schemeDescriptions.default'
WHERE name = 'Default' AND is_default = true;

-- DOWN

-- Revert the description back to English
UPDATE color_schemes
SET
  description = 'Standard color scheme with blue primary colors',
  description_key = NULL
WHERE name = 'Default' AND is_default = true;

-- Note: We don't remove the description_key column in DOWN to preserve other data
