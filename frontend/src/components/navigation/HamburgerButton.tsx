/**
 * HamburgerButton Component
 * STORY-018B: Context Menu Responsive & Mobile
 *
 * Toggle button for mobile/tablet sidebar menu.
 * Displays a hamburger icon (3 lines) when closed, and X icon when open.
 *
 * Features:
 * - Animated icon transition
 * - Touch-friendly 44px minimum tap target
 * - WCAG 2.1 Level AA accessibility
 * - Focus visible ring
 *
 * @example
 * ```tsx
 * <HamburgerButton
 *   isOpen={sidebarOpen}
 *   onClick={() => setSidebarOpen(!sidebarOpen)}
 * />
 * ```
 */

import React from 'react';

/**
 * Props for HamburgerButton component
 */
export interface HamburgerButtonProps {
  /** Whether the menu is currently open */
  isOpen: boolean;
  /** Click handler to toggle menu state */
  onClick: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for E2E testing */
  'data-testid'?: string;
  /** Custom aria-label when open */
  openLabel?: string;
  /** Custom aria-label when closed */
  closedLabel?: string;
}

/**
 * HamburgerButton Component
 *
 * A hamburger menu toggle button with animated state transitions.
 * Transforms between hamburger (☰) and close (✕) icons.
 */
export const HamburgerButton: React.FC<HamburgerButtonProps> = ({
  isOpen,
  onClick,
  className = '',
  'data-testid': testId = 'hamburger-button',
  openLabel = 'Close menu',
  closedLabel = 'Open menu',
}) => {
  return (
    <button
      type="button"
      className={`
        min-w-[44px] min-h-[44px]
        flex items-center justify-center
        text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
        hover:bg-[var(--color-background-surface)]
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        rounded-md
        transition-colors duration-[var(--transition-normal,200ms)]
        ${className}
      `}
      onClick={onClick}
      aria-label={isOpen ? openLabel : closedLabel}
      aria-expanded={isOpen}
      data-testid={testId}
    >
      {isOpen ? (
        // Close icon (X)
        <svg
          className="w-6 h-6 transition-transform duration-[var(--transition-normal,200ms)]"
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
      ) : (
        // Hamburger icon (3 lines)
        <svg
          className="w-6 h-6 transition-transform duration-[var(--transition-normal,200ms)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      )}
    </button>
  );
};

export default HamburgerButton;
