-- ======================================
-- Migration 024: Create feedback_submissions table
-- STORY-038B: Feedback Rate Limiting & Email Queue
-- ======================================
-- Creates table for storing feedback submissions with metadata
-- for tracking, rate limiting, and analytics purposes.
-- ======================================

-- UP
CREATE TABLE IF NOT EXISTS feedback_submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    comment TEXT NOT NULL,
    url VARCHAR(2048),
    route VARCHAR(500),
    browser_info TEXT,
    user_agent TEXT,
    browser_name VARCHAR(50),
    browser_version VARCHAR(20),
    os_name VARCHAR(50),
    os_version VARCHAR(20),
    device_type VARCHAR(20),
    screen_resolution VARCHAR(50),
    language VARCHAR(20),
    timezone VARCHAR(50),
    has_screenshot BOOLEAN NOT NULL DEFAULT FALSE,
    email_status VARCHAR(20) DEFAULT 'pending' CHECK (email_status IN ('pending', 'sent', 'failed')),
    email_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for feedback_submissions
-- For rate limiting queries (count submissions per user per hour)
CREATE INDEX idx_feedback_submissions_user_id ON feedback_submissions(user_id);
CREATE INDEX idx_feedback_submissions_user_created ON feedback_submissions(user_id, created_at DESC);

-- For analytics and reporting
CREATE INDEX idx_feedback_submissions_created_at ON feedback_submissions(created_at DESC);
CREATE INDEX idx_feedback_submissions_route ON feedback_submissions(route);
CREATE INDEX idx_feedback_submissions_browser ON feedback_submissions(browser_name);
CREATE INDEX idx_feedback_submissions_device ON feedback_submissions(device_type);

-- For email status tracking
CREATE INDEX idx_feedback_submissions_email_status ON feedback_submissions(email_status);

-- Comments for documentation
COMMENT ON TABLE feedback_submissions IS 'STORY-038B: Stores user feedback submissions with metadata for tracking and rate limiting';
COMMENT ON COLUMN feedback_submissions.user_id IS 'ID of the user who submitted feedback';
COMMENT ON COLUMN feedback_submissions.user_email IS 'Email of the user at time of submission';
COMMENT ON COLUMN feedback_submissions.comment IS 'User feedback message';
COMMENT ON COLUMN feedback_submissions.url IS 'Full URL where feedback was submitted';
COMMENT ON COLUMN feedback_submissions.route IS 'Route/path portion of the URL';
COMMENT ON COLUMN feedback_submissions.browser_info IS 'Raw browser info string from client';
COMMENT ON COLUMN feedback_submissions.user_agent IS 'User-Agent header value';
COMMENT ON COLUMN feedback_submissions.browser_name IS 'Parsed browser name (Chrome, Firefox, etc.)';
COMMENT ON COLUMN feedback_submissions.browser_version IS 'Parsed browser version';
COMMENT ON COLUMN feedback_submissions.os_name IS 'Parsed operating system name';
COMMENT ON COLUMN feedback_submissions.os_version IS 'Parsed operating system version';
COMMENT ON COLUMN feedback_submissions.device_type IS 'Device type (Desktop, Mobile, Tablet)';
COMMENT ON COLUMN feedback_submissions.screen_resolution IS 'Screen resolution from client';
COMMENT ON COLUMN feedback_submissions.language IS 'Browser language preference';
COMMENT ON COLUMN feedback_submissions.timezone IS 'User timezone';
COMMENT ON COLUMN feedback_submissions.has_screenshot IS 'Whether feedback included a screenshot';
COMMENT ON COLUMN feedback_submissions.email_status IS 'Status of feedback notification email';
COMMENT ON COLUMN feedback_submissions.email_sent_at IS 'Timestamp when email was sent';

-- DOWN
DROP INDEX IF EXISTS idx_feedback_submissions_email_status;
DROP INDEX IF EXISTS idx_feedback_submissions_device;
DROP INDEX IF EXISTS idx_feedback_submissions_browser;
DROP INDEX IF EXISTS idx_feedback_submissions_route;
DROP INDEX IF EXISTS idx_feedback_submissions_created_at;
DROP INDEX IF EXISTS idx_feedback_submissions_user_created;
DROP INDEX IF EXISTS idx_feedback_submissions_user_id;
DROP TABLE IF EXISTS feedback_submissions;
