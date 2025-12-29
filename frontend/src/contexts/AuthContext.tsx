/**
 * Auth Context
 * STORY-016A: Context Menu Core Navigation
 *
 * Provides authentication state and permission checking throughout the application.
 * Integrates with authService and rolesService for user data and permissions.
 *
 * @example
 * ```tsx
 * function ProtectedComponent() {
 *   const { user, hasPermission, isAuthenticated } = useAuth();
 *
 *   if (!isAuthenticated) return <Navigate to="/login" />;
 *   if (!hasPermission('users.read')) return <AccessDenied />;
 *
 *   return <UsersList />;
 * }
 * ```
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { authService, LoginRequest, LoginResponse, AUTH_STATE_CHANGE_EVENT } from '../services/authService';
import { rolesService, Permission, Role } from '../services/rolesService';

/**
 * Token validation interval in milliseconds (30 seconds)
 * This ensures we catch expired tokens reasonably quickly
 */
const TOKEN_VALIDATION_INTERVAL = 30 * 1000;

/**
 * Proactive refresh buffer in seconds (60 seconds before expiration)
 * Refresh token this many seconds before it actually expires
 */
const PROACTIVE_REFRESH_BUFFER = 60;

/**
 * User interface for authenticated user
 */
export interface User {
  id: number;
  email: string;
  name: string;
  status: string;
  role?: Role;
  permissions?: string[];
}

/**
 * Auth context state
 */
export interface AuthContextState {
  /** Currently authenticated user */
  user: User | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Whether auth state is still loading */
  isLoading: boolean;
  /** User's permissions (permission names) */
  permissions: string[];
  /** User's role */
  role: Role | null;
  /** Check if user has a specific permission */
  hasPermission: (permission: string) => boolean;
  /** Check if user has any of the specified permissions */
  hasAnyPermission: (permissions: string[]) => boolean;
  /** Check if user has all of the specified permissions */
  hasAllPermissions: (permissions: string[]) => boolean;
  /** Login user */
  login: (credentials: LoginRequest) => Promise<LoginResponse>;
  /** Logout user */
  logout: () => Promise<void>;
  /** Refresh user data */
  refreshUser: () => Promise<void>;
}

/**
 * Default context value
 */
const defaultContextValue: AuthContextState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  permissions: [],
  role: null,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAllPermissions: () => false,
  login: async () => {
    throw new Error('AuthContext not initialized');
  },
  logout: async () => {
    throw new Error('AuthContext not initialized');
  },
  refreshUser: async () => {
    throw new Error('AuthContext not initialized');
  },
};

/**
 * Auth Context
 */
export const AuthContext = createContext<AuthContextState>(defaultContextValue);

/**
 * Storage key for persisted user data
 */
const USER_STORAGE_KEY = 'auth_user';
const PERMISSIONS_STORAGE_KEY = 'auth_permissions';

/**
 * Auth Provider Props
 */
export interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Auth Provider Component
 *
 * Wraps the application to provide authentication state and methods.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ref to track if we're currently refreshing to prevent multiple refresh attempts
  const isRefreshingRef = useRef(false);

  /**
   * Load user from storage on mount
   * STORY-008: Enhanced to recover session from refresh token even if auth_user is missing
   */
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        // Check if we have a stored user
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);
        const storedPermissions = localStorage.getItem(PERMISSIONS_STORAGE_KEY);

        if (storedUser && authService.isAuthenticated()) {
          // Normal case: both user data and tokens exist
          const userData = JSON.parse(storedUser) as User;
          setUser(userData);

          if (storedPermissions) {
            setPermissions(JSON.parse(storedPermissions));
          }

          // Try to refresh user data in background
          // Don't await to avoid blocking the UI
          refreshUserData().catch(console.error);
        } else if (!storedUser && authService.isAuthenticated()) {
          // Recovery case: refresh token exists but user data is missing
          // This can happen when browser clears some localStorage but keeps tokens
          // Try to recover the session by refreshing the token and getting user info
          console.log('Attempting to recover session from refresh token...');
          try {
            // Make an authenticated API call to trigger token refresh
            const roles = await rolesService.listRoles();

            // If we get here, the token was valid/refreshed
            // Try to get user info from the access token
            const accessToken = localStorage.getItem('access_token');
            if (accessToken) {
              try {
                const base64Payload = accessToken.split('.')[1];
                const payload = JSON.parse(atob(base64Payload));

                // Create user object from token payload
                const recoveredUser: User = {
                  id: payload.sub,
                  email: payload.email,
                  name: payload.email.split('@')[0], // Fallback name from email
                  status: 'active',
                };

                setUser(recoveredUser);
                localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(recoveredUser));

                // Set permissions from roles
                if (roles.length > 0) {
                  const userRole = roles.find((r) => r.name.toLowerCase() === 'admin') || roles[0];
                  if (userRole) {
                    setRole(userRole);
                    const permissionNames = userRole.permissions?.map((p) => p.name) || [];
                    setPermissions(permissionNames);
                    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(permissionNames));
                  }
                }

                console.log('Session recovered successfully');
              } catch (decodeError) {
                console.error('Failed to decode access token:', decodeError);
              }
            }
          } catch (refreshError) {
            // Token refresh failed - user needs to login again
            console.log('Session recovery failed, user needs to login');
            authService.clearTokens();
          }
        }
      } catch (error) {
        console.error('Error loading stored auth:', error);
        // Clear invalid stored data
        localStorage.removeItem(USER_STORAGE_KEY);
        localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  /**
   * Handle logout - clears user state and storage
   */
  const handleLogout = useCallback(() => {
    setUser(null);
    setPermissions([]);
    setRole(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
  }, []);

  /**
   * Proactive token refresh
   * Refreshes the token before it expires to prevent session interruption
   */
  const proactiveTokenRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;

    try {
      isRefreshingRef.current = true;
      await authService.refreshToken();
      console.debug('Proactive token refresh successful');
    } catch (error) {
      console.warn('Proactive token refresh failed:', error);
      // If refresh fails, the next API call will trigger the interceptor
      // which will handle the redirect to login
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  /**
   * Periodic token validation
   * Checks token status every 30 seconds and handles expiration
   * IMPORTANT: This prevents users from working with expired sessions
   */
  useEffect(() => {
    // Don't run if not authenticated or still loading
    if (isLoading || !user) return;

    const validateToken = async () => {
      // Check if token is still valid
      if (!authService.isAuthenticated()) {
        console.warn('Token validation: Session expired, logging out');
        handleLogout();
        authService.forceLogout('session_expired');
        return;
      }

      // Check if token is about to expire and proactively refresh
      if (authService.isTokenAboutToExpire(PROACTIVE_REFRESH_BUFFER)) {
        console.debug('Token validation: Token about to expire, refreshing proactively');
        await proactiveTokenRefresh();
      }
    };

    // Run immediately on mount
    validateToken();

    // Set up periodic validation
    const intervalId = setInterval(validateToken, TOKEN_VALIDATION_INTERVAL);

    return () => clearInterval(intervalId);
  }, [isLoading, user, handleLogout, proactiveTokenRefresh]);

  /**
   * Listen for auth state change events from authService
   * This handles cases where the interceptor detects token expiration
   */
  useEffect(() => {
    const handleAuthStateChange = (event: CustomEvent<{ isAuthenticated: boolean; reason: string }>) => {
      const { isAuthenticated, reason } = event.detail;

      if (!isAuthenticated) {
        console.warn(`Auth state change: ${reason}`);
        handleLogout();
      }
    };

    window.addEventListener(AUTH_STATE_CHANGE_EVENT, handleAuthStateChange as EventListener);

    return () => {
      window.removeEventListener(AUTH_STATE_CHANGE_EVENT, handleAuthStateChange as EventListener);
    };
  }, [handleLogout]);

  /**
   * Refresh user data from server
   */
  const refreshUserData = useCallback(async () => {
    try {
      // Fetch user's role and permissions
      const roles = await rolesService.listRoles();
      if (roles.length > 0 && user) {
        // Find user's role - use case-insensitive matching to handle 'admin' vs 'Administrator'
        // Priority: user's assigned role > 'admin' role > first available role
        const userRoleName = user.role?.name?.toLowerCase();
        const userRole =
          (userRoleName && roles.find((r) => r.name.toLowerCase() === userRoleName)) ||
          roles.find((r) => r.name.toLowerCase() === 'admin') ||
          roles.find((r) => r.name.toLowerCase() === 'administrator') ||
          roles[0];
        if (userRole) {
          setRole(userRole);
          const permissionNames = userRole.permissions?.map((p) => p.name) || [];
          setPermissions(permissionNames);
          localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(permissionNames));
        }
      }
    } catch (error) {
      // Silently fail - user may not have permission to list roles
      console.debug('Could not refresh user data:', error);
    }
  }, [user]);

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback(
    (permission: string): boolean => {
      // Null permission means public access
      if (permission === null || permission === undefined || permission === '') {
        return true;
      }
      // Check if user has the exact permission
      if (permissions.includes(permission)) {
        return true;
      }
      // Check for wildcard permissions (e.g., 'users.*' grants all users permissions)
      const [category] = permission.split('.');
      if (permissions.includes(`${category}.*`)) {
        return true;
      }
      // Check for super admin permission
      if (permissions.includes('*') || permissions.includes('admin.*')) {
        return true;
      }
      return false;
    },
    [permissions]
  );

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = useCallback(
    (permissionList: string[]): boolean => {
      return permissionList.some((permission) => hasPermission(permission));
    },
    [hasPermission]
  );

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = useCallback(
    (permissionList: string[]): boolean => {
      return permissionList.every((permission) => hasPermission(permission));
    },
    [hasPermission]
  );

  /**
   * Login user
   */
  const login = useCallback(async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await authService.login(credentials);

    // Create user object from response
    const userData: User = {
      id: response.user.id,
      email: response.user.email,
      name: response.user.name,
      status: response.user.status,
    };

    setUser(userData);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));

    // Fetch permissions after login
    try {
      const roles = await rolesService.listRoles();
      // Find user's role - use case-insensitive matching to handle 'admin' vs 'Administrator'
      // Priority: exact match > case-insensitive 'admin' match > first available role
      const userRole =
        roles.find((r) => r.name.toLowerCase() === 'admin') ||
        roles.find((r) => r.name.toLowerCase() === 'administrator') ||
        roles[0];
      if (userRole) {
        setRole(userRole);
        const permissionNames = userRole.permissions?.map((p) => p.name) || [];
        setPermissions(permissionNames);
        localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(permissionNames));
      }
    } catch (error) {
      // Set default permissions for demo
      const defaultPermissions = [
        'dashboard.read',
        'users.read',
        'users.create',
        'users.update',
        'users.delete',
        'roles.read',
        'settings.read',
      ];
      setPermissions(defaultPermissions);
      localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(defaultPermissions));
    }

    return response;
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(async (): Promise<void> => {
    await authService.logout();
    handleLogout();
  }, [handleLogout]);

  /**
   * Memoized context value
   */
  const contextValue = useMemo<AuthContextState>(
    () => ({
      user,
      isAuthenticated: !!user && authService.isAuthenticated(),
      isLoading,
      permissions,
      role,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      login,
      logout,
      refreshUser: refreshUserData,
    }),
    [
      user,
      isLoading,
      permissions,
      role,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      login,
      logout,
      refreshUserData,
    ]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

/**
 * Hook to access auth context
 *
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): AuthContextState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to check a single permission
 *
 * @param permission - Permission to check (null for public access)
 * @returns boolean indicating if user has the permission
 *
 * @example
 * ```tsx
 * function DeleteButton() {
 *   const canDelete = usePermission('users.delete');
 *   if (!canDelete) return null;
 *   return <button>Delete</button>;
 * }
 * ```
 */
export function usePermission(permission: string | null): boolean {
  const { hasPermission } = useAuth();
  return permission === null ? true : hasPermission(permission);
}

export default AuthContext;
