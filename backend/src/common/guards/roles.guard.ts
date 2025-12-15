/**
 * Roles Authorization Guard
 * STORY-003A: User CRUD Backend API
 *
 * Guards endpoints that require specific roles (e.g., admin).
 * Must be used after JwtAuthGuard as it requires user info.
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('admin')
 * @Get()
 * async adminOnlyEndpoint() { ... }
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
 * Metadata key for required roles
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for a route
 *
 * @param roles - Required role names (any one of them is sufficient)
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * User role from database
 */
interface UserRole {
  role_id: number;
  role_name: string;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get user roles from database
    const userRoles = await this.getUserRoles(user.id);

    // Check if user has any of the required roles
    const hasRole = userRoles.some((role) =>
      requiredRoles.includes(role.role_name.toLowerCase()),
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }

  /**
   * Get user roles from database
   */
  private async getUserRoles(userId: number): Promise<UserRole[]> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const result = await pool.query<UserRole>(
      `SELECT ur.role_id, r.name as role_name
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [userId],
    );

    return result.rows;
  }
}
