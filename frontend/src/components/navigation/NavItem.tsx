/**
 * NavItem Component
 * STORY-016A: Context Menu Core Navigation
 *
 * Individual navigation item with icon, label, and active state.
 * Supports expandable items with children.
 *
 * @example
 * ```tsx
 * <NavItem
 *   item={{ id: 'dashboard', label: 'Dashboard', icon: 'home', path: '/dashboard' }}
 *   isActive={true}
 *   onClick={() => navigate('/dashboard')}
 * />
 * ```
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationItem } from '../../config/navigation';
import { Icon, ChevronDownIcon, ChevronRightIcon } from '../icons';

/**
 * NavItem props
 */
export interface NavItemProps {
  /** Navigation item data */
  item: NavigationItem;
  /** Whether item is currently active */
  isActive?: boolean;
  /** Whether item is expanded (for items with children) */
  isExpanded?: boolean;
  /** Whether sidebar is collapsed (icon only mode) */
  isCollapsed?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Test ID for E2E testing */
  'data-testid'?: string;
}

/**
 * NavItem Component
 *
 * Touch-friendly navigation item (44px minimum height)
 * with icon, label, and optional expand indicator.
 */
export const NavItem: React.FC<NavItemProps> = ({
  item,
  isActive = false,
  isExpanded = false,
  isCollapsed = false,
  onClick,
  'data-testid': testId,
}) => {
  const { t } = useTranslation('navigation');
  const hasChildren = item.children && item.children.length > 0;
  const label = t(item.labelKey);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!item.disabled && onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (item.disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (onClick) {
        onClick();
      }
    }
  };

  // Base classes
  const baseClasses = `
    flex items-center
    min-h-[44px]
    px-3 py-2
    rounded-md
    text-sm font-medium
    transition-colors duration-150
    w-full
    group
  `;

  // State-based classes - using CSS variables for dark mode support
  const stateClasses = isActive
    ? 'bg-primary-50 text-primary-700'
    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background-surface)]';

  // Disabled classes
  const disabledClasses = item.disabled
    ? 'opacity-50 cursor-not-allowed'
    : 'cursor-pointer';

  // Collapsed mode: center icon
  const collapsedClasses = isCollapsed ? 'justify-center' : '';

  return (
    <a
      href={item.path || '#'}
      className={`${baseClasses} ${stateClasses} ${disabledClasses} ${collapsedClasses}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-current={isActive ? 'page' : undefined}
      aria-disabled={item.disabled}
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-haspopup={hasChildren ? 'menu' : undefined}
      tabIndex={item.disabled ? -1 : 0}
      title={isCollapsed ? label : undefined}
      data-testid={testId}
    >
      {/* Icon */}
      <span
        className={`
          flex-shrink-0 w-5 h-5
          ${isActive ? 'text-primary-600' : 'text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-secondary)]'}
          ${isCollapsed ? '' : 'mr-3'}
        `}
        aria-hidden="true"
      >
        <Icon name={item.icon} className="w-5 h-5" />
      </span>

      {/* Label (hidden when collapsed) */}
      {!isCollapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>

          {/* Badge */}
          {item.badge !== undefined && (
            <span
              className="
                ml-2
                px-2 py-0.5
                text-xs font-medium
                bg-primary-100 text-primary-700
                rounded-full
              "
              aria-label={`${item.badge} notifications`}
            >
              {item.badge}
            </span>
          )}

          {/* Expand/Collapse indicator for items with children */}
          {hasChildren && (
            <span
              className={`
                ml-auto
                text-[var(--color-text-tertiary)]
                transition-transform duration-200
                ${isExpanded ? 'rotate-180' : ''}
              `}
              aria-hidden="true"
            >
              <ChevronDownIcon className="w-4 h-4" />
            </span>
          )}
        </>
      )}
    </a>
  );
};

export default NavItem;
