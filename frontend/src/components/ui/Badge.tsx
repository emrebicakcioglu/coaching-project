/**
 * Badge Component
 * UI-AUDIT: Standardized badge component with consistent color variants
 *
 * Provides consistent styling for status badges, role badges, and tags
 * throughout the application.
 *
 * @example
 * ```tsx
 * <Badge variant="success">Active</Badge>
 * <Badge variant="warning">Pending</Badge>
 * <Badge variant="error">Suspended</Badge>
 * <Badge variant="info">Admin</Badge>
 * <Badge variant="neutral" size="sm">Viewer</Badge>
 * ```
 */

import React from 'react';

/**
 * Badge variant types
 */
export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'primary'
  | 'admin'
  | 'moderator'
  | 'editor'
  | 'viewer';

/**
 * Badge size types
 */
export type BadgeSize = 'sm' | 'md' | 'lg';

/**
 * Badge props
 */
export interface BadgeProps {
  /** Badge content */
  children: React.ReactNode;
  /** Badge variant */
  variant?: BadgeVariant;
  /** Badge size */
  size?: BadgeSize;
  /** Whether badge is removable */
  onRemove?: () => void;
  /** Whether badge has a dot indicator */
  dot?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for E2E testing */
  'data-testid'?: string;
}

/**
 * Map badge variants to theme badge types
 */
const variantToThemeType: Record<BadgeVariant, string> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
  neutral: 'default',
  primary: 'primary',
  admin: 'error',
  moderator: 'secondary',
  editor: 'info',
  viewer: 'default',
};

/**
 * Get variant-specific inline styles using CSS variables
 */
const getVariantStyles = (variant: BadgeVariant): React.CSSProperties => {
  const themeType = variantToThemeType[variant];

  return {
    backgroundColor: `var(--color-badge-${themeType}-bg)`,
    color: `var(--color-badge-${themeType}-text)`,
    borderColor: `var(--color-badge-${themeType}-bg)`,
  };
};

/**
 * Get variant-specific CSS classes (kept for backwards compatibility)
 */
const getVariantClasses = (_variant: BadgeVariant): string => {
  // Color classes removed - now using CSS variables via inline styles
  return '';
};

/**
 * Get dot indicator color
 */
const getDotColor = (variant: BadgeVariant): string => {
  switch (variant) {
    case 'success':
      return 'bg-green-500';
    case 'warning':
      return 'bg-yellow-500';
    case 'error':
      return 'bg-red-500';
    case 'info':
      return 'bg-blue-500';
    case 'admin':
      return 'bg-red-500';
    case 'moderator':
      return 'bg-purple-500';
    case 'editor':
      return 'bg-blue-500';
    default:
      return 'bg-neutral-500';
  }
};

/**
 * Get size-specific CSS classes
 */
const getSizeClasses = (size: BadgeSize): string => {
  switch (size) {
    case 'sm':
      return 'px-2 py-0.5 text-xs';
    case 'md':
      return 'px-2.5 py-1 text-xs';
    case 'lg':
      return 'px-3 py-1.5 text-sm';
    default:
      return 'px-2.5 py-1 text-xs';
  }
};

/**
 * Badge Component
 *
 * A standardized badge component for displaying statuses, roles, and tags.
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  onRemove,
  dot = false,
  className = '',
  'data-testid': testId,
}) => {
  const variantClasses = getVariantClasses(variant);
  const variantStyles = getVariantStyles(variant);
  const sizeClasses = getSizeClasses(size);

  const badgeClasses = [
    'inline-flex items-center font-medium rounded-full border',
    variantClasses,
    sizeClasses,
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={badgeClasses} style={variantStyles} data-testid={testId}>
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${getDotColor(variant)}`}
          aria-hidden="true"
        />
      )}
      {children}
      {onRemove && (
        <button
          type="button"
          className="ml-1.5 -mr-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-1"
          onClick={onRemove}
          aria-label={`Remove ${children}`}
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  );
};

/**
 * Helper function to get badge variant from role name
 */
export const getRoleBadgeVariant = (roleName: string): BadgeVariant => {
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
  return 'primary';
};

/**
 * Helper function to get badge variant from status
 */
export const getStatusBadgeVariant = (status: string): BadgeVariant => {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === 'active' || normalizedStatus === 'enabled') {
    return 'success';
  }
  if (normalizedStatus === 'pending' || normalizedStatus === 'waiting') {
    return 'warning';
  }
  if (normalizedStatus === 'inactive' || normalizedStatus === 'disabled') {
    return 'neutral';
  }
  if (normalizedStatus === 'suspended' || normalizedStatus === 'blocked' || normalizedStatus === 'deleted') {
    return 'error';
  }
  return 'neutral';
};

export default Badge;
