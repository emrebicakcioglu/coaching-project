/**
 * Route Permission Guard
 * STORY-027B: Permission Guards & Data Filtering
 *
 * A NestJS guard that provides route-based access control.
 * Checks user permissions before allowing access to API routes.
 *
 * Features:
 * - Route-based permission checking
 * - Unauthorized/Forbidden HTTP status responses
 * - Integration with permission hierarchy
 * - Data context setup for downstream filtering
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, RoutePermissionGuard)
 * @RoutePermissions('users.read')
 * async listUsers() { ... }
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Inject,
  forwardRef,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';
import { PermissionsService, DataLevelContext } from '../permissions.service';
import { WinstonLoggerService } from '../../common/services/logger.service';
import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for route permissions
 */
export const ROUTE_PERMISSIONS_KEY = 'route_permissions';

/**
 * Metadata key for route permission mode (any/all)
 */
export const ROUTE_PERMISSION_MODE_KEY = 'route_permission_mode';

/**
 * Metadata key to skip route permission check
 */
export const SKIP_ROUTE_PERMISSION_KEY = 'skip_route_permission';

/**
 * Decorator to specify required permissions for a route
 * User must have at least one of the specified permissions (OR check)
 *
 * @param permissions - Array of permission names
 * @returns Method/class decorator
 */
export const RoutePermissions = (...permissions: string[]) => {
  return (target: object, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    SetMetadata(ROUTE_PERMISSIONS_KEY, permissions)(target, propertyKey!, descriptor!);
    SetMetadata(ROUTE_PERMISSION_MODE_KEY, 'any')(target, propertyKey!, descriptor!);
  };
};

/**
 * Decorator to require ALL specified permissions for a route
 * User must have every one of the specified permissions (AND check)
 *
 * @param permissions - Array of permission names
 * @returns Method/class decorator
 */
export const RoutePermissionsAll = (...permissions: string[]) => {
  return (target: object, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    SetMetadata(ROUTE_PERMISSIONS_KEY, permissions)(target, propertyKey!, descriptor!);
    SetMetadata(ROUTE_PERMISSION_MODE_KEY, 'all')(target, propertyKey!, descriptor!);
  };
};

/**
 * Decorator to skip route permission check for public endpoints
 *
 * @returns Method/class decorator
 */
export const SkipRoutePermission = () => SetMetadata(SKIP_ROUTE_PERMISSION_KEY, true);

/**
 * Extended request interface with data context
 */
export interface RoutePermissionRequest extends AuthenticatedRequest {
  dataContext?: DataLevelContext;
  permissions?: string[];
  permissionCheckResult?: {
    granted: boolean;
    matchType?: 'exact' | 'wildcard' | 'hierarchy' | 'admin';
    matchedPermission?: string;
  };
}

@Injectable()
export class RoutePermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(forwardRef(() => PermissionsService))
    private readonly permissionsService: PermissionsService,
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if permission check should be skipped
    const skipCheck = this.reflector.getAllAndOverride<boolean>(SKIP_ROUTE_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipCheck) {
      this.logger.debug('Route permission check skipped', 'RoutePermissionGuard');
      return true;
    }

    const request = context.switchToHttp().getRequest<RoutePermissionRequest>();
    const user = request.user;

    // Check authentication
    if (!user) {
      this.logger.warn('Unauthorized: No user in request', 'RoutePermissionGuard');
      throw new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        error: 'Unauthorized',
        message: 'Authentication required to access this resource',
      });
    }

    if (!user.id) {
      this.logger.warn('Unauthorized: User ID missing', 'RoutePermissionGuard');
      throw new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        error: 'Unauthorized',
        message: 'Invalid authentication token',
      });
    }

    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(ROUTE_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no permissions specified, allow access (but still load user permissions)
    if (!requiredPermissions || requiredPermissions.length === 0) {
      await this.loadUserContext(request, user.id);
      return true;
    }

    // Get permission mode (any/all)
    const permissionMode = this.reflector.getAllAndOverride<'any' | 'all'>(ROUTE_PERMISSION_MODE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) || 'any';

    // Load user permissions
    const userPermissions = await this.permissionsService.getUserPermissions(user.id);
    request.permissions = userPermissions;

    // Check permissions based on mode
    if (permissionMode === 'all') {
      return this.checkAllPermissions(request, user.id, requiredPermissions);
    } else {
      return this.checkAnyPermission(request, user.id, requiredPermissions);
    }
  }

  /**
   * Check if user has ANY of the required permissions (OR check)
   */
  private async checkAnyPermission(
    request: RoutePermissionRequest,
    userId: number,
    permissions: string[],
  ): Promise<boolean> {
    for (const permission of permissions) {
      const result = await this.permissionsService.hasPermission(userId, permission);
      if (result.granted) {
        this.logger.debug(
          `Route permission granted: ${permission} (${result.matchType})`,
          'RoutePermissionGuard',
        );
        request.permissionCheckResult = {
          granted: true,
          matchType: result.matchType,
          matchedPermission: result.matchedPermission,
        };
        await this.loadUserContext(request, userId);
        return true;
      }
    }

    this.logger.warn(
      `Route permission denied for user ${userId}. Required: ${permissions.join(' or ')}`,
      'RoutePermissionGuard',
    );

    throw new ForbiddenException({
      statusCode: HttpStatus.FORBIDDEN,
      error: 'Forbidden',
      message: `Access denied. Required permission: ${permissions.join(' or ')}`,
      requiredPermissions: permissions,
      permissionMode: 'any',
    });
  }

  /**
   * Check if user has ALL of the required permissions (AND check)
   */
  private async checkAllPermissions(
    request: RoutePermissionRequest,
    userId: number,
    permissions: string[],
  ): Promise<boolean> {
    const result = await this.permissionsService.hasAllPermissions(userId, permissions);

    if (result.granted) {
      this.logger.debug(
        `All route permissions granted for user ${userId}`,
        'RoutePermissionGuard',
      );
      request.permissionCheckResult = {
        granted: true,
        matchType: 'exact',
      };
      await this.loadUserContext(request, userId);
      return true;
    }

    this.logger.warn(
      `Route permissions denied for user ${userId}. Missing: ${result.missingPermissions.join(', ')}`,
      'RoutePermissionGuard',
    );

    throw new ForbiddenException({
      statusCode: HttpStatus.FORBIDDEN,
      error: 'Forbidden',
      message: `Access denied. Missing permissions: ${result.missingPermissions.join(', ')}`,
      requiredPermissions: permissions,
      missingPermissions: result.missingPermissions,
      permissionMode: 'all',
    });
  }

  /**
   * Load user context (permissions and data context) into request
   */
  private async loadUserContext(request: RoutePermissionRequest, userId: number): Promise<void> {
    // Load permissions if not already loaded
    if (!request.permissions) {
      request.permissions = await this.permissionsService.getUserPermissions(userId);
    }

    // Build data context for filtering
    const dataContext = await this.permissionsService.buildDataLevelContext(userId);
    request.dataContext = dataContext;

    this.logger.debug(
      `User context loaded: role=${dataContext.userRole}, userId=${userId}`,
      'RoutePermissionGuard',
    );
  }
}
