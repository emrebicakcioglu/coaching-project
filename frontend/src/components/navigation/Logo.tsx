/**
 * Logo Component
 * STORY-016A: Context Menu Core Navigation
 * UI-AUDIT: Replaced logo placeholder with actual SVG branding
 *
 * Company logo and name display for sidebar header.
 *
 * @example
 * ```tsx
 * <Logo companyName="Core App" showName={true} />
 * ```
 */

import React from 'react';

/**
 * Logo props
 */
export interface LogoProps {
  /** Company name to display */
  companyName?: string;
  /** Whether to show company name (false when sidebar is collapsed) */
  showName?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for E2E testing */
  'data-testid'?: string;
}

/**
 * Logo Component
 *
 * Displays a professional SVG logo mark with optional company name.
 * The logo mark is always visible, but name can be hidden.
 */
export const Logo: React.FC<LogoProps> = ({
  companyName = 'Core App',
  showName = true,
  className = '',
  'data-testid': testId = 'logo',
}) => {
  return (
    <div
      className={`flex items-center ${className}`}
      data-testid={testId}
    >
      {/* Logo mark - SVG icon representing interconnected nodes/core */}
      <div
        className="
          flex-shrink-0
          w-8 h-8
          bg-gradient-to-br from-primary-500 to-primary-700
          rounded-lg
          flex items-center justify-center
          shadow-sm
        "
        aria-hidden="true"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Hexagon core shape */}
          <path d="M12 2L21 7v10l-9 5-9-5V7l9-5z" />
          {/* Inner connecting lines */}
          <path d="M12 7v10M7 9.5l10 5M7 14.5l10-5" />
        </svg>
      </div>

      {/* Company name */}
      {showName && (
        <span
          className="ml-3 text-lg font-semibold text-[var(--color-text-primary)] truncate"
          data-testid={`${testId}-name`}
        >
          {companyName}
        </span>
      )}
    </div>
  );
};

export default Logo;
