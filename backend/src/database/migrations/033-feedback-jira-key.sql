-- ======================================
-- Migration 033: Add Jira columns to feedback_submissions
-- STORY-041E: Jira Ticket Creation
-- ======================================
-- Adds columns to track Jira issue creation from feedback submissions.
-- - jira_issue_key: The Jira issue key (e.g., "PROJ-123")
-- - jira_created_at: Timestamp when Jira ticket was created
-- ======================================

-- UP

-- Add Jira issue key column to track created tickets
ALTER TABLE feedback_submissions
ADD COLUMN IF NOT EXISTS jira_issue_key VARCHAR(50);

-- Add timestamp for when Jira ticket was created
ALTER TABLE feedback_submissions
ADD COLUMN IF NOT EXISTS jira_created_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookup by Jira issue key
CREATE INDEX IF NOT EXISTS idx_feedback_jira_key ON feedback_submissions(jira_issue_key)
WHERE jira_issue_key IS NOT NULL;

-- Add column comments for documentation
COMMENT ON COLUMN feedback_submissions.jira_issue_key IS 'STORY-041E: Jira issue key (e.g., PROJ-123) when feedback is exported to Jira';
COMMENT ON COLUMN feedback_submissions.jira_created_at IS 'STORY-041E: Timestamp when Jira ticket was created from this feedback';

-- ======================================
-- DOWN
-- ======================================
DROP INDEX IF EXISTS idx_feedback_jira_key;
ALTER TABLE feedback_submissions DROP COLUMN IF EXISTS jira_issue_key;
ALTER TABLE feedback_submissions DROP COLUMN IF EXISTS jira_created_at;
