/**
 * withPermission HOC Unit Tests
 * STORY-008B: Permission-System (Frontend)
 *
 * Tests for withPermission higher-order component.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { withPermission } from './withPermission';
import { AuthProvider } from '../../contexts';
import { authService } from '../../services/authService';
import React from 'react';

// Mock the services
vi.mock('../../services/authService', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: vi.fn(),
  },
}));

vi.mock('../../services/rolesService', () => ({
  rolesService: {
    listRoles: vi.fn().mockResolvedValue([]),
  },
}));

// Test components
interface TestComponentProps {
  label?: string;
}

const TestComponent: React.FC<TestComponentProps> = ({ label = 'Content' }) => (
  <div data-testid="test-component">{label}</div>
);

const FallbackComponent: React.FC = () => (
  <div data-testid="fallback-component">No Access</div>
);

// Wrapper component for testing
interface TestWrapperProps {
  children: React.ReactNode;
}

const TestWrapper: React.FC<TestWrapperProps> = ({ children }) => (
  <MemoryRouter>
    <AuthProvider>{children}</AuthProvider>
  </MemoryRouter>
);

describe('withPermission HOC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(authService.isAuthenticated).mockReturnValue(true);
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        status: 'active',
      })
    );
  });

  describe('Single Permission Check', () => {
    it('renders wrapped component when user has permission', async () => {
      localStorage.setItem(
        'auth_permissions',
        JSON.stringify(['users.delete'])
      );

      const ProtectedComponent = withPermission('users.delete')(TestComponent);

      render(
        <TestWrapper>
          <ProtectedComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-component')).toBeInTheDocument();
      });
    });

    it('renders null when user lacks permission', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify(['users.read']));

      const ProtectedComponent = withPermission('users.delete')(TestComponent);

      render(
        <TestWrapper>
          <ProtectedComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
      });
    });

    it('renders fallback when user lacks permission and fallback is provided', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify(['users.read']));

      const ProtectedComponent = withPermission('users.delete', {
        fallback: <FallbackComponent />,
      })(TestComponent);

      render(
        <TestWrapper>
          <ProtectedComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('fallback-component')).toBeInTheDocument();
        expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
      });
    });
  });

  describe('Multiple Permissions (Array)', () => {
    it('renders when user has any of the permissions (default)', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify(['users.update']));

      const ProtectedComponent = withPermission([
        'users.update',
        'users.delete',
      ])(TestComponent);

      render(
        <TestWrapper>
          <ProtectedComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-component')).toBeInTheDocument();
      });
    });

    it('renders null when user has none of the permissions', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify(['users.read']));

      const ProtectedComponent = withPermission([
        'users.update',
        'users.delete',
      ])(TestComponent);

      render(
        <TestWrapper>
          <ProtectedComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
      });
    });

    it('renders when user has all permissions (requireAll=true)', async () => {
      localStorage.setItem(
        'auth_permissions',
        JSON.stringify(['users.update', 'users.delete'])
      );

      const ProtectedComponent = withPermission(
        ['users.update', 'users.delete'],
        { requireAll: true }
      )(TestComponent);

      render(
        <TestWrapper>
          <ProtectedComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-component')).toBeInTheDocument();
      });
    });

    it('renders null when user lacks some permissions (requireAll=true)', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify(['users.update']));

      const ProtectedComponent = withPermission(
        ['users.update', 'users.delete'],
        { requireAll: true }
      )(TestComponent);

      render(
        <TestWrapper>
          <ProtectedComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
      });
    });
  });

  describe('Wildcard Permission Support', () => {
    it('grants access with wildcard permission', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify(['users.*']));

      const ProtectedComponent = withPermission('users.delete')(TestComponent);

      render(
        <TestWrapper>
          <ProtectedComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-component')).toBeInTheDocument();
      });
    });
  });

  describe('Props Passing', () => {
    it('passes props to wrapped component', async () => {
      localStorage.setItem(
        'auth_permissions',
        JSON.stringify(['users.delete'])
      );

      const ProtectedComponent = withPermission('users.delete')(TestComponent);

      render(
        <TestWrapper>
          <ProtectedComponent label="Custom Label" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-component')).toHaveTextContent(
          'Custom Label'
        );
      });
    });
  });

  describe('Display Name', () => {
    it('sets display name correctly', () => {
      const ProtectedComponent = withPermission('users.delete')(TestComponent);
      expect(ProtectedComponent.displayName).toBe(
        'withPermission(TestComponent)'
      );
    });

    it('uses custom display name when provided', () => {
      const ProtectedComponent = withPermission('users.delete', {
        displayName: 'CustomName',
      })(TestComponent);
      expect(ProtectedComponent.displayName).toBe('withPermission(CustomName)');
    });
  });

  describe('Inverted Logic', () => {
    it('renders when user does NOT have permission (invert=true)', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify(['users.read']));

      const ProtectedComponent = withPermission('admin.access', {
        invert: true,
      })(TestComponent);

      render(
        <TestWrapper>
          <ProtectedComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-component')).toBeInTheDocument();
      });
    });

    it('renders null when user HAS permission (invert=true)', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify(['admin.access']));

      const ProtectedComponent = withPermission('admin.access', {
        invert: true,
      })(TestComponent);

      render(
        <TestWrapper>
          <ProtectedComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles null user gracefully', async () => {
      vi.mocked(authService.isAuthenticated).mockReturnValue(false);
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_permissions');

      const ProtectedComponent = withPermission('users.delete')(TestComponent);

      render(
        <TestWrapper>
          <ProtectedComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
      });
    });

    it('handles empty permissions array', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify([]));

      const ProtectedComponent = withPermission('users.delete')(TestComponent);

      render(
        <TestWrapper>
          <ProtectedComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
      });
    });
  });
});
