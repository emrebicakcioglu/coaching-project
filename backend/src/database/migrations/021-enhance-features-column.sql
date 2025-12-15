-- Migration: Enhance Features Column for Feature Toggles
-- STORY-014A: Feature Toggles Backend
-- Version: 021
--
-- This migration updates the features JSONB column to support
-- comprehensive feature toggle functionality with metadata.

-- UP
-- Update the features column with enhanced structure
UPDATE app_settings
SET features = '{
  "user-registration": {
    "enabled": true,
    "name": "User Registration",
    "description": "Allow users to self-register",
    "category": "authentication"
  },
  "mfa": {
    "enabled": false,
    "name": "Multi-Factor Authentication",
    "description": "Enable 2FA for users",
    "category": "security"
  },
  "feedback-button": {
    "enabled": true,
    "name": "Feedback Button",
    "description": "Show feedback button with screenshot",
    "category": "support"
  },
  "dark-mode": {
    "enabled": false,
    "name": "Dark Mode",
    "description": "Allow users to switch to dark theme",
    "category": "ui"
  }
}'::JSONB
WHERE id = 1;

-- Add comment explaining the new structure
COMMENT ON COLUMN app_settings.features IS 'Feature toggles stored as JSONB. Each feature key maps to an object with: enabled (boolean), name (string), description (string), category (string). STORY-014A: Feature Toggles Backend.';

-- DOWN
-- Revert to simple boolean flags
UPDATE app_settings
SET features = '{"mfa_enabled": true, "registration_enabled": true}'::JSONB
WHERE id = 1;

COMMENT ON COLUMN app_settings.features IS NULL;
