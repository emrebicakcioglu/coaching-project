-- Migration: Create Permissions Table
-- STORY-024B: PostgreSQL Schema & Migrations
-- Version: 003

-- UP
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(50)
);

-- Create indexes for permissions table
CREATE INDEX idx_permissions_name ON permissions(name);
CREATE INDEX idx_permissions_category ON permissions(category);

-- DOWN
DROP INDEX IF EXISTS idx_permissions_category;
DROP INDEX IF EXISTS idx_permissions_name;
DROP TABLE IF EXISTS permissions;
