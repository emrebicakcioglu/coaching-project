/**
 * Core Application Backend - Legacy Entry Point
 *
 * NOTE: This file is kept for backward compatibility with scripts and tests.
 * The main application entry point is now main.ts (NestJS).
 *
 * Use main.ts for NestJS application startup.
 * This file exports utilities for use in other modules and scripts.
 *
 * Stories:
 * - STORY-012: Environment Configuration
 * - STORY-021A: API-Basis-Infrastruktur (NestJS Setup)
 * - STORY-024A: PostgreSQL Database Setup
 * - STORY-024B: PostgreSQL Schema & Migrations
 */

// Export env and database utilities for use in other modules
export { env } from './config';
export { getDatabase, DatabasePool, DatabaseService, DatabaseModule } from './database';
export { withTransaction, TransactionManager } from './database';
export { Migrator, Seeder } from './database';
export { WinstonLoggerService } from './common/services/logger.service';
export { HttpExceptionFilter } from './common/filters/http-exception.filter';
