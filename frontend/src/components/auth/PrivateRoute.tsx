/**
 * PrivateRoute Component
 * STORY-007B: Login System Frontend UI
 * STORY-008B: Permission-System (Frontend)
 *
 * Protected route wrapper that redirects unauthenticated users to login.
 * Optionally checks for required permissions.
 *
 * @example
 * ```tsx
 * // Basic usage - just requires authentication
 * <PrivateRoute>
 *   <DashboardPage />
 * </PrivateRoute>
 *
 * // With permission check
 * <PrivateRoute permission="users.read">
 *   <UsersListPage />
 * </PrivateRoute>
 *
 * // With multiple permissions (any)
 * <PrivateRoute permissions={['users.read', 'users.write']} requireAll={false}>
 *   <UserManagement />
 * </PrivateRoute>
 * ```
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts';
// Import CSS for loading spinner styles (shared auth styles)
import '../../pages/AuthPages.css';

/**
 * Props for PrivateRoute component
 */
export interface PrivateRouteProps {
  /** Child components to render when authenticated */
  children: React.ReactNode;
  /** Single permission required to access this route */
  permission?: string;
  /** Multiple permissions to check */
  permissions?: string[];
  /** Whether all permissions are required (default: false - any permission grants access) */
  requireAll?: boolean;
  /** Custom redirect path for unauthenticated users (default: /login) */
  redirectTo?: string;
  /** Custom redirect path for unauthorized users (default: /forbidden) */
  unauthorizedRedirectTo?: string;
  /** Optional fallback component to show while loading */
  loadingFallback?: React.ReactNode;
}

/**
 * Loading spinner component
 */
const LoadingSpinner: React.FC = () => (
  <div
    className="private-route-loading"
    role="status"
    aria-label="Authentifizierung wird überprüft"
    data-testid="auth-loading"
  >
    <div className="private-route-loading__spinner" aria-hidden="true" />
    <span className="sr-only">Authentifizierung wird überprüft...</span>
  </div>
);

/**
 * PrivateRoute Component
 *
 * Wraps protected routes and handles:
 * - Authentication check (redirects to login if not authenticated)
 * - Permission checks (redirects to unauthorized page if lacking permissions)
 * - Loading state during auth initialization
 */
export const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  redirectTo = '/login',
  unauthorizedRedirectTo = '/forbidden',
  loadingFallback,
}) => {
  const { isAuthenticated, isLoading, hasPermission, hasAnyPermission, hasAllPermissions } =
    useAuth();
  const location = useLocation();

  // Show loading state while auth is being checked
  if (isLoading) {
    return <>{loadingFallback || <LoadingSpinner />}</>;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Save the attempted URL for redirect after login
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location.pathname, returnUrl: location.pathname }}
        replace
        data-testid="redirect-to-login"
      />
    );
  }

  // Check single permission
  if (permission && !hasPermission(permission)) {
    return <Navigate to={unauthorizedRedirectTo} replace data-testid="redirect-unauthorized" />;
  }

  // Check multiple permissions
  if (permissions && permissions.length > 0) {
    const hasRequiredPermissions = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (!hasRequiredPermissions) {
      return <Navigate to={unauthorizedRedirectTo} replace data-testid="redirect-unauthorized" />;
    }
  }

  // User is authenticated and has required permissions
  return <>{children}</>;
};

export default PrivateRoute;
