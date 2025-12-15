/**
 * Database Integration Tests
 * STORY-024A: PostgreSQL Database Setup
 *
 * These tests verify the database connectivity against a real PostgreSQL instance.
 * They are designed to run in CI/CD environments where Docker containers are available.
 *
 * Note: These tests require a running PostgreSQL instance.
 * Set DB_INTEGRATION_TEST=true to enable these tests.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  DatabasePool,
  withTransaction,
  TransactionManager,
} from '../../src/database';
import { EnvConfig } from '../../src/config/env';

// Skip integration tests unless explicitly enabled
const shouldRunIntegrationTests = process.env.DB_INTEGRATION_TEST === 'true';

// Create test environment configuration
const createTestEnv = (): EnvConfig => ({
  NODE_ENV: 'test',
  APP_PORT: 4102,
  APP_HOST: 'localhost',
  APP_URL: 'http://localhost:4102',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '14101', 10),
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'your_secure_password_here',
  DB_NAME: process.env.DB_NAME || 'core_app',
  DB_SSL: false,
  DB_POOL_MAX: 5, // Use smaller pool for tests
  DB_POOL_IDLE_TIMEOUT_MS: 10000,
  DB_POOL_CONNECTION_TIMEOUT_MS: 5000,
  JWT_SECRET: 'test-jwt-secret-that-is-at-least-32-characters',
  JWT_EXPIRES_IN: '24h',
  JWT_REFRESH_EXPIRES_IN: '30d',
  RESEND_API_KEY: 're_test_key',
  EMAIL_FROM_NAME: 'Test',
  EMAIL_FROM_ADDRESS: 'test@example.com',
  BCRYPT_ROUNDS: 12,
  RATE_LIMIT_WINDOW_MS: 60000,
  RATE_LIMIT_MAX_REQUESTS: 100,
  LOG_LEVEL: 'info',
  LOG_FILE_PATH: './logs/app.log',
  LOG_DIR: './logs',
  LOG_MAX_FILES: '14d',
  LOG_MAX_SIZE: '20m',
  AUDIT_LOG_ENABLED: true,
  AUDIT_LOG_API_REQUESTS: false,
  AUDIT_LOG_READ_ONLY: true,
});

// Conditionally run integration tests
const describeIntegration = shouldRunIntegrationTests ? describe : describe.skip;

describeIntegration('Database Integration Tests', () => {
  let dbPool: DatabasePool;

  beforeAll(async () => {
    // Create and initialize the database pool
    const testEnv = createTestEnv();
    dbPool = new DatabasePool(testEnv);

    try {
      await dbPool.initialize();
    } catch (error) {
      console.error('Failed to initialize database pool for integration tests:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Clean up the pool
    if (dbPool) {
      await dbPool.close();
    }
  });

  describe('Connection Pool', () => {
    it('should connect to the database', async () => {
      expect(dbPool.isPoolConnected()).toBe(true);
    });

    it('should execute a simple query', async () => {
      const result = await dbPool.query('SELECT 1 as value');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].value).toBe(1);
    });

    it('should execute a query with parameters', async () => {
      const result = await dbPool.query('SELECT $1::int as value', [42]);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].value).toBe(42);
    });

    it('should return pool statistics', () => {
      const stats = dbPool.getPoolStats();
      expect(stats).toBeDefined();
      expect(stats?.totalConnections).toBeGreaterThanOrEqual(0);
      expect(stats?.idleConnections).toBeGreaterThanOrEqual(0);
      expect(stats?.waitingClients).toBeGreaterThanOrEqual(0);
    });

    it('should pass health check', async () => {
      const health = await dbPool.healthCheck();
      expect(health.healthy).toBe(true);
      expect(health.message).toBe('Database connection healthy');
      expect(health.latencyMs).toBeDefined();
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should get a client from the pool', async () => {
      const client = await dbPool.getClient();
      expect(client).toBeDefined();

      try {
        const result = await client.query('SELECT NOW() as current_time');
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].current_time).toBeDefined();
      } finally {
        client.release();
      }
    });
  });

  describe('Transactions', () => {
    // Create a test table for transaction tests
    beforeAll(async () => {
      await dbPool.query(`
        CREATE TABLE IF NOT EXISTS test_transactions (
          id SERIAL PRIMARY KEY,
          value VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    // Clean up test table
    afterAll(async () => {
      await dbPool.query('DROP TABLE IF EXISTS test_transactions');
    });

    // Clear test data between tests
    afterEach(async () => {
      await dbPool.query('DELETE FROM test_transactions');
    });

    it('should commit a successful transaction', async () => {
      const result = await withTransaction(
        async (ctx) => {
          await ctx.query("INSERT INTO test_transactions (value) VALUES ('test1')");
          await ctx.query("INSERT INTO test_transactions (value) VALUES ('test2')");
          return 'committed';
        },
        undefined,
        dbPool
      );

      expect(result).toBe('committed');

      // Verify data was committed
      const rows = await dbPool.query('SELECT * FROM test_transactions ORDER BY id');
      expect(rows.rows).toHaveLength(2);
      expect(rows.rows[0].value).toBe('test1');
      expect(rows.rows[1].value).toBe('test2');
    });

    it('should rollback a failed transaction', async () => {
      try {
        await withTransaction(
          async (ctx) => {
            await ctx.query("INSERT INTO test_transactions (value) VALUES ('will_be_rolled_back')");
            throw new Error('Intentional error');
          },
          undefined,
          dbPool
        );
      } catch (error) {
        expect((error as Error).message).toBe('Intentional error');
      }

      // Verify data was rolled back
      const rows = await dbPool.query('SELECT * FROM test_transactions');
      expect(rows.rows).toHaveLength(0);
    });

    it('should support savepoints', async () => {
      const result = await withTransaction(
        async (ctx) => {
          await ctx.query("INSERT INTO test_transactions (value) VALUES ('before_savepoint')");
          await ctx.createSavepoint('sp1');
          await ctx.query("INSERT INTO test_transactions (value) VALUES ('after_savepoint')");
          await ctx.rollbackToSavepoint('sp1');
          await ctx.releaseSavepoint('sp1');
          return 'done';
        },
        undefined,
        dbPool
      );

      expect(result).toBe('done');

      // Verify only the row before savepoint exists
      const rows = await dbPool.query('SELECT * FROM test_transactions');
      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0].value).toBe('before_savepoint');
    });

    it('should support TransactionManager', async () => {
      const txManager = new TransactionManager(dbPool);

      const ctx = await txManager.begin();
      expect(txManager.isTransactionActive()).toBe(true);

      await ctx.query("INSERT INTO test_transactions (value) VALUES ('via_manager')");
      await txManager.commit();

      expect(txManager.isTransactionActive()).toBe(false);

      // Verify data was committed
      const rows = await dbPool.query('SELECT * FROM test_transactions');
      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0].value).toBe('via_manager');
    });

    it('should rollback with TransactionManager', async () => {
      const txManager = new TransactionManager(dbPool);

      await txManager.begin();
      const ctx = txManager.getContext();
      await ctx.query("INSERT INTO test_transactions (value) VALUES ('will_rollback')");
      await txManager.rollback();

      // Verify data was rolled back
      const rows = await dbPool.query('SELECT * FROM test_transactions');
      expect(rows.rows).toHaveLength(0);
    });
  });

  describe('Connection Pool Behavior', () => {
    it('should handle concurrent queries', async () => {
      const queries = Array.from({ length: 10 }, (_, i) =>
        dbPool.query('SELECT $1::int as value', [i])
      );

      const results = await Promise.all(queries);

      results.forEach((result, i) => {
        expect(result.rows[0].value).toBe(i);
      });
    });

    it('should handle connection timeout gracefully', async () => {
      // Create a pool with very short timeout for testing
      const shortTimeoutEnv = createTestEnv();
      shortTimeoutEnv.DB_POOL_CONNECTION_TIMEOUT_MS = 1; // 1ms timeout

      const shortTimeoutPool = new DatabasePool(shortTimeoutEnv);

      // This might or might not timeout depending on the database response time
      // We just verify it doesn't crash
      try {
        await shortTimeoutPool.initialize();
        await shortTimeoutPool.close();
      } catch (error) {
        // Expected to possibly fail with timeout
        expect(error).toBeDefined();
      }
    });
  });
});

// Unit test that runs without database
describe('Database Integration Test Utils', () => {
  it('should create test environment configuration', () => {
    const testEnv = createTestEnv();

    expect(testEnv.NODE_ENV).toBe('test');
    expect(testEnv.DB_POOL_MAX).toBe(5);
    expect(testEnv.DB_PORT).toBeDefined();
  });

  it('should respect environment variables for test config', () => {
    const originalDbHost = process.env.DB_HOST;
    process.env.DB_HOST = 'custom-test-host';

    const testEnv = createTestEnv();
    expect(testEnv.DB_HOST).toBe('custom-test-host');

    // Restore
    if (originalDbHost) {
      process.env.DB_HOST = originalDbHost;
    } else {
      delete process.env.DB_HOST;
    }
  });
});
