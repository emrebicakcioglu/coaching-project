-- Migration: Seed Default Roles
-- STORY-003A: User CRUD Backend API
-- Version: 010
--
-- Seeds default roles required for authorization:
-- - admin: Full administrative access
-- - user: Standard user access

-- UP
INSERT INTO roles (name, description)
VALUES
  ('admin', 'Administrator with full system access'),
  ('user', 'Standard user with limited access')
ON CONFLICT (name) DO NOTHING;

-- DOWN
-- Note: We don't delete roles on rollback as they may have user associations
-- If cleanup is needed, manually remove after checking user_roles table
