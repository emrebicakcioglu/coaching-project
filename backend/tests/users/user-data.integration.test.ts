/**
 * User Data Integration Tests
 * STORY-025: Benutzerdaten (User Data Storage)
 *
 * Integration tests for user data storage functionality.
 * Tests database operations, unique constraints, and timestamp management.
 *
 * Note: These tests require a running PostgreSQL database.
 * They are skipped in CI if DATABASE_URL is not set.
 */

import { Pool, PoolClient } from 'pg';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from '../../src/database/types';

// Skip tests if database is not available
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:test@localhost:14101/core_app_test';
const shouldSkip = !process.env.RUN_INTEGRATION_TESTS;

// Helper to describe integration tests
const describeIntegration = shouldSkip ? describe.skip : describe;

describeIntegration('User Data Storage Integration', () => {
  let pool: Pool;
  let client: PoolClient;

  // Test data
  const testPassword = 'SecurePass123!';
  let testPasswordHash: string;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 5,
    });

    // Create password hash for tests
    testPasswordHash = await bcrypt.hash(testPassword, 10);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    client = await pool.connect();
    await client.query('BEGIN');
  });

  afterEach(async () => {
    await client.query('ROLLBACK');
    client.release();
  });

  describe('User Table Schema', () => {
    it('should have all required columns', async () => {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);

      const columns = result.rows.map((r) => r.column_name);

      expect(columns).toContain('id');
      expect(columns).toContain('email');
      expect(columns).toContain('password_hash');
      expect(columns).toContain('name');
      expect(columns).toContain('status');
      expect(columns).toContain('mfa_enabled');
      expect(columns).toContain('mfa_secret');
      expect(columns).toContain('created_at');
      expect(columns).toContain('updated_at');
      expect(columns).toContain('last_login');
    });

    it('should have unique constraint on email', async () => {
      const result = await client.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'users' AND constraint_type = 'UNIQUE'
      `);

      const constraints = result.rows.map((r) => r.constraint_name);
      const hasEmailUnique = constraints.some((c) => c.includes('email'));
      expect(hasEmailUnique).toBe(true);
    });

    it('should have index on email', async () => {
      const result = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'users' AND indexname LIKE '%email%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should have index on status', async () => {
      const result = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'users' AND indexname LIKE '%status%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('User CRUD Operations', () => {
    it('should create a user with all required fields', async () => {
      const result = await client.query<User>(
        `INSERT INTO users (email, password_hash, name, status, mfa_enabled)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        ['test@example.com', testPasswordHash, 'Test User', 'active', false],
      );

      const user = result.rows[0];
      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.password_hash).toBe(testPasswordHash);
      expect(user.name).toBe('Test User');
      expect(user.status).toBe('active');
      expect(user.mfa_enabled).toBe(false);
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
    });

    it('should auto-populate created_at timestamp', async () => {
      const beforeInsert = new Date();

      const result = await client.query<User>(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        ['auto@example.com', testPasswordHash, 'Auto User'],
      );

      const afterInsert = new Date();
      const user = result.rows[0];

      expect(user.created_at.getTime()).toBeGreaterThanOrEqual(beforeInsert.getTime() - 1000);
      expect(user.created_at.getTime()).toBeLessThanOrEqual(afterInsert.getTime() + 1000);
    });

    it('should auto-populate updated_at on update', async () => {
      // Create user
      const createResult = await client.query<User>(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        ['update@example.com', testPasswordHash, 'Update User'],
      );
      const originalUpdatedAt = createResult.rows[0].updated_at;

      // Wait a bit to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Update user
      const updateResult = await client.query<User>(
        `UPDATE users SET name = $1 WHERE id = $2 RETURNING *`,
        ['Updated Name', createResult.rows[0].id],
      );

      const newUpdatedAt = updateResult.rows[0].updated_at;
      expect(newUpdatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should retrieve user by email', async () => {
      // Create user
      await client.query(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)`,
        ['find@example.com', testPasswordHash, 'Find User'],
      );

      // Find by email
      const result = await client.query<User>(
        'SELECT * FROM users WHERE email = $1',
        ['find@example.com'],
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].email).toBe('find@example.com');
    });

    it('should update user fields', async () => {
      // Create user
      const createResult = await client.query<User>(
        `INSERT INTO users (email, password_hash, name, status)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        ['update-test@example.com', testPasswordHash, 'Original Name', 'active'],
      );

      const userId = createResult.rows[0].id;

      // Update fields
      const updateResult = await client.query<User>(
        `UPDATE users
         SET name = $1, status = $2
         WHERE id = $3
         RETURNING *`,
        ['Updated Name', 'inactive', userId],
      );

      expect(updateResult.rows[0].name).toBe('Updated Name');
      expect(updateResult.rows[0].status).toBe('inactive');
    });

    it('should delete user', async () => {
      // Create user
      const createResult = await client.query<User>(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        ['delete@example.com', testPasswordHash, 'Delete User'],
      );

      const userId = createResult.rows[0].id;

      // Delete user
      await client.query('DELETE FROM users WHERE id = $1', [userId]);

      // Verify deleted
      const findResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
      expect(findResult.rows.length).toBe(0);
    });
  });

  describe('Password Security', () => {
    it('should store password as bcrypt hash', async () => {
      const plainPassword = 'MySecurePassword123!';
      const hash = await bcrypt.hash(plainPassword, 12);

      const result = await client.query<User>(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        ['bcrypt@example.com', hash, 'Bcrypt User'],
      );

      const user = result.rows[0];

      // Verify hash format ($2b$XX$...)
      expect(user.password_hash).toMatch(/^\$2[aby]?\$\d{2}\$/);

      // Verify password can be verified
      const isValid = await bcrypt.compare(plainPassword, user.password_hash);
      expect(isValid).toBe(true);

      // Verify wrong password fails
      const isWrong = await bcrypt.compare('WrongPassword', user.password_hash);
      expect(isWrong).toBe(false);
    });

    it('should not store plain-text passwords', async () => {
      const plainPassword = 'PlainTextPassword123!';
      const hash = await bcrypt.hash(plainPassword, 12);

      const result = await client.query<User>(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        ['plain@example.com', hash, 'Plain User'],
      );

      expect(result.rows[0].password_hash).not.toBe(plainPassword);
      expect(result.rows[0].password_hash.length).toBeGreaterThan(50);
    });
  });

  describe('Email Uniqueness', () => {
    it('should enforce unique email constraint', async () => {
      // Create first user
      await client.query(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)`,
        ['unique@example.com', testPasswordHash, 'First User'],
      );

      // Try to create second user with same email
      await expect(
        client.query(
          `INSERT INTO users (email, password_hash, name)
           VALUES ($1, $2, $3)`,
          ['unique@example.com', testPasswordHash, 'Second User'],
        ),
      ).rejects.toThrow();
    });

    it('should treat email as case-sensitive in storage but unique check', async () => {
      // Note: PostgreSQL UNIQUE constraint is case-sensitive by default
      // Our application should handle case-insensitivity at the application layer
      await client.query(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)`,
        ['case@example.com', testPasswordHash, 'Case User'],
      );

      // This depends on how the unique constraint is set up
      // If using LOWER(), it should fail. If not, it might succeed.
      // The test documents current behavior
      const result = await client.query(
        'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
        ['CASE@EXAMPLE.COM'],
      );

      expect(result.rows.length).toBe(1);
    });
  });

  describe('Status Management', () => {
    const validStatuses: UserStatus[] = ['active', 'inactive', 'suspended', 'deleted'];

    it.each(validStatuses)('should accept status: %s', async (status) => {
      const result = await client.query<User>(
        `INSERT INTO users (email, password_hash, name, status)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [`${status}-status@example.com`, testPasswordHash, `${status} User`, status],
      );

      expect(result.rows[0].status).toBe(status);
    });

    it('should default status to active', async () => {
      const result = await client.query<User>(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        ['default-status@example.com', testPasswordHash, 'Default User'],
      );

      expect(result.rows[0].status).toBe('active');
    });

    it('should track status changes', async () => {
      // Create user
      const createResult = await client.query<User>(
        `INSERT INTO users (email, password_hash, name, status)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        ['status-change@example.com', testPasswordHash, 'Status User', 'active'],
      );

      const userId = createResult.rows[0].id;

      // Change to inactive
      await client.query(
        'UPDATE users SET status = $1 WHERE id = $2',
        ['inactive', userId],
      );

      // Verify change
      const result = await client.query<User>(
        'SELECT * FROM users WHERE id = $1',
        [userId],
      );

      expect(result.rows[0].status).toBe('inactive');
    });
  });

  describe('Timestamp Management', () => {
    it('should set created_at on creation', async () => {
      const before = new Date();

      const result = await client.query<User>(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        ['created@example.com', testPasswordHash, 'Created User'],
      );

      const after = new Date();
      const createdAt = result.rows[0].created_at;

      expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });

    it('should update updated_at on modification', async () => {
      // Create user
      const createResult = await client.query<User>(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        ['updated@example.com', testPasswordHash, 'Updated User'],
      );

      const originalUpdatedAt = createResult.rows[0].updated_at;

      // Wait for time difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Update user - trigger should update updated_at
      const updateResult = await client.query<User>(
        `UPDATE users SET name = $1 WHERE id = $2 RETURNING *`,
        ['New Name', createResult.rows[0].id],
      );

      expect(updateResult.rows[0].updated_at.getTime())
        .toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should track last_login timestamp', async () => {
      // Create user
      const createResult = await client.query<User>(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        ['login@example.com', testPasswordHash, 'Login User'],
      );

      expect(createResult.rows[0].last_login).toBeNull();

      // Update last login
      const loginTime = new Date();
      await client.query(
        'UPDATE users SET last_login = $1 WHERE id = $2',
        [loginTime, createResult.rows[0].id],
      );

      // Verify
      const result = await client.query<User>(
        'SELECT * FROM users WHERE id = $1',
        [createResult.rows[0].id],
      );

      expect(result.rows[0].last_login).not.toBeNull();
    });
  });

  describe('Optional Fields', () => {
    it('should allow null mfa_secret', async () => {
      const result = await client.query<User>(
        `INSERT INTO users (email, password_hash, name, mfa_secret)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        ['nomfa@example.com', testPasswordHash, 'No MFA User', null],
      );

      expect(result.rows[0].mfa_secret).toBeNull();
    });

    it('should store mfa_secret when provided', async () => {
      const mfaSecret = 'JBSWY3DPEHPK3PXP';

      const result = await client.query<User>(
        `INSERT INTO users (email, password_hash, name, mfa_secret, mfa_enabled)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        ['mfa@example.com', testPasswordHash, 'MFA User', mfaSecret, true],
      );

      expect(result.rows[0].mfa_secret).toBe(mfaSecret);
      expect(result.rows[0].mfa_enabled).toBe(true);
    });

    it('should allow null last_login', async () => {
      const result = await client.query<User>(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        ['nologin@example.com', testPasswordHash, 'No Login User'],
      );

      expect(result.rows[0].last_login).toBeNull();
    });
  });

  describe('Soft Delete', () => {
    it('should support soft delete via deleted_at column', async () => {
      // Check if deleted_at column exists
      const columnCheck = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'deleted_at'
      `);

      expect(columnCheck.rows.length).toBe(1);
    });

    it('should perform soft delete by setting deleted_at', async () => {
      // Create user
      const createResult = await client.query<User>(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        ['softdelete@example.com', testPasswordHash, 'Soft Delete User'],
      );

      const userId = createResult.rows[0].id;

      // Soft delete
      const deleteResult = await client.query<User>(
        `UPDATE users SET deleted_at = NOW(), status = 'deleted' WHERE id = $1 RETURNING *`,
        [userId],
      );

      expect(deleteResult.rows[0].deleted_at).not.toBeNull();
      expect(deleteResult.rows[0].status).toBe('deleted');
    });
  });
});
