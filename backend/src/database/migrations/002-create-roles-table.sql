-- Migration: Create Roles Table
-- STORY-024B: PostgreSQL Schema & Migrations
-- Version: 002

-- UP
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for roles table
CREATE INDEX idx_roles_name ON roles(name);

-- DOWN
DROP INDEX IF EXISTS idx_roles_name;
DROP TABLE IF EXISTS roles;
