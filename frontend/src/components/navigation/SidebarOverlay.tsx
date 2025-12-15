/**
 * SidebarOverlay Component
 * STORY-018B: Context Menu Responsive & Mobile
 *
 * Overlay backdrop for tablet/mobile menu states.
 * Provides a semi-transparent backdrop that closes the sidebar when clicked.
 *
 * Features:
 * - Smooth fade-in/fade-out transitions
 * - Click to dismiss
 * - Proper z-index layering
 * - Accessibility: aria-hidden
 *
 * @example
 * ```tsx
 * <SidebarOverlay
 *   isVisible={sidebarOpen}
 *   onClick={() => setSidebarOpen(false)}
 * />
 * ```
 */

import React from 'react';

/**
 * Props for SidebarOverlay component
 */
export interface SidebarOverlayProps {
  /** Whether the overlay is visible */
  isVisible: boolean;
  /** Click handler to close the sidebar */
  onClick: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for E2E testing */
  'data-testid'?: string;
  /** Background opacity class (default: bg-opacity-50) */
  opacity?: 'light' | 'medium' | 'dark';
  /** Transition duration (default: normal - 200ms) */
  transitionSpeed?: 'fast' | 'normal' | 'slow';
}

/**
 * Opacity classes mapping
 */
const opacityClasses = {
  light: 'bg-opacity-25',
  medium: 'bg-opacity-50',
  dark: 'bg-opacity-75',
} as const;

/**
 * Transition speed classes mapping (using CSS custom properties)
 */
const transitionClasses = {
  fast: 'duration-[var(--transition-fast,150ms)]',
  normal: 'duration-[var(--transition-normal,200ms)]',
  slow: 'duration-[var(--transition-slow,300ms)]',
} as const;

/**
 * SidebarOverlay Component
 *
 * A semi-transparent backdrop overlay for mobile/tablet sidebar.
 * Renders nothing when not visible to avoid unnecessary DOM nodes.
 */
export const SidebarOverlay: React.FC<SidebarOverlayProps> = ({
  isVisible,
  onClick,
  className = '',
  'data-testid': testId = 'sidebar-overlay',
  opacity = 'medium',
  transitionSpeed = 'slow',
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`
        fixed inset-0
        bg-black ${opacityClasses[opacity]}
        z-[var(--z-modal-backdrop,1040)]
        transition-opacity ${transitionClasses[transitionSpeed]} ease-in-out
        ${className}
      `}
      onClick={onClick}
      aria-hidden="true"
      data-testid={testId}
      role="presentation"
    />
  );
};

export default SidebarOverlay;
