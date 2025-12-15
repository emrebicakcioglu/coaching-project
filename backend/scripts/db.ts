#!/usr/bin/env ts-node
/**
 * Database Management CLI
 * STORY-024B: PostgreSQL Schema & Migrations
 *
 * Command-line interface for database operations:
 * - migrate: Run pending migrations
 * - rollback: Rollback last migration(s)
 * - reset: Rollback all migrations
 * - seed: Seed the database with test data
 * - fresh: Reset + migrate + seed
 * - status: Show migration status
 *
 * Usage:
 *   npx ts-node scripts/db.ts migrate
 *   npx ts-node scripts/db.ts rollback [steps]
 *   npx ts-node scripts/db.ts seed
 *   npx ts-node scripts/db.ts fresh
 *   npx ts-node scripts/db.ts status
 */

import { Pool } from 'pg';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Migrator } from '../src/database/migrator';
import { Seeder } from '../src/database/seeder';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Get database configuration from environment variables
 */
function getDbConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '14101', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'core_app',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
}

/**
 * Create database connection pool
 */
function createPool(): Pool {
  const config = getDbConfig();
  return new Pool(config);
}

/**
 * Display help message
 */
function showHelp(): void {
  console.log(`
Database Management CLI
=======================

Usage: npx ts-node scripts/db.ts <command> [options]

Commands:
  migrate           Run all pending migrations
  rollback [n]      Rollback last n migrations (default: 1)
  reset             Rollback all migrations
  seed              Seed database with test data
  fresh             Reset + migrate + seed (fresh database)
  status            Show migration status
  help              Show this help message

Examples:
  npx ts-node scripts/db.ts migrate
  npx ts-node scripts/db.ts rollback 2
  npx ts-node scripts/db.ts fresh

Environment Variables:
  DB_HOST           Database host (default: localhost)
  DB_PORT           Database port (default: 14101)
  DB_USER           Database user (default: postgres)
  DB_PASSWORD       Database password
  DB_NAME           Database name (default: core_app)
  DB_SSL            Enable SSL (default: false)
  BCRYPT_ROUNDS     BCrypt rounds for password hashing (default: 12)
`);
}

/**
 * Run migrations
 */
async function runMigrate(pool: Pool): Promise<void> {
  const migrator = new Migrator(pool);
  console.log('\nRunning migrations...\n');
  const results = await migrator.up();

  if (results.length === 0) {
    console.log('Database is up to date.');
  } else {
    console.log(`\n✅ Successfully ran ${results.length} migration(s).`);
  }
}

/**
 * Rollback migrations
 */
async function runRollback(pool: Pool, steps: number): Promise<void> {
  const migrator = new Migrator(pool);
  console.log(`\nRolling back ${steps} migration(s)...\n`);
  const results = await migrator.down(steps);

  if (results.length === 0) {
    console.log('No migrations to rollback.');
  } else {
    console.log(`\n✅ Successfully rolled back ${results.length} migration(s).`);
  }
}

/**
 * Reset all migrations
 */
async function runReset(pool: Pool): Promise<void> {
  const migrator = new Migrator(pool);
  console.log('\nResetting database (rolling back all migrations)...\n');
  const results = await migrator.reset();

  if (results.length === 0) {
    console.log('No migrations to rollback.');
  } else {
    console.log(`\n✅ Successfully rolled back ${results.length} migration(s).`);
  }
}

/**
 * Seed the database
 */
async function runSeed(pool: Pool): Promise<void> {
  const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  const seeder = new Seeder(pool, bcryptRounds);
  console.log('\nSeeding database...\n');

  const result = await seeder.run();

  if (result.success) {
    console.log('\n✅ Seeding completed successfully.');
    if (result.counts) {
      console.log(`   - Permissions: ${result.counts.permissions}`);
      console.log(`   - Roles: ${result.counts.roles}`);
      console.log(`   - Role-Permissions: ${result.counts.rolePermissions}`);
      console.log(`   - Users: ${result.counts.users}`);
      console.log(`   - User-Roles: ${result.counts.userRoles}`);
    }
  } else {
    console.error(`\n❌ Seeding failed: ${result.error}`);
    process.exit(1);
  }
}

/**
 * Fresh database (reset + migrate + seed)
 */
async function runFresh(pool: Pool): Promise<void> {
  console.log('\n🔄 Running fresh database setup...');

  // Reset
  await runReset(pool);

  // Migrate
  await runMigrate(pool);

  // Seed
  await runSeed(pool);

  console.log('\n✅ Fresh database setup completed.');
}

/**
 * Show migration status
 */
async function runStatus(pool: Pool): Promise<void> {
  const migrator = new Migrator(pool);
  const status = await migrator.status();

  console.log('\nMigration Status');
  console.log('================\n');

  console.log(`Total migrations: ${status.total}`);
  console.log(`Executed: ${status.executed.length}`);
  console.log(`Pending: ${status.pending.length}\n`);

  if (status.executed.length > 0) {
    console.log('Executed migrations:');
    status.executed.forEach((m) => {
      console.log(`  ✓ ${m.name} (${m.executed_at.toISOString()})`);
    });
    console.log('');
  }

  if (status.pending.length > 0) {
    console.log('Pending migrations:');
    status.pending.forEach((m) => {
      console.log(`  ○ ${m.name}`);
    });
    console.log('');
  }

  // Validate checksums
  const validation = await migrator.validateChecksums();
  if (!validation.valid) {
    console.log('⚠️  Checksum warnings:');
    validation.mismatches.forEach((m) => {
      console.log(`  - ${m.name}: checksum mismatch`);
    });
    console.log('');
  }
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }

  const pool = createPool();

  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Connected to database');

    switch (command) {
      case 'migrate':
        await runMigrate(pool);
        break;

      case 'rollback':
        const steps = parseInt(args[1] || '1', 10);
        await runRollback(pool, steps);
        break;

      case 'reset':
        await runReset(pool);
        break;

      case 'seed':
        await runSeed(pool);
        break;

      case 'fresh':
        await runFresh(pool);
        break;

      case 'status':
        await runStatus(pool);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Error: ${errorMessage}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run CLI
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
