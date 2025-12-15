-- Migration: Enhance Theme Colors Structure
-- STORY-017: Theme-System Backend
-- Version: 018
--
-- This migration enhances the theme_colors JSONB structure to support
-- nested colors for background, text, and status categories.
-- Previous structure: { primary, secondary, accent, background, text }
-- New structure: { primary, secondary, background: { page, card }, text: { primary, secondary }, status: { success, warning, error } }

-- UP

-- Update theme_colors to the enhanced structure with migration from old format
UPDATE app_settings
SET theme_colors = jsonb_build_object(
  'primary', COALESCE(theme_colors->>'primary', '#2563eb'),
  'secondary', COALESCE(theme_colors->>'secondary', '#7c3aed'),
  'background', jsonb_build_object(
    'page', COALESCE(theme_colors->>'background', '#ffffff'),
    'card', '#f9fafb'
  ),
  'text', jsonb_build_object(
    'primary', COALESCE(theme_colors->>'text', '#111827'),
    'secondary', '#6b7280'
  ),
  'status', jsonb_build_object(
    'success', '#10b981',
    'warning', '#f59e0b',
    'error', '#ef4444'
  )
)
WHERE id = 1;

-- Update the default constraint for new installations
-- Note: PostgreSQL doesn't allow modifying column defaults in-place,
-- so we recreate with the new default
ALTER TABLE app_settings
  ALTER COLUMN theme_colors SET DEFAULT '{
    "primary": "#2563eb",
    "secondary": "#7c3aed",
    "background": {"page": "#ffffff", "card": "#f9fafb"},
    "text": {"primary": "#111827", "secondary": "#6b7280"},
    "status": {"success": "#10b981", "warning": "#f59e0b", "error": "#ef4444"}
  }'::jsonb;

-- Add a comment to document the structure
COMMENT ON COLUMN app_settings.theme_colors IS 'Theme colors configuration with nested structure: { primary, secondary, background: { page, card }, text: { primary, secondary }, status: { success, warning, error } }';

-- DOWN

-- Revert to the simpler structure
UPDATE app_settings
SET theme_colors = jsonb_build_object(
  'primary', COALESCE(theme_colors->>'primary', '#3B82F6'),
  'secondary', COALESCE(theme_colors->>'secondary', '#6B7280'),
  'accent', '#9c27b0',
  'background', COALESCE(theme_colors->'background'->>'page', '#ffffff'),
  'text', COALESCE(theme_colors->'text'->>'primary', '#333333')
)
WHERE id = 1;

ALTER TABLE app_settings
  ALTER COLUMN theme_colors SET DEFAULT '{"primary": "#3B82F6", "secondary": "#6B7280"}'::jsonb;

COMMENT ON COLUMN app_settings.theme_colors IS NULL;
