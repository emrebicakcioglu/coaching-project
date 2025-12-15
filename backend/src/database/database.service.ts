/**
 * Database Service
 *
 * NestJS service wrapper for the existing DatabasePool.
 * Provides dependency injection for database operations.
 *
 * Story: STORY-021A (API-Basis-Infrastruktur)
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { DatabasePool, getDatabase } from './pool';
import { Migrator } from './migrator';
import { env } from '../config/env';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private databasePool: DatabasePool;

  constructor() {
    this.databasePool = getDatabase(env);
  }

  /**
   * Initialize database connection on module startup
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.databasePool.initialize();

      // Run migrations if needed
      const pool = this.databasePool.getPool();
      if (pool) {
        console.log('');
        console.log('Checking database migrations...');
        const migrator = new Migrator(pool);
        const status = await migrator.status();

        if (status.pending.length > 0) {
          console.log(
            `Running ${status.pending.length} pending migration(s)...`,
          );
          await migrator.up();
          console.log('✅ Migrations completed');
        } else {
          console.log('✅ Database schema is up to date');
        }
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Close database connection on module shutdown
   */
  async onModuleDestroy(): Promise<void> {
    await this.databasePool.close();
  }

  /**
   * Execute a SQL query
   */
  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    return this.databasePool.query<T>(text, params);
  }

  /**
   * Get a client from the pool for transactions
   */
  async getClient(): Promise<PoolClient> {
    return this.databasePool.getClient();
  }

  /**
   * Perform a health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    message: string;
    latencyMs?: number;
  }> {
    return this.databasePool.healthCheck();
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): {
    totalConnections: number;
    idleConnections: number;
    waitingClients: number;
  } | null {
    return this.databasePool.getPoolStats();
  }

  /**
   * Check if pool is connected
   */
  isConnected(): boolean {
    return this.databasePool.isPoolConnected();
  }

  /**
   * Get raw pool (use with caution)
   */
  getPool(): Pool | null {
    return this.databasePool.getPool();
  }
}
