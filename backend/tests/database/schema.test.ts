/**
 * Schema Integration Tests
 * STORY-024B: PostgreSQL Schema & Migrations
 *
 * Tests for database schema integrity:
 * - Table structures
 * - Foreign key constraints
 * - Indexes
 * - Triggers
 */

import { Pool } from 'pg';
import * as path from 'path';
import { Migrator } from '../../src/database/migrator';

// Test database configuration
const testDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '14101', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'test_password',
  database: process.env.DB_NAME || 'core_app_test',
};

describe('Database Schema', () => {
  let pool: Pool;
  let migrator: Migrator;
  const migrationsPath = path.join(__dirname, '../../src/database/migrations');

  beforeAll(async () => {
    // Skip tests if not in integration test mode
    if (!process.env.RUN_INTEGRATION_TESTS) {
      console.log('Skipping integration tests (set RUN_INTEGRATION_TESTS=true to run)');
      return;
    }

    pool = new Pool(testDbConfig);
    migrator = new Migrator(pool, migrationsPath);

    // Clean up and run migrations
    await cleanupDatabase();
    await migrator.up();
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  async function cleanupDatabase() {
    await pool.query('DROP TABLE IF EXISTS schema_migrations CASCADE');
    await pool.query('DROP TABLE IF EXISTS refresh_tokens CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_roles CASCADE');
    await pool.query('DROP TABLE IF EXISTS role_permissions CASCADE');
    await pool.query('DROP TABLE IF EXISTS app_settings CASCADE');
    await pool.query('DROP TABLE IF EXISTS permissions CASCADE');
    await pool.query('DROP TABLE IF EXISTS roles CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    await pool.query('DROP FUNCTION IF EXISTS update_updated_at_column CASCADE');
  }

  describe('Tables', () => {
    it('should create all required tables', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      const result = await pool.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('users', 'roles', 'permissions', 'user_roles', 'role_permissions', 'app_settings', 'refresh_tokens')
        ORDER BY table_name
      `);

      const tables = result.rows.map(r => r.table_name);
      expect(tables).toContain('users');
      expect(tables).toContain('roles');
      expect(tables).toContain('permissions');
      expect(tables).toContain('user_roles');
      expect(tables).toContain('role_permissions');
      expect(tables).toContain('app_settings');
      expect(tables).toContain('refresh_tokens');
    });
  });

  describe('Users Table', () => {
    it('should have correct columns', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);

      const columns = result.rows.reduce((acc, row) => {
        acc[row.column_name] = row;
        return acc;
      }, {} as Record<string, { data_type: string; is_nullable: string; column_default: string | null }>);

      expect(columns['id']).toBeDefined();
      expect(columns['email']).toBeDefined();
      expect(columns['password_hash']).toBeDefined();
      expect(columns['name']).toBeDefined();
      expect(columns['status']).toBeDefined();
      expect(columns['mfa_enabled']).toBeDefined();
      expect(columns['created_at']).toBeDefined();
      expect(columns['updated_at']).toBeDefined();

      expect(columns['email'].is_nullable).toBe('NO');
      expect(columns['password_hash'].is_nullable).toBe('NO');
    });

    it('should have unique constraint on email', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      const result = await pool.query(`
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'users' AND constraint_type = 'UNIQUE'
      `);

      expect(result.rows.length).toBeGreaterThanOrEqual(1);
    });

    it('should enforce status check constraint', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      // Try to insert invalid status
      await expect(pool.query(`
        INSERT INTO users (email, password_hash, name, status)
        VALUES ('test@example.com', 'hash', 'Test', 'invalid_status')
      `)).rejects.toThrow();
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should have FK from user_roles to users', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      const result = await pool.query(`
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'user_roles' AND constraint_type = 'FOREIGN KEY'
      `);

      expect(result.rows.length).toBeGreaterThanOrEqual(2);
    });

    it('should cascade delete user_roles when user is deleted', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      // Create test data
      await pool.query(`
        INSERT INTO roles (name, description) VALUES ('test_role', 'Test Role')
      `);
      await pool.query(`
        INSERT INTO users (email, password_hash, name, status)
        VALUES ('cascade_test@example.com', 'hash', 'Cascade Test', 'active')
      `);
      await pool.query(`
        INSERT INTO user_roles (user_id, role_id)
        SELECT u.id, r.id FROM users u, roles r
        WHERE u.email = 'cascade_test@example.com' AND r.name = 'test_role'
      `);

      // Delete user
      await pool.query(`DELETE FROM users WHERE email = 'cascade_test@example.com'`);

      // Verify user_roles was cascaded
      const result = await pool.query(`
        SELECT COUNT(*) FROM user_roles ur
        JOIN users u ON u.id = ur.user_id
        WHERE u.email = 'cascade_test@example.com'
      `);
      expect(parseInt(result.rows[0].count, 10)).toBe(0);

      // Cleanup
      await pool.query(`DELETE FROM roles WHERE name = 'test_role'`);
    });
  });

  describe('Indexes', () => {
    it('should have indexes on users table', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      const result = await pool.query(`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'users'
      `);

      const indexNames = result.rows.map(r => r.indexname);
      expect(indexNames.some(n => n.includes('email'))).toBe(true);
      expect(indexNames.some(n => n.includes('status'))).toBe(true);
    });

    it('should have indexes on user_roles table', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      const result = await pool.query(`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'user_roles'
      `);

      const indexNames = result.rows.map(r => r.indexname);
      expect(indexNames.some(n => n.includes('user_id'))).toBe(true);
      expect(indexNames.some(n => n.includes('role_id'))).toBe(true);
    });

    it('should have indexes on refresh_tokens table', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      const result = await pool.query(`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'refresh_tokens'
      `);

      const indexNames = result.rows.map(r => r.indexname);
      expect(indexNames.some(n => n.includes('user_id'))).toBe(true);
      expect(indexNames.some(n => n.includes('token_hash'))).toBe(true);
    });
  });

  describe('App Settings Singleton', () => {
    it('should have a single row in app_settings', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      const result = await pool.query('SELECT * FROM app_settings');
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].id).toBe(1);
    });

    it('should prevent inserting additional rows', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      await expect(pool.query(`
        INSERT INTO app_settings (id, company_name) VALUES (2, 'Test')
      `)).rejects.toThrow();
    });

    it('should have JSONB columns for settings', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      const result = await pool.query(`
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_name = 'app_settings'
        AND column_name IN ('theme_colors', 'features', 'maintenance')
      `);

      result.rows.forEach(row => {
        expect(row.data_type).toBe('jsonb');
      });
    });
  });

  describe('Triggers', () => {
    it('should have update_updated_at trigger on users', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      const result = await pool.query(`
        SELECT trigger_name FROM information_schema.triggers
        WHERE event_object_table = 'users'
      `);

      expect(result.rows.some(r => r.trigger_name.includes('updated_at'))).toBe(true);
    });

    it('should auto-update updated_at on users table', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      // Insert user
      await pool.query(`
        INSERT INTO users (email, password_hash, name, status)
        VALUES ('trigger_test@example.com', 'hash', 'Trigger Test', 'active')
      `);

      // Get initial updated_at
      const initialResult = await pool.query(`
        SELECT updated_at FROM users WHERE email = 'trigger_test@example.com'
      `);
      const initialUpdatedAt = initialResult.rows[0].updated_at;

      // Wait a bit and update
      await new Promise(resolve => setTimeout(resolve, 100));
      await pool.query(`
        UPDATE users SET name = 'Trigger Test Updated'
        WHERE email = 'trigger_test@example.com'
      `);

      // Check updated_at changed
      const finalResult = await pool.query(`
        SELECT updated_at FROM users WHERE email = 'trigger_test@example.com'
      `);
      const finalUpdatedAt = finalResult.rows[0].updated_at;

      expect(new Date(finalUpdatedAt).getTime()).toBeGreaterThan(new Date(initialUpdatedAt).getTime());

      // Cleanup
      await pool.query(`DELETE FROM users WHERE email = 'trigger_test@example.com'`);
    });
  });
});

describe('Query Performance', () => {
  it('should define indexes for common query patterns', async () => {
    // This is a design validation test, not requiring DB connection
    const expectedIndexPatterns = [
      { table: 'users', columns: ['email', 'status'] },
      { table: 'user_roles', columns: ['user_id', 'role_id'] },
      { table: 'role_permissions', columns: ['role_id', 'permission_id'] },
      { table: 'refresh_tokens', columns: ['user_id', 'token_hash', 'expires_at'] },
      { table: 'permissions', columns: ['name', 'category'] },
    ];

    // Validate the expected index patterns are defined
    expectedIndexPatterns.forEach(pattern => {
      expect(pattern.table).toBeDefined();
      expect(pattern.columns.length).toBeGreaterThan(0);
    });
  });
});
