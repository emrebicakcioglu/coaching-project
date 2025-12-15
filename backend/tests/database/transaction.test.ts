/**
 * Transaction Support Unit Tests
 * STORY-024A: PostgreSQL Database Setup
 *
 * Tests for the transaction module including:
 * - Transaction execution with commit/rollback
 * - Transaction isolation levels
 * - Savepoints
 * - TransactionManager class
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { PoolClient, QueryResult } from 'pg';
import {
  withTransaction,
  TransactionManager,
  createTransactionManager,
  buildBeginStatement,
  TransactionOptions,
  TransactionContext,
} from '../../src/database/transaction';
import { DatabasePool } from '../../src/database/pool';

// Define mock types
interface MockPoolClient {
  query: jest.Mock;
  release: jest.Mock;
}

interface MockDatabasePool {
  getClient: jest.Mock;
  initialize: jest.Mock;
  query: jest.Mock;
  healthCheck: jest.Mock;
  getPoolStats: jest.Mock;
  isPoolConnected: jest.Mock;
  close: jest.Mock;
  getPool: jest.Mock;
  getSafeConfig: jest.Mock;
}

// Create mock pool client
const createMockClient = (): MockPoolClient => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  release: jest.fn(),
});

// Create mock database pool
const createMockPool = (mockClient: MockPoolClient): MockDatabasePool => ({
  getClient: jest.fn().mockResolvedValue(mockClient),
  initialize: jest.fn(),
  query: jest.fn(),
  healthCheck: jest.fn(),
  getPoolStats: jest.fn(),
  isPoolConnected: jest.fn().mockReturnValue(true),
  close: jest.fn(),
  getPool: jest.fn(),
  getSafeConfig: jest.fn(),
});

describe('Transaction Module', () => {
  describe('buildBeginStatement', () => {
    it('should return simple BEGIN with no options', () => {
      const result = buildBeginStatement();
      expect(result).toBe('BEGIN');
    });

    it('should return simple BEGIN with empty options', () => {
      const result = buildBeginStatement({});
      expect(result).toBe('BEGIN');
    });

    it('should include isolation level when specified', () => {
      const options: TransactionOptions = {
        isolationLevel: 'SERIALIZABLE',
      };
      const result = buildBeginStatement(options);
      expect(result).toBe('BEGIN ISOLATION LEVEL SERIALIZABLE');
    });

    it('should include READ ONLY when specified', () => {
      const options: TransactionOptions = {
        readOnly: true,
      };
      const result = buildBeginStatement(options);
      expect(result).toBe('BEGIN READ ONLY');
    });

    it('should include isolation level and READ ONLY', () => {
      const options: TransactionOptions = {
        isolationLevel: 'REPEATABLE READ',
        readOnly: true,
      };
      const result = buildBeginStatement(options);
      expect(result).toBe('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    });

    it('should include DEFERRABLE when appropriate', () => {
      const options: TransactionOptions = {
        isolationLevel: 'SERIALIZABLE',
        readOnly: true,
        deferrable: true,
      };
      const result = buildBeginStatement(options);
      expect(result).toBe('BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY DEFERRABLE');
    });

    it('should not include DEFERRABLE when conditions not met', () => {
      const options: TransactionOptions = {
        isolationLevel: 'READ COMMITTED',
        deferrable: true,
      };
      const result = buildBeginStatement(options);
      expect(result).toBe('BEGIN ISOLATION LEVEL READ COMMITTED');
    });

    it('should handle all isolation levels', () => {
      const levels = ['READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'] as const;

      levels.forEach((level) => {
        const result = buildBeginStatement({ isolationLevel: level });
        expect(result).toBe(`BEGIN ISOLATION LEVEL ${level}`);
      });
    });
  });

  describe('withTransaction', () => {
    let mockClient: MockPoolClient;
    let mockPool: MockDatabasePool;

    beforeEach(() => {
      mockClient = createMockClient();
      mockPool = createMockPool(mockClient);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should execute callback within a transaction', async () => {
      const callback = jest.fn().mockResolvedValue('result');

      const result = await withTransaction(callback, undefined, mockPool as unknown as DatabasePool);

      expect(mockPool.getClient).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(callback).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    it('should rollback on callback error', async () => {
      const error = new Error('Callback failed');
      const callback = jest.fn().mockRejectedValue(error);

      await expect(withTransaction(callback, undefined, mockPool as unknown as DatabasePool)).rejects.toThrow('Callback failed');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should use transaction options', async () => {
      const callback = jest.fn().mockResolvedValue('result');
      const options: TransactionOptions = {
        isolationLevel: 'SERIALIZABLE',
        readOnly: true,
      };

      await withTransaction(callback, options, mockPool as unknown as DatabasePool);

      expect(mockClient.query).toHaveBeenCalledWith(
        'BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY'
      );
    });

    it('should provide transaction context to callback', async () => {
      let receivedContext: TransactionContext | undefined;

      await withTransaction(async (ctx) => {
        receivedContext = ctx;
        return 'result';
      }, undefined, mockPool as unknown as DatabasePool);

      expect(receivedContext).toBeDefined();
      expect(typeof receivedContext!.query).toBe('function');
      expect(typeof receivedContext!.createSavepoint).toBe('function');
      expect(typeof receivedContext!.rollbackToSavepoint).toBe('function');
      expect(typeof receivedContext!.releaseSavepoint).toBe('function');
      expect(typeof receivedContext!.getClient).toBe('function');
    });

    it('should allow queries within transaction context', async () => {
      const mockQueryResult: QueryResult = {
        rows: [{ id: 1 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      };
      mockClient.query.mockResolvedValue(mockQueryResult as any);

      let queryResult: QueryResult | null = null;

      await withTransaction(async (ctx) => {
        queryResult = await ctx.query('SELECT * FROM users');
        return 'done';
      }, undefined, mockPool as unknown as DatabasePool);

      expect(queryResult).not.toBeNull();
    });

    it('should support savepoints', async () => {
      await withTransaction(async (ctx) => {
        await ctx.createSavepoint('sp1');
        await ctx.rollbackToSavepoint('sp1');
        await ctx.releaseSavepoint('sp1');
        return 'done';
      }, undefined, mockPool as unknown as DatabasePool);

      expect(mockClient.query).toHaveBeenCalledWith('SAVEPOINT sp1');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK TO SAVEPOINT sp1');
      expect(mockClient.query).toHaveBeenCalledWith('RELEASE SAVEPOINT sp1');
    });

    it('should return the client through context', async () => {
      let contextClient: PoolClient | null = null;

      await withTransaction(async (ctx) => {
        contextClient = ctx.getClient();
        return 'done';
      }, undefined, mockPool as unknown as DatabasePool);

      expect(contextClient).toBe(mockClient);
    });
  });

  describe('TransactionManager', () => {
    let mockClient: MockPoolClient;
    let mockPool: MockDatabasePool;
    let txManager: TransactionManager;

    beforeEach(() => {
      mockClient = createMockClient();
      mockPool = createMockPool(mockClient);
      txManager = new TransactionManager(mockPool as unknown as DatabasePool);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('begin', () => {
      it('should start a new transaction', async () => {
        const ctx = await txManager.begin();

        expect(mockPool.getClient).toHaveBeenCalled();
        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(ctx).toBeDefined();
        expect(txManager.isTransactionActive()).toBe(true);
      });

      it('should start transaction with options', async () => {
        const options: TransactionOptions = {
          isolationLevel: 'READ COMMITTED',
        };

        await txManager.begin(options);

        expect(mockClient.query).toHaveBeenCalledWith('BEGIN ISOLATION LEVEL READ COMMITTED');
      });

      it('should throw if transaction already active', async () => {
        await txManager.begin();

        await expect(txManager.begin()).rejects.toThrow('Transaction already active');
      });
    });

    describe('commit', () => {
      it('should commit the transaction', async () => {
        await txManager.begin();
        await txManager.commit();

        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        expect(mockClient.release).toHaveBeenCalled();
        expect(txManager.isTransactionActive()).toBe(false);
      });

      it('should throw if no active transaction', async () => {
        await expect(txManager.commit()).rejects.toThrow('No active transaction to commit');
      });
    });

    describe('rollback', () => {
      it('should rollback the transaction', async () => {
        await txManager.begin();
        await txManager.rollback();

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
        expect(txManager.isTransactionActive()).toBe(false);
      });

      it('should throw if no active transaction', async () => {
        await expect(txManager.rollback()).rejects.toThrow('No active transaction to rollback');
      });
    });

    describe('isTransactionActive', () => {
      it('should return false initially', () => {
        expect(txManager.isTransactionActive()).toBe(false);
      });

      it('should return true after begin', async () => {
        await txManager.begin();
        expect(txManager.isTransactionActive()).toBe(true);
      });

      it('should return false after commit', async () => {
        await txManager.begin();
        await txManager.commit();
        expect(txManager.isTransactionActive()).toBe(false);
      });

      it('should return false after rollback', async () => {
        await txManager.begin();
        await txManager.rollback();
        expect(txManager.isTransactionActive()).toBe(false);
      });
    });

    describe('getContext', () => {
      it('should return context when transaction active', async () => {
        await txManager.begin();
        const ctx = txManager.getContext();

        expect(ctx).toBeDefined();
        expect(typeof ctx.query).toBe('function');
      });

      it('should throw if no active transaction', () => {
        expect(() => txManager.getContext()).toThrow('No active transaction');
      });
    });
  });

  describe('createTransactionManager', () => {
    it('should create a new TransactionManager instance', () => {
      const mockClient = createMockClient();
      const mockPool = createMockPool(mockClient);

      const manager = createTransactionManager(mockPool as unknown as DatabasePool);

      expect(manager).toBeInstanceOf(TransactionManager);
    });
  });
});
