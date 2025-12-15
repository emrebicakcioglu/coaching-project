/**
 * Permission Service
 * STORY-027: Permission-System Core
 *
 * Provides granular permission checks with:
 * - Wildcard support (users.*)
 * - OR-Check (hasAnyPermission)
 * - AND-Check (hasAllPermissions)
 * - Permission hierarchy (parent → child cascading)
 * - Data-level filtering (role-based scoping)
 */

import {
  Injectable,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { WinstonLoggerService } from '../common/services/logger.service';

/**
 * Permission hierarchy node structure
 */
export interface PermissionHierarchy {
  id: number;
  name: string;
  category: string | null;
  parentPermission?: string | null;
  children: string[];
}

/**
 * Data-level filter context for role-based scoping
 */
export interface DataLevelContext {
  userId: number;
  userRole: 'admin' | 'manager' | 'user';
  teamIds?: number[];
  departmentId?: number;
}

/**
 * Data scope result for queries
 */
export interface DataScope {
  /** SQL WHERE clause condition */
  condition: string;
  /** Parameters for the condition */
  params: unknown[];
  /** Description of the scope for logging */
  description: string;
}

/**
 * Permission check result with details
 */
export interface PermissionCheckResult {
  granted: boolean;
  matchedPermission?: string;
  matchType?: 'exact' | 'wildcard' | 'hierarchy' | 'admin';
  missingPermissions?: string[];
}

@Injectable()
export class PermissionsService {
  // In-memory cache for permission hierarchy
  private hierarchyCache: Map<string, PermissionHierarchy> | null = null;
  private hierarchyCacheExpiry: number = 0;
  private readonly hierarchyCacheTtlMs: number;

  // User permissions cache
  private userPermissionCache: Map<number, { permissions: string[]; expiresAt: number }> = new Map();
  private readonly userCacheTtlMs: number;

  constructor(
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
  ) {
    // Cache TTL: 5 minutes (configurable via env)
    this.userCacheTtlMs = parseInt(process.env.PERMISSION_CACHE_TTL_MS || '300000', 10);
    this.hierarchyCacheTtlMs = parseInt(process.env.PERMISSION_HIERARCHY_CACHE_TTL_MS || '600000', 10);
  }

  /**
   * Get all permissions for a user from their assigned roles
   *
   * @param userId - User ID
   * @param useCache - Whether to use cached permissions (default: true)
   * @returns Array of permission names
   */
  async getUserPermissions(userId: number, useCache: boolean = true): Promise<string[]> {
    // Check cache first
    if (useCache) {
      const cached = this.userPermissionCache.get(userId);
      if (cached && cached.expiresAt > Date.now()) {
        this.logger.debug(`Permission cache hit for user ${userId}`, 'PermissionsService');
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
    this.userPermissionCache.set(userId, {
      permissions,
      expiresAt: Date.now() + this.userCacheTtlMs,
    });

    this.logger.debug(
      `Loaded ${permissions.length} permissions for user ${userId}`,
      'PermissionsService',
    );

    return permissions;
  }

  /**
   * Check if a user has a specific permission
   * Supports exact match, wildcard patterns, hierarchy, and admin override
   *
   * @param userId - User ID
   * @param permissionName - Permission name to check
   * @returns Detailed permission check result
   */
  async hasPermission(userId: number, permissionName: string): Promise<PermissionCheckResult> {
    const permissions = await this.getUserPermissions(userId);

    // 1. Check for exact match
    if (permissions.includes(permissionName)) {
      return {
        granted: true,
        matchedPermission: permissionName,
        matchType: 'exact',
      };
    }

    // 2. Check for super admin permission (grants all)
    if (permissions.includes('system.admin') || permissions.includes('*')) {
      return {
        granted: true,
        matchedPermission: permissions.includes('system.admin') ? 'system.admin' : '*',
        matchType: 'admin',
      };
    }

    // 3. Check for wildcard permissions (e.g., users.* matches users.create)
    const wildcardMatch = this.checkWildcardPermission(permissions, permissionName);
    if (wildcardMatch) {
      return {
        granted: true,
        matchedPermission: wildcardMatch,
        matchType: 'wildcard',
      };
    }

    // 4. Check for permission hierarchy (parent → child cascading)
    const hierarchyMatch = await this.checkHierarchyPermission(permissions, permissionName);
    if (hierarchyMatch) {
      return {
        granted: true,
        matchedPermission: hierarchyMatch,
        matchType: 'hierarchy',
      };
    }

    return {
      granted: false,
      missingPermissions: [permissionName],
    };
  }

  /**
   * Check if a user has ANY of the specified permissions (OR-check)
   * Returns true if user has at least one permission
   * Uses short-circuit evaluation for performance
   *
   * @param userId - User ID
   * @param permissionNames - Array of permission names to check
   * @returns True if user has at least one permission
   */
  async hasAnyPermission(userId: number, permissionNames: string[]): Promise<boolean> {
    if (!permissionNames || permissionNames.length === 0) {
      return true;
    }

    // Short-circuit: check each permission until one matches
    for (const permission of permissionNames) {
      const result = await this.hasPermission(userId, permission);
      if (result.granted) {
        this.logger.debug(
          `OR-check passed: user ${userId} has permission ${result.matchedPermission}`,
          'PermissionsService',
        );
        return true;
      }
    }

    this.logger.debug(
      `OR-check failed: user ${userId} has none of [${permissionNames.join(', ')}]`,
      'PermissionsService',
    );
    return false;
  }

  /**
   * Check if a user has ALL of the specified permissions (AND-check)
   * Returns true only if user has every permission
   *
   * @param userId - User ID
   * @param permissionNames - Array of permission names to check
   * @returns Object with result and any missing permissions
   */
  async hasAllPermissions(userId: number, permissionNames: string[]): Promise<{ granted: boolean; missingPermissions: string[] }> {
    if (!permissionNames || permissionNames.length === 0) {
      return { granted: true, missingPermissions: [] };
    }

    const missingPermissions: string[] = [];

    for (const permission of permissionNames) {
      const result = await this.hasPermission(userId, permission);
      if (!result.granted) {
        missingPermissions.push(permission);
      }
    }

    if (missingPermissions.length > 0) {
      this.logger.debug(
        `AND-check failed: user ${userId} missing [${missingPermissions.join(', ')}]`,
        'PermissionsService',
      );
      return { granted: false, missingPermissions };
    }

    this.logger.debug(
      `AND-check passed: user ${userId} has all permissions`,
      'PermissionsService',
    );
    return { granted: true, missingPermissions: [] };
  }

  /**
   * Check wildcard permission match
   * Supports patterns like:
   * - users.* matches users.create, users.update, etc.
   * - *.read matches users.read, roles.read, etc.
   * - users.*.view matches users.profile.view, users.settings.view, etc.
   *
   * @param userPermissions - User's permission list
   * @param targetPermission - Permission to check against
   * @returns Matching wildcard permission or null
   */
  private checkWildcardPermission(userPermissions: string[], targetPermission: string): string | null {
    const targetParts = targetPermission.split('.');

    for (const userPerm of userPermissions) {
      // Skip non-wildcard permissions
      if (!userPerm.includes('*')) {
        continue;
      }

      const permParts = userPerm.split('.');

      // Simple trailing wildcard: category.*
      if (permParts.length === 2 && permParts[1] === '*') {
        if (targetParts[0] === permParts[0]) {
          return userPerm;
        }
        continue;
      }

      // Complex wildcard matching with arbitrary depth
      if (this.matchWildcardPattern(permParts, targetParts)) {
        return userPerm;
      }
    }

    return null;
  }

  /**
   * Match wildcard pattern against target
   * Supports * as single-segment wildcard
   *
   * @param pattern - Pattern parts (e.g., ['users', '*', 'view'])
   * @param target - Target parts (e.g., ['users', 'profile', 'view'])
   * @returns True if pattern matches target
   */
  private matchWildcardPattern(pattern: string[], target: string[]): boolean {
    // If pattern is shorter (and ends with *), it can match longer targets
    // E.g., ['users', '*'] matches ['users', 'create']

    // Handle trailing wildcard that matches any depth
    if (pattern.length > 0 && pattern[pattern.length - 1] === '*') {
      // Check all parts before the wildcard match
      for (let i = 0; i < pattern.length - 1; i++) {
        if (i >= target.length) {
          return false;
        }
        if (pattern[i] !== '*' && pattern[i] !== target[i]) {
          return false;
        }
      }
      // Trailing * matches any remaining segments
      return target.length >= pattern.length - 1;
    }

    // Exact length matching for non-trailing wildcards
    if (pattern.length !== target.length) {
      return false;
    }

    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] !== '*' && pattern[i] !== target[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check permission hierarchy (parent → child cascading)
   * If user has parent permission, they also have all child permissions
   *
   * @param userPermissions - User's permission list
   * @param targetPermission - Permission to check
   * @returns Parent permission that grants access or null
   */
  private async checkHierarchyPermission(userPermissions: string[], targetPermission: string): Promise<string | null> {
    const hierarchy = await this.getPermissionHierarchy();

    // Find the target permission in hierarchy
    const targetNode = hierarchy.get(targetPermission);
    if (!targetNode || !targetNode.parentPermission) {
      return null;
    }

    // Check if user has the parent permission
    let currentParent: string | null | undefined = targetNode.parentPermission;
    while (currentParent) {
      if (userPermissions.includes(currentParent)) {
        return currentParent;
      }

      // Check for wildcard match on parent
      const wildcardMatch = this.checkWildcardPermission(userPermissions, currentParent);
      if (wildcardMatch) {
        return wildcardMatch;
      }

      // Move up the hierarchy
      const parentNode = hierarchy.get(currentParent);
      currentParent = parentNode?.parentPermission;
    }

    return null;
  }

  /**
   * Get permission hierarchy from database
   * Cached for performance
   */
  private async getPermissionHierarchy(): Promise<Map<string, PermissionHierarchy>> {
    // Check cache
    if (this.hierarchyCache && this.hierarchyCacheExpiry > Date.now()) {
      return this.hierarchyCache;
    }

    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    // Query permissions with parent relationship
    // Note: This assumes a parent_permission_id column exists
    // If not, we'll use category-based hierarchy
    const result = await pool.query<{
      id: number;
      name: string;
      category: string | null;
      parent_name: string | null;
    }>(
      `SELECT
        p.id,
        p.name,
        p.category,
        pp.name as parent_name
       FROM permissions p
       LEFT JOIN permissions pp ON p.category = pp.name AND pp.category IS NULL
       ORDER BY p.name`,
    );

    const hierarchy = new Map<string, PermissionHierarchy>();

    for (const row of result.rows) {
      hierarchy.set(row.name, {
        id: row.id,
        name: row.name,
        category: row.category,
        parentPermission: row.parent_name,
        children: [],
      });
    }

    // Build children lists
    for (const [name, node] of hierarchy.entries()) {
      if (node.parentPermission && hierarchy.has(node.parentPermission)) {
        hierarchy.get(node.parentPermission)!.children.push(name);
      }
    }

    // Cache the result
    this.hierarchyCache = hierarchy;
    this.hierarchyCacheExpiry = Date.now() + this.hierarchyCacheTtlMs;

    this.logger.debug(
      `Loaded permission hierarchy with ${hierarchy.size} permissions`,
      'PermissionsService',
    );

    return hierarchy;
  }

  /**
   * Get data scope filter based on user role
   * Implements role-based data scoping:
   * - Admin: sees all data
   * - Manager: sees only their team members' data
   * - User: sees only their own data
   *
   * @param context - Data level context with user info
   * @param targetTable - Table alias to filter
   * @param userIdColumn - Column name for user ID in target table
   * @returns Data scope with SQL condition and parameters
   */
  getDataScope(context: DataLevelContext, targetTable: string = '', userIdColumn: string = 'user_id'): DataScope {
    const prefix = targetTable ? `${targetTable}.` : '';

    switch (context.userRole) {
      case 'admin':
        // Admins see all data
        return {
          condition: '1=1',
          params: [],
          description: 'Admin: full access to all records',
        };

      case 'manager':
        // Managers see their team members' data
        if (context.teamIds && context.teamIds.length > 0) {
          const placeholders = context.teamIds.map((_, i) => `$${i + 1}`).join(', ');
          return {
            condition: `${prefix}${userIdColumn} IN (
              SELECT user_id FROM team_members WHERE team_id IN (${placeholders})
              UNION SELECT $${context.teamIds.length + 1}
            )`,
            params: [...context.teamIds, context.userId],
            description: `Manager: access to team members (teams: ${context.teamIds.join(', ')}) and own data`,
          };
        }
        // Fallback if no team IDs - manager sees only own data
        return {
          condition: `${prefix}${userIdColumn} = $1`,
          params: [context.userId],
          description: 'Manager (no team): access to own data only',
        };

      case 'user':
      default:
        // Regular users see only their own data
        return {
          condition: `${prefix}${userIdColumn} = $1`,
          params: [context.userId],
          description: 'User: access to own data only',
        };
    }
  }

  /**
   * Get user's role for data-level filtering
   * Determines the highest-level role for data access
   *
   * @param userId - User ID
   * @returns User role level
   */
  async getUserRoleLevel(userId: number): Promise<'admin' | 'manager' | 'user'> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const result = await pool.query<{ name: string }>(
      `SELECT r.name
       FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1
       ORDER BY
         CASE r.name
           WHEN 'admin' THEN 1
           WHEN 'manager' THEN 2
           ELSE 3
         END
       LIMIT 1`,
      [userId],
    );

    if (result.rows.length === 0) {
      return 'user';
    }

    const roleName = result.rows[0].name.toLowerCase();
    if (roleName === 'admin' || roleName === 'administrator') {
      return 'admin';
    }
    if (roleName === 'manager' || roleName === 'supervisor') {
      return 'manager';
    }
    return 'user';
  }

  /**
   * Get team IDs for a manager
   *
   * @param userId - Manager user ID
   * @returns Array of team IDs the user manages
   */
  async getManagerTeamIds(userId: number): Promise<number[]> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    // Check if team_members table exists and query it
    try {
      const result = await pool.query<{ team_id: number }>(
        `SELECT DISTINCT team_id
         FROM team_members
         WHERE user_id = $1 AND is_manager = true`,
        [userId],
      );
      return result.rows.map(row => row.team_id);
    } catch {
      // Table doesn't exist yet - return empty array
      this.logger.warn(
        'team_members table not found, returning empty team list',
        'PermissionsService',
      );
      return [];
    }
  }

  /**
   * Build data-level context for a user
   *
   * @param userId - User ID
   * @returns Complete data level context
   */
  async buildDataLevelContext(userId: number): Promise<DataLevelContext> {
    const userRole = await this.getUserRoleLevel(userId);

    const context: DataLevelContext = {
      userId,
      userRole,
    };

    // Get team IDs for managers
    if (userRole === 'manager') {
      context.teamIds = await this.getManagerTeamIds(userId);
    }

    return context;
  }

  /**
   * Invalidate user's permission cache
   * Call when user roles change
   *
   * @param userId - User ID
   */
  invalidateUserCache(userId: number): void {
    this.userPermissionCache.delete(userId);
    this.logger.debug(`Permission cache invalidated for user ${userId}`, 'PermissionsService');
  }

  /**
   * Invalidate all caches
   * Call when role permissions or hierarchy changes
   */
  invalidateAllCaches(): void {
    this.userPermissionCache.clear();
    this.hierarchyCache = null;
    this.hierarchyCacheExpiry = 0;
    this.logger.debug('All permission caches invalidated', 'PermissionsService');
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): {
    userCacheSize: number;
    hierarchyCacheSize: number;
    hierarchyCacheExpiry: Date | null;
  } {
    return {
      userCacheSize: this.userPermissionCache.size,
      hierarchyCacheSize: this.hierarchyCache?.size ?? 0,
      hierarchyCacheExpiry: this.hierarchyCacheExpiry > 0
        ? new Date(this.hierarchyCacheExpiry)
        : null,
    };
  }
}
