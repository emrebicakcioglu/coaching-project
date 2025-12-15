/**
 * Logo Component
 * STORY-016A: Context Menu Core Navigation
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
 * Displays a simple logo mark with optional company name.
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
      {/* Logo mark */}
      <div
        className="
          flex-shrink-0
          w-8 h-8
          bg-primary-600
          rounded-lg
          flex items-center justify-center
          text-white font-bold text-sm
        "
        aria-hidden="true"
      >
        {/* Simple logo - first letter of company name */}
        {companyName.charAt(0).toUpperCase()}
      </div>

      {/* Company name */}
      {showName && (
        <span
          className="ml-3 text-lg font-semibold text-neutral-900 truncate"
          data-testid={`${testId}-name`}
        >
          {companyName}
        </span>
      )}
    </div>
  );
};

export default Logo;
