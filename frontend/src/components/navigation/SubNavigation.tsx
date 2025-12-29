/**
 * SubNavigation Component
 * STORY-016A: Context Menu Core Navigation
 *
 * Nested navigation items for expandable menu items.
 * Displays indented child items with active state support.
 *
 * @example
 * ```tsx
 * <SubNavigation
 *   items={[
 *     { id: 'users-list', label: 'All Users', path: '/users' },
 *     { id: 'users-create', label: 'Create User', path: '/users/new' }
 *   ]}
 *   activePath="/users"
 *   onItemClick={(item) => navigate(item.path)}
 * />
 * ```
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationItem } from '../../config/navigation';
import { Icon } from '../icons';

/**
 * SubNavigation props
 */
export interface SubNavigationProps {
  /** Child navigation items */
  items: NavigationItem[];
  /** Currently active path */
  activePath: string;
  /** Click handler for child items */
  onItemClick: (item: NavigationItem) => void;
  /** Parent item ID for generating unique test IDs */
  parentId: string;
  /** Test ID for E2E testing */
  'data-testid'?: string;
}

/**
 * SubNavigation Component
 *
 * Renders nested navigation items with proper indentation
 * and ARIA attributes for accessibility.
 */
export const SubNavigation: React.FC<SubNavigationProps> = ({
  items,
  activePath,
  onItemClick,
  parentId,
  'data-testid': testId,
}) => {
  const { t } = useTranslation('navigation');

  return (
    <ul
      className="mt-1 ml-4 pl-4 border-l border-neutral-200 space-y-1"
      role="menu"
      aria-label={`${parentId} submenu`}
      data-testid={testId}
    >
      {items.map((item) => {
        const isActive = item.path === activePath;
        const label = t(item.labelKey);

        const handleClick = (e: React.MouseEvent) => {
          e.preventDefault();
          if (!item.disabled) {
            onItemClick(item);
          }
        };

        const handleKeyDown = (e: React.KeyboardEvent) => {
          if (item.disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onItemClick(item);
          }
        };

        return (
          <li key={item.id} role="none">
            <a
              href={item.path || '#'}
              className={`
                flex items-center
                min-h-[40px]
                px-3 py-2
                rounded-md
                text-sm
                transition-colors duration-150
                ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background-surface)]'
                }
                ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              onClick={handleClick}
              onKeyDown={handleKeyDown}
              role="menuitem"
              aria-current={isActive ? 'page' : undefined}
              aria-disabled={item.disabled}
              tabIndex={item.disabled ? -1 : 0}
              data-testid={`${testId}-${item.id}`}
            >
              {/* Icon (if available) */}
              {item.icon && (
                <span
                  className={`
                    flex-shrink-0 w-4 h-4 mr-2
                    ${isActive ? 'text-primary-600' : 'text-[var(--color-text-tertiary)]'}
                  `}
                  aria-hidden="true"
                >
                  <Icon name={item.icon} className="w-4 h-4" />
                </span>
              )}

              {/* Label */}
              <span className="flex-1 truncate">{label}</span>

              {/* Badge */}
              {item.badge !== undefined && (
                <span
                  className="
                    ml-2
                    px-1.5 py-0.5
                    text-xs font-medium
                    bg-primary-100 text-primary-700
                    rounded-full
                  "
                  aria-label={`${item.badge} notifications`}
                >
                  {item.badge}
                </span>
              )}
            </a>
          </li>
        );
      })}
    </ul>
  );
};

export default SubNavigation;
