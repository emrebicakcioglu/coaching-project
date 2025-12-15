-- Migration: Create User Backup Codes Table
-- STORY-005A: MFA Setup (Backend)
-- Version: 017

-- UP

-- Create table for MFA backup codes
-- Backup codes are hashed using bcrypt and each can only be used once
CREATE TABLE user_backup_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash VARCHAR(255) NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for efficient lookups by user_id
CREATE INDEX idx_backup_codes_user_id ON user_backup_codes(user_id);

-- Create index for finding unused codes
CREATE INDEX idx_backup_codes_user_id_used ON user_backup_codes(user_id, used);

-- DOWN

DROP INDEX IF EXISTS idx_backup_codes_user_id_used;
DROP INDEX IF EXISTS idx_backup_codes_user_id;
DROP TABLE IF EXISTS user_backup_codes;
