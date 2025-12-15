/**
 * Database Migration System
 * STORY-024B: PostgreSQL Schema & Migrations
 *
 * SQL-based migration system with version control support.
 * Supports forward and rollback migrations.
 */

import { Pool, PoolClient } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface MigrationRecord {
  id: number;
  name: string;
  executed_at: Date;
  checksum: string;
}

export interface MigrationFile {
  version: string;
  name: string;
  filename: string;
  upSql: string;
  downSql: string;
  checksum: string;
}

export interface MigrationResult {
  success: boolean;
  migration: string;
  direction: 'up' | 'down';
  error?: string;
  executedAt: Date;
}

/**
 * Database Migrator
 *
 * Handles database migrations with:
 * - Version tracking via migrations table
 * - Checksum validation for migration integrity
 * - Transaction support for atomic migrations
 * - Forward and rollback capabilities
 */
export class Migrator {
  private pool: Pool;
  private migrationsPath: string;
  private tableName: string = 'schema_migrations';

  constructor(pool: Pool, migrationsPath?: string) {
    this.pool = pool;
    this.migrationsPath =
      migrationsPath ||
      path.join(__dirname, 'migrations');
  }

  /**
   * Calculate checksum for migration content
   */
  private calculateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Ensure the migrations tracking table exists
   */
  async ensureMigrationsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64) NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_name ON ${this.tableName}(name);
    `;
    await this.pool.query(sql);
  }

  /**
   * Get all executed migrations from the database
   */
  async getExecutedMigrations(): Promise<MigrationRecord[]> {
    await this.ensureMigrationsTable();
    const result = await this.pool.query<MigrationRecord>(
      `SELECT * FROM ${this.tableName} ORDER BY name ASC`
    );
    return result.rows;
  }

  /**
   * Load all migration files from the migrations directory
   */
  loadMigrationFiles(): MigrationFile[] {
    if (!fs.existsSync(this.migrationsPath)) {
      return [];
    }

    const files = fs.readdirSync(this.migrationsPath)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const migrations: MigrationFile[] = [];

    for (const filename of files) {
      const match = filename.match(/^(\d{3,})[-_](.+)\.sql$/);
      if (!match) continue;

      const version = match[1];
      const name = match[2];
      const filePath = path.join(this.migrationsPath, filename);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Parse up and down migrations from the file
      const upMatch = content.match(/--\s*UP\s*([\s\S]*?)(?=--\s*DOWN|$)/i);
      const downMatch = content.match(/--\s*DOWN\s*([\s\S]*?)$/i);

      const upSql = upMatch ? upMatch[1].trim() : content.trim();
      const downSql = downMatch ? downMatch[1].trim() : '';

      migrations.push({
        version,
        name: `${version}_${name}`,
        filename,
        upSql,
        downSql,
        checksum: this.calculateChecksum(content),
      });
    }

    return migrations;
  }

  /**
   * Get pending migrations (not yet executed)
   */
  async getPendingMigrations(): Promise<MigrationFile[]> {
    const executed = await this.getExecutedMigrations();
    const executedNames = new Set(executed.map(m => m.name));
    const allMigrations = this.loadMigrationFiles();

    return allMigrations.filter(m => !executedNames.has(m.name));
  }

  /**
   * Execute a single migration within a transaction
   */
  private async executeMigration(
    client: PoolClient,
    migration: MigrationFile,
    direction: 'up' | 'down'
  ): Promise<MigrationResult> {
    const sql = direction === 'up' ? migration.upSql : migration.downSql;

    if (!sql) {
      throw new Error(`No ${direction} migration SQL found for ${migration.name}`);
    }

    const startTime = Date.now();

    try {
      // Execute the migration SQL
      await client.query(sql);

      // Record or remove the migration
      if (direction === 'up') {
        await client.query(
          `INSERT INTO ${this.tableName} (name, checksum) VALUES ($1, $2)`,
          [migration.name, migration.checksum]
        );
      } else {
        await client.query(
          `DELETE FROM ${this.tableName} WHERE name = $1`,
          [migration.name]
        );
      }

      const duration = Date.now() - startTime;
      console.log(`  ✓ ${migration.name} (${direction}) - ${duration}ms`);

      return {
        success: true,
        migration: migration.name,
        direction,
        executedAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  ✗ ${migration.name} (${direction}) - ${errorMessage}`);

      return {
        success: false,
        migration: migration.name,
        direction,
        error: errorMessage,
        executedAt: new Date(),
      };
    }
  }

  /**
   * Run all pending migrations
   */
  async up(): Promise<MigrationResult[]> {
    const results: MigrationResult[] = [];
    const pending = await this.getPendingMigrations();

    if (pending.length === 0) {
      console.log('No pending migrations.');
      return results;
    }

    console.log(`Running ${pending.length} migration(s)...`);

    for (const migration of pending) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        const result = await this.executeMigration(client, migration, 'up');
        results.push(result);

        if (!result.success) {
          await client.query('ROLLBACK');
          throw new Error(`Migration ${migration.name} failed: ${result.error}`);
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    console.log(`Completed ${results.length} migration(s).`);
    return results;
  }

  /**
   * Rollback the last executed migration
   */
  async down(steps: number = 1): Promise<MigrationResult[]> {
    const results: MigrationResult[] = [];
    const executed = await this.getExecutedMigrations();
    const allMigrations = this.loadMigrationFiles();

    if (executed.length === 0) {
      console.log('No migrations to rollback.');
      return results;
    }

    // Get the migrations to rollback (most recent first)
    const toRollback = executed
      .slice(-steps)
      .reverse();

    console.log(`Rolling back ${toRollback.length} migration(s)...`);

    for (const record of toRollback) {
      const migration = allMigrations.find(m => m.name === record.name);

      if (!migration) {
        throw new Error(`Migration file not found for: ${record.name}`);
      }

      if (!migration.downSql) {
        throw new Error(`No down migration available for: ${record.name}`);
      }

      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        const result = await this.executeMigration(client, migration, 'down');
        results.push(result);

        if (!result.success) {
          await client.query('ROLLBACK');
          throw new Error(`Rollback ${migration.name} failed: ${result.error}`);
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    console.log(`Rolled back ${results.length} migration(s).`);
    return results;
  }

  /**
   * Reset database (rollback all migrations)
   */
  async reset(): Promise<MigrationResult[]> {
    const executed = await this.getExecutedMigrations();
    return this.down(executed.length);
  }

  /**
   * Get migration status
   */
  async status(): Promise<{
    executed: MigrationRecord[];
    pending: MigrationFile[];
    total: number;
  }> {
    const executed = await this.getExecutedMigrations();
    const pending = await this.getPendingMigrations();

    return {
      executed,
      pending,
      total: executed.length + pending.length,
    };
  }

  /**
   * Validate migration checksums
   */
  async validateChecksums(): Promise<{
    valid: boolean;
    mismatches: Array<{ name: string; expected: string; actual: string }>;
  }> {
    const executed = await this.getExecutedMigrations();
    const allMigrations = this.loadMigrationFiles();
    const mismatches: Array<{ name: string; expected: string; actual: string }> = [];

    for (const record of executed) {
      const migration = allMigrations.find(m => m.name === record.name);
      if (migration && migration.checksum !== record.checksum) {
        mismatches.push({
          name: record.name,
          expected: record.checksum,
          actual: migration.checksum,
        });
      }
    }

    return {
      valid: mismatches.length === 0,
      mismatches,
    };
  }
}

export default Migrator;
