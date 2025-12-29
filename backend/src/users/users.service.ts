/**
 * Users Service
 * STORY-021B: Resource Endpoints
 * STORY-003A: User CRUD Backend API
 * STORY-007B: User Role Assignment
 *
 * Business logic for user management including CRUD operations,
 * pagination, filtering, sorting, soft delete, and role management.
 *
 * STORY-007B additions:
 * - Permission aggregation from all user roles
 * - Token invalidation on role changes
 * - Enhanced role assignment/removal with assigned_by tracking
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../database/database.service';
import { WinstonLoggerService } from '../common/services/logger.service';
import { AuditService } from '../common/services/audit.service';
import { AuthService } from '../auth/auth.service';
import { PermissionAggregationService } from './permission-aggregation.service';
import { User } from '../database/types';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ListUsersQueryDto,
  ALLOWED_USER_SORT_FIELDS,
} from './dto/list-users-query.dto';
import { UserResponseDto, UserRoleDto, UserWithRoles, UserWithPermissionsDto } from './dto/user-response.dto';
import { parseSort, PaginatedResponse, createPaginatedResponse } from '../common/dto/pagination.dto';
import { Request } from 'express';

/**
 * Extended Request interface with user and requestId
 */
interface AuthRequest extends Request {
  user?: { id?: number; email?: string };
  requestId?: string;
}

/**
 * Users Service
 * Handles all user-related business logic
 */
@Injectable()
export class UsersService {
  private readonly bcryptRounds: number;

  constructor(
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    @Inject(forwardRef(() => PermissionAggregationService))
    private readonly permissionAggregationService: PermissionAggregationService,
  ) {
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  }

  /**
   * Find all users with pagination, filtering, and sorting
   *
   * @param query - Query parameters for pagination, filtering, and sorting
   * @returns Paginated list of users
   */
  async findAll(
    query: ListUsersQueryDto,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    const pool = this.databaseService.ensurePool();

    const {
      page = 1,
      limit = 20,
      sort,
      status,
      search,
      mfa_enabled,
      role,
      include_deleted = false,
    } = query;

    // Parse sort parameter
    const { field: sortField, order: sortOrder } = parseSort(
      sort,
      [...ALLOWED_USER_SORT_FIELDS],
      'created_at',
    );

    // Map camelCase to snake_case for database columns
    const sortColumn = this.mapSortField(sortField);

    // Build WHERE clause
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // By default, exclude soft-deleted users unless explicitly requested
    if (!include_deleted) {
      conditions.push(`u.deleted_at IS NULL`);
    }

    if (status) {
      conditions.push(`u.status = $${paramIndex++}`);
      params.push(status);
    }

    if (search) {
      conditions.push(`(u.email ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (mfa_enabled !== undefined) {
      conditions.push(`u.mfa_enabled = $${paramIndex++}`);
      params.push(mfa_enabled);
    }

    // Role filter requires a join with user_roles
    let roleJoin = '';
    if (role) {
      roleJoin = `
        INNER JOIN user_roles ur ON u.id = ur.user_id
        INNER JOIN roles r ON ur.role_id = r.id`;
      conditions.push(`LOWER(r.name) = LOWER($${paramIndex++})`);
      params.push(role);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(DISTINCT u.id) as count FROM users u ${roleJoin} ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Calculate offset
    const offset = (page - 1) * limit;

    // Get paginated data with roles
    const dataResult = await pool.query<User>(
      `SELECT DISTINCT u.* FROM users u ${roleJoin} ${whereClause}
       ORDER BY u.${sortColumn} ${sortOrder.toUpperCase()}
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset],
    );

    // Fetch roles for all users
    const usersWithRoles = await this.attachRolesToUsers(dataResult.rows);
    const users = UserResponseDto.fromEntities(usersWithRoles);

    this.logger.debug(
      `Found ${users.length} users (page ${page}, total ${total})`,
      'UsersService',
    );

    return createPaginatedResponse(users, total, page, limit);
  }

  /**
   * Find a single user by ID
   *
   * @param id - User ID
   * @returns User or throws NotFoundException
   */
  async findOne(id: number): Promise<UserResponseDto> {
    const pool = this.databaseService.ensurePool();

    const result = await pool.query<User>(
      'SELECT * FROM users WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const user = result.rows[0];
    const userWithRoles = await this.attachRolesToUser(user);

    return UserResponseDto.fromEntity(userWithRoles);
  }

  /**
   * Find a user by ID (internal - includes password_hash)
   *
   * @param id - User ID
   * @returns Full user record or null
   */
  async findById(id: number): Promise<User | null> {
    const pool = this.databaseService.ensurePool();

    const result = await pool.query<User>(
      'SELECT * FROM users WHERE id = $1',
      [id],
    );

    return result.rows[0] || null;
  }

  /**
   * Find a user by email (internal - includes password_hash)
   *
   * @param email - User email
   * @returns Full user record or null
   */
  async findByEmail(email: string): Promise<User | null> {
    const pool = this.databaseService.ensurePool();

    const result = await pool.query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()],
    );

    return result.rows[0] || null;
  }

  /**
   * Create a new user
   *
   * @param createUserDto - User data
   * @param request - Optional request for audit logging
   * @returns Created user
   */
  async create(createUserDto: CreateUserDto, request?: AuthRequest): Promise<UserResponseDto> {
    const pool = this.databaseService.ensurePool();

    const {
      email,
      password,
      name,
      status = 'active',
      mfa_enabled = false,
      roles = ['user'],
    } = createUserDto;

    // Check if email already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictException(`User with email ${email} already exists`);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, this.bcryptRounds);

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert user
      const result = await client.query<User>(
        `INSERT INTO users (email, password_hash, name, status, mfa_enabled)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [email.toLowerCase(), passwordHash, name, status, mfa_enabled],
      );

      const user = result.rows[0];

      // Assign roles
      for (const roleName of roles) {
        const roleResult = await client.query<{ id: number }>(
          'SELECT id FROM roles WHERE LOWER(name) = LOWER($1)',
          [roleName],
        );

        if (roleResult.rows.length > 0) {
          await client.query(
            'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [user.id, roleResult.rows[0].id],
          );
        } else {
          this.logger.warn(`Role "${roleName}" not found, skipping assignment`, 'UsersService');
        }
      }

      await client.query('COMMIT');

      // Audit log
      await this.auditService.log({
        action: 'USER_CREATE',
        userId: request?.user?.id || null,
        resource: 'user',
        resourceId: user.id,
        details: { email: user.email, name: user.name, roles, createdBy: request?.user?.email },
        request: request as AuthRequest,
      });

      this.logger.log(`Created user: ${user.email} (ID: ${user.id})`, 'UsersService');

      const userWithRoles = await this.attachRolesToUser(user);
      return UserResponseDto.fromEntity(userWithRoles);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing user
   *
   * @param id - User ID
   * @param updateUserDto - Update data
   * @param request - Optional request for audit logging
   * @returns Updated user
   */
  async update(id: number, updateUserDto: UpdateUserDto, request?: AuthRequest): Promise<UserResponseDto> {
    const pool = this.databaseService.ensurePool();

    // Check if user exists
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Don't allow updating deleted users
    if (existingUser.deleted_at) {
      throw new BadRequestException('Cannot update a deleted user');
    }

    const { email, password, name, status, mfa_enabled } = updateUserDto;

    // Check if email is being changed and already exists
    if (email && email.toLowerCase() !== existingUser.email.toLowerCase()) {
      const emailExists = await this.findByEmail(email);
      if (emailExists) {
        throw new ConflictException(`User with email ${email} already exists`);
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;
    const changes: Record<string, { old: unknown; new: unknown }> = {};

    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      params.push(email.toLowerCase());
      changes.email = { old: existingUser.email, new: email.toLowerCase() };
    }

    if (password !== undefined) {
      const passwordHash = await bcrypt.hash(password, this.bcryptRounds);
      updates.push(`password_hash = $${paramIndex++}`);
      params.push(passwordHash);
      changes.password = { old: '[REDACTED]', new: '[REDACTED]' };
    }

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
      changes.name = { old: existingUser.name, new: name };
    }

    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
      changes.status = { old: existingUser.status, new: status };
    }

    if (mfa_enabled !== undefined) {
      updates.push(`mfa_enabled = $${paramIndex++}`);
      params.push(mfa_enabled);
      changes.mfa_enabled = { old: existingUser.mfa_enabled, new: mfa_enabled };
    }

    // Always update updated_at
    updates.push(`updated_at = NOW()`);

    // If no updates, return existing user
    if (updates.length === 1) {
      const userWithRoles = await this.attachRolesToUser(existingUser);
      return UserResponseDto.fromEntity(userWithRoles);
    }

    // Execute update
    params.push(id);
    const result = await pool.query<User>(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params,
    );

    const user = result.rows[0];

    // Audit log
    await this.auditService.log({
      action: 'USER_UPDATE',
      userId: request?.user?.id || null,
      resource: 'user',
      resourceId: user.id,
      details: { changes, updatedBy: request?.user?.email },
      request: request as AuthRequest,
    });

    this.logger.log(`Updated user: ${user.email} (ID: ${user.id})`, 'UsersService');

    const userWithRoles = await this.attachRolesToUser(user);
    return UserResponseDto.fromEntity(userWithRoles);
  }

  /**
   * Soft delete a user
   * Sets deleted_at timestamp and status to 'deleted'
   *
   * @param id - User ID
   * @param request - Optional request for audit logging
   * @returns Deleted user
   */
  async delete(id: number, request?: AuthRequest): Promise<UserResponseDto> {
    const pool = this.databaseService.ensurePool();

    // Check if user exists
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check if already deleted
    if (existingUser.deleted_at) {
      throw new BadRequestException('User is already deleted');
    }

    // Soft delete: set deleted_at and status
    const result = await pool.query<User>(
      `UPDATE users SET
        deleted_at = NOW(),
        status = 'deleted',
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id],
    );

    const user = result.rows[0];

    // Audit log
    await this.auditService.log({
      action: 'USER_DELETE',
      userId: request?.user?.id || null,
      resource: 'user',
      resourceId: user.id,
      details: { email: user.email, deletedBy: request?.user?.email },
      request: request as AuthRequest,
    });

    this.logger.log(`Soft-deleted user: ${user.email} (ID: ${id})`, 'UsersService');

    const userWithRoles = await this.attachRolesToUser(user);
    return UserResponseDto.fromEntity(userWithRoles);
  }

  /**
   * Hard delete a user (permanent removal)
   * Use with caution - this cannot be undone
   *
   * @param id - User ID
   * @param request - Optional request for audit logging
   * @returns Deleted user info
   */
  async hardDelete(id: number, request?: AuthRequest): Promise<UserResponseDto> {
    const pool = this.databaseService.ensurePool();

    // Check if user exists
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Delete user (cascade will handle user_roles)
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    // Audit log
    await this.auditService.log({
      action: 'USER_HARD_DELETE',
      userId: request?.user?.id || null,
      resource: 'user',
      resourceId: id,
      details: { email: existingUser.email, hardDeletedBy: request?.user?.email },
      level: 'warn',
      request: request as AuthRequest,
    });

    this.logger.warn(`Hard-deleted user: ${existingUser.email} (ID: ${id})`, 'UsersService');

    return UserResponseDto.fromEntity(existingUser as UserWithRoles);
  }

  /**
   * Restore a soft-deleted user
   *
   * @param id - User ID
   * @param request - Optional request for audit logging
   * @returns Restored user
   */
  async restore(id: number, request?: AuthRequest): Promise<UserResponseDto> {
    const pool = this.databaseService.ensurePool();

    // Check if user exists
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check if user is deleted
    if (!existingUser.deleted_at) {
      throw new BadRequestException('User is not deleted');
    }

    // Restore: clear deleted_at and set status to inactive
    const result = await pool.query<User>(
      `UPDATE users SET
        deleted_at = NULL,
        status = 'inactive',
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id],
    );

    const user = result.rows[0];

    // Audit log
    await this.auditService.log({
      action: 'USER_RESTORE',
      userId: request?.user?.id || null,
      resource: 'user',
      resourceId: user.id,
      details: { email: user.email, restoredBy: request?.user?.email },
      request: request as AuthRequest,
    });

    this.logger.log(`Restored user: ${user.email} (ID: ${id})`, 'UsersService');

    const userWithRoles = await this.attachRolesToUser(user);
    return UserResponseDto.fromEntity(userWithRoles);
  }

  /**
   * Admin reset password for a user
   *
   * @param id - User ID
   * @param newPassword - New password
   * @param request - Optional request for audit logging
   * @returns Updated user
   */
  async adminResetPassword(
    id: number,
    newPassword: string,
    request?: AuthRequest,
  ): Promise<UserResponseDto> {
    const pool = this.databaseService.ensurePool();

    // Check if user exists
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (existingUser.deleted_at) {
      throw new BadRequestException('Cannot reset password for deleted user');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, this.bcryptRounds);

    // Update password
    const result = await pool.query<User>(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [passwordHash, id],
    );

    const user = result.rows[0];

    // Audit log
    await this.auditService.log({
      action: 'USER_PASSWORD_RESET_BY_ADMIN',
      userId: request?.user?.id || null,
      resource: 'user',
      resourceId: user.id,
      details: { targetEmail: user.email, resetBy: request?.user?.email },
      request: request as AuthRequest,
    });

    this.logger.log(`Admin reset password for user: ${user.email} (ID: ${id})`, 'UsersService');

    const userWithRoles = await this.attachRolesToUser(user);
    return UserResponseDto.fromEntity(userWithRoles);
  }

  /**
   * Update user's last login timestamp
   *
   * @param id - User ID
   */
  async updateLastLogin(id: number): Promise<void> {
    const pool = this.databaseService.ensurePool();

    await pool.query(
      'UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1',
      [id],
    );
  }

  /**
   * Check if a user has a specific role
   *
   * @param userId - User ID
   * @param roleName - Role name to check
   * @returns True if user has the role
   */
  async hasRole(userId: number, roleName: string): Promise<boolean> {
    const pool = this.databaseService.ensurePool();

    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1 AND LOWER(r.name) = LOWER($2)`,
      [userId, roleName],
    );

    return parseInt(result.rows[0].count, 10) > 0;
  }

  /**
   * Assign roles to a user
   * STORY-007B: Enhanced with assigned_by tracking and token invalidation
   *
   * @param userId - User ID
   * @param roleNames - Role names to assign
   * @param request - Optional request for audit logging
   * @param invalidateTokens - Whether to invalidate user tokens (default: true)
   */
  async assignRoles(
    userId: number,
    roleNames: string[],
    request?: AuthRequest,
    invalidateTokens: boolean = true,
  ): Promise<void> {
    const pool = this.databaseService.ensurePool();

    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const assignedBy = request?.user?.id || null;
    let rolesChanged = false;

    for (const roleName of roleNames) {
      const roleResult = await pool.query<{ id: number; name: string }>(
        'SELECT id, name FROM roles WHERE LOWER(name) = LOWER($1)',
        [roleName],
      );

      if (roleResult.rows.length === 0) {
        throw new BadRequestException(`Role "${roleName}" not found`);
      }

      const role = roleResult.rows[0];

      // STORY-007B: Include assigned_by in the insert
      const insertResult = await pool.query(
        `INSERT INTO user_roles (user_id, role_id, assigned_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, role_id) DO NOTHING
         RETURNING *`,
        [userId, role.id, assignedBy],
      );

      // Check if a new row was actually inserted
      if (insertResult.rowCount && insertResult.rowCount > 0) {
        rolesChanged = true;

        // Audit log
        await this.auditService.logRoleAssignment(
          userId,
          role.id,
          role.name,
          request?.user?.id || 0,
          request as AuthRequest,
        );
      }
    }

    // STORY-007B: Invalidate permission cache and user tokens if roles changed
    if (rolesChanged) {
      this.permissionAggregationService.invalidateCache(userId);

      if (invalidateTokens) {
        await this.authService.invalidateUserTokens(userId);
        this.logger.log(
          `Tokens invalidated for user ${userId} due to role assignment`,
          'UsersService',
        );
      }
    }

    this.logger.log(`Assigned roles [${roleNames.join(', ')}] to user ID: ${userId}`, 'UsersService');
  }

  /**
   * Remove roles from a user
   * STORY-007B: Enhanced with token invalidation
   *
   * @param userId - User ID
   * @param roleNames - Role names to remove
   * @param request - Optional request for audit logging
   * @param invalidateTokens - Whether to invalidate user tokens (default: true)
   */
  async removeRoles(
    userId: number,
    roleNames: string[],
    request?: AuthRequest,
    invalidateTokens: boolean = true,
  ): Promise<void> {
    const pool = this.databaseService.ensurePool();

    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    let rolesChanged = false;

    for (const roleName of roleNames) {
      const roleResult = await pool.query<{ id: number; name: string }>(
        'SELECT id, name FROM roles WHERE LOWER(name) = LOWER($1)',
        [roleName],
      );

      if (roleResult.rows.length === 0) {
        continue; // Skip non-existent roles silently
      }

      const role = roleResult.rows[0];

      const deleteResult = await pool.query(
        'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2 RETURNING *',
        [userId, role.id],
      );

      // Check if a row was actually deleted
      if (deleteResult.rowCount && deleteResult.rowCount > 0) {
        rolesChanged = true;

        // Audit log
        await this.auditService.log({
          action: 'ROLE_REVOKE',
          userId: request?.user?.id || null,
          resource: 'user_role',
          resourceId: userId,
          details: {
            targetUserId: userId,
            roleId: role.id,
            roleName: role.name,
            revokedBy: request?.user?.email,
          },
          request: request as AuthRequest,
        });
      }
    }

    // STORY-007B: Invalidate permission cache and user tokens if roles changed
    if (rolesChanged) {
      this.permissionAggregationService.invalidateCache(userId);

      if (invalidateTokens) {
        await this.authService.invalidateUserTokens(userId);
        this.logger.log(
          `Tokens invalidated for user ${userId} due to role removal`,
          'UsersService',
        );
      }
    }

    this.logger.log(`Removed roles [${roleNames.join(', ')}] from user ID: ${userId}`, 'UsersService');
  }

  /**
   * Get a user with their aggregated permissions
   * STORY-007B: User Role Assignment
   *
   * @param id - User ID
   * @returns User with roles and aggregated permissions
   */
  async findOneWithPermissions(id: number): Promise<UserWithPermissionsDto> {
    const user = await this.findOne(id);

    // Get aggregated permissions from all roles
    const permissions = await this.permissionAggregationService.getUserPermissions(id);

    return UserWithPermissionsDto.fromUserResponse(user, permissions);
  }

  /**
   * Get user roles (simple array of role info)
   * STORY-007B: User Role Assignment
   *
   * @param userId - User ID
   * @returns Array of user roles
   */
  async getUserRoles(userId: number): Promise<UserRoleDto[]> {
    const pool = this.databaseService.ensurePool();

    const result = await pool.query<UserRoleDto>(
      `SELECT r.id, r.name, r.description
       FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1
       ORDER BY r.name`,
      [userId],
    );

    return result.rows;
  }

  /**
   * Get user permissions (aggregated from all roles)
   * STORY-007B: User Role Assignment
   *
   * @param userId - User ID
   * @returns Array of permission names
   */
  async getUserPermissions(userId: number): Promise<string[]> {
    return this.permissionAggregationService.getUserPermissions(userId);
  }

  /**
   * Attach roles to a single user
   */
  private async attachRolesToUser(user: User): Promise<UserWithRoles> {
    const pool = this.databaseService.ensurePool();

    const rolesResult = await pool.query<UserRoleDto>(
      `SELECT r.id, r.name, r.description
       FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1
       ORDER BY r.name`,
      [user.id],
    );

    return { ...user, roles: rolesResult.rows };
  }

  /**
   * Attach roles to multiple users
   */
  private async attachRolesToUsers(users: User[]): Promise<UserWithRoles[]> {
    if (users.length === 0) {
      return [];
    }

    const pool = this.databaseService.ensurePool();

    const userIds = users.map((u) => u.id);

    const rolesResult = await pool.query<{ user_id: number; id: number; name: string; description: string | null }>(
      `SELECT ur.user_id, r.id, r.name, r.description
       FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = ANY($1)
       ORDER BY r.name`,
      [userIds],
    );

    // Group roles by user_id
    const rolesByUser = new Map<number, UserRoleDto[]>();
    for (const row of rolesResult.rows) {
      const userRoles = rolesByUser.get(row.user_id) || [];
      userRoles.push({ id: row.id, name: row.name, description: row.description });
      rolesByUser.set(row.user_id, userRoles);
    }

    return users.map((user) => ({
      ...user,
      roles: rolesByUser.get(user.id) || [],
    }));
  }

  /**
   * Map sort field from API to database column name
   * Handles camelCase to snake_case conversion
   */
  private mapSortField(field: string): string {
    const fieldMap: Record<string, string> = {
      id: 'id',
      email: 'email',
      name: 'name',
      status: 'status',
      created_at: 'created_at',
      createdAt: 'created_at',
      updated_at: 'updated_at',
      updatedAt: 'updated_at',
      last_login: 'last_login',
      lastLogin: 'last_login',
      mfa_enabled: 'mfa_enabled',
      mfaEnabled: 'mfa_enabled',
    };

    return fieldMap[field] || 'created_at';
  }
}
