-- Migration: Add Feedback Feature Flag
-- STORY-041: Feedback Feature Flag
-- Version: 030
--
-- This migration adds the feedback feature flag to the features JSONB column.
-- The feedback.enabled flag controls whether users can submit feedback.
-- Default: false (Feature is disabled by default)

-- UP
-- Add feedback feature to the features JSONB column
UPDATE app_settings
SET features = features || '{
  "feedback": {
    "enabled": false,
    "name": "Feedback System",
    "description": "Allow users to submit feedback with screenshots",
    "category": "support"
  }
}'::jsonb
WHERE id = 1
  AND NOT (features ? 'feedback');

-- Add comment explaining the feature
COMMENT ON COLUMN app_settings.features IS 'Feature toggles stored as JSONB. Each feature key maps to an object with: enabled (boolean), name (string), description (string), category (string). Includes: user-registration, mfa, feedback-button, dark-mode, feedback. STORY-014A, STORY-041.';

-- DOWN
-- Remove the feedback feature from the features JSONB column
UPDATE app_settings
SET features = features - 'feedback'
WHERE id = 1;

-- Revert comment
COMMENT ON COLUMN app_settings.features IS 'Feature toggles stored as JSONB. Each feature key maps to an object with: enabled (boolean), name (string), description (string), category (string). STORY-014A: Feature Toggles Backend.';
