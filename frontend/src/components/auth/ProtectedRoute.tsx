/**
 * ProtectedRoute Component
 * STORY-008B: Permission-System (Frontend)
 *
 * Route wrapper that checks for specific permissions and redirects to /forbidden
 * when the user lacks the required permission.
 *
 * Unlike PrivateRoute which handles authentication AND permissions,
 * ProtectedRoute focuses specifically on permission-based route protection.
 *
 * @example
 * ```tsx
 * // Single permission check
 * <ProtectedRoute permission="users.read">
 *   <UsersListPage />
 * </ProtectedRoute>
 *
 * // With custom fallback
 * <ProtectedRoute permission="admin.access" fallback={<AccessDeniedMessage />}>
 *   <AdminPanel />
 * </ProtectedRoute>
 * ```
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePermission, useAuth } from '../../contexts';

/**
 * Props for ProtectedRoute component
 */
export interface ProtectedRouteProps {
  /** Child components to render when permission is granted */
  children: React.ReactNode;
  /** Permission required to access this route (e.g., 'users.read') */
  permission: string;
  /** Custom redirect path when permission is denied (default: /forbidden) */
  redirectTo?: string;
  /** Optional fallback component instead of redirect */
  fallback?: React.ReactNode;
}

/**
 * ProtectedRoute Component
 *
 * Wraps routes that require specific permissions.
 * Redirects to /forbidden page when the user lacks the required permission.
 *
 * Note: This component assumes the user is already authenticated.
 * For routes that need both authentication and permission checks,
 * combine with PrivateRoute or use PrivateRoute's permission prop.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  permission,
  redirectTo = '/forbidden',
  fallback,
}) => {
  const hasPermission = usePermission(permission);
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Wait for auth to initialize
  if (isLoading) {
    return null;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname, returnUrl: location.pathname }}
        replace
        data-testid="protected-route-redirect-login"
      />
    );
  }

  // Check permission
  if (!hasPermission) {
    // Use fallback if provided, otherwise redirect
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <Navigate
        to={redirectTo}
        replace
        data-testid="protected-route-redirect-forbidden"
      />
    );
  }

  // User has the required permission
  return <>{children}</>;
};

export default ProtectedRoute;
