-- ======================================
-- Migration 031: Add screenshot_path column to feedback_submissions
-- STORY-041B: Feedback Screenshot Storage
-- ======================================
-- Adds screenshot_path column to store MinIO file references
-- instead of sending screenshots as email attachments.
-- ======================================

-- UP

-- Add screenshot_path column to feedback_submissions table
-- This column stores the file path/name in MinIO for later retrieval
ALTER TABLE feedback_submissions
ADD COLUMN IF NOT EXISTS screenshot_path VARCHAR(500);

-- Create index for screenshot queries (e.g., finding feedbacks with screenshots)
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_screenshot
ON feedback_submissions(screenshot_path)
WHERE screenshot_path IS NOT NULL;

-- Update column comments
COMMENT ON COLUMN feedback_submissions.screenshot_path IS 'STORY-041B: Path to screenshot file stored in MinIO feedback bucket';

-- ======================================
-- DOWN
-- ======================================
DROP INDEX IF EXISTS idx_feedback_submissions_screenshot;
ALTER TABLE feedback_submissions DROP COLUMN IF EXISTS screenshot_path;
