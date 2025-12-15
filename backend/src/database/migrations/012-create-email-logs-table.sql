-- Migration: 012-create-email-logs-table
-- STORY-023A: E-Mail Service Setup (Resend.com)
-- Creates email_logs table for tracking all sent emails
--
-- Purpose:
-- - Track all email sending attempts
-- - Store Resend message IDs for reference
-- - Log failed attempts with error details
-- - Support retry mechanism tracking
--
-- Columns:
-- - id: Primary key
-- - recipient: Email recipient address
-- - subject: Email subject line
-- - template: Template name used
-- - message_id: Resend.com message ID (null if failed)
-- - status: sent | failed | pending
-- - error: Error message if failed
-- - retry_count: Number of retry attempts
-- - sent_at: Timestamp when email was successfully sent
-- - created_at: Record creation timestamp
--
-- @up

CREATE TABLE IF NOT EXISTS email_logs (
    id SERIAL PRIMARY KEY,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    template VARCHAR(100) NOT NULL,
    message_id VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('sent', 'failed', 'pending')),
    error TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index for querying by recipient (for email history lookups)
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient);

-- Index for querying by status (for monitoring and retry processing)
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

-- Index for querying by message_id (for Resend webhook processing)
CREATE INDEX IF NOT EXISTS idx_email_logs_message_id ON email_logs(message_id);

-- Index for querying by template (for template performance analysis)
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON email_logs(template);

-- Index for querying by date (for reporting and cleanup)
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);

-- Comment on table
COMMENT ON TABLE email_logs IS 'STORY-023A: Email sending log for Resend.com integration';

-- @down
DROP INDEX IF EXISTS idx_email_logs_created_at;
DROP INDEX IF EXISTS idx_email_logs_template;
DROP INDEX IF EXISTS idx_email_logs_message_id;
DROP INDEX IF EXISTS idx_email_logs_status;
DROP INDEX IF EXISTS idx_email_logs_recipient;
DROP TABLE IF EXISTS email_logs;
