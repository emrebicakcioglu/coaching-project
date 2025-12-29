/**
 * MobileSidebar Component
 * STORY-018B: Context Menu Responsive & Mobile
 *
 * Responsive sidebar container with breakpoint handling.
 * Manages sidebar visibility across Desktop (≥1024px), Tablet (768-1023px),
 * and Mobile (<768px) breakpoints.
 *
 * Features:
 * - Desktop: Fixed sidebar, 280px width, always visible
 * - Tablet: Collapsible overlay menu
 * - Mobile: Hamburger menu with full overlay
 * - Smooth CSS transitions (200-300ms)
 * - Touch-friendly tap targets (min 44x44px)
 * - WCAG 2.1 Level AA accessibility
 * - Body scroll lock when open on mobile/tablet
 * - Escape key to close
 *
 * @example
 * ```tsx
 * <MobileSidebar
 *   isOpen={sidebarOpen}
 *   onClose={() => setSidebarOpen(false)}
 *   onOpen={() => setSidebarOpen(true)}
 *   header={<Logo />}
 * >
 *   <nav>Navigation items...</nav>
 * </MobileSidebar>
 * ```
 */

import React, { useEffect, useCallback } from 'react';
import { useResponsive } from '../../hooks';
import { HamburgerButton } from './HamburgerButton';
import { SidebarOverlay } from './SidebarOverlay';

/**
 * Sidebar width constants matching design specifications
 */
export const MOBILE_SIDEBAR_WIDTH = {
  /** Desktop sidebar width (Story-018B spec) */
  desktop: 280,
  /** Collapsed desktop sidebar width */
  collapsed: 64,
  /** Maximum width on mobile (85% of viewport) */
  mobileMax: '85vw',
} as const;

/**
 * Props for MobileSidebar component
 */
export interface MobileSidebarProps {
  /** Sidebar content (navigation items) */
  children: React.ReactNode;
  /** Whether sidebar is open (mobile/tablet) */
  isOpen: boolean;
  /** Callback when sidebar should open */
  onOpen: () => void;
  /** Callback when sidebar should close */
  onClose: () => void;
  /** Optional header content (logo, title) */
  header?: React.ReactNode;
  /** Optional footer content (user profile) */
  footer?: React.ReactNode;
  /** Header content for mobile bar (optional, defaults to header) */
  mobileBarHeader?: React.ReactNode;
  /** Whether sidebar is collapsed (desktop only) */
  isCollapsed?: boolean;
  /** Callback when collapse state changes (desktop only) */
  onToggleCollapse?: () => void;
  /** Additional CSS classes for sidebar */
  className?: string;
  /** Test ID for E2E testing */
  'data-testid'?: string;
}

/**
 * MobileSidebar Component
 *
 * Provides a responsive sidebar container that adapts to different screen sizes.
 * On desktop, renders as a fixed sidebar. On tablet/mobile, renders as an
 * overlay drawer with a hamburger toggle button.
 */
export const MobileSidebar: React.FC<MobileSidebarProps> = ({
  children,
  isOpen,
  onOpen,
  onClose,
  header,
  footer,
  mobileBarHeader,
  isCollapsed = false,
  onToggleCollapse,
  className = '',
  'data-testid': testId = 'mobile-sidebar',
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const showMobileLayout = isMobile || isTablet;

  // Handle escape key to close sidebar
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && showMobileLayout) {
        onClose();
      }
    },
    [isOpen, onClose, showMobileLayout]
  );

  // Add/remove escape key listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Lock body scroll when sidebar is open on mobile/tablet
  useEffect(() => {
    if (showMobileLayout && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [showMobileLayout, isOpen]);

  // Toggle handler for hamburger button
  const handleToggle = useCallback(() => {
    if (isOpen) {
      onClose();
    } else {
      onOpen();
    }
  }, [isOpen, onOpen, onClose]);

  // Desktop layout: Fixed sidebar
  if (isDesktop) {
    return (
      <aside
        className={`
          flex-shrink-0
          ${isCollapsed ? 'w-16' : 'w-[280px]'}
          bg-white
          border-r border-neutral-200
          h-screen
          sticky top-0
          flex flex-col
          transition-all duration-[var(--transition-slow,300ms)] ease-in-out
          ${className}
        `}
        aria-label="Sidebar"
        data-testid={testId}
        data-variant="desktop"
        data-collapsed={isCollapsed}
      >
        {/* Header */}
        {header && (
          <div
            className="flex-shrink-0 p-4 border-b border-neutral-200"
            data-testid={`${testId}-header`}
          >
            {header}
          </div>
        )}

        {/* Main content (navigation) */}
        <div
          className="flex-1 overflow-y-auto"
          data-testid={`${testId}-content`}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="flex-shrink-0 border-t border-neutral-200"
            data-testid={`${testId}-footer`}
          >
            {footer}
          </div>
        )}

        {/* Collapse Toggle (desktop only) */}
        {onToggleCollapse && (
          <div className="p-2 border-t border-[var(--color-border-default)]">
            <button
              type="button"
              className="
                w-full
                min-h-[44px]
                flex items-center justify-center
                text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
                hover:bg-[var(--color-background-surface)]
                focus:outline-none focus:ring-2 focus:ring-primary-500
                rounded-md
                transition-colors duration-[var(--transition-normal,200ms)]
              "
              onClick={onToggleCollapse}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              data-testid={`${testId}-toggle`}
            >
              {isCollapsed ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              ) : (
                <>
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  <span className="text-sm">Collapse</span>
                </>
              )}
            </button>
          </div>
        )}
      </aside>
    );
  }

  // Mobile/Tablet layout: Header bar with hamburger + overlay sidebar
  return (
    <>
      {/* Mobile header bar */}
      <header
        className="
          fixed top-0 left-0 right-0
          h-14
          bg-white
          border-b border-neutral-200
          z-[var(--z-sticky,1020)]
          flex items-center justify-between
          px-4
        "
        data-testid={`${testId}-header-bar`}
      >
        {/* Hamburger button */}
        <HamburgerButton
          isOpen={isOpen}
          onClick={handleToggle}
          data-testid={`${testId}-hamburger`}
        />

        {/* Center content (logo/title) */}
        <div className="flex-1 flex justify-center">
          {mobileBarHeader || header}
        </div>

        {/* Spacer to balance the hamburger button */}
        <div className="min-w-[44px]" aria-hidden="true" />
      </header>

      {/* Backdrop overlay */}
      <SidebarOverlay
        isVisible={isOpen}
        onClick={onClose}
        data-testid={`${testId}-backdrop`}
      />

      {/* Sidebar drawer */}
      <aside
        className={`
          fixed top-0 left-0
          w-[280px] max-w-[85vw]
          h-full
          bg-white
          z-[var(--z-modal,1050)]
          transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          transition-transform duration-[var(--transition-slow,300ms)] ease-in-out
          flex flex-col
          shadow-xl
          ${className}
        `}
        aria-label="Sidebar"
        aria-hidden={!isOpen}
        role="dialog"
        aria-modal={isOpen}
        data-testid={testId}
        data-variant={isMobile ? 'mobile' : 'tablet'}
      >
        {/* Header with close button */}
        <div
          className="flex-shrink-0 p-4 border-b border-[var(--color-border-default)] flex items-center justify-between"
          data-testid={`${testId}-drawer-header`}
        >
          <div className="flex-1">{header}</div>
          <button
            type="button"
            className="
              min-w-[44px] min-h-[44px]
              flex items-center justify-center
              text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
              focus:outline-none focus:ring-2 focus:ring-primary-500
              rounded-md
              -mr-2
              transition-colors duration-[var(--transition-normal,200ms)]
            "
            onClick={onClose}
            aria-label="Close sidebar"
            data-testid={`${testId}-close`}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Main content (navigation) */}
        <div
          className="flex-1 overflow-y-auto"
          data-testid={`${testId}-content`}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="flex-shrink-0 p-4 border-t border-neutral-200"
            data-testid={`${testId}-footer`}
          >
            {footer}
          </div>
        )}
      </aside>
    </>
  );
};

export default MobileSidebar;
