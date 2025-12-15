/**
 * User Repository
 * STORY-025: Benutzerdaten (User Data Storage)
 * STORY-023: User Registration - Added verification token methods
 *
 * Repository pattern for user data access.
 * Provides a clean interface for all database operations related to users.
 */

import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { User, UserInsert, UserUpdate, UserStatus } from '../database/types';

/**
 * User filter options for querying
 */
export interface UserFilter {
  email?: string;
  status?: UserStatus;
  mfa_enabled?: boolean;
  include_deleted?: boolean;
  search?: string;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * User Repository
 * Handles all database operations for the users table
 */
@Injectable()
export class UserRepository {
  constructor(
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * Get the database pool
   * @throws Error if pool is not available
   */
  private getPool(): Pool {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }
    return pool;
  }

  /**
   * Find a user by ID
   * @param id - User ID
   * @returns User or null if not found
   */
  async findById(id: number): Promise<User | null> {
    const pool = this.getPool();
    const result = await pool.query<User>(
      'SELECT * FROM users WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  /**
   * Find a user by email (case-insensitive)
   * @param email - User email
   * @returns User or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    const pool = this.getPool();
    const result = await pool.query<User>(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email],
    );
    return result.rows[0] || null;
  }

  /**
   * Find all users with optional filtering and pagination
   * @param filter - Filter options
   * @param pagination - Pagination options
   * @returns Paginated list of users
   */
  async findAll(
    filter?: UserFilter,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<User>> {
    const pool = this.getPool();

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const sortField = pagination?.sortField || 'created_at';
    const sortOrder = pagination?.sortOrder || 'desc';

    // Build WHERE clause
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // By default, exclude soft-deleted users
    if (!filter?.include_deleted) {
      conditions.push(`deleted_at IS NULL`);
    }

    if (filter?.email) {
      conditions.push(`LOWER(email) = LOWER($${paramIndex++})`);
      params.push(filter.email);
    }

    if (filter?.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filter.status);
    }

    if (filter?.mfa_enabled !== undefined) {
      conditions.push(`mfa_enabled = $${paramIndex++}`);
      params.push(filter.mfa_enabled);
    }

    if (filter?.search) {
      conditions.push(`(email ILIKE $${paramIndex} OR name ILIKE $${paramIndex})`);
      params.push(`%${filter.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Validate sort field to prevent SQL injection
    const allowedSortFields = ['id', 'email', 'name', 'status', 'created_at', 'updated_at', 'last_login'];
    const safeSortField = allowedSortFields.includes(sortField) ? sortField : 'created_at';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM users ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Calculate offset
    const offset = (page - 1) * limit;

    // Get paginated data
    const dataResult = await pool.query<User>(
      `SELECT * FROM users ${whereClause}
       ORDER BY ${safeSortField} ${safeSortOrder}
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset],
    );

    return {
      data: dataResult.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Create a new user
   * STORY-023: Updated to support verification token fields for registration
   * @param userData - User data to insert
   * @param client - Optional pool client for transaction support
   * @returns Created user
   */
  async create(userData: UserInsert, client?: PoolClient): Promise<User> {
    const queryRunner = client || this.getPool();

    const result = await queryRunner.query<User>(
      `INSERT INTO users (email, password_hash, name, status, mfa_enabled, mfa_secret, verification_token_hash, verification_token_expires)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userData.email.toLowerCase(),
        userData.password_hash,
        userData.name,
        userData.status || 'active',
        userData.mfa_enabled || false,
        userData.mfa_secret || null,
        userData.verification_token_hash || null,
        userData.verification_token_expires || null,
      ],
    );

    return result.rows[0];
  }

  /**
   * Update a user
   * @param id - User ID
   * @param userData - User data to update
   * @param client - Optional pool client for transaction support
   * @returns Updated user or null if not found
   */
  async update(id: number, userData: UserUpdate, client?: PoolClient): Promise<User | null> {
    const queryRunner = client || this.getPool();

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (userData.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      params.push(userData.email.toLowerCase());
    }

    if (userData.password_hash !== undefined) {
      updates.push(`password_hash = $${paramIndex++}`);
      params.push(userData.password_hash);
    }

    if (userData.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(userData.name);
    }

    if (userData.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(userData.status);
    }

    if (userData.mfa_enabled !== undefined) {
      updates.push(`mfa_enabled = $${paramIndex++}`);
      params.push(userData.mfa_enabled);
    }

    if (userData.mfa_secret !== undefined) {
      updates.push(`mfa_secret = $${paramIndex++}`);
      params.push(userData.mfa_secret);
    }

    if (userData.last_login !== undefined) {
      updates.push(`last_login = $${paramIndex++}`);
      params.push(userData.last_login);
    }

    if (userData.deleted_at !== undefined) {
      updates.push(`deleted_at = $${paramIndex++}`);
      params.push(userData.deleted_at);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    // updated_at is auto-updated by trigger, but we can also set it explicitly
    updates.push(`updated_at = NOW()`);

    params.push(id);
    const result = await queryRunner.query<User>(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params,
    );

    return result.rows[0] || null;
  }

  /**
   * Update last login timestamp
   * @param id - User ID
   */
  async updateLastLogin(id: number): Promise<void> {
    const pool = this.getPool();
    await pool.query(
      'UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1',
      [id],
    );
  }

  /**
   * Soft delete a user (set deleted_at and status = 'deleted')
   * @param id - User ID
   * @returns Deleted user or null if not found
   */
  async softDelete(id: number): Promise<User | null> {
    const pool = this.getPool();
    const result = await pool.query<User>(
      `UPDATE users SET
        deleted_at = NOW(),
        status = 'deleted',
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id],
    );
    return result.rows[0] || null;
  }

  /**
   * Restore a soft-deleted user
   * @param id - User ID
   * @returns Restored user or null if not found
   */
  async restore(id: number): Promise<User | null> {
    const pool = this.getPool();
    const result = await pool.query<User>(
      `UPDATE users SET
        deleted_at = NULL,
        status = 'inactive',
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id],
    );
    return result.rows[0] || null;
  }

  /**
   * Hard delete a user (permanent removal)
   * Use with caution - this cannot be undone
   * @param id - User ID
   * @returns True if deleted, false if not found
   */
  async hardDelete(id: number): Promise<boolean> {
    const pool = this.getPool();
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1',
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Check if email is unique (case-insensitive)
   * @param email - Email to check
   * @param excludeId - Optional user ID to exclude from check (for updates)
   * @returns True if email is unique
   */
  async isEmailUnique(email: string, excludeId?: number): Promise<boolean> {
    const pool = this.getPool();
    const params: unknown[] = [email.toLowerCase()];
    let query = 'SELECT COUNT(*) as count FROM users WHERE LOWER(email) = $1';

    if (excludeId !== undefined) {
      query += ' AND id != $2';
      params.push(excludeId);
    }

    const result = await pool.query<{ count: string }>(query, params);
    return parseInt(result.rows[0].count, 10) === 0;
  }

  /**
   * Count users by status
   * @returns Count of users grouped by status
   */
  async countByStatus(): Promise<Record<UserStatus, number>> {
    const pool = this.getPool();
    const result = await pool.query<{ status: UserStatus; count: string }>(
      `SELECT status, COUNT(*) as count FROM users GROUP BY status`,
    );

    const counts: Record<UserStatus, number> = {
      active: 0,
      inactive: 0,
      suspended: 0,
      deleted: 0,
      pending: 0,
    };

    for (const row of result.rows) {
      counts[row.status] = parseInt(row.count, 10);
    }

    return counts;
  }

  /**
   * Get total user count (excluding deleted)
   * @param includeDeleted - Include soft-deleted users
   * @returns Total count
   */
  async count(includeDeleted = false): Promise<number> {
    const pool = this.getPool();
    const whereClause = includeDeleted ? '' : 'WHERE deleted_at IS NULL';
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM users ${whereClause}`,
    );
    return parseInt(result.rows[0].count, 10);
  }

  // ===========================================
  // Email Verification Methods (STORY-023: User Registration)
  // ===========================================

  /**
   * Find user by verification token hash
   * STORY-023: User Registration
   * @param tokenHash - SHA-256 hash of the verification token
   * @returns User or null if not found or token expired
   */
  async findByVerificationToken(tokenHash: string): Promise<User | null> {
    const pool = this.getPool();
    const result = await pool.query<User>(
      `SELECT * FROM users
       WHERE verification_token_hash = $1
       AND verification_token_expires > NOW()
       AND status = 'pending'`,
      [tokenHash],
    );
    return result.rows[0] || null;
  }

  /**
   * Verify user email
   * STORY-023: User Registration
   * Sets email_verified_at, clears verification token, and updates status to active
   * @param userId - User ID
   * @returns Updated user or null if not found
   */
  async verifyEmail(userId: number): Promise<User | null> {
    const pool = this.getPool();
    const result = await pool.query<User>(
      `UPDATE users SET
        email_verified_at = NOW(),
        verification_token_hash = NULL,
        verification_token_expires = NULL,
        status = 'active',
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [userId],
    );
    return result.rows[0] || null;
  }

  /**
   * Update verification token for a user
   * STORY-023: User Registration - Used for resending verification email
   * @param userId - User ID
   * @param tokenHash - SHA-256 hash of the new verification token
   * @param expiresAt - Token expiration timestamp
   * @returns Updated user or null if not found
   */
  async updateVerificationToken(
    userId: number,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<User | null> {
    const pool = this.getPool();
    const result = await pool.query<User>(
      `UPDATE users SET
        verification_token_hash = $1,
        verification_token_expires = $2,
        updated_at = NOW()
       WHERE id = $3 AND status = 'pending'
       RETURNING *`,
      [tokenHash, expiresAt, userId],
    );
    return result.rows[0] || null;
  }

  /**
   * Find pending user by email
   * STORY-023: User Registration - Used for resending verification email
   * @param email - User email
   * @returns User or null if not found or not pending
   */
  async findPendingByEmail(email: string): Promise<User | null> {
    const pool = this.getPool();
    const result = await pool.query<User>(
      `SELECT * FROM users
       WHERE LOWER(email) = LOWER($1)
       AND status = 'pending'`,
      [email],
    );
    return result.rows[0] || null;
  }

  /**
   * Delete expired pending users
   * STORY-023: User Registration - Cleanup task for unverified registrations
   * @param olderThan - Delete users with expired tokens older than this duration
   * @returns Number of deleted users
   */
  async deleteExpiredPendingUsers(olderThan?: Date): Promise<number> {
    const pool = this.getPool();
    const expiryDate = olderThan || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: 7 days
    const result = await pool.query(
      `DELETE FROM users
       WHERE status = 'pending'
       AND verification_token_expires < $1`,
      [expiryDate],
    );
    return result.rowCount || 0;
  }
}
