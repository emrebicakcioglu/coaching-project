/**
 * Permission Decorators
 * STORY-027: Permission-System Core
 *
 * Decorators for NestJS controllers to specify permission requirements.
 * Supports single permissions, OR-checks, and AND-checks.
 *
 * Usage:
 * @RequirePermission('users.create')
 * @RequireAnyPermission(['users.create', 'users.admin'])
 * @RequireAllPermissions(['users.read', 'users.update'])
 */

import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for required permissions (ANY match - OR check)
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Metadata key for required permissions (ALL must match - AND check)
 */
export const PERMISSIONS_ALL_KEY = 'permissions_all';

/**
 * Metadata key for permission mode
 */
export const PERMISSION_MODE_KEY = 'permission_mode';

/**
 * Permission check modes
 */
export type PermissionMode = 'any' | 'all';

/**
 * Decorator to require a single permission
 * User must have this specific permission (or a wildcard that covers it)
 *
 * @param permission - Required permission name
 * @returns Method/class decorator
 */
export const RequirePermission = (permission: string) => {
  return (target: object, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    SetMetadata(PERMISSIONS_KEY, [permission])(target, propertyKey!, descriptor!);
    SetMetadata(PERMISSION_MODE_KEY, 'any')(target, propertyKey!, descriptor!);
  };
};

/**
 * Decorator to require ANY of the specified permissions (OR-check)
 * User must have at least one of the specified permissions
 *
 * Usage:
 * @RequireAnyPermission(['users.create', 'users.update'])
 * async createOrUpdateUser() { ... }
 *
 * @param permissions - Array of permission names (any one is sufficient)
 * @returns Method/class decorator
 */
export const RequireAnyPermission = (...permissions: string[]) => {
  return (target: object, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    SetMetadata(PERMISSIONS_KEY, permissions)(target, propertyKey!, descriptor!);
    SetMetadata(PERMISSION_MODE_KEY, 'any')(target, propertyKey!, descriptor!);
  };
};

/**
 * Decorator to require ALL of the specified permissions (AND-check)
 * User must have every one of the specified permissions
 *
 * Usage:
 * @RequireAllPermissions(['users.read', 'users.update'])
 * async updateUser() { ... }
 *
 * @param permissions - Array of permission names (all required)
 * @returns Method/class decorator
 */
export const RequireAllPermissions = (...permissions: string[]) => {
  return (target: object, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    SetMetadata(PERMISSIONS_ALL_KEY, permissions)(target, propertyKey!, descriptor!);
    SetMetadata(PERMISSION_MODE_KEY, 'all')(target, propertyKey!, descriptor!);
  };
};

/**
 * Decorator to bypass permission checks (use with caution)
 * Should only be used for public endpoints or special cases
 *
 * Usage:
 * @SkipPermissionCheck()
 * async publicEndpoint() { ... }
 */
export const SKIP_PERMISSION_KEY = 'skip_permission_check';

export const SkipPermissionCheck = () => SetMetadata(SKIP_PERMISSION_KEY, true);

/**
 * Decorator for resource-level permission checking
 * Combines general permission with "own resource" permission
 *
 * Usage:
 * @RequireResourcePermission('users', 'update')
 * async updateUser(@Param('id') id: number) {
 *   // User with 'users.update' can update any user
 *   // User with 'users.update.own' can only update themselves
 * }
 */
export const RESOURCE_PERMISSION_KEY = 'resource_permission';

export interface ResourcePermissionMetadata {
  resourceType: string;
  action: string;
}

export const RequireResourcePermission = (resourceType: string, action: string) => {
  return SetMetadata(RESOURCE_PERMISSION_KEY, { resourceType, action } as ResourcePermissionMetadata);
};

/**
 * Decorator for data-level permission filtering
 * Indicates that the endpoint should apply data-level filtering
 *
 * Usage:
 * @ApplyDataFilter('users')
 * async listUsers() {
 *   // Admin sees all users
 *   // Manager sees team members
 *   // User sees only themselves
 * }
 */
export const DATA_FILTER_KEY = 'data_filter';

export interface DataFilterMetadata {
  resourceType: string;
  ownerColumn?: string;
}

export const ApplyDataFilter = (resourceType: string, ownerColumn: string = 'user_id') => {
  return SetMetadata(DATA_FILTER_KEY, { resourceType, ownerColumn } as DataFilterMetadata);
};
