/**
 * ResponsiveNavigation Component
 * STORY-017B: Component Responsiveness
 *
 * A responsive navigation that displays as a sidebar on desktop
 * and as a hamburger menu on mobile devices.
 *
 * @example
 * ```tsx
 * <ResponsiveNavigation
 *   logo={<Logo />}
 *   items={[
 *     { label: 'Dashboard', href: '/dashboard', icon: <DashboardIcon /> },
 *     { label: 'Users', href: '/users', icon: <UsersIcon /> },
 *   ]}
 * />
 * ```
 */

import React, { useState, useCallback } from 'react';
import { useResponsive } from '../../hooks';
import { ResponsiveSidebar } from './ResponsiveSidebar';

/**
 * Navigation item definition
 */
export interface NavItem {
  /** Display label */
  label: string;
  /** Navigation URL */
  href: string;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Whether item is active */
  isActive?: boolean;
  /** Optional badge content */
  badge?: string | number;
  /** Sub-items for dropdown */
  items?: NavItem[];
  /** Whether item is disabled */
  disabled?: boolean;
}

/**
 * Props for ResponsiveNavigation component
 */
export interface ResponsiveNavigationProps {
  /** Logo or brand element */
  logo?: React.ReactNode;
  /** Navigation items */
  items: NavItem[];
  /** Optional footer content */
  footer?: React.ReactNode;
  /** Callback when navigation item is clicked */
  onItemClick?: (item: NavItem) => void;
  /** Currently active path */
  activePath?: string;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for E2E testing */
  'data-testid'?: string;
  /** Main content to render alongside navigation */
  children?: React.ReactNode;
}

/**
 * HamburgerButton Component
 *
 * Touch-friendly hamburger menu button (44x44px minimum)
 */
const HamburgerButton: React.FC<{
  isOpen: boolean;
  onClick: () => void;
  'data-testid'?: string;
}> = ({ isOpen, onClick, 'data-testid': testId }) => (
  <button
    type="button"
    className="
      min-w-[44px] min-h-[44px]
      flex items-center justify-center
      text-neutral-600 hover:text-neutral-900
      hover:bg-neutral-100
      focus:outline-none focus:ring-2 focus:ring-primary-500
      rounded-md
      transition-colors
    "
    onClick={onClick}
    aria-label={isOpen ? 'Close menu' : 'Open menu'}
    aria-expanded={isOpen}
    data-testid={testId}
  >
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {isOpen ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      ) : (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6h16M4 12h16M4 18h16"
        />
      )}
    </svg>
  </button>
);

/**
 * NavItemComponent
 *
 * Individual navigation item with touch-friendly sizing
 */
const NavItemComponent: React.FC<{
  item: NavItem;
  isActive: boolean;
  onClick?: (item: NavItem) => void;
  'data-testid'?: string;
}> = ({ item, isActive, onClick, 'data-testid': testId }) => {
  const handleClick = (e: React.MouseEvent) => {
    if (item.disabled) {
      e.preventDefault();
      return;
    }
    if (onClick) {
      onClick(item);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (item.disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (onClick) {
        onClick(item);
      }
    }
  };

  return (
    <a
      href={item.href}
      className={`
        flex items-center
        min-h-[44px]
        px-3 py-2
        rounded-md
        text-sm font-medium
        transition-colors
        ${
          isActive
            ? 'bg-primary-50 text-primary-700'
            : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
        }
        ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-current={isActive ? 'page' : undefined}
      aria-disabled={item.disabled}
      tabIndex={item.disabled ? -1 : 0}
      data-testid={testId}
    >
      {item.icon && (
        <span className="flex-shrink-0 w-5 h-5 mr-3" aria-hidden="true">
          {item.icon}
        </span>
      )}
      <span className="flex-1">{item.label}</span>
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
    </a>
  );
};

/**
 * ResponsiveNavigation Component
 *
 * Desktop: Fixed sidebar navigation
 * Mobile: Hamburger menu with overlay sidebar
 */
export const ResponsiveNavigation: React.FC<ResponsiveNavigationProps> = ({
  logo,
  items,
  footer,
  onItemClick,
  activePath,
  className = '',
  'data-testid': testId = 'responsive-navigation',
  children,
}) => {
  const { isMobile } = useResponsive();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleOpenSidebar = useCallback(() => {
    setIsSidebarOpen(true);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const handleItemClick = useCallback(
    (item: NavItem) => {
      if (onItemClick) {
        onItemClick(item);
      }
      // Close sidebar on mobile when item is clicked
      if (isMobile) {
        setIsSidebarOpen(false);
      }
    },
    [onItemClick, isMobile]
  );

  // Determine if item is active
  const isItemActive = (item: NavItem): boolean => {
    if (item.isActive !== undefined) {
      return item.isActive;
    }
    if (activePath) {
      return item.href === activePath;
    }
    return false;
  };

  // Navigation content
  const navigationContent = (
    <nav aria-label="Main navigation">
      <ul className="space-y-1" role="list">
        {items.map((item, index) => (
          <li key={item.href || index}>
            <NavItemComponent
              item={item}
              isActive={isItemActive(item)}
              onClick={handleItemClick}
              data-testid={`${testId}-item-${index}`}
            />
          </li>
        ))}
      </ul>
    </nav>
  );

  // Mobile: Header bar with hamburger + overlay sidebar
  if (isMobile) {
    return (
      <div className={className} data-testid={testId} data-variant="mobile">
        {/* Mobile header bar */}
        <header
          className="
            fixed top-0 left-0 right-0
            h-14
            bg-white
            border-b border-neutral-200
            z-[var(--z-sticky)]
            flex items-center justify-between
            px-4
          "
          data-testid={`${testId}-header`}
        >
          <HamburgerButton
            isOpen={isSidebarOpen}
            onClick={handleToggleSidebar}
            data-testid={`${testId}-hamburger`}
          />
          {logo && (
            <div className="flex-1 flex justify-center" data-testid={`${testId}-logo`}>
              {logo}
            </div>
          )}
          {/* Spacer to balance the hamburger button */}
          <div className="min-w-[44px]" />
        </header>

        {/* Mobile sidebar overlay */}
        <ResponsiveSidebar
          isOpen={isSidebarOpen}
          onClose={handleCloseSidebar}
          header={logo}
          footer={footer}
          data-testid={`${testId}-sidebar`}
        >
          {navigationContent}
        </ResponsiveSidebar>

        {/* Main content area with top padding for header */}
        {children && (
          <main className="pt-14" data-testid={`${testId}-main`}>
            {children}
          </main>
        )}
      </div>
    );
  }

  // Desktop: Fixed sidebar layout
  return (
    <div
      className={`flex min-h-screen ${className}`}
      data-testid={testId}
      data-variant="desktop"
    >
      {/* Desktop sidebar */}
      <ResponsiveSidebar
        header={logo}
        footer={footer}
        data-testid={`${testId}-sidebar`}
      >
        {navigationContent}
      </ResponsiveSidebar>

      {/* Main content area */}
      {children && (
        <main
          className="flex-1 overflow-y-auto"
          data-testid={`${testId}-main`}
        >
          {children}
        </main>
      )}
    </div>
  );
};

export default ResponsiveNavigation;
