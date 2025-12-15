/**
 * Auth Context Unit Tests
 * STORY-007B: Login System Frontend UI
 *
 * Tests for AuthProvider component, useAuth hook, and permission checking.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth, usePermission, AuthContext } from './AuthContext';
import { authService } from '../services/authService';
import { rolesService } from '../services/rolesService';
import React from 'react';

// Mock the services
vi.mock('../services/authService', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: vi.fn(),
  },
}));

vi.mock('../services/rolesService', () => ({
  rolesService: {
    listRoles: vi.fn(),
  },
}));

// Helper component to access auth context
const AuthConsumer: React.FC = () => {
  const { user, isAuthenticated, isLoading, permissions, role } = useAuth();
  return (
    <div>
      <span data-testid="loading">{isLoading ? 'loading' : 'loaded'}</span>
      <span data-testid="authenticated">{isAuthenticated ? 'yes' : 'no'}</span>
      <span data-testid="user-email">{user?.email || 'none'}</span>
      <span data-testid="user-name">{user?.name || 'none'}</span>
      <span data-testid="permissions-count">{permissions.length}</span>
      <span data-testid="role-name">{role?.name || 'none'}</span>
    </div>
  );
};

// Helper component to test permission checking
const PermissionConsumer: React.FC<{ permission: string }> = ({ permission }) => {
  const hasPermission = usePermission(permission);
  return (
    <span data-testid="has-permission">{hasPermission ? 'yes' : 'no'}</span>
  );
};

// Helper component to test login/logout
const LoginLogoutConsumer: React.FC = () => {
  const { login, logout, isAuthenticated, user } = useAuth();
  const [error, setError] = React.useState<string | null>(null);

  const handleLogin = async () => {
    try {
      await login({ email: 'test@example.com', password: 'password123' });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div>
      <span data-testid="authenticated">{isAuthenticated ? 'yes' : 'no'}</span>
      <span data-testid="user-email">{user?.email || 'none'}</span>
      <button data-testid="login-btn" onClick={handleLogin}>Login</button>
      <button data-testid="logout-btn" onClick={handleLogout}>Logout</button>
      {error && <span data-testid="error">{error}</span>}
    </div>
  );
};

describe('AuthContext', () => {
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    status: 'active',
  };

  const mockLoginResponse = {
    user: mockUser,
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
  };

  const mockRoles = [
    {
      id: 1,
      name: 'Administrator',
      description: 'Admin role',
      is_system: true,
      created_at: new Date().toISOString(),
      permissions: [
        { id: 1, name: 'users.read', description: 'Read users' },
        { id: 2, name: 'users.create', description: 'Create users' },
        { id: 3, name: 'users.delete', description: 'Delete users' },
        { id: 4, name: 'settings.read', description: 'Read settings' },
      ],
    },
    {
      id: 2,
      name: 'User',
      description: 'Regular user',
      is_system: false,
      created_at: new Date().toISOString(),
      permissions: [
        { id: 1, name: 'users.read', description: 'Read users' },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(authService.isAuthenticated).mockReturnValue(false);
    vi.mocked(authService.login).mockResolvedValue(mockLoginResponse);
    vi.mocked(authService.logout).mockResolvedValue(undefined);
    vi.mocked(rolesService.listRoles).mockResolvedValue(mockRoles);
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('AuthProvider', () => {
    it('renders children correctly', async () => {
      render(
        <AuthProvider>
          <div data-testid="child">Child content</div>
        </AuthProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('shows loading state initially then loaded', async () => {
      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      // Should eventually show loaded
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });
    });

    it('shows not authenticated by default', async () => {
      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
      expect(screen.getByTestId('user-email')).toHaveTextContent('none');
    });

    it('restores user from localStorage if authenticated', async () => {
      const storedUser = {
        id: 1,
        email: 'stored@example.com',
        name: 'Stored User',
        status: 'active',
      };
      localStorage.setItem('auth_user', JSON.stringify(storedUser));
      localStorage.setItem('auth_permissions', JSON.stringify(['users.read']));
      vi.mocked(authService.isAuthenticated).mockReturnValue(true);

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
      expect(screen.getByTestId('user-email')).toHaveTextContent('stored@example.com');
    });

    it('clears invalid stored data', async () => {
      localStorage.setItem('auth_user', 'invalid-json');

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(localStorage.getItem('auth_user')).toBeNull();
    });
  });

  describe('useAuth hook', () => {
    it('throws error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<AuthConsumer />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });

    it('provides login function that updates state', async () => {
      render(
        <AuthProvider>
          <LoginLogoutConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
      });

      const loginBtn = screen.getByTestId('login-btn');
      await act(async () => {
        loginBtn.click();
      });

      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
    });

    it('provides logout function that clears state', async () => {
      // Start authenticated
      const storedUser = mockUser;
      localStorage.setItem('auth_user', JSON.stringify(storedUser));
      localStorage.setItem('auth_permissions', JSON.stringify(['users.read']));
      vi.mocked(authService.isAuthenticated).mockReturnValue(true);

      render(
        <AuthProvider>
          <LoginLogoutConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
      });

      const logoutBtn = screen.getByTestId('logout-btn');
      await act(async () => {
        logoutBtn.click();
      });

      await waitFor(() => {
        expect(authService.logout).toHaveBeenCalled();
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
      expect(screen.getByTestId('user-email')).toHaveTextContent('none');
      expect(localStorage.getItem('auth_user')).toBeNull();
      expect(localStorage.getItem('auth_permissions')).toBeNull();
    });
  });

  describe('Permission checking', () => {
    beforeEach(() => {
      const storedUser = mockUser;
      localStorage.setItem('auth_user', JSON.stringify(storedUser));
      localStorage.setItem('auth_permissions', JSON.stringify([
        'users.read',
        'users.create',
        'settings.read',
      ]));
      vi.mocked(authService.isAuthenticated).mockReturnValue(true);
    });

    it('hasPermission returns true for existing permission', async () => {
      const TestComponent: React.FC = () => {
        const { hasPermission } = useAuth();
        return (
          <span data-testid="result">{hasPermission('users.read') ? 'yes' : 'no'}</span>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('yes');
      });
    });

    it('hasPermission returns false for non-existing permission', async () => {
      const TestComponent: React.FC = () => {
        const { hasPermission } = useAuth();
        return (
          <span data-testid="result">{hasPermission('users.delete') ? 'yes' : 'no'}</span>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('no');
      });
    });

    it('hasPermission handles wildcard permissions', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify(['users.*']));

      const TestComponent: React.FC = () => {
        const { hasPermission } = useAuth();
        return (
          <div>
            <span data-testid="users-read">{hasPermission('users.read') ? 'yes' : 'no'}</span>
            <span data-testid="users-delete">{hasPermission('users.delete') ? 'yes' : 'no'}</span>
            <span data-testid="settings-read">{hasPermission('settings.read') ? 'yes' : 'no'}</span>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('users-read')).toHaveTextContent('yes');
      });
      expect(screen.getByTestId('users-delete')).toHaveTextContent('yes');
      expect(screen.getByTestId('settings-read')).toHaveTextContent('no');
    });

    it('hasPermission handles super admin permission', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify(['*']));

      const TestComponent: React.FC = () => {
        const { hasPermission } = useAuth();
        return (
          <div>
            <span data-testid="users-read">{hasPermission('users.read') ? 'yes' : 'no'}</span>
            <span data-testid="anything">{hasPermission('anything.else') ? 'yes' : 'no'}</span>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('users-read')).toHaveTextContent('yes');
      });
      expect(screen.getByTestId('anything')).toHaveTextContent('yes');
    });

    it('hasAnyPermission returns true if any permission matches', async () => {
      const TestComponent: React.FC = () => {
        const { hasAnyPermission } = useAuth();
        return (
          <div>
            <span data-testid="some-match">
              {hasAnyPermission(['users.read', 'users.delete']) ? 'yes' : 'no'}
            </span>
            <span data-testid="no-match">
              {hasAnyPermission(['users.delete', 'roles.read']) ? 'yes' : 'no'}
            </span>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('some-match')).toHaveTextContent('yes');
      });
      expect(screen.getByTestId('no-match')).toHaveTextContent('no');
    });

    it('hasAllPermissions returns true only if all permissions match', async () => {
      const TestComponent: React.FC = () => {
        const { hasAllPermissions } = useAuth();
        return (
          <div>
            <span data-testid="all-match">
              {hasAllPermissions(['users.read', 'users.create']) ? 'yes' : 'no'}
            </span>
            <span data-testid="partial-match">
              {hasAllPermissions(['users.read', 'users.delete']) ? 'yes' : 'no'}
            </span>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('all-match')).toHaveTextContent('yes');
      });
      expect(screen.getByTestId('partial-match')).toHaveTextContent('no');
    });
  });

  describe('usePermission hook', () => {
    beforeEach(() => {
      const storedUser = mockUser;
      localStorage.setItem('auth_user', JSON.stringify(storedUser));
      localStorage.setItem('auth_permissions', JSON.stringify(['users.read']));
      vi.mocked(authService.isAuthenticated).mockReturnValue(true);
    });

    it('returns true for null permission (public access)', async () => {
      const TestComponent: React.FC = () => {
        const hasPermission = usePermission(null);
        return <span data-testid="result">{hasPermission ? 'yes' : 'no'}</span>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('yes');
      });
    });

    it('returns true for permission user has', async () => {
      render(
        <AuthProvider>
          <PermissionConsumer permission="users.read" />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('has-permission')).toHaveTextContent('yes');
      });
    });

    it('returns false for permission user does not have', async () => {
      render(
        <AuthProvider>
          <PermissionConsumer permission="users.delete" />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('has-permission')).toHaveTextContent('no');
      });
    });
  });
});
