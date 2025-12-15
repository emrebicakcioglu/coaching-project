/**
 * Enhanced Permissions Guard
 * STORY-027: Permission-System Core
 *
 * Advanced guard with support for:
 * - OR-Check (hasAnyPermission)
 * - AND-Check (hasAllPermissions)
 * - Resource-level permissions
 * - Data-level filtering context
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';
import { PermissionsService } from '../permissions.service';
import {
  PERMISSIONS_KEY,
  PERMISSIONS_ALL_KEY,
  PERMISSION_MODE_KEY,
  SKIP_PERMISSION_KEY,
  RESOURCE_PERMISSION_KEY,
  DATA_FILTER_KEY,
  ResourcePermissionMetadata,
  DataFilterMetadata,
  PermissionMode,
} from '../decorators/permissions.decorator';
import { WinstonLoggerService } from '../../common/services/logger.service';

/**
 * Extended request with data level context
 */
export interface RequestWithDataContext extends AuthenticatedRequest {
  dataContext?: {
    userRole: 'admin' | 'manager' | 'user';
    userId: number;
    teamIds?: number[];
  };
  permissions?: string[];
}

@Injectable()
export class EnhancedPermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(forwardRef(() => PermissionsService))
    private readonly permissionsService: PermissionsService,
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if permission check should be skipped
    const skipCheck = this.reflector.getAllAndOverride<boolean>(SKIP_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithDataContext>();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get required permissions from decorators
    const anyPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const allPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_ALL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const permissionMode = this.reflector.getAllAndOverride<PermissionMode>(PERMISSION_MODE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Check resource-level permissions
    const resourcePermission = this.reflector.getAllAndOverride<ResourcePermissionMetadata>(
      RESOURCE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Check data filter metadata
    const dataFilter = this.reflector.getAllAndOverride<DataFilterMetadata>(
      DATA_FILTER_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions required, allow access
    if (!anyPermissions?.length && !allPermissions?.length && !resourcePermission) {
      // Still set up data context if data filter is specified
      if (dataFilter) {
        await this.setupDataContext(request, user.id);
      }
      return true;
    }

    // Load user permissions into request for downstream use
    const userPermissions = await this.permissionsService.getUserPermissions(user.id);
    request.permissions = userPermissions;

    // Handle resource-level permissions
    if (resourcePermission) {
      const hasResourceAccess = await this.checkResourcePermission(
        context,
        user.id,
        resourcePermission,
      );
      if (!hasResourceAccess) {
        throw new ForbiddenException(
          `Access denied. Required permission: ${resourcePermission.resourceType}.${resourcePermission.action}`,
        );
      }
    }

    // Handle AND-check (all permissions required)
    if (allPermissions?.length) {
      const result = await this.permissionsService.hasAllPermissions(user.id, allPermissions);
      if (!result.granted) {
        throw new ForbiddenException(
          `Access denied. Missing required permissions: ${result.missingPermissions.join(', ')}`,
        );
      }
    }

    // Handle OR-check (any permission sufficient)
    if (anyPermissions?.length && permissionMode !== 'all') {
      const hasAny = await this.permissionsService.hasAnyPermission(user.id, anyPermissions);
      if (!hasAny) {
        throw new ForbiddenException(
          `Access denied. Required permission(s): ${anyPermissions.join(' or ')}`,
        );
      }
    }

    // Set up data context if data filter is specified
    if (dataFilter) {
      await this.setupDataContext(request, user.id);
    }

    return true;
  }

  /**
   * Check resource-level permission
   * Supports "own resource" permissions (e.g., users.update.own)
   */
  private async checkResourcePermission(
    context: ExecutionContext,
    userId: number,
    metadata: ResourcePermissionMetadata,
  ): Promise<boolean> {
    const { resourceType, action } = metadata;

    // Check for general permission
    const generalPermission = `${resourceType}.${action}`;
    const hasGeneral = await this.permissionsService.hasPermission(userId, generalPermission);
    if (hasGeneral.granted) {
      return true;
    }

    // Check for "own" permission
    const ownPermission = `${resourceType}.${action}.own`;
    const hasOwn = await this.permissionsService.hasPermission(userId, ownPermission);
    if (hasOwn.granted) {
      // Need to verify the resource belongs to the user
      const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
      const resourceId = this.extractResourceId(request);

      if (resourceId !== undefined) {
        // If resource ID matches user ID, allow access
        // This is a simple check - more complex ownership checks
        // should be done in the service layer
        if (resourceId === userId) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Extract resource ID from request params
   */
  private extractResourceId(request: AuthenticatedRequest): number | undefined {
    // Try common param names
    const id = request.params?.id || request.params?.userId || request.params?.resourceId;
    if (id) {
      const parsed = parseInt(id, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return undefined;
  }

  /**
   * Set up data-level context on request
   */
  private async setupDataContext(request: RequestWithDataContext, userId: number): Promise<void> {
    const dataContext = await this.permissionsService.buildDataLevelContext(userId);
    request.dataContext = {
      userRole: dataContext.userRole,
      userId: dataContext.userId,
      teamIds: dataContext.teamIds,
    };

    this.logger.debug(
      `Data context set: role=${dataContext.userRole}, userId=${userId}`,
      'EnhancedPermissionsGuard',
    );
  }
}
