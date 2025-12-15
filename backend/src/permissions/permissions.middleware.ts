/**
 * Permission Middleware
 * STORY-027: Permission-System Core
 *
 * Express-style middleware for permission validation.
 * Provides granular permission checks that integrate with routes.
 *
 * Usage (Express style):
 * app.post('/api/users', hasPermission('users.create'), createUser);
 * app.get('/api/users', hasAnyPermission(['users.read', 'users.admin']), listUsers);
 * app.put('/api/users/:id', hasAllPermissions(['users.read', 'users.update']), updateUser);
 */

import { Request, Response, NextFunction } from 'express';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { AuthenticatedRequest } from '../common/guards/jwt-auth.guard';

/**
 * Extended request with permissions array
 */
export interface RequestWithPermissions extends AuthenticatedRequest {
  permissions?: string[];
}

/**
 * Check if user has a specific permission
 * Returns 403 Forbidden if permission not granted
 *
 * @param permission - Required permission string
 * @returns Express middleware function
 */
export const hasPermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as RequestWithPermissions;
    const userPermissions = authReq.permissions || [];

    const hasAccess = checkPermission(userPermissions, permission);

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required permission: ${permission}`,
        statusCode: 403,
      });
    }
    return next();
  };
};

/**
 * Check if user has ANY of the specified permissions (OR-check)
 * Returns true if user has at least one of the permissions
 * Uses short-circuit evaluation for performance
 *
 * @param permissions - Array of permission strings
 * @returns Express middleware function
 */
export const hasAnyPermission = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as RequestWithPermissions;
    const userPermissions = authReq.permissions || [];

    // Short-circuit: return true as soon as one permission matches
    for (const permission of permissions) {
      if (checkPermission(userPermissions, permission)) {
        return next();
      }
    }

    return res.status(403).json({
      error: 'Forbidden',
      message: `Access denied. Required permissions (any): ${permissions.join(' or ')}`,
      statusCode: 403,
    });
  };
};

/**
 * Check if user has ALL of the specified permissions (AND-check)
 * Returns true only if user has every permission
 * Reports missing permissions in error response
 *
 * @param permissions - Array of permission strings
 * @returns Express middleware function
 */
export const hasAllPermissions = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as RequestWithPermissions;
    const userPermissions = authReq.permissions || [];

    const missingPermissions: string[] = [];

    for (const permission of permissions) {
      if (!checkPermission(userPermissions, permission)) {
        missingPermissions.push(permission);
      }
    }

    if (missingPermissions.length > 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Missing permissions: ${missingPermissions.join(', ')}`,
        missingPermissions,
        statusCode: 403,
      });
    }

    return next();
  };
};

/**
 * Check single permission with wildcard and hierarchy support
 *
 * @param userPermissions - User's permission list
 * @param targetPermission - Permission to check
 * @returns True if user has the permission
 */
function checkPermission(userPermissions: string[], targetPermission: string): boolean {
  // 1. Check for exact match
  if (userPermissions.includes(targetPermission)) {
    return true;
  }

  // 2. Check for super admin permission
  if (userPermissions.includes('system.admin') || userPermissions.includes('*')) {
    return true;
  }

  // 3. Check for wildcard permissions
  return userPermissions.some(userPerm => {
    // Handle category.* pattern (e.g., users.* matches users.create)
    if (userPerm.endsWith('.*')) {
      const category = userPerm.slice(0, -2);
      return targetPermission.startsWith(category + '.');
    }

    // Handle more complex wildcards (e.g., users.*.read)
    if (userPerm.includes('*')) {
      return matchWildcardPattern(userPerm, targetPermission);
    }

    return false;
  });
}

/**
 * Match wildcard pattern against target permission
 *
 * @param pattern - Pattern with wildcards (e.g., 'users.*.read')
 * @param target - Target permission (e.g., 'users.profile.read')
 * @returns True if pattern matches target
 */
function matchWildcardPattern(pattern: string, target: string): boolean {
  const patternParts = pattern.split('.');
  const targetParts = target.split('.');

  // Trailing wildcard can match variable length
  const hasTrailingWildcard = patternParts[patternParts.length - 1] === '*';

  if (hasTrailingWildcard) {
    // Check all parts before trailing *
    for (let i = 0; i < patternParts.length - 1; i++) {
      if (i >= targetParts.length) {
        return false;
      }
      if (patternParts[i] !== '*' && patternParts[i] !== targetParts[i]) {
        return false;
      }
    }
    return targetParts.length >= patternParts.length - 1;
  }

  // Non-trailing wildcards must match exactly in length
  if (patternParts.length !== targetParts.length) {
    return false;
  }

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i] !== '*' && patternParts[i] !== targetParts[i]) {
      return false;
    }
  }

  return true;
}

/**
 * NestJS Middleware to populate user permissions on request
 * Should be applied before permission checking middleware
 */
@Injectable()
export class PermissionLoaderMiddleware implements NestMiddleware {
  async use(req: Request, _res: Response, next: NextFunction) {
    const authReq = req as RequestWithPermissions;

    // Only load permissions if user is authenticated
    if (authReq.user?.id) {
      // Permissions will be loaded by the PermissionsGuard or service
      // This middleware just ensures the permissions array exists
      if (!authReq.permissions) {
        authReq.permissions = [];
      }
    }

    next();
  }
}

/**
 * Create a middleware factory for custom permission checks
 *
 * @param checkFn - Custom check function
 * @returns Middleware factory
 */
export const createPermissionCheck = (
  checkFn: (permissions: string[], req: Request) => boolean,
  errorMessage: string = 'Access denied',
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as RequestWithPermissions;
    const userPermissions = authReq.permissions || [];

    if (checkFn(userPermissions, req)) {
      return next();
    }

    return res.status(403).json({
      error: 'Forbidden',
      message: errorMessage,
      statusCode: 403,
    });
  };
};

/**
 * Middleware to check resource-level permissions
 * Checks if user can access a specific resource based on ownership or permissions
 *
 * @param resourceType - Type of resource (e.g., 'users', 'posts')
 * @param action - Action to check (e.g., 'read', 'update', 'delete')
 * @param getResourceOwnerId - Function to extract owner ID from request
 * @returns Express middleware function
 */
export const hasResourcePermission = (
  resourceType: string,
  action: string,
  getResourceOwnerId: (req: Request) => number | undefined,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as RequestWithPermissions;
    const userPermissions = authReq.permissions || [];
    const userId = authReq.user?.id;

    // Check for general permission (e.g., users.update)
    const generalPermission = `${resourceType}.${action}`;
    if (checkPermission(userPermissions, generalPermission)) {
      return next();
    }

    // Check for "own" permission (e.g., users.update.own)
    const ownPermission = `${resourceType}.${action}.own`;
    if (checkPermission(userPermissions, ownPermission)) {
      const resourceOwnerId = getResourceOwnerId(req);
      if (resourceOwnerId === userId) {
        return next();
      }
    }

    return res.status(403).json({
      error: 'Forbidden',
      message: `Access denied. Required permission: ${generalPermission}`,
      statusCode: 403,
    });
  };
};
