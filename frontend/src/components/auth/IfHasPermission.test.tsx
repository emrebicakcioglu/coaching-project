/**
 * IfHasPermission Component Unit Tests
 * STORY-008B: Permission-System (Frontend)
 *
 * Tests for IfHasPermission conditional rendering component.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IfHasPermission } from './IfHasPermission';
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
const DeleteButton: React.FC = () => (
  <button data-testid="delete-button">Delete</button>
);
const EditButton: React.FC = () => (
  <button data-testid="edit-button">Edit</button>
);
const FallbackMessage: React.FC = () => (
  <span data-testid="fallback-message">No Access</span>
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

describe('IfHasPermission', () => {
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
    it('renders children when user has the permission', async () => {
      localStorage.setItem(
        'auth_permissions',
        JSON.stringify(['users.delete', 'users.read'])
      );

      render(
        <TestWrapper>
          <IfHasPermission permission="users.delete">
            <DeleteButton />
          </IfHasPermission>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('delete-button')).toBeInTheDocument();
      });
    });

    it('renders nothing when user lacks the permission', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify(['users.read']));

      render(
        <TestWrapper>
          <IfHasPermission permission="users.delete">
            <DeleteButton />
          </IfHasPermission>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('delete-button')).not.toBeInTheDocument();
      });
    });

    it('renders fallback when user lacks permission and fallback is provided', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify(['users.read']));

      render(
        <TestWrapper>
          <IfHasPermission
            permission="users.delete"
            fallback={<FallbackMessage />}
          >
            <DeleteButton />
          </IfHasPermission>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('fallback-message')).toBeInTheDocument();
        expect(screen.queryByTestId('delete-button')).not.toBeInTheDocument();
      });
    });
  });

  describe('Multiple Permissions (Any)', () => {
    it('renders children when user has any of the permissions', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify(['users.update']));

      render(
        <TestWrapper>
          <IfHasPermission permissions={['users.update', 'users.delete']}>
            <EditButton />
          </IfHasPermission>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('edit-button')).toBeInTheDocument();
      });
    });

    it('renders nothing when user has none of the permissions', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify(['users.read']));

      render(
        <TestWrapper>
          <IfHasPermission permissions={['users.update', 'users.delete']}>
            <EditButton />
          </IfHasPermission>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('edit-button')).not.toBeInTheDocument();
      });
    });
  });

  describe('Multiple Permissions (All Required)', () => {
    it('renders children when user has all permissions', async () => {
      localStorage.setItem(
        'auth_permissions',
        JSON.stringify(['users.read', 'users.update'])
      );

      render(
        <TestWrapper>
          <IfHasPermission
            permissions={['users.read', 'users.update']}
            requireAll
          >
            <EditButton />
          </IfHasPermission>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('edit-button')).toBeInTheDocument();
      });
    });

    it('renders nothing when user lacks some permissions', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify(['users.read']));

      render(
        <TestWrapper>
          <IfHasPermission
            permissions={['users.read', 'users.update']}
            requireAll
          >
            <EditButton />
          </IfHasPermission>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('edit-button')).not.toBeInTheDocument();
      });
    });
  });

  describe('Wildcard Permission Support', () => {
    it('grants access with wildcard permission (users.*)', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify(['users.*']));

      render(
        <TestWrapper>
          <IfHasPermission permission="users.delete">
            <DeleteButton />
          </IfHasPermission>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('delete-button')).toBeInTheDocument();
      });
    });

    it('grants access with super admin permission (*)', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify(['*']));

      render(
        <TestWrapper>
          <IfHasPermission permission="admin.access">
            <DeleteButton />
          </IfHasPermission>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('delete-button')).toBeInTheDocument();
      });
    });
  });

  describe('Inverted Logic', () => {
    it('renders children when user does NOT have permission (invert=true)', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify(['users.read']));

      render(
        <TestWrapper>
          <IfHasPermission permission="admin.access" invert>
            <span data-testid="non-admin-content">Non-Admin Content</span>
          </IfHasPermission>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('non-admin-content')).toBeInTheDocument();
      });
    });

    it('renders nothing when user HAS permission (invert=true)', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify(['admin.access']));

      render(
        <TestWrapper>
          <IfHasPermission permission="admin.access" invert>
            <span data-testid="non-admin-content">Non-Admin Content</span>
          </IfHasPermission>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('non-admin-content')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('renders children when no permission is specified', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify(['users.read']));

      render(
        <TestWrapper>
          <IfHasPermission>
            <DeleteButton />
          </IfHasPermission>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('delete-button')).toBeInTheDocument();
      });
    });

    it('handles null user gracefully', async () => {
      vi.mocked(authService.isAuthenticated).mockReturnValue(false);
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_permissions');

      render(
        <TestWrapper>
          <IfHasPermission permission="users.delete">
            <DeleteButton />
          </IfHasPermission>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('delete-button')).not.toBeInTheDocument();
      });
    });

    it('handles empty permissions array', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify([]));

      render(
        <TestWrapper>
          <IfHasPermission permission="users.delete">
            <DeleteButton />
          </IfHasPermission>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('delete-button')).not.toBeInTheDocument();
      });
    });
  });
});
