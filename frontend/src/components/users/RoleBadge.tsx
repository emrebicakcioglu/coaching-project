/**
 * Role Badge Component
 * STORY-007B: User Role Assignment
 *
 * Displays a role as a styled badge.
 * Different colors for different role types (admin, user, etc.)
 */

import React from 'react';
import './RoleBadge.css';

export interface RoleBadgeProps {
  /** Role name to display */
  name: string;
  /** Optional additional CSS class */
  className?: string;
  /** Whether to show a smaller version */
  small?: boolean;
  /** Optional click handler for removable badges */
  onRemove?: () => void;
}

/**
 * Get badge variant based on role name
 */
const getRoleVariant = (roleName: string): string => {
  const name = roleName.toLowerCase();

  if (name === 'admin' || name === 'administrator') {
    return 'admin';
  }
  if (name === 'moderator' || name === 'mod') {
    return 'moderator';
  }
  if (name === 'editor') {
    return 'editor';
  }
  if (name === 'viewer' || name === 'guest') {
    return 'viewer';
  }
  return 'default';
};

/**
 * RoleBadge Component
 *
 * Displays a role name as a colored badge.
 * Supports removable badges with an X button.
 */
export const RoleBadge: React.FC<RoleBadgeProps> = ({
  name,
  className = '',
  small = false,
  onRemove,
}) => {
  const variant = getRoleVariant(name);
  const classes = [
    'role-badge',
    `role-badge--${variant}`,
    small ? 'role-badge--small' : '',
    onRemove ? 'role-badge--removable' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} title={name}>
      <span className="role-badge__text">{name}</span>
      {onRemove && (
        <button
          type="button"
          className="role-badge__remove"
          onClick={onRemove}
          aria-label={`Remove ${name} role`}
          title={`Remove ${name} role`}
        >
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </span>
  );
};

export default RoleBadge;
