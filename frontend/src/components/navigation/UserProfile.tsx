/**
 * UserProfile Component
 * STORY-016A: Context Menu Core Navigation
 *
 * User profile section in sidebar footer with avatar,
 * name, and logout option.
 *
 * @example
 * ```tsx
 * <UserProfile
 *   user={{ id: 1, name: 'John Doe', email: 'john@example.com' }}
 *   isCollapsed={false}
 * />
 * ```
 */

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, useAuth } from '../../contexts';
import { LogoutIcon, UserIcon } from '../icons';
import { logger } from '../../services/loggerService';

/**
 * UserProfile props
 */
export interface UserProfileProps {
  /** User data */
  user: User | null;
  /** Whether sidebar is collapsed */
  isCollapsed?: boolean;
  /** Test ID for E2E testing */
  'data-testid'?: string;
}

/**
 * UserProfile Component
 *
 * Displays user avatar, name, email, and logout button.
 * Adapts to collapsed sidebar mode.
 */
export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  isCollapsed = false,
  'data-testid': testId = 'user-profile',
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      logger.error('Logout failed', error);
      // Still navigate to login on error
      navigate('/login');
    }
  }, [logout, navigate]);

  // Get user initials for avatar
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Collapsed mode: Show only avatar with tooltip
  if (isCollapsed) {
    return (
      <div
        className="flex flex-col items-center space-y-2"
        data-testid={testId}
        data-collapsed="true"
      >
        {/* Avatar */}
        <div
          className="
            w-10 h-10
            rounded-full
            bg-primary-100
            flex items-center justify-center
            text-primary-700 font-medium text-sm
          "
          title={user?.name || 'User'}
          aria-label={user?.name || 'User profile'}
        >
          {user?.name ? (
            getInitials(user.name)
          ) : (
            <UserIcon className="w-5 h-5" />
          )}
        </div>

        {/* Logout button */}
        <button
          type="button"
          className="
            min-w-[44px] min-h-[44px]
            flex items-center justify-center
            text-[var(--color-text-tertiary)] hover:text-error
            hover:bg-[var(--color-background-surface)]
            focus:outline-none focus:ring-2 focus:ring-primary-500
            rounded-md
            transition-colors
          "
          onClick={handleLogout}
          title="Logout"
          aria-label="Logout"
          data-testid={`${testId}-logout`}
        >
          <LogoutIcon className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // Expanded mode: Show full profile
  return (
    <div className="flex items-center space-x-3" data-testid={testId}>
      {/* Avatar */}
      <div
        className="
          flex-shrink-0
          w-10 h-10
          rounded-full
          bg-primary-100
          flex items-center justify-center
          text-primary-700 font-medium text-sm
        "
        aria-hidden="true"
      >
        {user?.name ? (
          getInitials(user.name)
        ) : (
          <UserIcon className="w-5 h-5" />
        )}
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium text-[var(--color-text-primary)] truncate"
          data-testid={`${testId}-name`}
        >
          {user?.name || 'Guest'}
        </p>
        <p
          className="text-xs text-[var(--color-text-tertiary)] truncate"
          data-testid={`${testId}-email`}
        >
          {user?.email || ''}
        </p>
      </div>

      {/* Logout button */}
      <button
        type="button"
        className="
          flex-shrink-0
          min-w-[44px] min-h-[44px]
          flex items-center justify-center
          text-[var(--color-text-tertiary)] hover:text-error
          hover:bg-[var(--color-background-surface)]
          focus:outline-none focus:ring-2 focus:ring-primary-500
          rounded-md
          transition-colors
        "
        onClick={handleLogout}
        title="Logout"
        aria-label="Logout"
        data-testid={`${testId}-logout`}
      >
        <LogoutIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default UserProfile;
