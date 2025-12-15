/**
 * Database Module Entry Point
 * STORY-024A: PostgreSQL Database Setup
 * STORY-024B: PostgreSQL Schema & Migrations
 * STORY-021A: API-Basis-Infrastruktur (NestJS Setup)
 *
 * This module exports all database-related functionality including:
 * - Connection pool management
 * - Transaction support
 * - Health check utilities
 * - Migration system
 * - Seeding system
 * - Type definitions
 * - NestJS module and service
 */

// Export NestJS module and service (STORY-021A)
export { DatabaseModule } from './database.module';
export { DatabaseService } from './database.service';

// Export pool module
export {
  DatabasePool,
  DatabaseConfig,
  QueryOptions,
  buildDatabaseConfig,
  createPool,
  getDatabase,
  resetDatabase,
} from './pool';

// Export transaction module
export {
  TransactionIsolationLevel,
  TransactionOptions,
  TransactionContext,
  TransactionManager,
  withTransaction,
  createTransactionManager,
  buildBeginStatement,
} from './transaction';

// Export migration module (STORY-024B)
export {
  Migrator,
  MigrationRecord,
  MigrationFile,
  MigrationResult,
} from './migrator';

// Export seeder module (STORY-024B)
export {
  Seeder,
  SeedResult,
} from './seeder';

// Export type definitions (STORY-024B)
export * from './types';

// Re-export pg types that consumers might need
export type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
