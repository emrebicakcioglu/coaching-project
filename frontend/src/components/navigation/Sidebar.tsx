/**
 * Sidebar Component
 * STORY-016A: Context Menu Core Navigation
 * STORY-030: Application Versioning
 *
 * Main sidebar navigation component with collapsible state,
 * permission-based filtering, and responsive behavior.
 *
 * Features:
 * - Collapsible sidebar (280px -> 64px)
 * - Permission-based menu filtering
 * - Active route highlighting
 * - Sub-navigation support
 * - User profile footer
 * - Mobile hamburger menu
 * - Smooth transitions
 * - WCAG 2.1 Level AA accessibility
 * - Version display in footer (STORY-030)
 *
 * @example
 * ```tsx
 * <Sidebar
 *   isCollapsed={false}
 *   onToggleCollapse={() => {}}
 *   activePath="/dashboard"
 * />
 * ```
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useResponsive } from '../../hooks';
import { useAuth } from '../../contexts';
import {
  NavigationItem,
  getNavigationItems,
  filterNavigationByPermission,
  isNavigationItemActive,
} from '../../config/navigation';
import { Icon, ChevronLeftIcon, ChevronRightIcon, MenuIcon, CloseIcon } from '../icons';
import { NavItem } from './NavItem';
import { SubNavigation } from './SubNavigation';
import { UserProfile } from './UserProfile';
import { Logo } from './Logo';
import { DarkModeToggle } from './DarkModeToggle';
import { VersionFooter } from '../about';

/**
 * Sidebar width constants
 */
const SIDEBAR_WIDTH = {
  expanded: 280,
  collapsed: 64,
} as const;

/**
 * Sidebar props
 */
export interface SidebarProps {
  /** Whether sidebar is collapsed (desktop only) */
  isCollapsed?: boolean;
  /** Callback when collapse state changes */
  onToggleCollapse?: () => void;
  /** Currently active path (optional, defaults to current route) */
  activePath?: string;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for E2E testing */
  'data-testid'?: string;
  /** Company name to display */
  companyName?: string;
}

/**
 * Sidebar Component
 *
 * Desktop: Fixed sidebar that can be collapsed
 * Tablet (<1024px): Overlay menu
 * Mobile (<768px): Hamburger menu
 */
export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed = false,
  onToggleCollapse,
  activePath: activePathProp,
  className = '',
  'data-testid': testId = 'sidebar',
  companyName = 'Core App',
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation('navigation');
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const { hasPermission, user } = useAuth();

  // Mobile sidebar open state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Expanded sub-navigation items
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Use prop or current location for active path
  const activePath = activePathProp || location.pathname;

  // Filter navigation items based on permissions
  const filteredItems = useMemo(() => {
    const allItems = getNavigationItems();
    return filterNavigationByPermission(allItems, hasPermission);
  }, [hasPermission]);

  // Auto-expand parent of active child on mount
  useEffect(() => {
    filteredItems.forEach((item) => {
      if (item.children?.some((child) => child.path === activePath)) {
        setExpandedItems((prev) => new Set([...prev, item.id]));
      }
    });
  }, [activePath, filteredItems]);

  // Handle navigation item click
  const handleItemClick = useCallback(
    (item: NavigationItem) => {
      if (item.disabled) return;

      if (item.children && item.children.length > 0) {
        // Toggle expansion for items with children
        setExpandedItems((prev) => {
          const next = new Set(prev);
          if (next.has(item.id)) {
            next.delete(item.id);
          } else {
            next.add(item.id);
          }
          return next;
        });
      } else if (item.path) {
        // Navigate to path
        navigate(item.path);
        // Close mobile menu after navigation
        if (isMobile || isTablet) {
          setIsMobileOpen(false);
        }
      }
    },
    [navigate, isMobile, isTablet]
  );

  // Handle child item click
  const handleChildClick = useCallback(
    (item: NavigationItem) => {
      if (item.disabled || !item.path) return;
      navigate(item.path);
      // Close mobile menu after navigation
      if (isMobile || isTablet) {
        setIsMobileOpen(false);
      }
    },
    [navigate, isMobile, isTablet]
  );

  // Toggle mobile sidebar
  const handleToggleMobile = useCallback(() => {
    setIsMobileOpen((prev) => !prev);
  }, []);

  // Close mobile sidebar
  const handleCloseMobile = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  // Handle escape key to close mobile sidebar
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if ((isMobile || isTablet) && isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, isTablet, isMobileOpen]);

  // Navigation content (shared between desktop and mobile)
  const navigationContent = (
    <nav aria-label="Main navigation" className="flex-1 overflow-y-auto py-4">
      <ul className="space-y-1 px-3" role="list">
        {filteredItems.map((item) => {
          const isActive = isNavigationItemActive(item, activePath);
          const isExpanded = expandedItems.has(item.id);
          const hasChildren = item.children && item.children.length > 0;

          return (
            <li key={item.id}>
              <NavItem
                item={item}
                isActive={isActive && !hasChildren}
                isExpanded={isExpanded}
                isCollapsed={isDesktop && isCollapsed}
                onClick={() => handleItemClick(item)}
                data-testid={`${testId}-nav-${item.id}`}
              />
              {hasChildren && isExpanded && !isCollapsed && (
                <SubNavigation
                  items={item.children!}
                  activePath={activePath}
                  onItemClick={handleChildClick}
                  parentId={item.id}
                  data-testid={`${testId}-subnav-${item.id}`}
                />
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );

  // Mobile: Header bar with hamburger + overlay sidebar
  if (isMobile || isTablet) {
    return (
      <>
        {/* Mobile header bar */}
        <header
          className="
            fixed top-0 left-0 right-0
            h-14
            bg-[var(--color-background-card)]
            border-b border-[var(--color-border-default)]
            z-[var(--z-sticky)]
            flex items-center justify-between
            px-4
          "
          data-testid={`${testId}-header`}
        >
          <button
            type="button"
            className="
              min-w-[44px] min-h-[44px]
              flex items-center justify-center
              text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
              hover:bg-[var(--color-background-surface)]
              focus:outline-none focus:ring-2 focus:ring-primary-500
              rounded-md
              transition-colors
            "
            onClick={handleToggleMobile}
            aria-label={isMobileOpen ? t('sidebar.closeMenu') : t('sidebar.openMenu')}
            aria-expanded={isMobileOpen}
            data-testid={`${testId}-hamburger`}
          >
            {isMobileOpen ? (
              <CloseIcon className="w-6 h-6" />
            ) : (
              <MenuIcon className="w-6 h-6" />
            )}
          </button>

          <div className="flex-1 flex justify-center">
            <Logo
              companyName={companyName}
              showName={true}
              data-testid={`${testId}-logo`}
            />
          </div>

          {/* Dark Mode Toggle */}
          <DarkModeToggle variant="icon" data-testid="dark-mode-toggle-mobile" />
        </header>

        {/* Backdrop */}
        {isMobileOpen && (
          <div
            className="
              fixed inset-0
              bg-black bg-opacity-50
              z-[var(--z-modal-backdrop)]
              transition-opacity duration-300
            "
            onClick={handleCloseMobile}
            aria-hidden="true"
            data-testid={`${testId}-backdrop`}
          />
        )}

        {/* Mobile sidebar drawer */}
        <aside
          className={`
            fixed top-0 left-0
            w-[280px] max-w-[85vw]
            h-full
            bg-[var(--color-background-card)]
            z-[var(--z-modal)]
            transform ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
            transition-transform duration-300 ease-in-out
            flex flex-col
            shadow-xl
          `}
          aria-label="Sidebar"
          aria-hidden={!isMobileOpen}
          role="dialog"
          aria-modal={isMobileOpen}
          data-testid={testId}
          data-variant="mobile"
        >
          {/* Header */}
          <div className="flex-shrink-0 p-4 border-b border-[var(--color-border-default)] flex items-center justify-between">
            <Logo
              companyName={companyName}
              showName={true}
              data-testid={`${testId}-drawer-logo`}
            />
            <button
              type="button"
              className="
                min-w-[44px] min-h-[44px]
                flex items-center justify-center
                text-neutral-500 hover:text-neutral-700
                focus:outline-none focus:ring-2 focus:ring-primary-500
                rounded-md
                -mr-2
              "
              onClick={handleCloseMobile}
              aria-label={t('sidebar.closeSidebar')}
              data-testid={`${testId}-close`}
            >
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          {navigationContent}

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-[var(--color-border-default)]">
            <div className="p-4">
              <UserProfile
                user={user}
                isCollapsed={false}
                data-testid={`${testId}-user-profile`}
              />
            </div>
            {/* Version Footer - STORY-030 */}
            <div className="px-4 pb-2">
              <VersionFooter
                isCollapsed={false}
                data-testid={`${testId}-version`}
              />
            </div>
          </div>
        </aside>
      </>
    );
  }

  // Desktop: Fixed sidebar with collapse
  return (
    <aside
      className={`
        flex-shrink-0
        ${isCollapsed ? 'w-16' : 'w-[280px]'}
        bg-[var(--color-background-card)]
        border-r border-[var(--color-border-default)]
        h-screen
        sticky top-0
        flex flex-col
        transition-all duration-300 ease-in-out
        ${className}
      `}
      aria-label="Sidebar"
      data-testid={testId}
      data-variant="desktop"
      data-collapsed={isCollapsed}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-[var(--color-border-default)]">
        <Logo
          companyName={companyName}
          showName={!isCollapsed}
          data-testid={`${testId}-logo`}
        />
      </div>

      {/* Navigation */}
      {navigationContent}

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-[var(--color-border-default)]">
        {/* User Profile */}
        <div className="p-4">
          <UserProfile
            user={user}
            isCollapsed={isCollapsed}
            data-testid={`${testId}-user-profile`}
          />
        </div>

        {/* Version Footer - STORY-030 */}
        <div className={`${isCollapsed ? 'px-2' : 'px-4'} pb-2`}>
          <VersionFooter
            isCollapsed={isCollapsed}
            data-testid={`${testId}-version`}
          />
        </div>

        {/* Dark Mode Toggle */}
        <div className="px-2 py-1">
          <DarkModeToggle
            variant={isCollapsed ? 'icon' : 'full'}
            data-testid="dark-mode-toggle-desktop"
          />
        </div>

        {/* Collapse Toggle */}
        <div className="p-2 border-t border-neutral-100">
          <button
            type="button"
            className="
              w-full
              min-h-[44px]
              flex items-center justify-center
              text-neutral-500 hover:text-neutral-700
              hover:bg-[var(--color-background-surface)]
              focus:outline-none focus:ring-2 focus:ring-primary-500
              rounded-md
              transition-colors
            "
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
            data-testid={`${testId}-toggle`}
          >
            {isCollapsed ? (
              <ChevronRightIcon className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeftIcon className="w-5 h-5 mr-2" />
                <span className="text-sm">{t('sidebar.collapse')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
