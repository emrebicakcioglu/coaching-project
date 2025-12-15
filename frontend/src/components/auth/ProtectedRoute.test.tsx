/**
 * ProtectedRoute Component Unit Tests
 * STORY-008B: Permission-System (Frontend)
 *
 * Tests for ProtectedRoute component including permission checking,
 * redirect to /forbidden, and fallback rendering.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
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
const ProtectedContent: React.FC = () => (
  <div data-testid="protected-content">Protected Content</div>
);
const ForbiddenPage: React.FC = () => (
  <div data-testid="forbidden-page">Forbidden</div>
);
const LoginPage: React.FC = () => (
  <div data-testid="login-page">Login Page</div>
);
const CustomFallback: React.FC = () => (
  <div data-testid="custom-fallback">Access Denied</div>
);

// Wrapper component for testing
interface TestWrapperProps {
  children: React.ReactNode;
  initialEntries?: string[];
}

const TestWrapper: React.FC<TestWrapperProps> = ({
  children,
  initialEntries = ['/protected'],
}) => (
  <MemoryRouter initialEntries={initialEntries}>
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="/protected" element={children} />
      </Routes>
    </AuthProvider>
  </MemoryRouter>
);

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Authentication Check', () => {
    it('redirects to login when not authenticated', async () => {
      vi.mocked(authService.isAuthenticated).mockReturnValue(false);

      render(
        <TestWrapper>
          <ProtectedRoute permission="users.read">
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('Permission Check', () => {
    beforeEach(() => {
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

    it('renders children when user has required permission', async () => {
      localStorage.setItem(
        'auth_permissions',
        JSON.stringify(['users.read', 'users.create'])
      );

      render(
        <TestWrapper>
          <ProtectedRoute permission="users.read">
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });

    it('redirects to /forbidden when user lacks required permission', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify(['users.read']));

      render(
        <TestWrapper>
          <ProtectedRoute permission="admin.access">
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('forbidden-page')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('supports wildcard permissions', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify(['users.*']));

      render(
        <TestWrapper>
          <ProtectedRoute permission="users.delete">
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });

    it('uses custom redirect path', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify(['users.read']));

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <AuthProvider>
            <Routes>
              <Route
                path="/custom-forbidden"
                element={<div data-testid="custom-forbidden">Custom Forbidden</div>}
              />
              <Route
                path="/protected"
                element={
                  <ProtectedRoute
                    permission="admin.access"
                    redirectTo="/custom-forbidden"
                  >
                    <ProtectedContent />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('custom-forbidden')).toBeInTheDocument();
      });
    });
  });

  describe('Fallback Component', () => {
    beforeEach(() => {
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

    it('renders fallback instead of redirecting when provided', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify(['users.read']));

      render(
        <TestWrapper>
          <ProtectedRoute
            permission="admin.access"
            fallback={<CustomFallback />}
          >
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('forbidden-page')).not.toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles null permissions array', async () => {
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
      // No permissions in storage

      render(
        <TestWrapper>
          <ProtectedRoute permission="users.read">
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('forbidden-page')).toBeInTheDocument();
      });
    });

    it('handles empty permissions array', async () => {
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
      localStorage.setItem('auth_permissions', JSON.stringify([]));

      render(
        <TestWrapper>
          <ProtectedRoute permission="users.read">
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('forbidden-page')).toBeInTheDocument();
      });
    });
  });
});
