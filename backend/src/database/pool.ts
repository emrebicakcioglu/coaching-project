/**
 * PostgreSQL Connection Pool Module
 * STORY-024A: PostgreSQL Database Setup
 *
 * This module provides a connection pool for PostgreSQL using the pg library.
 * The pool is configured based on environment variables and follows best practices
 * for connection management.
 *
 * Features:
 * - Connection pooling with configurable limits
 * - SSL support for production environments
 * - Idle timeout management
 * - Connection timeout handling
 * - Health check functionality
 *
 * Environment Variables Required:
 * - DB_HOST: Database host
 * - DB_PORT: Database port (default: 5432)
 * - DB_USER: Database username
 * - DB_PASSWORD: Database password
 * - DB_NAME: Database name
 * - DB_SSL: Enable SSL (default: false)
 * - DB_POOL_MAX: Maximum connections (default: 20)
 * - DB_POOL_IDLE_TIMEOUT_MS: Idle timeout (default: 30000)
 * - DB_POOL_CONNECTION_TIMEOUT_MS: Connection timeout (default: 2000)
 */

import { Pool, PoolConfig, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env, EnvConfig } from '../config/env';

/**
 * Database configuration interface
 * Provides typed configuration for the database pool
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean | { rejectUnauthorized: boolean };
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

/**
 * Query options for prepared statements
 */
export interface QueryOptions {
  name?: string;
  values?: unknown[];
}

/**
 * Builds database configuration from environment variables
 * This function is exported for testing purposes
 *
 * @param envConfig - Validated environment configuration
 * @returns Database configuration object
 */
export const buildDatabaseConfig = (envConfig: EnvConfig): DatabaseConfig => {
  return {
    host: envConfig.DB_HOST,
    port: envConfig.DB_PORT,
    user: envConfig.DB_USER,
    password: envConfig.DB_PASSWORD,
    database: envConfig.DB_NAME,
    ssl: envConfig.DB_SSL ? { rejectUnauthorized: false } : false,
    max: envConfig.DB_POOL_MAX,
    idleTimeoutMillis: envConfig.DB_POOL_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: envConfig.DB_POOL_CONNECTION_TIMEOUT_MS,
  };
};

/**
 * Creates a new PostgreSQL connection pool
 * This function is exported for testing purposes
 *
 * @param config - Database configuration
 * @returns PostgreSQL Pool instance
 */
export const createPool = (config: DatabaseConfig): Pool => {
  const poolConfig: PoolConfig = {
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: config.ssl,
    max: config.max,
    idleTimeoutMillis: config.idleTimeoutMillis,
    connectionTimeoutMillis: config.connectionTimeoutMillis,
  };

  return new Pool(poolConfig);
};

/**
 * Database Pool Manager Class
 * Manages the PostgreSQL connection pool lifecycle
 */
export class DatabasePool {
  private pool: Pool | null = null;
  private config: DatabaseConfig;
  private isConnected: boolean = false;

  constructor(envConfig: EnvConfig) {
    this.config = buildDatabaseConfig(envConfig);
  }

  /**
   * Initializes the database pool
   * Creates the pool and verifies connectivity
   *
   * @throws Error if connection fails
   */
  async initialize(): Promise<void> {
    if (this.pool) {
      console.log('Database pool already initialized');
      return;
    }

    this.pool = createPool(this.config);

    // Set up pool error handler
    this.pool.on('error', (err: Error) => {
      console.error('Unexpected error on idle client:', err.message);
    });

    // Verify connection by executing a test query
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      this.isConnected = true;
      console.log('✅ Database connection pool established');
      console.log(`   Host: ${this.config.host}:${this.config.port}`);
      console.log(`   Database: ${this.config.database}`);
      console.log(`   Pool Size: ${this.config.max}`);
    } catch (error) {
      this.isConnected = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to connect to database:', errorMessage);
      throw error;
    }
  }

  /**
   * Executes a SQL query using the connection pool
   *
   * @param text - SQL query string
   * @param params - Query parameters
   * @returns Query result
   * @throws Error if pool not initialized or query fails
   */
  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call initialize() first.');
    }

    return this.pool.query<T>(text, params);
  }

  /**
   * Gets a client from the pool for transactional operations
   *
   * @returns PoolClient for transaction management
   * @throws Error if pool not initialized
   */
  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call initialize() first.');
    }

    return this.pool.connect();
  }

  /**
   * Performs a health check on the database connection
   *
   * @returns Object with health status and optional error message
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string; latencyMs?: number }> {
    if (!this.pool) {
      return {
        healthy: false,
        message: 'Database pool not initialized',
      };
    }

    const startTime = Date.now();

    try {
      await this.pool.query('SELECT 1');
      const latencyMs = Date.now() - startTime;
      return {
        healthy: true,
        message: 'Database connection healthy',
        latencyMs,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        healthy: false,
        message: `Database health check failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Gets the current pool statistics
   *
   * @returns Pool statistics object
   */
  getPoolStats(): {
    totalConnections: number;
    idleConnections: number;
    waitingClients: number;
  } | null {
    if (!this.pool) {
      return null;
    }

    return {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingClients: this.pool.waitingCount,
    };
  }

  /**
   * Returns whether the pool is currently connected
   */
  isPoolConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Closes the connection pool gracefully
   * Waits for all active queries to complete
   */
  async close(): Promise<void> {
    if (!this.pool) {
      console.log('Database pool not initialized, nothing to close');
      return;
    }

    try {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      console.log('✅ Database connection pool closed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error closing database pool:', errorMessage);
      throw error;
    }
  }

  /**
   * Gets the raw pool instance
   * Use with caution - prefer using class methods
   *
   * @returns The underlying Pool instance or null
   */
  getPool(): Pool | null {
    return this.pool;
  }

  /**
   * Gets the database configuration (without sensitive data)
   *
   * @returns Safe configuration object (no password)
   */
  getSafeConfig(): Omit<DatabaseConfig, 'password'> {
    const { password: _, ...safeConfig } = this.config;
    return safeConfig;
  }
}

// Singleton instance for application-wide use
let databasePool: DatabasePool | null = null;

/**
 * Gets or creates the singleton database pool instance
 *
 * @param envConfig - Optional environment config (uses global env if not provided)
 * @returns DatabasePool instance
 */
export const getDatabase = (envConfig?: EnvConfig): DatabasePool => {
  if (!databasePool) {
    databasePool = new DatabasePool(envConfig || env);
  }
  return databasePool;
};

/**
 * Resets the singleton database pool
 * Useful for testing purposes
 */
export const resetDatabase = async (): Promise<void> => {
  if (databasePool) {
    await databasePool.close();
    databasePool = null;
  }
};

export default DatabasePool;
