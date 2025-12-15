/**
 * Permission Aggregation Service
 * STORY-007B: User Role Assignment
 *
 * Provides methods to collect and aggregate permissions from all user roles.
 * Handles caching and efficient permission lookups.
 */

import {
  Injectable,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { WinstonLoggerService } from '../common/services/logger.service';

/**
 * Permission with category information
 */
export interface AggregatedPermission {
  id: number;
  name: string;
  category?: string | null;
}

/**
 * Service for aggregating user permissions from all assigned roles
 */
@Injectable()
export class PermissionAggregationService {
  // Simple in-memory cache for user permissions
  private permissionCache: Map<number, { permissions: string[]; expiresAt: number }> = new Map();
  private readonly cacheTtlMs: number;

  constructor(
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
  ) {
    // Cache TTL: 5 minutes (configurable via env)
    this.cacheTtlMs = parseInt(process.env.PERMISSION_CACHE_TTL_MS || '300000', 10);
  }

  /**
   * Get all permissions for a user by aggregating from all assigned roles
   *
   * @param userId - User ID
   * @param useCache - Whether to use cached permissions (default: true)
   * @returns Array of permission names
   */
  async getUserPermissions(userId: number, useCache: boolean = true): Promise<string[]> {
    // Check cache first
    if (useCache) {
      const cached = this.permissionCache.get(userId);
      if (cached && cached.expiresAt > Date.now()) {
        this.logger.debug(`Permission cache hit for user ${userId}`, 'PermissionAggregationService');
        return cached.permissions;
      }
    }

    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    // Query to get all distinct permissions from all user roles
    const result = await pool.query<{ name: string }>(
      `SELECT DISTINCT p.name
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = $1
       ORDER BY p.name`,
      [userId],
    );

    const permissions = result.rows.map((row) => row.name);

    // Cache the result
    this.permissionCache.set(userId, {
      permissions,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    this.logger.debug(
      `Aggregated ${permissions.length} permissions for user ${userId}`,
      'PermissionAggregationService',
    );

    return permissions;
  }

  /**
   * Get all permissions for a user with detailed information
   *
   * @param userId - User ID
   * @returns Array of permission objects with id, name, and category
   */
  async getUserPermissionsDetailed(userId: number): Promise<AggregatedPermission[]> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const result = await pool.query<AggregatedPermission>(
      `SELECT DISTINCT p.id, p.name, p.category
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = $1
       ORDER BY p.category, p.name`,
      [userId],
    );

    return result.rows;
  }

  /**
   * Get permissions grouped by category for a user
   *
   * @param userId - User ID
   * @returns Object with category keys and permission arrays
   */
  async getUserPermissionsGrouped(userId: number): Promise<Record<string, string[]>> {
    const permissions = await this.getUserPermissionsDetailed(userId);

    const grouped: Record<string, string[]> = {};
    for (const perm of permissions) {
      const category = perm.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(perm.name);
    }

    return grouped;
  }

  /**
   * Check if a user has a specific permission
   *
   * @param userId - User ID
   * @param permissionName - Permission name to check
   * @returns True if user has the permission
   */
  async hasPermission(userId: number, permissionName: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);

    // Check for exact match
    if (permissions.includes(permissionName)) {
      return true;
    }

    // Check for wildcard permissions (e.g., users.* matches users.create)
    const [category] = permissionName.split('.');
    const wildcardPermission = `${category}.*`;
    if (permissions.includes(wildcardPermission)) {
      return true;
    }

    // Check for super admin permission
    if (permissions.includes('system.admin') || permissions.includes('*')) {
      return true;
    }

    return false;
  }

  /**
   * Check if a user has any of the specified permissions
   *
   * @param userId - User ID
   * @param permissionNames - Array of permission names to check
   * @returns True if user has at least one of the permissions
   */
  async hasAnyPermission(userId: number, permissionNames: string[]): Promise<boolean> {
    for (const permission of permissionNames) {
      if (await this.hasPermission(userId, permission)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a user has all of the specified permissions
   *
   * @param userId - User ID
   * @param permissionNames - Array of permission names to check
   * @returns True if user has all of the permissions
   */
  async hasAllPermissions(userId: number, permissionNames: string[]): Promise<boolean> {
    for (const permission of permissionNames) {
      if (!(await this.hasPermission(userId, permission))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Invalidate the permission cache for a user
   * Should be called when user roles change
   *
   * @param userId - User ID
   */
  invalidateCache(userId: number): void {
    this.permissionCache.delete(userId);
    this.logger.debug(`Permission cache invalidated for user ${userId}`, 'PermissionAggregationService');
  }

  /**
   * Invalidate the entire permission cache
   * Should be called when role permissions change
   */
  invalidateAllCache(): void {
    this.permissionCache.clear();
    this.logger.debug('All permission cache invalidated', 'PermissionAggregationService');
  }

  /**
   * Get cache statistics (for debugging/monitoring)
   */
  getCacheStats(): { size: number; entries: Array<{ userId: number; expiresAt: Date }> } {
    const entries: Array<{ userId: number; expiresAt: Date }> = [];
    for (const [userId, data] of this.permissionCache.entries()) {
      entries.push({ userId, expiresAt: new Date(data.expiresAt) });
    }
    return {
      size: this.permissionCache.size,
      entries,
    };
  }
}
