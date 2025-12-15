-- Migration: Add User Verification Fields
-- STORY-023: User Registration
-- Version: 025
--
-- Adds fields required for email verification during user registration:
-- - verification_token_hash: Hashed verification token
-- - verification_token_expires: Token expiration timestamp
-- - email_verified_at: Timestamp when email was verified
--
-- Also extends the status enum to include 'pending' for unverified users.

-- UP

-- First, update the status check constraint to allow 'pending' status
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check
  CHECK (status IN ('active', 'inactive', 'suspended', 'deleted', 'pending'));

-- Add verification-related columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;

-- Create index for verification token lookups
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token_hash)
  WHERE verification_token_hash IS NOT NULL;

-- Create index for pending users cleanup
CREATE INDEX IF NOT EXISTS idx_users_pending_status ON users(status, verification_token_expires)
  WHERE status = 'pending';

-- Comment on new columns
COMMENT ON COLUMN users.verification_token_hash IS 'SHA-256 hash of email verification token';
COMMENT ON COLUMN users.verification_token_expires IS 'Timestamp when verification token expires (24 hours from creation)';
COMMENT ON COLUMN users.email_verified_at IS 'Timestamp when user verified their email address';

-- DOWN
DROP INDEX IF EXISTS idx_users_pending_status;
DROP INDEX IF EXISTS idx_users_verification_token;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at;
ALTER TABLE users DROP COLUMN IF EXISTS verification_token_expires;
ALTER TABLE users DROP COLUMN IF EXISTS verification_token_hash;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check
  CHECK (status IN ('active', 'inactive', 'suspended', 'deleted'));
