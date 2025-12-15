/**
 * Database Pool Unit Tests
 * STORY-024A: PostgreSQL Database Setup
 *
 * Tests for the connection pool module including:
 * - Configuration building
 * - Pool creation
 * - Health checks
 * - Connection management
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Pool, QueryResult } from 'pg';
import {
  DatabasePool,
  DatabaseConfig,
  buildDatabaseConfig,
  createPool,
  getDatabase,
  resetDatabase,
} from '../../src/database/pool';
import { EnvConfig } from '../../src/config/env';

// Mock the pg module
jest.mock('pg', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  const mockPool = {
    connect: jest.fn().mockResolvedValue(mockClient),
    query: jest.fn(),
    end: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    totalCount: 5,
    idleCount: 3,
    waitingCount: 0,
  };

  return {
    Pool: jest.fn(() => mockPool),
  };
});

// Define mock types
interface MockPoolClient {
  query: jest.Mock;
  release: jest.Mock;
}

interface MockPool {
  connect: jest.Mock;
  query: jest.Mock;
  end: jest.Mock;
  on: jest.Mock;
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

// Create a mock environment configuration
const createMockEnv = (overrides: Partial<EnvConfig> = {}): EnvConfig => ({
  NODE_ENV: 'test',
  APP_PORT: 4102,
  APP_HOST: 'localhost',
  APP_URL: 'http://localhost:4102',
  DB_HOST: 'localhost',
  DB_PORT: 14101,
  DB_USER: 'testuser',
  DB_PASSWORD: 'testpassword123',
  DB_NAME: 'testdb',
  DB_SSL: false,
  DB_POOL_MAX: 20,
  DB_POOL_IDLE_TIMEOUT_MS: 30000,
  DB_POOL_CONNECTION_TIMEOUT_MS: 2000,
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
  ...overrides,
});

describe('Database Pool Module', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Reset singleton after each test
  afterEach(async () => {
    await resetDatabase();
  });

  describe('buildDatabaseConfig', () => {
    it('should build configuration from environment variables', () => {
      const mockEnv = createMockEnv();
      const config = buildDatabaseConfig(mockEnv);

      expect(config).toEqual({
        host: 'localhost',
        port: 14101,
        user: 'testuser',
        password: 'testpassword123',
        database: 'testdb',
        ssl: false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    });

    it('should configure SSL when DB_SSL is true', () => {
      const mockEnv = createMockEnv({ DB_SSL: true });
      const config = buildDatabaseConfig(mockEnv);

      expect(config.ssl).toEqual({ rejectUnauthorized: false });
    });

    it('should use custom pool settings', () => {
      const mockEnv = createMockEnv({
        DB_POOL_MAX: 50,
        DB_POOL_IDLE_TIMEOUT_MS: 60000,
        DB_POOL_CONNECTION_TIMEOUT_MS: 5000,
      });
      const config = buildDatabaseConfig(mockEnv);

      expect(config.max).toBe(50);
      expect(config.idleTimeoutMillis).toBe(60000);
      expect(config.connectionTimeoutMillis).toBe(5000);
    });
  });

  describe('createPool', () => {
    it('should create a new Pool instance with correct configuration', () => {
      const config: DatabaseConfig = {
        host: 'testhost',
        port: 5432,
        user: 'testuser',
        password: 'testpass123',
        database: 'testdb',
        ssl: false,
        max: 10,
        idleTimeoutMillis: 20000,
        connectionTimeoutMillis: 3000,
      };

      const pool = createPool(config);

      expect(Pool).toHaveBeenCalledWith({
        host: 'testhost',
        port: 5432,
        user: 'testuser',
        password: 'testpass123',
        database: 'testdb',
        ssl: false,
        max: 10,
        idleTimeoutMillis: 20000,
        connectionTimeoutMillis: 3000,
      });
      expect(pool).toBeDefined();
    });
  });

  describe('DatabasePool class', () => {
    let mockPool: MockPool;
    let mockClient: MockPoolClient;

    beforeEach(() => {
      mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
        release: jest.fn(),
      };
    });

    describe('initialize', () => {
      it('should initialize the pool and verify connection', async () => {
        mockPool = {
          connect: jest.fn().mockResolvedValue(mockClient),
          query: jest.fn(),
          end: jest.fn(),
          on: jest.fn(),
          totalCount: 5,
          idleCount: 3,
          waitingCount: 0,
        };

        (Pool as unknown as jest.Mock).mockImplementation(() => mockPool);

        const newDbPool = new DatabasePool(createMockEnv());
        await newDbPool.initialize();

        expect(Pool).toHaveBeenCalled();
        expect(mockPool.connect).toHaveBeenCalled();
        expect(mockClient.query).toHaveBeenCalledWith('SELECT 1');
        expect(mockClient.release).toHaveBeenCalled();
        expect(newDbPool.isPoolConnected()).toBe(true);
      });

      it('should not reinitialize if already initialized', async () => {
        mockPool = {
          connect: jest.fn().mockResolvedValue(mockClient),
          query: jest.fn(),
          end: jest.fn(),
          on: jest.fn(),
          totalCount: 5,
          idleCount: 3,
          waitingCount: 0,
        };

        (Pool as unknown as jest.Mock).mockImplementation(() => mockPool);

        const newDbPool = new DatabasePool(createMockEnv());
        await newDbPool.initialize();
        await newDbPool.initialize(); // Second call

        // Pool constructor should only be called once
        expect(Pool).toHaveBeenCalledTimes(1);
      });

      it('should handle connection failure', async () => {
        const error = new Error('Connection refused');
        mockClient = {
          query: jest.fn().mockRejectedValue(error),
          release: jest.fn(),
        };

        mockPool = {
          connect: jest.fn().mockResolvedValue(mockClient),
          query: jest.fn(),
          end: jest.fn(),
          on: jest.fn(),
          totalCount: 0,
          idleCount: 0,
          waitingCount: 0,
        };

        (Pool as unknown as jest.Mock).mockImplementation(() => mockPool);

        const newDbPool = new DatabasePool(createMockEnv());

        await expect(newDbPool.initialize()).rejects.toThrow('Connection refused');
        expect(newDbPool.isPoolConnected()).toBe(false);
      });
    });

    describe('query', () => {
      it('should execute a query using the pool', async () => {
        const mockResult: QueryResult = {
          rows: [{ id: 1, name: 'Test' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        };

        mockPool = {
          connect: jest.fn().mockResolvedValue(mockClient),
          query: jest.fn().mockResolvedValue(mockResult),
          end: jest.fn(),
          on: jest.fn(),
          totalCount: 5,
          idleCount: 3,
          waitingCount: 0,
        } ;

        (Pool as unknown as jest.Mock).mockImplementation(() => mockPool);

        const newDbPool = new DatabasePool(createMockEnv());
        await newDbPool.initialize();

        const result = await newDbPool.query('SELECT * FROM users WHERE id = $1', [1]);

        expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
        expect(result).toEqual(mockResult);
      });

      it('should throw error if pool not initialized', async () => {
        const newDbPool = new DatabasePool(createMockEnv());

        await expect(newDbPool.query('SELECT 1')).rejects.toThrow(
          'Database pool not initialized. Call initialize() first.'
        );
      });
    });

    describe('getClient', () => {
      it('should get a client from the pool', async () => {
        mockPool = {
          connect: jest.fn().mockResolvedValue(mockClient),
          query: jest.fn(),
          end: jest.fn(),
          on: jest.fn(),
          totalCount: 5,
          idleCount: 3,
          waitingCount: 0,
        } ;

        (Pool as unknown as jest.Mock).mockImplementation(() => mockPool);

        const newDbPool = new DatabasePool(createMockEnv());
        await newDbPool.initialize();

        const client = await newDbPool.getClient();

        expect(client).toBeDefined();
        expect(mockPool.connect).toHaveBeenCalled();
      });

      it('should throw error if pool not initialized', async () => {
        const newDbPool = new DatabasePool(createMockEnv());

        await expect(newDbPool.getClient()).rejects.toThrow(
          'Database pool not initialized. Call initialize() first.'
        );
      });
    });

    describe('healthCheck', () => {
      it('should return healthy status when connection is good', async () => {
        mockPool = {
          connect: jest.fn().mockResolvedValue(mockClient),
          query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
          end: jest.fn(),
          on: jest.fn(),
          totalCount: 5,
          idleCount: 3,
          waitingCount: 0,
        } ;

        (Pool as unknown as jest.Mock).mockImplementation(() => mockPool);

        const newDbPool = new DatabasePool(createMockEnv());
        await newDbPool.initialize();

        const health = await newDbPool.healthCheck();

        expect(health.healthy).toBe(true);
        expect(health.message).toBe('Database connection healthy');
        expect(health.latencyMs).toBeDefined();
        expect(health.latencyMs).toBeGreaterThanOrEqual(0);
      });

      it('should return unhealthy status when pool not initialized', async () => {
        const newDbPool = new DatabasePool(createMockEnv());
        const health = await newDbPool.healthCheck();

        expect(health.healthy).toBe(false);
        expect(health.message).toBe('Database pool not initialized');
      });

      it('should return unhealthy status when query fails', async () => {
        // Initialize uses client.query() from connect(), healthCheck uses pool.query() directly
        // So we need pool.query to fail only for the healthCheck call
        mockPool = {
          connect: jest.fn().mockResolvedValue(mockClient),
          query: jest.fn().mockRejectedValue(new Error('Connection lost')),
          end: jest.fn(),
          on: jest.fn(),
          totalCount: 5,
          idleCount: 3,
          waitingCount: 0,
        };

        (Pool as unknown as jest.Mock).mockImplementation(() => mockPool);

        const newDbPool = new DatabasePool(createMockEnv());
        await newDbPool.initialize();

        const health = await newDbPool.healthCheck();

        expect(health.healthy).toBe(false);
        expect(health.message).toContain('Connection lost');
      });
    });

    describe('getPoolStats', () => {
      it('should return pool statistics when initialized', async () => {
        mockPool = {
          connect: jest.fn().mockResolvedValue(mockClient),
          query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
          end: jest.fn(),
          on: jest.fn(),
          totalCount: 5,
          idleCount: 3,
          waitingCount: 1,
        } ;

        (Pool as unknown as jest.Mock).mockImplementation(() => mockPool);

        const newDbPool = new DatabasePool(createMockEnv());
        await newDbPool.initialize();

        const stats = newDbPool.getPoolStats();

        expect(stats).toEqual({
          totalConnections: 5,
          idleConnections: 3,
          waitingClients: 1,
        });
      });

      it('should return null when pool not initialized', () => {
        const newDbPool = new DatabasePool(createMockEnv());
        const stats = newDbPool.getPoolStats();

        expect(stats).toBeNull();
      });
    });

    describe('close', () => {
      it('should close the pool gracefully', async () => {
        mockPool = {
          connect: jest.fn().mockResolvedValue(mockClient),
          query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
          end: jest.fn().mockResolvedValue(undefined),
          on: jest.fn(),
          totalCount: 5,
          idleCount: 3,
          waitingCount: 0,
        } ;

        (Pool as unknown as jest.Mock).mockImplementation(() => mockPool);

        const newDbPool = new DatabasePool(createMockEnv());
        await newDbPool.initialize();
        await newDbPool.close();

        expect(mockPool.end).toHaveBeenCalled();
        expect(newDbPool.isPoolConnected()).toBe(false);
        expect(newDbPool.getPool()).toBeNull();
      });

      it('should handle close when pool not initialized', async () => {
        const newDbPool = new DatabasePool(createMockEnv());

        // Should not throw
        await expect(newDbPool.close()).resolves.not.toThrow();
      });

      it('should handle close error', async () => {
        const error = new Error('Close failed');
        mockPool = {
          connect: jest.fn().mockResolvedValue(mockClient),
          query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
          end: jest.fn().mockRejectedValue(error),
          on: jest.fn(),
          totalCount: 5,
          idleCount: 3,
          waitingCount: 0,
        } ;

        (Pool as unknown as jest.Mock).mockImplementation(() => mockPool);

        const newDbPool = new DatabasePool(createMockEnv());
        await newDbPool.initialize();

        await expect(newDbPool.close()).rejects.toThrow('Close failed');
      });
    });

    describe('getSafeConfig', () => {
      it('should return configuration without password', () => {
        const newDbPool = new DatabasePool(createMockEnv());
        const safeConfig = newDbPool.getSafeConfig();

        expect(safeConfig).not.toHaveProperty('password');
        expect(safeConfig.host).toBe('localhost');
        expect(safeConfig.port).toBe(14101);
        expect(safeConfig.user).toBe('testuser');
        expect(safeConfig.database).toBe('testdb');
      });
    });

    describe('getPool', () => {
      it('should return null when not initialized', () => {
        const newDbPool = new DatabasePool(createMockEnv());
        expect(newDbPool.getPool()).toBeNull();
      });

      it('should return pool when initialized', async () => {
        mockPool = {
          connect: jest.fn().mockResolvedValue(mockClient),
          query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
          end: jest.fn(),
          on: jest.fn(),
          totalCount: 5,
          idleCount: 3,
          waitingCount: 0,
        } ;

        (Pool as unknown as jest.Mock).mockImplementation(() => mockPool);

        const newDbPool = new DatabasePool(createMockEnv());
        await newDbPool.initialize();

        expect(newDbPool.getPool()).toBeDefined();
      });
    });
  });

  describe('Singleton functions', () => {
    describe('getDatabase', () => {
      it('should return the same instance on multiple calls', () => {
        const mockEnv = createMockEnv();
        const instance1 = getDatabase(mockEnv);
        const instance2 = getDatabase(mockEnv);

        expect(instance1).toBe(instance2);
      });

      it('should create instance with provided config', () => {
        const mockEnv = createMockEnv({ DB_HOST: 'customhost' });
        const instance = getDatabase(mockEnv);

        expect(instance.getSafeConfig().host).toBe('customhost');
      });
    });

    describe('resetDatabase', () => {
      it('should reset the singleton instance', async () => {
        const mockEnv = createMockEnv();
        const instance1 = getDatabase(mockEnv);
        await resetDatabase();
        const instance2 = getDatabase(mockEnv);

        expect(instance1).not.toBe(instance2);
      });
    });
  });
});
