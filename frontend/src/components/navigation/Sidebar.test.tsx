/**
 * Sidebar Component Tests
 * STORY-016A: Context Menu Core Navigation
 *
 * Unit tests for Sidebar navigation component.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Sidebar } from './Sidebar';
import { AuthContext, AuthContextState } from '../../contexts';

// Mock useResponsive hook
vi.mock('../../hooks', () => ({
  useResponsive: vi.fn(() => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    width: 1200,
    height: 800,
    breakpoint: 'lg',
    isBreakpoint: () => true,
    isBelowBreakpoint: () => false,
  })),
}));

// Import the mock to configure it in tests
import { useResponsive } from '../../hooks';

/**
 * Helper to create mock auth context
 */
const createMockAuthContext = (
  overrides: Partial<AuthContextState> = {}
): AuthContextState => ({
  user: {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    status: 'active',
  },
  isAuthenticated: true,
  isLoading: false,
  permissions: [
    'dashboard.read',
    'users.read',
    'users.create',
    'roles.read',
    'settings.read',
  ],
  role: null,
  hasPermission: (permission: string) => {
    const perms = overrides.permissions || [
      'dashboard.read',
      'users.read',
      'users.create',
      'roles.read',
      'settings.read',
    ];
    return permission === null || perms.includes(permission);
  },
  hasAnyPermission: (permissions: string[]) =>
    permissions.some((p) => p === null || overrides.permissions?.includes(p)),
  hasAllPermissions: (permissions: string[]) =>
    permissions.every((p) => p === null || overrides.permissions?.includes(p)),
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
  ...overrides,
});

/**
 * Wrapper component for tests
 */
const TestWrapper: React.FC<{
  children: React.ReactNode;
  authContext?: AuthContextState;
  initialRoute?: string;
}> = ({ children, authContext, initialRoute = '/dashboard' }) => {
  const context = authContext || createMockAuthContext();
  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthContext.Provider value={context}>{children}</AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('Sidebar', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    // Default to desktop mode
    vi.mocked(useResponsive).mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      width: 1200,
      height: 800,
      breakpoint: 'lg',
      isBreakpoint: () => true,
      isBelowBreakpoint: () => false,
    });
  });

  describe('Desktop Mode', () => {
    it('renders sidebar with navigation items', () => {
      render(
        <TestWrapper>
          <Sidebar data-testid="sidebar" />
        </TestWrapper>
      );

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar')).toHaveAttribute(
        'data-variant',
        'desktop'
      );
    });

    it('displays company logo', () => {
      render(
        <TestWrapper>
          <Sidebar companyName="Test Company" data-testid="sidebar" />
        </TestWrapper>
      );

      expect(screen.getByTestId('sidebar-logo')).toBeInTheDocument();
      expect(screen.getByText('Test Company')).toBeInTheDocument();
    });

    it('shows user profile in footer', () => {
      render(
        <TestWrapper>
          <Sidebar data-testid="sidebar" />
        </TestWrapper>
      );

      expect(screen.getByTestId('sidebar-user-profile')).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('renders collapse toggle button', () => {
      const onToggle = vi.fn();
      render(
        <TestWrapper>
          <Sidebar
            isCollapsed={false}
            onToggleCollapse={onToggle}
            data-testid="sidebar"
          />
        </TestWrapper>
      );

      const toggleButton = screen.getByTestId('sidebar-toggle');
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('aria-label', 'Collapse sidebar');

      fireEvent.click(toggleButton);
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('shows collapsed state correctly', () => {
      render(
        <TestWrapper>
          <Sidebar isCollapsed={true} data-testid="sidebar" />
        </TestWrapper>
      );

      expect(screen.getByTestId('sidebar')).toHaveAttribute(
        'data-collapsed',
        'true'
      );
    });

    it('highlights active navigation item', () => {
      render(
        <TestWrapper initialRoute="/dashboard">
          <Sidebar data-testid="sidebar" />
        </TestWrapper>
      );

      const dashboardNav = screen.getByTestId('sidebar-nav-dashboard');
      expect(dashboardNav).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Permission Filtering', () => {
    it('shows items user has permission for', () => {
      const authContext = createMockAuthContext({
        permissions: ['dashboard.read', 'users.read'],
        hasPermission: (p) =>
          p === null || ['dashboard.read', 'users.read'].includes(p),
      });

      render(
        <TestWrapper authContext={authContext}>
          <Sidebar data-testid="sidebar" />
        </TestWrapper>
      );

      expect(screen.getByTestId('sidebar-nav-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-nav-users')).toBeInTheDocument();
    });

    it('hides items user does not have permission for', () => {
      const authContext = createMockAuthContext({
        permissions: ['dashboard.read'],
        hasPermission: (p) => p === null || p === 'dashboard.read',
      });

      render(
        <TestWrapper authContext={authContext}>
          <Sidebar data-testid="sidebar" />
        </TestWrapper>
      );

      expect(screen.getByTestId('sidebar-nav-dashboard')).toBeInTheDocument();
      expect(
        screen.queryByTestId('sidebar-nav-users')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('sidebar-nav-roles')
      ).not.toBeInTheDocument();
    });

    it('always shows public navigation items (null permission)', () => {
      const authContext = createMockAuthContext({
        permissions: [],
        hasPermission: (p) => p === null,
      });

      render(
        <TestWrapper authContext={authContext}>
          <Sidebar data-testid="sidebar" />
        </TestWrapper>
      );

      // Help has null permission, should always be visible
      expect(screen.getByTestId('sidebar-nav-help')).toBeInTheDocument();
    });
  });

  describe('Sub-Navigation', () => {
    it('expands parent when clicking item with children', async () => {
      render(
        <TestWrapper>
          <Sidebar data-testid="sidebar" />
        </TestWrapper>
      );

      const usersNav = screen.getByTestId('sidebar-nav-users');
      expect(usersNav).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(usersNav);

      await waitFor(() => {
        expect(usersNav).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('collapses parent when clicking expanded item', async () => {
      render(
        <TestWrapper>
          <Sidebar data-testid="sidebar" />
        </TestWrapper>
      );

      const usersNav = screen.getByTestId('sidebar-nav-users');

      // Expand
      fireEvent.click(usersNav);
      await waitFor(() => {
        expect(usersNav).toHaveAttribute('aria-expanded', 'true');
      });

      // Collapse
      fireEvent.click(usersNav);
      await waitFor(() => {
        expect(usersNav).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('shows sub-navigation items when expanded', async () => {
      render(
        <TestWrapper>
          <Sidebar data-testid="sidebar" />
        </TestWrapper>
      );

      // Expand users submenu
      fireEvent.click(screen.getByTestId('sidebar-nav-users'));

      await waitFor(() => {
        expect(
          screen.getByTestId('sidebar-subnav-users')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Mode', () => {
    beforeEach(() => {
      vi.mocked(useResponsive).mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        width: 375,
        height: 667,
        breakpoint: 'xs',
        isBreakpoint: () => false,
        isBelowBreakpoint: () => true,
      });
    });

    it('renders mobile header with hamburger button', () => {
      render(
        <TestWrapper>
          <Sidebar data-testid="sidebar" />
        </TestWrapper>
      );

      expect(screen.getByTestId('sidebar-header')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-hamburger')).toBeInTheDocument();
    });

    it('hamburger button has correct aria attributes when closed', () => {
      render(
        <TestWrapper>
          <Sidebar data-testid="sidebar" />
        </TestWrapper>
      );

      const hamburger = screen.getByTestId('sidebar-hamburger');
      expect(hamburger).toHaveAttribute('aria-expanded', 'false');
      expect(hamburger).toHaveAttribute('aria-label', 'Open menu');
    });

    it('opens sidebar when hamburger is clicked', async () => {
      render(
        <TestWrapper>
          <Sidebar data-testid="sidebar" />
        </TestWrapper>
      );

      const hamburger = screen.getByTestId('sidebar-hamburger');
      fireEvent.click(hamburger);

      await waitFor(() => {
        expect(hamburger).toHaveAttribute('aria-expanded', 'true');
        expect(hamburger).toHaveAttribute('aria-label', 'Close menu');
      });
    });

    it('shows backdrop when sidebar is open', async () => {
      render(
        <TestWrapper>
          <Sidebar data-testid="sidebar" />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId('sidebar-hamburger'));

      await waitFor(() => {
        expect(screen.getByTestId('sidebar-backdrop')).toBeInTheDocument();
      });
    });

    it('closes sidebar when backdrop is clicked', async () => {
      render(
        <TestWrapper>
          <Sidebar data-testid="sidebar" />
        </TestWrapper>
      );

      const hamburger = screen.getByTestId('sidebar-hamburger');
      fireEvent.click(hamburger);

      await waitFor(() => {
        expect(screen.getByTestId('sidebar-backdrop')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('sidebar-backdrop'));

      await waitFor(() => {
        expect(
          screen.queryByTestId('sidebar-backdrop')
        ).not.toBeInTheDocument();
      });
    });

    it('closes sidebar when close button is clicked', async () => {
      render(
        <TestWrapper>
          <Sidebar data-testid="sidebar" />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId('sidebar-hamburger'));

      await waitFor(() => {
        expect(screen.getByTestId('sidebar-close')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('sidebar-close'));

      // Verify sidebar is closed by checking backdrop is gone
      await waitFor(() => {
        expect(screen.queryByTestId('sidebar-backdrop')).not.toBeInTheDocument();
      });
    });

    it('closes sidebar when Escape key is pressed', async () => {
      render(
        <TestWrapper>
          <Sidebar data-testid="sidebar" />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId('sidebar-hamburger'));

      await waitFor(() => {
        expect(screen.getByTestId('sidebar-backdrop')).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(
          screen.queryByTestId('sidebar-backdrop')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <TestWrapper>
          <Sidebar data-testid="sidebar" />
        </TestWrapper>
      );

      expect(screen.getByTestId('sidebar')).toHaveAttribute(
        'aria-label',
        'Sidebar'
      );
    });

    it('navigation items are keyboard accessible', () => {
      render(
        <TestWrapper>
          <Sidebar data-testid="sidebar" />
        </TestWrapper>
      );

      const dashboardNav = screen.getByTestId('sidebar-nav-dashboard');
      expect(dashboardNav).toHaveAttribute('tabIndex', '0');
    });

    it('toggle button has descriptive label', () => {
      render(
        <TestWrapper>
          <Sidebar
            isCollapsed={false}
            onToggleCollapse={vi.fn()}
            data-testid="sidebar"
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('sidebar-toggle')).toHaveAttribute(
        'aria-label',
        'Collapse sidebar'
      );
    });
  });
});
