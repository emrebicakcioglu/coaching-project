/**
 * ResponsiveSidebar Component
 * STORY-017B: Component Responsiveness
 *
 * A responsive sidebar that displays as a fixed sidebar on desktop
 * and as an overlay drawer on mobile devices.
 *
 * @example
 * ```tsx
 * <ResponsiveSidebar
 *   isOpen={sidebarOpen}
 *   onClose={() => setSidebarOpen(false)}
 *   header={<Logo />}
 * >
 *   <nav>Navigation items...</nav>
 * </ResponsiveSidebar>
 * ```
 */

import React, { useEffect, useCallback } from 'react';
import { useResponsive } from '../../hooks';

/**
 * Props for ResponsiveSidebar component
 */
export interface ResponsiveSidebarProps {
  /** Sidebar content */
  children: React.ReactNode;
  /** Whether sidebar is open (primarily for mobile) */
  isOpen?: boolean;
  /** Callback when sidebar should close */
  onClose?: () => void;
  /** Optional header content */
  header?: React.ReactNode;
  /** Optional footer content */
  footer?: React.ReactNode;
  /** Width of sidebar on desktop */
  width?: 'sm' | 'md' | 'lg';
  /** Position of sidebar */
  position?: 'left' | 'right';
  /** Additional CSS classes */
  className?: string;
  /** Test ID for E2E testing */
  'data-testid'?: string;
}

/**
 * Width mapping for sidebar
 */
const widthClasses = {
  sm: 'w-56', // 224px
  md: 'w-64', // 256px
  lg: 'w-72', // 288px
} as const;

/**
 * ResponsiveSidebar Component
 *
 * Desktop: Fixed position sidebar that takes up space in the layout
 * Mobile: Overlay drawer that slides in from the side
 */
export const ResponsiveSidebar: React.FC<ResponsiveSidebarProps> = ({
  children,
  isOpen = false,
  onClose,
  header,
  footer,
  width = 'md',
  position = 'left',
  className = '',
  'data-testid': testId = 'responsive-sidebar',
}) => {
  const { isMobile } = useResponsive();

  // Handle escape key to close sidebar on mobile
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobile && isOpen && onClose) {
        onClose();
      }
    },
    [isMobile, isOpen, onClose]
  );

  // Handle body scroll lock on mobile when sidebar is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, isOpen]);

  // Add escape key listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const positionClasses = position === 'left' ? 'left-0' : 'right-0';
  const translateClasses =
    position === 'left'
      ? isOpen
        ? 'translate-x-0'
        : '-translate-x-full'
      : isOpen
        ? 'translate-x-0'
        : 'translate-x-full';

  // Desktop: Fixed sidebar
  if (!isMobile) {
    return (
      <aside
        data-testid={testId}
        data-variant="desktop"
        className={`
          flex-shrink-0
          ${widthClasses[width]}
          bg-white
          border-r border-neutral-200
          h-screen
          sticky top-0
          flex flex-col
          ${className}
        `}
        aria-label="Sidebar"
      >
        {header && (
          <div
            className="flex-shrink-0 p-4 border-b border-neutral-200"
            data-testid={`${testId}-header`}
          >
            {header}
          </div>
        )}
        <div
          className="flex-1 overflow-y-auto p-4"
          data-testid={`${testId}-content`}
        >
          {children}
        </div>
        {footer && (
          <div
            className="flex-shrink-0 p-4 border-t border-neutral-200"
            data-testid={`${testId}-footer`}
          >
            {footer}
          </div>
        )}
      </aside>
    );
  }

  // Mobile: Overlay sidebar
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="
            fixed inset-0
            bg-black bg-opacity-50
            z-[var(--z-modal-backdrop)]
            transition-opacity duration-300
          "
          data-testid={`${testId}-backdrop`}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar drawer */}
      <aside
        data-testid={testId}
        data-variant="mobile"
        className={`
          fixed top-0 ${positionClasses}
          ${widthClasses[width]}
          h-full
          bg-white
          z-[var(--z-modal)]
          transform ${translateClasses}
          transition-transform duration-300 ease-in-out
          flex flex-col
          shadow-xl
          ${className}
        `}
        aria-label="Sidebar"
        aria-hidden={!isOpen}
        role="dialog"
        aria-modal={isOpen}
      >
        {header && (
          <div
            className="flex-shrink-0 p-4 border-b border-neutral-200 flex items-center justify-between"
            data-testid={`${testId}-header`}
          >
            <div className="flex-1">{header}</div>
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
              onClick={onClose}
              aria-label="Close sidebar"
              data-testid={`${testId}-close-button`}
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
        )}
        <div
          className="flex-1 overflow-y-auto p-4"
          data-testid={`${testId}-content`}
        >
          {children}
        </div>
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

export default ResponsiveSidebar;
