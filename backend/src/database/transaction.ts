/**
 * PostgreSQL Transaction Support Module
 * STORY-024A: PostgreSQL Database Setup
 *
 * This module provides transaction management utilities for PostgreSQL.
 * It supports automatic commit/rollback based on operation success or failure.
 *
 * Features:
 * - Automatic transaction management
 * - Rollback on errors
 * - Transaction isolation levels
 * - Nested transaction support (via savepoints)
 */

import { PoolClient, QueryResult, QueryResultRow } from 'pg';
import { DatabasePool, getDatabase } from './pool';

/**
 * Transaction isolation levels supported by PostgreSQL
 */
export type TransactionIsolationLevel =
  | 'READ UNCOMMITTED'
  | 'READ COMMITTED'
  | 'REPEATABLE READ'
  | 'SERIALIZABLE';

/**
 * Transaction options
 */
export interface TransactionOptions {
  isolationLevel?: TransactionIsolationLevel;
  readOnly?: boolean;
  deferrable?: boolean;
}

/**
 * Transaction context passed to transaction callbacks
 * Provides methods to execute queries within the transaction
 */
export interface TransactionContext {
  /**
   * Execute a query within the transaction
   */
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;

  /**
   * Create a savepoint for nested transaction support
   */
  createSavepoint(name: string): Promise<void>;

  /**
   * Rollback to a savepoint
   */
  rollbackToSavepoint(name: string): Promise<void>;

  /**
   * Release a savepoint
   */
  releaseSavepoint(name: string): Promise<void>;

  /**
   * Get the underlying client (use with caution)
   */
  getClient(): PoolClient;
}

/**
 * Creates a transaction context from a pool client
 *
 * @param client - PostgreSQL pool client
 * @returns Transaction context object
 */
const createTransactionContext = (client: PoolClient): TransactionContext => {
  return {
    async query<T extends QueryResultRow = QueryResultRow>(
      text: string,
      params?: unknown[]
    ): Promise<QueryResult<T>> {
      return client.query<T>(text, params);
    },

    async createSavepoint(name: string): Promise<void> {
      await client.query(`SAVEPOINT ${name}`);
    },

    async rollbackToSavepoint(name: string): Promise<void> {
      await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
    },

    async releaseSavepoint(name: string): Promise<void> {
      await client.query(`RELEASE SAVEPOINT ${name}`);
    },

    getClient(): PoolClient {
      return client;
    },
  };
};

/**
 * Builds the BEGIN statement with transaction options
 *
 * @param options - Transaction options
 * @returns BEGIN statement string
 */
export const buildBeginStatement = (options?: TransactionOptions): string => {
  const parts: string[] = ['BEGIN'];

  if (options) {
    if (options.isolationLevel) {
      parts.push(`ISOLATION LEVEL ${options.isolationLevel}`);
    }
    if (options.readOnly) {
      parts.push('READ ONLY');
    }
    if (options.deferrable && options.readOnly && options.isolationLevel === 'SERIALIZABLE') {
      parts.push('DEFERRABLE');
    }
  }

  return parts.join(' ');
};

/**
 * Executes a callback within a database transaction
 * Automatically commits on success and rolls back on failure
 *
 * @param callback - Async function to execute within the transaction
 * @param options - Transaction options
 * @param pool - Optional database pool (uses singleton if not provided)
 * @returns Result of the callback function
 * @throws Error if transaction fails
 *
 * @example
 * ```typescript
 * const result = await withTransaction(async (ctx) => {
 *   await ctx.query('INSERT INTO users (name) VALUES ($1)', ['John']);
 *   await ctx.query('INSERT INTO audit_log (action) VALUES ($1)', ['user_created']);
 *   return { success: true };
 * });
 * ```
 */
export async function withTransaction<T>(
  callback: (ctx: TransactionContext) => Promise<T>,
  options?: TransactionOptions,
  pool?: DatabasePool
): Promise<T> {
  const db = pool || getDatabase();
  const client = await db.getClient();
  const context = createTransactionContext(client);

  try {
    const beginStatement = buildBeginStatement(options);
    await client.query(beginStatement);

    const result = await callback(context);

    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Transaction manager class for more complex transaction scenarios
 * Provides explicit transaction control
 */
export class TransactionManager {
  private client: PoolClient | null = null;
  private context: TransactionContext | null = null;
  private isActive: boolean = false;
  private pool: DatabasePool;

  constructor(pool?: DatabasePool) {
    this.pool = pool || getDatabase();
  }

  /**
   * Starts a new transaction
   *
   * @param options - Transaction options
   * @throws Error if transaction already active
   */
  async begin(options?: TransactionOptions): Promise<TransactionContext> {
    if (this.isActive) {
      throw new Error('Transaction already active');
    }

    this.client = await this.pool.getClient();
    this.context = createTransactionContext(this.client);

    const beginStatement = buildBeginStatement(options);
    await this.client.query(beginStatement);
    this.isActive = true;

    return this.context;
  }

  /**
   * Commits the current transaction
   *
   * @throws Error if no active transaction
   */
  async commit(): Promise<void> {
    if (!this.isActive || !this.client) {
      throw new Error('No active transaction to commit');
    }

    try {
      await this.client.query('COMMIT');
    } finally {
      this.cleanup();
    }
  }

  /**
   * Rolls back the current transaction
   *
   * @throws Error if no active transaction
   */
  async rollback(): Promise<void> {
    if (!this.isActive || !this.client) {
      throw new Error('No active transaction to rollback');
    }

    try {
      await this.client.query('ROLLBACK');
    } finally {
      this.cleanup();
    }
  }

  /**
   * Returns whether a transaction is currently active
   */
  isTransactionActive(): boolean {
    return this.isActive;
  }

  /**
   * Gets the current transaction context
   *
   * @throws Error if no active transaction
   */
  getContext(): TransactionContext {
    if (!this.context) {
      throw new Error('No active transaction');
    }
    return this.context;
  }

  /**
   * Cleans up transaction state
   */
  private cleanup(): void {
    if (this.client) {
      this.client.release();
      this.client = null;
    }
    this.context = null;
    this.isActive = false;
  }
}

/**
 * Creates a new transaction manager instance
 *
 * @param pool - Optional database pool
 * @returns New TransactionManager instance
 */
export const createTransactionManager = (pool?: DatabasePool): TransactionManager => {
  return new TransactionManager(pool);
};

export default {
  withTransaction,
  TransactionManager,
  createTransactionManager,
};
