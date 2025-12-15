/**
 * Migrator Integration Tests
 * STORY-024B: PostgreSQL Schema & Migrations
 *
 * Tests for the database migration system.
 * These tests require a running PostgreSQL database.
 */

import { Pool, PoolClient } from 'pg';
import * as path from 'path';
import * as fs from 'fs';
import { Migrator } from '../../src/database/migrator';

// Test database configuration
const testDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '14101', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'test_password',
  database: process.env.DB_NAME || 'core_app_test',
};

// Helper to create mock pool with query responses
function createMockPool(queryResponses: Record<string, { rows: unknown[] }> = {}): Pool {
  const defaultResponses: Record<string, { rows: unknown[] }> = {
    'CREATE TABLE': { rows: [] },
    'CREATE INDEX': { rows: [] },
    'SELECT': { rows: [] },
    ...queryResponses,
  };

  return {
    query: jest.fn((sql: string) => {
      for (const [key, response] of Object.entries(defaultResponses)) {
        if (sql.includes(key)) {
          return Promise.resolve(response);
        }
      }
      return Promise.resolve({ rows: [] });
    }),
    connect: jest.fn(),
  } as unknown as Pool;
}

// Helper to create mock pool client
function createMockClient(): PoolClient {
  return {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    release: jest.fn(),
  } as unknown as PoolClient;
}

// Tests that don't require a database connection
describe('Migrator (File-based tests)', () => {
  const migrationsPath = path.join(__dirname, '../../src/database/migrations');
  // Create a mock pool for file-based tests only
  const mockPool = {} as Pool;
  const migrator = new Migrator(mockPool, migrationsPath);

  describe('loadMigrationFiles', () => {
    it('should load all migration files from the migrations directory', () => {
      const files = migrator.loadMigrationFiles();

      expect(files.length).toBeGreaterThanOrEqual(7);
      expect(files[0].version).toBe('001');
      expect(files[0].name).toContain('create-users-table');
    });

    it('should parse UP and DOWN sections correctly', () => {
      const files = migrator.loadMigrationFiles();
      const usersFile = files.find(f => f.name.includes('create-users-table'));

      expect(usersFile).toBeDefined();
      expect(usersFile?.upSql).toContain('CREATE TABLE users');
      expect(usersFile?.downSql).toContain('DROP TABLE IF EXISTS users');
    });

    it('should generate checksums for migration files', () => {
      const files = migrator.loadMigrationFiles();

      files.forEach(file => {
        expect(file.checksum).toBeDefined();
        expect(file.checksum.length).toBe(64); // SHA-256 hex length
      });
    });

    it('should return empty array if migrations path does not exist', () => {
      const nonExistentMigrator = new Migrator(mockPool, '/non/existent/path');
      const files = nonExistentMigrator.loadMigrationFiles();
      expect(files).toEqual([]);
    });

    it('should skip files that do not match migration naming pattern', () => {
      const files = migrator.loadMigrationFiles();
      // All files should have proper naming format
      files.forEach(file => {
        expect(file.version).toMatch(/^\d{3,}$/);
        expect(file.filename).toMatch(/^\d{3,}[-_].+\.sql$/);
      });
    });
  });
});

// Tests using mocked pool (no actual DB connection needed)
describe('Migrator (Mocked tests)', () => {
  const migrationsPath = path.join(__dirname, '../../src/database/migrations');

  describe('ensureMigrationsTable', () => {
    it('should call pool.query with CREATE TABLE statement', async () => {
      const mockPool = createMockPool();
      const migrator = new Migrator(mockPool, migrationsPath);

      await migrator.ensureMigrationsTable();

      expect(mockPool.query).toHaveBeenCalled();
      const callArgs = (mockPool.query as jest.Mock).mock.calls[0][0];
      expect(callArgs).toContain('CREATE TABLE IF NOT EXISTS');
      expect(callArgs).toContain('schema_migrations');
    });
  });

  describe('getExecutedMigrations', () => {
    it('should return executed migrations from the database', async () => {
      const mockMigrations = [
        { id: 1, name: '001_create-users', executed_at: new Date(), checksum: 'abc123' },
        { id: 2, name: '002_create-roles', executed_at: new Date(), checksum: 'def456' },
      ];

      const mockPool = createMockPool({
        'SELECT': { rows: mockMigrations },
      });
      const migrator = new Migrator(mockPool, migrationsPath);

      const result = await migrator.getExecutedMigrations();

      expect(result).toEqual(mockMigrations);
    });

    it('should return empty array when no migrations executed', async () => {
      const mockPool = createMockPool({ 'SELECT': { rows: [] } });
      const migrator = new Migrator(mockPool, migrationsPath);

      const result = await migrator.getExecutedMigrations();

      expect(result).toEqual([]);
    });
  });

  describe('getPendingMigrations', () => {
    it('should return migrations not yet executed', async () => {
      // Mock: no migrations executed yet
      const mockPool = createMockPool({ 'SELECT': { rows: [] } });
      const migrator = new Migrator(mockPool, migrationsPath);

      const pending = await migrator.getPendingMigrations();

      expect(pending.length).toBeGreaterThanOrEqual(7);
      expect(pending[0].name).toContain('create-users-table');
    });

    it('should exclude already executed migrations', async () => {
      // Mock: first migration already executed
      const mockPool = createMockPool({
        'SELECT': { rows: [{ id: 1, name: '001_create-users-table', checksum: 'test' }] },
      });
      const migrator = new Migrator(mockPool, migrationsPath);

      const pending = await migrator.getPendingMigrations();

      expect(pending.find(m => m.name === '001_create-users-table')).toBeUndefined();
    });
  });

  describe('up', () => {
    it('should log message when no pending migrations', async () => {
      // Mock: all migrations already executed
      const allMigrations = new Migrator({} as Pool, migrationsPath).loadMigrationFiles();
      const executedMigrations = allMigrations.map((m, i) => ({
        id: i + 1,
        name: m.name,
        executed_at: new Date(),
        checksum: m.checksum,
      }));

      const mockPool = createMockPool({
        'SELECT': { rows: executedMigrations },
      });
      const migrator = new Migrator(mockPool, migrationsPath);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const results = await migrator.up();

      expect(results).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('No pending migrations.');
      consoleSpy.mockRestore();
    });

    it('should run pending migrations in order', async () => {
      const mockClient = createMockClient();
      const mockPool = createMockPool({ 'SELECT': { rows: [] } });
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      const migrator = new Migrator(mockPool, migrationsPath);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const results = await migrator.up();

      expect(results.length).toBeGreaterThanOrEqual(7);
      expect(results.every(r => r.success)).toBe(true);
      expect(results.every(r => r.direction === 'up')).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should rollback on migration error', async () => {
      const mockClient = createMockClient();
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('Migration failed')); // UP SQL

      const mockPool = createMockPool({ 'SELECT': { rows: [] } });
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      const migrator = new Migrator(mockPool, migrationsPath);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(migrator.up()).rejects.toThrow();
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      consoleSpy.mockRestore();
      consoleErrSpy.mockRestore();
    });
  });

  describe('down', () => {
    it('should log message when no migrations to rollback', async () => {
      const mockPool = createMockPool({ 'SELECT': { rows: [] } });
      const migrator = new Migrator(mockPool, migrationsPath);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const results = await migrator.down();

      expect(results).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('No migrations to rollback.');
      consoleSpy.mockRestore();
    });

    it('should rollback specified number of migrations', async () => {
      const allMigrations = new Migrator({} as Pool, migrationsPath).loadMigrationFiles();
      const executedMigrations = allMigrations.slice(0, 3).map((m, i) => ({
        id: i + 1,
        name: m.name,
        executed_at: new Date(),
        checksum: m.checksum,
      }));

      const mockClient = createMockClient();
      const mockPool = createMockPool({ 'SELECT': { rows: executedMigrations } });
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      const migrator = new Migrator(mockPool, migrationsPath);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const results = await migrator.down(2);

      expect(results.length).toBe(2);
      expect(results.every(r => r.direction === 'down')).toBe(true);
      consoleSpy.mockRestore();
    });

    it('should throw error if migration file not found', async () => {
      const mockPool = createMockPool({
        'SELECT': { rows: [{ id: 1, name: 'non_existent_migration', checksum: 'test' }] },
      });
      (mockPool.connect as jest.Mock).mockResolvedValue(createMockClient());

      const migrator = new Migrator(mockPool, migrationsPath);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await expect(migrator.down(1)).rejects.toThrow('Migration file not found');
      consoleSpy.mockRestore();
    });
  });

  describe('reset', () => {
    it('should call down with count of all executed migrations', async () => {
      const allMigrations = new Migrator({} as Pool, migrationsPath).loadMigrationFiles();
      const executedMigrations = allMigrations.slice(0, 2).map((m, i) => ({
        id: i + 1,
        name: m.name,
        executed_at: new Date(),
        checksum: m.checksum,
      }));

      const mockClient = createMockClient();
      const mockPool = createMockPool({ 'SELECT': { rows: executedMigrations } });
      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      const migrator = new Migrator(mockPool, migrationsPath);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const results = await migrator.reset();

      expect(results.length).toBe(2);
      consoleSpy.mockRestore();
    });
  });

  describe('status', () => {
    it('should return migration status with executed and pending', async () => {
      const allMigrations = new Migrator({} as Pool, migrationsPath).loadMigrationFiles();
      const executedMigrations = allMigrations.slice(0, 2).map((m, i) => ({
        id: i + 1,
        name: m.name,
        executed_at: new Date(),
        checksum: m.checksum,
      }));

      const mockPool = createMockPool({ 'SELECT': { rows: executedMigrations } });
      const migrator = new Migrator(mockPool, migrationsPath);

      const status = await migrator.status();

      expect(status.executed.length).toBe(2);
      expect(status.pending.length).toBe(allMigrations.length - 2);
      expect(status.total).toBe(allMigrations.length);
    });
  });

  describe('validateChecksums', () => {
    it('should return valid when all checksums match', async () => {
      const allMigrations = new Migrator({} as Pool, migrationsPath).loadMigrationFiles();
      const executedMigrations = allMigrations.slice(0, 2).map((m, i) => ({
        id: i + 1,
        name: m.name,
        executed_at: new Date(),
        checksum: m.checksum, // Use actual checksum
      }));

      const mockPool = createMockPool({ 'SELECT': { rows: executedMigrations } });
      const migrator = new Migrator(mockPool, migrationsPath);

      const result = await migrator.validateChecksums();

      expect(result.valid).toBe(true);
      expect(result.mismatches).toEqual([]);
    });

    it('should return mismatches when checksums differ', async () => {
      const allMigrations = new Migrator({} as Pool, migrationsPath).loadMigrationFiles();
      const executedMigrations = [{
        id: 1,
        name: allMigrations[0].name,
        executed_at: new Date(),
        checksum: 'wrong_checksum', // Mismatched checksum
      }];

      const mockPool = createMockPool({ 'SELECT': { rows: executedMigrations } });
      const migrator = new Migrator(mockPool, migrationsPath);

      const result = await migrator.validateChecksums();

      expect(result.valid).toBe(false);
      expect(result.mismatches.length).toBe(1);
      expect(result.mismatches[0].name).toBe(allMigrations[0].name);
      expect(result.mismatches[0].expected).toBe('wrong_checksum');
      expect(result.mismatches[0].actual).toBe(allMigrations[0].checksum);
    });
  });
});

// Tests that require a database connection
describe('Migrator (Database tests)', () => {
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

    // Clean up any existing migrations table
    await pool.query('DROP TABLE IF EXISTS schema_migrations CASCADE');
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  beforeEach(async () => {
    if (!process.env.RUN_INTEGRATION_TESTS) return;

    // Reset migration state before each test
    await pool.query('DROP TABLE IF EXISTS schema_migrations CASCADE');
    await pool.query('DROP TABLE IF EXISTS refresh_tokens CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_roles CASCADE');
    await pool.query('DROP TABLE IF EXISTS role_permissions CASCADE');
    await pool.query('DROP TABLE IF EXISTS app_settings CASCADE');
    await pool.query('DROP TABLE IF EXISTS permissions CASCADE');
    await pool.query('DROP TABLE IF EXISTS roles CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    await pool.query('DROP FUNCTION IF EXISTS update_updated_at_column CASCADE');
  });

  describe('ensureMigrationsTable', () => {
    it('should create the schema_migrations table if it does not exist', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      await migrator.ensureMigrationsTable();

      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'schema_migrations'
        );
      `);

      expect(result.rows[0].exists).toBe(true);
    });
  });

  describe('up', () => {
    it('should run all pending migrations', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      const results = await migrator.up();

      expect(results.length).toBeGreaterThanOrEqual(7);
      expect(results.every(r => r.success)).toBe(true);

      // Verify tables were created
      const tablesResult = await pool.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('users', 'roles', 'permissions', 'user_roles', 'role_permissions', 'app_settings', 'refresh_tokens')
      `);

      expect(tablesResult.rows.length).toBe(7);
    });

    it('should skip already executed migrations', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      // Run migrations first time
      await migrator.up();

      // Run migrations second time
      const results = await migrator.up();

      expect(results.length).toBe(0);
    });
  });

  describe('down', () => {
    it('should rollback the last migration', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      // First run migrations
      await migrator.up();

      // Rollback one migration
      const results = await migrator.down(1);

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
      expect(results[0].direction).toBe('down');

      // Verify refresh_tokens table was dropped
      const tableResult = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'refresh_tokens'
        );
      `);

      expect(tableResult.rows[0].exists).toBe(false);
    });

    it('should rollback multiple migrations', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      // First run migrations
      await migrator.up();

      // Rollback 2 migrations
      const results = await migrator.down(2);

      expect(results.length).toBe(2);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('status', () => {
    it('should return migration status', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      const status = await migrator.status();

      expect(status.executed).toHaveLength(0);
      expect(status.pending.length).toBeGreaterThanOrEqual(7);
      expect(status.total).toBe(status.executed.length + status.pending.length);
    });

    it('should show executed migrations after running', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      await migrator.up();
      const status = await migrator.status();

      expect(status.executed.length).toBeGreaterThanOrEqual(7);
      expect(status.pending).toHaveLength(0);
    });
  });

  describe('validateChecksums', () => {
    it('should validate checksums for executed migrations', async () => {
      if (!process.env.RUN_INTEGRATION_TESTS) {
        console.log('Skipping - set RUN_INTEGRATION_TESTS=true');
        return;
      }

      await migrator.up();
      const validation = await migrator.validateChecksums();

      expect(validation.valid).toBe(true);
      expect(validation.mismatches).toHaveLength(0);
    });
  });
});

describe('Migration SQL Syntax', () => {
  const migrationsPath = path.join(__dirname, '../../src/database/migrations');

  it('should have valid SQL syntax for all UP migrations', () => {
    const files = fs.readdirSync(migrationsPath).filter(f => f.endsWith('.sql'));

    files.forEach(filename => {
      const content = fs.readFileSync(path.join(migrationsPath, filename), 'utf-8');

      // Check for basic SQL syntax issues
      expect(content).not.toMatch(/;;/); // Double semicolons
      expect(content).toContain('-- UP'); // Must have UP section
    });
  });

  it('should have valid SQL syntax for all DOWN migrations', () => {
    const files = fs.readdirSync(migrationsPath).filter(f => f.endsWith('.sql'));

    files.forEach(filename => {
      const content = fs.readFileSync(path.join(migrationsPath, filename), 'utf-8');

      // Check for DOWN section
      expect(content).toContain('-- DOWN');

      // Extract DOWN section and verify it has content
      const downMatch = content.match(/--\s*DOWN\s*([\s\S]*?)$/i);
      expect(downMatch).toBeTruthy();
      expect(downMatch?.[1].trim().length).toBeGreaterThan(0);
    });
  });

  it('should have proper naming convention for migration files', () => {
    const files = fs.readdirSync(migrationsPath).filter(f => f.endsWith('.sql'));

    files.forEach(filename => {
      // Should match pattern: NNN-description.sql
      const match = filename.match(/^(\d{3,})-(.+)\.sql$/);
      expect(match).toBeTruthy();
    });
  });
});
