/**
 * usePermission Hook Unit Tests
 * STORY-008B: Permission-System (Frontend)
 *
 * Tests for usePermission hook which is exported from AuthContext.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, usePermission, useAuth } from '../contexts';
import { authService } from '../services/authService';

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
    listRoles: vi.fn().mockResolvedValue([]),
  },
}));

// Wrapper component for testing hooks
const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(AuthProvider, null, children)
    );
};

describe('usePermission Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Basic Permission Checking', () => {
    it('returns true when user has the exact permission', async () => {
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
      localStorage.setItem(
        'auth_permissions',
        JSON.stringify(['users.read', 'users.create'])
      );

      const { result } = renderHook(() => usePermission('users.read'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('returns false when user lacks the permission', async () => {
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
      localStorage.setItem('auth_permissions', JSON.stringify(['users.read']));

      const { result } = renderHook(() => usePermission('users.delete'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });
  });

  describe('Wildcard Permission Support', () => {
    it('returns true when user has wildcard permission (users.*)', async () => {
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
      localStorage.setItem('auth_permissions', JSON.stringify(['users.*']));

      const { result } = renderHook(() => usePermission('users.delete'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('wildcard permission does not match different categories', async () => {
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
      localStorage.setItem('auth_permissions', JSON.stringify(['users.*']));

      const { result } = renderHook(() => usePermission('roles.read'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });

    it('returns true when user has super admin permission (*)', async () => {
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
      localStorage.setItem('auth_permissions', JSON.stringify(['*']));

      const { result } = renderHook(() => usePermission('admin.access'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('returns true when user has admin.* permission', async () => {
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
      localStorage.setItem('auth_permissions', JSON.stringify(['admin.*']));

      const { result } = renderHook(() => usePermission('users.delete'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });
  });

  describe('Null Permission Handling', () => {
    it('returns true when permission is null (public access)', async () => {
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

      const { result } = renderHook(() => usePermission(null), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('returns false when user has no permissions', async () => {
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
      // No permissions stored

      const { result } = renderHook(() => usePermission('users.read'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });

    it('returns false when user is not authenticated', async () => {
      vi.mocked(authService.isAuthenticated).mockReturnValue(false);

      const { result } = renderHook(() => usePermission('users.read'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });

    it('returns false with empty permissions array', async () => {
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

      const { result } = renderHook(() => usePermission('users.read'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });
  });
});

describe('useAuth Permission Methods', () => {
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

  describe('hasAnyPermission', () => {
    it('returns true when user has any of the permissions', async () => {
      localStorage.setItem(
        'auth_permissions',
        JSON.stringify(['users.read'])
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(
          result.current.hasAnyPermission(['users.read', 'users.delete'])
        ).toBe(true);
      });
    });

    it('returns false when user has none of the permissions', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify(['roles.read']));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(
          result.current.hasAnyPermission(['users.read', 'users.delete'])
        ).toBe(false);
      });
    });
  });

  describe('hasAllPermissions', () => {
    it('returns true when user has all of the permissions', async () => {
      localStorage.setItem(
        'auth_permissions',
        JSON.stringify(['users.read', 'users.delete', 'users.create'])
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(
          result.current.hasAllPermissions(['users.read', 'users.delete'])
        ).toBe(true);
      });
    });

    it('returns false when user lacks some permissions', async () => {
      localStorage.setItem('auth_permissions', JSON.stringify(['users.read']));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(
          result.current.hasAllPermissions(['users.read', 'users.delete'])
        ).toBe(false);
      });
    });
  });
});
