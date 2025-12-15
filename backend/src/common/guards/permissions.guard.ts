/**
 * Permissions Authorization Guard
 * STORY-007A: Rollen-Management Backend
 *
 * Guards endpoints that require specific permissions.
 * Checks if the authenticated user has the required permission(s)
 * through their assigned roles.
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @RequirePermission('users.create')
 * @Post()
 * async createUser() { ... }
 *
 * Multiple permissions (ANY match):
 * @RequirePermission('users.create', 'users.update')
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  forwardRef,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DatabaseService } from '../../database/database.service';
import { AuthenticatedRequest } from './jwt-auth.guard';

/**
 * Metadata key for required permissions
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to specify required permissions for a route
 * User must have at least one of the specified permissions
 *
 * @param permissions - Required permission names (any one is sufficient)
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * User permission from database query
 */
interface UserPermission {
  permission_id: number;
  permission_name: string;
  category: string | null;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get user permissions from database
    const userPermissions = await this.getUserPermissions(user.id);

    // Check if user has any of the required permissions
    // Also check for wildcard permissions (e.g., 'users.*' matches 'users.create')
    const hasPermission = requiredPermissions.some((required) => {
      return userPermissions.some((userPerm) => {
        // Exact match
        if (userPerm.permission_name === required) {
          return true;
        }

        // Wildcard match (e.g., 'users.*' matches any 'users.xxx')
        const userPermParts = userPerm.permission_name.split('.');
        const requiredParts = required.split('.');

        if (userPermParts.length === 2 && userPermParts[1] === '*') {
          return userPermParts[0] === requiredParts[0];
        }

        // System admin has all permissions
        if (userPerm.permission_name === 'system.admin') {
          return true;
        }

        return false;
      });
    });

    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied. Required permission(s): ${requiredPermissions.join(' or ')}`,
      );
    }

    return true;
  }

  /**
   * Get user permissions from database through their roles
   */
  private async getUserPermissions(userId: number): Promise<UserPermission[]> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const result = await pool.query<UserPermission>(
      `SELECT DISTINCT p.id as permission_id, p.name as permission_name, p.category
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = $1`,
      [userId],
    );

    return result.rows;
  }
}
