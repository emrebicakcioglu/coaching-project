/**
 * UserProfile Component Tests
 * STORY-016A: Context Menu Core Navigation
 *
 * Unit tests for UserProfile sidebar footer component.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserProfile } from './UserProfile';
import { AuthContext, AuthContextState, User } from '../../contexts';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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
  permissions: [],
  role: null,
  hasPermission: () => true,
  hasAnyPermission: () => true,
  hasAllPermissions: () => true,
  login: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
  refreshUser: vi.fn(),
  ...overrides,
});

/**
 * Wrapper component for tests
 */
const TestWrapper: React.FC<{
  children: React.ReactNode;
  authContext?: AuthContextState;
}> = ({ children, authContext }) => {
  const context = authContext || createMockAuthContext();
  return (
    <MemoryRouter>
      <AuthContext.Provider value={context}>{children}</AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('UserProfile', () => {
  const defaultUser: User = {
    id: 1,
    email: 'john@example.com',
    name: 'John Doe',
    status: 'active',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Expanded Mode (Default)', () => {
    it('renders user name', () => {
      render(
        <TestWrapper>
          <UserProfile user={defaultUser} data-testid="user-profile" />
        </TestWrapper>
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('renders user email', () => {
      render(
        <TestWrapper>
          <UserProfile user={defaultUser} data-testid="user-profile" />
        </TestWrapper>
      );

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('renders user avatar with initials', () => {
      render(
        <TestWrapper>
          <UserProfile user={defaultUser} data-testid="user-profile" />
        </TestWrapper>
      );

      // Avatar should show initials "JD" for "John Doe"
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('renders logout button', () => {
      render(
        <TestWrapper>
          <UserProfile user={defaultUser} data-testid="user-profile" />
        </TestWrapper>
      );

      const logoutButton = screen.getByTestId('user-profile-logout');
      expect(logoutButton).toBeInTheDocument();
      expect(logoutButton).toHaveAttribute('aria-label', 'Logout');
    });

    it('renders with correct test ID', () => {
      render(
        <TestWrapper>
          <UserProfile user={defaultUser} data-testid="user-profile" />
        </TestWrapper>
      );

      expect(screen.getByTestId('user-profile')).toBeInTheDocument();
    });

    it('renders name and email test IDs', () => {
      render(
        <TestWrapper>
          <UserProfile user={defaultUser} data-testid="user-profile" />
        </TestWrapper>
      );

      expect(screen.getByTestId('user-profile-name')).toBeInTheDocument();
      expect(screen.getByTestId('user-profile-email')).toBeInTheDocument();
    });
  });

  describe('Collapsed Mode', () => {
    it('does not render user name when collapsed', () => {
      render(
        <TestWrapper>
          <UserProfile
            user={defaultUser}
            isCollapsed={true}
            data-testid="user-profile"
          />
        </TestWrapper>
      );

      // Name should not be visible in collapsed mode
      expect(screen.queryByTestId('user-profile-name')).not.toBeInTheDocument();
    });

    it('does not render user email when collapsed', () => {
      render(
        <TestWrapper>
          <UserProfile
            user={defaultUser}
            isCollapsed={true}
            data-testid="user-profile"
          />
        </TestWrapper>
      );

      expect(screen.queryByTestId('user-profile-email')).not.toBeInTheDocument();
    });

    it('still shows avatar when collapsed', () => {
      render(
        <TestWrapper>
          <UserProfile
            user={defaultUser}
            isCollapsed={true}
            data-testid="user-profile"
          />
        </TestWrapper>
      );

      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('still shows logout button when collapsed', () => {
      render(
        <TestWrapper>
          <UserProfile
            user={defaultUser}
            isCollapsed={true}
            data-testid="user-profile"
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('user-profile-logout')).toBeInTheDocument();
    });

    it('has data-collapsed attribute when collapsed', () => {
      render(
        <TestWrapper>
          <UserProfile
            user={defaultUser}
            isCollapsed={true}
            data-testid="user-profile"
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('user-profile')).toHaveAttribute(
        'data-collapsed',
        'true'
      );
    });

    it('avatar has title tooltip when collapsed', () => {
      render(
        <TestWrapper>
          <UserProfile
            user={defaultUser}
            isCollapsed={true}
            data-testid="user-profile"
          />
        </TestWrapper>
      );

      const avatar = screen.getByText('JD').closest('div');
      expect(avatar).toHaveAttribute('title', 'John Doe');
    });
  });

  describe('User Initials Generation', () => {
    it('generates initials from two-word name', () => {
      render(
        <TestWrapper>
          <UserProfile user={defaultUser} data-testid="user-profile" />
        </TestWrapper>
      );

      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('generates initials from single-word name', () => {
      const singleNameUser = { ...defaultUser, name: 'John' };
      render(
        <TestWrapper>
          <UserProfile user={singleNameUser} data-testid="user-profile" />
        </TestWrapper>
      );

      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('generates initials from three-word name (first two only)', () => {
      const threeNameUser = { ...defaultUser, name: 'John Michael Doe' };
      render(
        <TestWrapper>
          <UserProfile user={threeNameUser} data-testid="user-profile" />
        </TestWrapper>
      );

      expect(screen.getByText('JM')).toBeInTheDocument();
    });

    it('handles lowercase names', () => {
      const lowerCaseUser = { ...defaultUser, name: 'john doe' };
      render(
        <TestWrapper>
          <UserProfile user={lowerCaseUser} data-testid="user-profile" />
        </TestWrapper>
      );

      expect(screen.getByText('JD')).toBeInTheDocument();
    });
  });

  describe('Null User Handling', () => {
    it('shows Guest when user is null', () => {
      render(
        <TestWrapper>
          <UserProfile user={null} data-testid="user-profile" />
        </TestWrapper>
      );

      expect(screen.getByText('Guest')).toBeInTheDocument();
    });

    it('shows user icon instead of initials when user is null', () => {
      render(
        <TestWrapper>
          <UserProfile user={null} data-testid="user-profile" />
        </TestWrapper>
      );

      // Should render SVG icon instead of initials
      const profile = screen.getByTestId('user-profile');
      const svg = profile.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('shows empty email when user is null', () => {
      render(
        <TestWrapper>
          <UserProfile user={null} data-testid="user-profile" />
        </TestWrapper>
      );

      const email = screen.getByTestId('user-profile-email');
      expect(email.textContent).toBe('');
    });
  });

  describe('Logout Functionality', () => {
    it('calls logout when logout button is clicked', async () => {
      const mockLogout = vi.fn().mockResolvedValue(undefined);
      const authContext = createMockAuthContext({ logout: mockLogout });

      render(
        <TestWrapper authContext={authContext}>
          <UserProfile user={defaultUser} data-testid="user-profile" />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId('user-profile-logout'));

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalledTimes(1);
      });
    });

    it('navigates to login page after logout', async () => {
      const mockLogout = vi.fn().mockResolvedValue(undefined);
      const authContext = createMockAuthContext({ logout: mockLogout });

      render(
        <TestWrapper authContext={authContext}>
          <UserProfile user={defaultUser} data-testid="user-profile" />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId('user-profile-logout'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });

    it('navigates to login even if logout fails', async () => {
      const mockLogout = vi.fn().mockRejectedValue(new Error('Logout failed'));
      const authContext = createMockAuthContext({ logout: mockLogout });

      // Spy on console.error to suppress error output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <TestWrapper authContext={authContext}>
          <UserProfile user={defaultUser} data-testid="user-profile" />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId('user-profile-logout'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('logout button has aria-label', () => {
      render(
        <TestWrapper>
          <UserProfile user={defaultUser} data-testid="user-profile" />
        </TestWrapper>
      );

      expect(screen.getByTestId('user-profile-logout')).toHaveAttribute(
        'aria-label',
        'Logout'
      );
    });

    it('logout button has title for tooltip', () => {
      render(
        <TestWrapper>
          <UserProfile user={defaultUser} data-testid="user-profile" />
        </TestWrapper>
      );

      expect(screen.getByTestId('user-profile-logout')).toHaveAttribute(
        'title',
        'Logout'
      );
    });

    it('avatar is hidden from screen readers in expanded mode', () => {
      render(
        <TestWrapper>
          <UserProfile user={defaultUser} data-testid="user-profile" />
        </TestWrapper>
      );

      const avatar = screen.getByText('JD').closest('div');
      expect(avatar).toHaveAttribute('aria-hidden', 'true');
    });

    it('avatar has aria-label in collapsed mode', () => {
      render(
        <TestWrapper>
          <UserProfile
            user={defaultUser}
            isCollapsed={true}
            data-testid="user-profile"
          />
        </TestWrapper>
      );

      const avatar = screen.getByText('JD').closest('div');
      expect(avatar).toHaveAttribute('aria-label', 'John Doe');
    });

    it('logout button has minimum touch target size', () => {
      render(
        <TestWrapper>
          <UserProfile user={defaultUser} data-testid="user-profile" />
        </TestWrapper>
      );

      const logoutButton = screen.getByTestId('user-profile-logout');
      expect(logoutButton.className).toContain('min-w-[44px]');
      expect(logoutButton.className).toContain('min-h-[44px]');
    });

    it('logout button has focus styles', () => {
      render(
        <TestWrapper>
          <UserProfile user={defaultUser} data-testid="user-profile" />
        </TestWrapper>
      );

      const logoutButton = screen.getByTestId('user-profile-logout');
      expect(logoutButton.className).toContain('focus:outline-none');
      expect(logoutButton.className).toContain('focus:ring-2');
    });
  });

  describe('Styling', () => {
    it('truncates long names', () => {
      render(
        <TestWrapper>
          <UserProfile user={defaultUser} data-testid="user-profile" />
        </TestWrapper>
      );

      const name = screen.getByTestId('user-profile-name');
      expect(name.className).toContain('truncate');
    });

    it('truncates long emails', () => {
      render(
        <TestWrapper>
          <UserProfile user={defaultUser} data-testid="user-profile" />
        </TestWrapper>
      );

      const email = screen.getByTestId('user-profile-email');
      expect(email.className).toContain('truncate');
    });
  });
});
