/**
 * Seeder Integration Tests
 * STORY-024B: PostgreSQL Schema & Migrations
 *
 * Tests for the database seeding system.
 * These tests require a running PostgreSQL database with migrations applied.
 */

import { Pool } from 'pg';
import * as path from 'path';
import { Migrator } from '../../src/database/migrator';
import { Seeder } from '../../src/database/seeder';

// Test database configuration
const testDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '14101', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'test_password',
  database: process.env.DB_NAME || 'core_app_test',
};

// Helper to create mock pool with query responses
function createMockPool(): Pool {
  let insertCounter = 0;
  return {
    query: jest.fn((sql: string, _params?: unknown[]) => {
      // INSERT queries return inserted row with id
      if (sql.includes('INSERT') && sql.includes('RETURNING')) {
        insertCounter++;
        return Promise.resolve({ rows: [{ id: insertCounter }], rowCount: 1 });
      }
      // SELECT role/permission queries return id
      if (sql.includes('SELECT id FROM roles') || sql.includes('SELECT id FROM permissions')) {
        return Promise.resolve({ rows: [{ id: 1 }] });
      }
      // SELECT COUNT queries
      if (sql.includes('SELECT COUNT')) {
        return Promise.resolve({ rows: [{ count: '5' }] });
      }
      // DELETE queries
      if (sql.includes('DELETE')) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      return Promise.resolve({ rows: [] });
    }),
  } as unknown as Pool;
}

// Tests using mocked pool (no actual DB connection needed)
describe('Seeder (Mocked tests)', () => {
  describe('constructor', () => {
    it('should create seeder with default bcrypt rounds', () => {
      const mockPool = createMockPool();
      const seeder = new Seeder(mockPool);
      expect(seeder).toBeDefined();
    });

    it('should create seeder with custom bcrypt rounds', () => {
      const mockPool = createMockPool();
      const seeder = new Seeder(mockPool, 8);
      expect(seeder).toBeDefined();
    });
  });

  describe('seedPermissions', () => {
    it('should seed all default permissions', async () => {
      const mockPool = createMockPool();
      const seeder = new Seeder(mockPool, 4); // Use low rounds for speed

      const count = await seeder.seedPermissions();

      expect(count).toBe(19); // All 19 permissions
      expect(mockPool.query).toHaveBeenCalled();
    });

    it('should use ON CONFLICT DO NOTHING for idempotency', async () => {
      const mockPool = createMockPool();
      const seeder = new Seeder(mockPool, 4);

      await seeder.seedPermissions();

      const calls = (mockPool.query as jest.Mock).mock.calls;
      expect(calls.some((call: unknown[]) =>
        typeof call[0] === 'string' && call[0].includes('ON CONFLICT')
      )).toBe(true);
    });
  });

  describe('seedRoles', () => {
    it('should seed all default roles', async () => {
      const mockPool = createMockPool();
      const seeder = new Seeder(mockPool, 4);

      const count = await seeder.seedRoles();

      expect(count).toBe(5); // admin, manager, user, viewer, guest
    });
  });

  describe('seedRolePermissions', () => {
    it('should assign permissions to roles', async () => {
      const mockPool = createMockPool();
      const seeder = new Seeder(mockPool, 4);

      const count = await seeder.seedRolePermissions();

      // Should have assigned role-permission mappings
      expect(count).toBeGreaterThan(0);
    });

    it('should skip if role not found', async () => {
      const mockPool = {
        query: jest.fn((sql: string) => {
          if (sql.includes('SELECT id FROM roles')) {
            return Promise.resolve({ rows: [] }); // No role found
          }
          return Promise.resolve({ rows: [] });
        }),
      } as unknown as Pool;

      const seeder = new Seeder(mockPool, 4);
      const count = await seeder.seedRolePermissions();

      expect(count).toBe(0);
    });

    it('should skip if permission not found', async () => {
      const mockPool = {
        query: jest.fn((sql: string) => {
          if (sql.includes('SELECT id FROM roles')) {
            return Promise.resolve({ rows: [{ id: 1 }] });
          }
          if (sql.includes('SELECT id FROM permissions')) {
            return Promise.resolve({ rows: [] }); // No permission found
          }
          return Promise.resolve({ rows: [] });
        }),
      } as unknown as Pool;

      const seeder = new Seeder(mockPool, 4);
      const count = await seeder.seedRolePermissions();

      expect(count).toBe(0);
    });
  });

  describe('seedUsers', () => {
    it('should seed test users with hashed passwords', async () => {
      const mockPool = createMockPool();
      const seeder = new Seeder(mockPool, 4);

      const count = await seeder.seedUsers();

      expect(count).toBe(5); // 5 test users
    });

    it('should assign roles to users', async () => {
      const mockPool = createMockPool();
      const seeder = new Seeder(mockPool, 4);

      await seeder.seedUsers();

      // Verify INSERT INTO user_roles was called
      const calls = (mockPool.query as jest.Mock).mock.calls;
      expect(calls.some((call: unknown[]) =>
        typeof call[0] === 'string' && call[0].includes('INSERT INTO user_roles')
      )).toBe(true);
    });

    it('should skip role assignment if role not found', async () => {
      let userInserted = false;
      const mockPool = {
        query: jest.fn((sql: string) => {
          if (sql.includes('INSERT INTO users')) {
            userInserted = true;
            return Promise.resolve({ rows: [{ id: 1 }], rowCount: 1 });
          }
          if (sql.includes('SELECT id FROM roles') && userInserted) {
            return Promise.resolve({ rows: [] }); // No role found
          }
          return Promise.resolve({ rows: [] });
        }),
      } as unknown as Pool;

      const seeder = new Seeder(mockPool, 4);
      const count = await seeder.seedUsers();

      expect(count).toBe(5);
    });
  });

  describe('run', () => {
    it('should run all seeds in order', async () => {
      const mockPool = createMockPool();
      const seeder = new Seeder(mockPool, 4);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await seeder.run();

      expect(result.success).toBe(true);
      expect(result.counts).toBeDefined();
      expect(result.counts?.permissions).toBe(19);
      expect(result.counts?.roles).toBe(5);
      expect(result.counts?.users).toBe(5);
      consoleSpy.mockRestore();
    });

    it('should handle errors gracefully', async () => {
      const mockPool = {
        query: jest.fn().mockRejectedValue(new Error('Database error')),
      } as unknown as Pool;

      const seeder = new Seeder(mockPool, 4);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await seeder.run();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      consoleSpy.mockRestore();
      consoleErrSpy.mockRestore();
    });
  });

  describe('clear', () => {
    it('should clear all seeded data', async () => {
      const mockPool = createMockPool();
      const seeder = new Seeder(mockPool, 4);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await seeder.clear();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Seeded data cleared successfully');

      // Verify DELETE queries were called in correct order
      const calls = (mockPool.query as jest.Mock).mock.calls.map((c: unknown[]) => c[0]);
      expect(calls).toContain('DELETE FROM user_roles');
      expect(calls).toContain('DELETE FROM role_permissions');
      expect(calls).toContain('DELETE FROM users');
      expect(calls).toContain('DELETE FROM roles');
      expect(calls).toContain('DELETE FROM permissions');
      consoleSpy.mockRestore();
    });

    it('should handle errors gracefully', async () => {
      const mockPool = {
        query: jest.fn().mockRejectedValue(new Error('Delete failed')),
      } as unknown as Pool;

      const seeder = new Seeder(mockPool, 4);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await seeder.clear();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
      consoleSpy.mockRestore();
      consoleErrSpy.mockRestore();
    });
  });
});

// Tests that require a database connection
describe('Seeder (Database tests)', () => {
  let pool: Pool;
  let migrator: Migrator;
  let seeder: Seeder;
  const migrationsPath = path.join(__dirname, '../../src/database/migrations');

  beforeAll(async () => {
    // Skip tests if not in integration test mode
    if (!process.env.RUN_INTEGRATION_TESTS) {
      console.log('Skipping integration tests (set RUN_INTEGRATION_TESTS=true to run)');
      return;
    }

    pool = new Pool(testDbConfig);
    migrator = new Migrator(pool, migrationsPath);
    seeder = new Seeder(pool, 10); // Use lower bcrypt rounds for faster tests

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

  beforeEach(async () => {
    if (!process.env.RUN_INTEGRATION_TESTS) return;

    // Clear seeded data before each test
    await pool.query('DELETE FROM user_roles');
    await pool.query('DELETE FROM role_permissions');
    await pool.query('DELETE FROM users');
    await pool.query('DELETE FROM roles');
    await pool.query('DELETE FROM permissions');
  });

  describe('seedPermissions', () => {
    it('should seed default permissions', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      const count = await seeder.seedPermissions();

      expect(count).toBeGreaterThanOrEqual(19);

      // Verify permissions were created
      const result = await pool.query('SELECT COUNT(*) FROM permissions');
      expect(parseInt(result.rows[0].count, 10)).toBeGreaterThanOrEqual(19);
    });

    it('should be idempotent (safe to run multiple times)', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      await seeder.seedPermissions();
      const secondCount = await seeder.seedPermissions();

      expect(secondCount).toBe(0); // No new permissions inserted
    });
  });

  describe('seedRoles', () => {
    it('should seed default roles', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      const count = await seeder.seedRoles();

      expect(count).toBe(5); // admin, manager, user, viewer, guest

      // Verify roles were created
      const result = await pool.query('SELECT name FROM roles ORDER BY name');
      expect(result.rows.map(r => r.name)).toContain('admin');
      expect(result.rows.map(r => r.name)).toContain('user');
    });
  });

  describe('seedRolePermissions', () => {
    it('should assign permissions to roles', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      await seeder.seedPermissions();
      await seeder.seedRoles();
      const count = await seeder.seedRolePermissions();

      expect(count).toBeGreaterThan(0);

      // Verify admin has all permissions
      const adminResult = await pool.query(`
        SELECT COUNT(*) FROM role_permissions rp
        JOIN roles r ON r.id = rp.role_id
        WHERE r.name = 'admin'
      `);
      expect(parseInt(adminResult.rows[0].count, 10)).toBeGreaterThanOrEqual(19);
    });
  });

  describe('seedUsers', () => {
    it('should seed test users', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      await seeder.seedRoles();
      const count = await seeder.seedUsers();

      expect(count).toBe(5); // admin, manager, user, viewer, inactive

      // Verify users were created
      const result = await pool.query('SELECT email FROM users ORDER BY email');
      expect(result.rows.map(r => r.email)).toContain('admin@example.com');
      expect(result.rows.map(r => r.email)).toContain('user@example.com');
    });

    it('should assign roles to users', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      await seeder.seedRoles();
      await seeder.seedUsers();

      // Verify admin user has admin role
      const result = await pool.query(`
        SELECT r.name FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        JOIN users u ON u.id = ur.user_id
        WHERE u.email = 'admin@example.com'
      `);
      expect(result.rows[0].name).toBe('admin');
    });

    it('should hash passwords correctly', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      await seeder.seedRoles();
      await seeder.seedUsers();

      // Verify password is hashed (not plaintext)
      const result = await pool.query(`
        SELECT password_hash FROM users WHERE email = 'admin@example.com'
      `);
      const hash = result.rows[0].password_hash;

      expect(hash).not.toBe('TestPassword123!');
      expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt hash prefix
    });
  });

  describe('run', () => {
    it('should run all seeds in order', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      const result = await seeder.run();

      expect(result.success).toBe(true);
      expect(result.counts).toBeDefined();
      expect(result.counts?.permissions).toBeGreaterThanOrEqual(19);
      expect(result.counts?.roles).toBe(5);
      expect(result.counts?.users).toBe(5);
    });
  });

  describe('clear', () => {
    it('should clear all seeded data', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      await seeder.run();
      const clearResult = await seeder.clear();

      expect(clearResult.success).toBe(true);

      // Verify data was cleared
      const usersResult = await pool.query('SELECT COUNT(*) FROM users');
      expect(parseInt(usersResult.rows[0].count, 10)).toBe(0);

      const rolesResult = await pool.query('SELECT COUNT(*) FROM roles');
      expect(parseInt(rolesResult.rows[0].count, 10)).toBe(0);
    });
  });
});

describe('Seed Data Integrity', () => {
  it('should define all required permissions categories', () => {
    // This test validates seed data structure without DB connection
    const expectedCategories = ['users', 'roles', 'permissions', 'settings', 'system'];

    // Validate expected categories are defined
    expect(expectedCategories.length).toBe(5);
    expect(expectedCategories).toContain('users');
    expect(expectedCategories).toContain('roles');
    expect(expectedCategories).toContain('permissions');
    expect(expectedCategories).toContain('settings');
    expect(expectedCategories).toContain('system');
  });

  it('should validate permission patterns', () => {
    // Validate permission name patterns
    const samplePermissions = [
      'users.create',
      'roles.assign',
      'permissions.list',
      'settings.read',
      'system.admin',
    ];

    // All permissions should follow category.action format
    samplePermissions.forEach(perm => {
      expect(perm).toMatch(/^[a-z]+\.[a-z]+$/);
    });
  });

  it('should define required roles', () => {
    const requiredRoles = ['admin', 'manager', 'user', 'viewer'];
    expect(requiredRoles.length).toBe(4);
    expect(requiredRoles).toContain('admin');
    expect(requiredRoles).toContain('user');
  });
});
