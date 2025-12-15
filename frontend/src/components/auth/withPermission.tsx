/**
 * withPermission Higher-Order Component
 * STORY-008B: Permission-System (Frontend)
 *
 * HOC that wraps components with permission checking.
 * Provides permission-based component protection.
 *
 * @example
 * ```tsx
 * // Basic usage
 * const ProtectedButton = withPermission('users.delete')(DeleteButton);
 *
 * // With custom fallback
 * const ProtectedPanel = withPermission('admin.access', {
 *   fallback: <AccessDeniedMessage />
 * })(AdminPanel);
 *
 * // Multiple permissions
 * const ProtectedForm = withPermission(['users.read', 'users.update'], {
 *   requireAll: true
 * })(UserEditForm);
 * ```
 */

import React, { ComponentType } from 'react';
import { useAuth } from '../../contexts';

/**
 * Options for withPermission HOC
 */
export interface WithPermissionOptions {
  /** Fallback component to render when permission is denied */
  fallback?: React.ReactNode;
  /** When true, all permissions are required (for array of permissions). Default: false */
  requireAll?: boolean;
  /** When true, inverts the permission check */
  invert?: boolean;
  /** Display name for the wrapped component (for debugging) */
  displayName?: string;
}

/**
 * Props injected by withPermission HOC
 */
export interface InjectedPermissionProps {
  /** Whether the user has the required permission */
  hasRequiredPermission: boolean;
}

/**
 * withPermission Higher-Order Component
 *
 * Wraps a component with permission checking logic.
 * Returns null (or fallback) when user lacks required permission.
 *
 * @param permission - Single permission string or array of permissions
 * @param options - Optional configuration
 * @returns HOC function that wraps components with permission checking
 */
export function withPermission<P extends object>(
  permission: string | string[],
  options: WithPermissionOptions = {}
): (WrappedComponent: ComponentType<P>) => React.FC<P> {
  const {
    fallback = null,
    requireAll = false,
    invert = false,
    displayName,
  } = options;

  return function withPermissionHOC(
    WrappedComponent: ComponentType<P>
  ): React.FC<P> {
    const WithPermission: React.FC<P> = (props) => {
      const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

      // Check permission(s)
      let granted: boolean;

      if (Array.isArray(permission)) {
        granted = requireAll
          ? hasAllPermissions(permission)
          : hasAnyPermission(permission);
      } else {
        granted = hasPermission(permission);
      }

      // Invert if needed
      if (invert) {
        granted = !granted;
      }

      // Render
      if (!granted) {
        return <>{fallback}</>;
      }

      return <WrappedComponent {...props} />;
    };

    // Set display name for debugging
    const componentName =
      displayName ||
      WrappedComponent.displayName ||
      WrappedComponent.name ||
      'Component';
    WithPermission.displayName = `withPermission(${componentName})`;

    return WithPermission;
  };
}

/**
 * Utility type for components wrapped with withPermission
 */
export type WithPermissionComponent<P> = React.FC<P>;

export default withPermission;
