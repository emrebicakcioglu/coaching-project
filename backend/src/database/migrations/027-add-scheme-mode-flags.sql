-- Migration: 027-add-scheme-mode-flags
-- Description: Add is_light_scheme and is_dark_scheme flags to color_schemes table
-- for Dark Mode Toggle functionality
-- Date: 2025-01-14

-- Add mode flags to color_schemes table
ALTER TABLE color_schemes
ADD COLUMN IF NOT EXISTS is_light_scheme BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_dark_scheme BOOLEAN DEFAULT false;

-- Create partial unique indexes to ensure only one scheme per mode
-- These ensure that at most one scheme can be marked as light mode
-- and at most one scheme can be marked as dark mode
CREATE UNIQUE INDEX IF NOT EXISTS idx_color_schemes_single_light
ON color_schemes (is_light_scheme) WHERE is_light_scheme = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_color_schemes_single_dark
ON color_schemes (is_dark_scheme) WHERE is_dark_scheme = true;

-- Set default scheme as light mode by default (if not already set)
UPDATE color_schemes
SET is_light_scheme = true
WHERE is_default = true
  AND NOT EXISTS (SELECT 1 FROM color_schemes WHERE is_light_scheme = true);

-- If there's a scheme named 'Dark Mode Theme', set it as dark mode
UPDATE color_schemes
SET is_dark_scheme = true
WHERE name = 'Dark Mode Theme'
  AND NOT EXISTS (SELECT 1 FROM color_schemes WHERE is_dark_scheme = true);
