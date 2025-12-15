/**
 * IfHasPermission Component
 * STORY-008B: Permission-System (Frontend)
 *
 * Conditional rendering component based on user permissions.
 * Renders children only when the user has the specified permission.
 *
 * @example
 * ```tsx
 * // Basic usage - render button only if user can delete
 * <IfHasPermission permission="users.delete">
 *   <button onClick={handleDelete}>Delete User</button>
 * </IfHasPermission>
 *
 * // With fallback content
 * <IfHasPermission permission="admin.access" fallback={<span>Access Denied</span>}>
 *   <AdminPanel />
 * </IfHasPermission>
 *
 * // Multiple permissions (any)
 * <IfHasPermission permissions={['users.update', 'users.delete']}>
 *   <EditControls />
 * </IfHasPermission>
 *
 * // Multiple permissions (all required)
 * <IfHasPermission permissions={['users.read', 'users.update']} requireAll>
 *   <UserEditForm />
 * </IfHasPermission>
 * ```
 */

import React from 'react';
import { useAuth } from '../../contexts';

/**
 * Props for IfHasPermission component
 */
export interface IfHasPermissionProps {
  /** Child components to render when permission is granted */
  children: React.ReactNode;
  /** Single permission to check */
  permission?: string;
  /** Multiple permissions to check */
  permissions?: string[];
  /** When true, all permissions are required. Default: false (any permission grants access) */
  requireAll?: boolean;
  /** Optional fallback content when permission is denied */
  fallback?: React.ReactNode;
  /** When true, inverts the permission check (renders when user does NOT have permission) */
  invert?: boolean;
}

/**
 * IfHasPermission Component
 *
 * Conditionally renders children based on user permissions.
 * Renders nothing (or fallback) when the user lacks the required permission.
 *
 * Supports:
 * - Single permission check
 * - Multiple permissions (any/all)
 * - Fallback content
 * - Inverted logic (render when user DOESN'T have permission)
 */
export const IfHasPermission: React.FC<IfHasPermissionProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  invert = false,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  // Determine if user has required permission(s)
  let granted = false;

  if (permission) {
    // Single permission check
    granted = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    // Multiple permissions check
    granted = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  } else {
    // No permission specified - always grant access
    granted = true;
  }

  // Invert result if needed
  if (invert) {
    granted = !granted;
  }

  // Render children or fallback
  if (granted) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

export default IfHasPermission;
