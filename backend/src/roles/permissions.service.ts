/**
 * Permissions Service
 * STORY-007A: Rollen-Management Backend
 *
 * Business logic for permission management including
 * listing, grouping by category, and retrieval operations.
 */

import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { WinstonLoggerService } from '../common/services/logger.service';
import { Permission } from '../database/types';
import {
  PermissionResponseDto,
  GroupedPermissionsResponseDto,
} from './dto/permission-response.dto';

/**
 * Permissions Service
 * Handles all permission-related business logic
 */
@Injectable()
export class PermissionsService {
  constructor(
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
  ) {}

  /**
   * Find all permissions
   *
   * @returns List of all permissions
   */
  async findAll(): Promise<PermissionResponseDto[]> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const result = await pool.query<Permission>(
      'SELECT * FROM permissions ORDER BY category, name',
    );

    this.logger.debug(`Found ${result.rows.length} permissions`, 'PermissionsService');

    return PermissionResponseDto.fromEntities(result.rows);
  }

  /**
   * Find a single permission by ID
   *
   * @param id - Permission ID
   * @returns Permission or throws NotFoundException
   */
  async findOne(id: number): Promise<PermissionResponseDto> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const result = await pool.query<Permission>(
      'SELECT * FROM permissions WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }

    return PermissionResponseDto.fromEntity(result.rows[0]);
  }

  /**
   * Find permissions by name
   *
   * @param name - Permission name (exact or partial match)
   * @returns Permission or null
   */
  async findByName(name: string): Promise<PermissionResponseDto | null> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const result = await pool.query<Permission>(
      'SELECT * FROM permissions WHERE name = $1',
      [name],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return PermissionResponseDto.fromEntity(result.rows[0]);
  }

  /**
   * Get permissions grouped by category
   *
   * @returns Permissions grouped by category
   */
  async findAllGroupedByCategory(): Promise<GroupedPermissionsResponseDto> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const result = await pool.query<Permission>(
      'SELECT * FROM permissions ORDER BY category, name',
    );

    // Group permissions by category
    const categories: Record<string, PermissionResponseDto[]> = {};

    for (const permission of result.rows) {
      const category = permission.category || 'other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(PermissionResponseDto.fromEntity(permission));
    }

    this.logger.debug(
      `Found ${result.rows.length} permissions in ${Object.keys(categories).length} categories`,
      'PermissionsService',
    );

    return {
      categories,
      total: result.rows.length,
    };
  }

  /**
   * Get permissions by category
   *
   * @param category - Permission category
   * @returns List of permissions in the category
   */
  async findByCategory(category: string): Promise<PermissionResponseDto[]> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const result = await pool.query<Permission>(
      'SELECT * FROM permissions WHERE category = $1 ORDER BY name',
      [category],
    );

    this.logger.debug(
      `Found ${result.rows.length} permissions in category: ${category}`,
      'PermissionsService',
    );

    return PermissionResponseDto.fromEntities(result.rows);
  }

  /**
   * Get all unique permission categories
   *
   * @returns List of unique categories
   */
  async getCategories(): Promise<string[]> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const result = await pool.query<{ category: string | null }>(
      `SELECT DISTINCT category FROM permissions
       WHERE category IS NOT NULL
       ORDER BY category`,
    );

    return result.rows.map((r) => r.category).filter((c): c is string => c !== null);
  }

  /**
   * Check if a user has a specific permission
   *
   * @param userId - User ID
   * @param permissionName - Permission name to check
   * @returns True if user has the permission
   */
  async userHasPermission(userId: number, permissionName: string): Promise<boolean> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = $1 AND (
         p.name = $2
         OR p.name = 'system.admin'
         OR (p.name LIKE '%.*' AND SPLIT_PART(p.name, '.', 1) = SPLIT_PART($2, '.', 1))
       )`,
      [userId, permissionName],
    );

    return parseInt(result.rows[0].count, 10) > 0;
  }

  /**
   * Get all permissions for a user (through their roles)
   *
   * @param userId - User ID
   * @returns List of permissions the user has
   */
  async getUserPermissions(userId: number): Promise<PermissionResponseDto[]> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const result = await pool.query<Permission>(
      `SELECT DISTINCT p.*
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = $1
       ORDER BY p.category, p.name`,
      [userId],
    );

    return PermissionResponseDto.fromEntities(result.rows);
  }
}
