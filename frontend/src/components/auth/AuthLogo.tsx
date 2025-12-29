/**
 * AuthLogo Component
 * STORY-3: Register Page UI Audit - Logo Placeholder Fix
 * STORY-002-001: i18n Support for Login Page
 *
 * Shared logo component for authentication pages (Login, Register, Forgot Password, etc.)
 * Ensures visual consistency across all auth-related pages.
 *
 * This component uses an SVG logo to replace the previous "LOGO" text placeholder.
 * The design matches the sidebar logo for brand consistency.
 *
 * @example
 * ```tsx
 * <AuthLogo />
 * ```
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * AuthLogo props
 */
export interface AuthLogoProps {
  /** Logo size in pixels (default: 64) */
  size?: number;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for E2E testing */
  'data-testid'?: string;
}

/**
 * AuthLogo Component
 *
 * Displays a professional SVG logo for authentication pages.
 * Uses a gradient background with a hexagon/core shape to represent
 * the "Core App" branding.
 *
 * STORY-3: Replaced "LOGO" text placeholder with actual SVG branding.
 */
export const AuthLogo: React.FC<AuthLogoProps> = ({
  size = 64,
  className = '',
  'data-testid': testId = 'auth-logo',
}) => {
  const { t } = useTranslation('auth');
  const iconSize = Math.round(size * 0.5); // Icon is 50% of container

  return (
    <div
      className={`auth-logo ${className}`}
      aria-label={t('logo')}
      data-testid={testId}
    >
      <div
        className="auth-logo__placeholder"
        aria-hidden="true"
        style={{ width: size, height: size }}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          data-testid={`${testId}-svg`}
        >
          {/* Hexagon core shape - represents "Core" in Core App */}
          <path d="M12 2L21 7v10l-9 5-9-5V7l9-5z" />
          {/* Inner connecting lines - represents interconnected infrastructure */}
          <path d="M12 7v10M7 9.5l10 5M7 14.5l10-5" />
        </svg>
      </div>
    </div>
  );
};

export default AuthLogo;
