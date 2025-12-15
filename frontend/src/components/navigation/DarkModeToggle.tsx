/**
 * Dark Mode Toggle Component
 * Dark Mode Toggle Feature
 *
 * Toggle button for switching between light and dark modes.
 * Shows sun icon in dark mode (to switch to light), moon icon in light mode (to switch to dark).
 *
 * @example
 * ```tsx
 * // Icon only (for mobile header)
 * <DarkModeToggle variant="icon" />
 *
 * // Full with label (for desktop sidebar)
 * <DarkModeToggle variant="full" />
 * ```
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { SunIcon, MoonIcon } from '../icons/Icons';

/**
 * Dark Mode Toggle Props
 */
export interface DarkModeToggleProps {
  /** Display variant: icon-only or full with label */
  variant: 'icon' | 'full';
  /** Additional CSS classes */
  className?: string;
  /** Test ID for E2E testing */
  'data-testid'?: string;
}

/**
 * Dark Mode Toggle Component
 *
 * Button that toggles between light and dark mode.
 * Displays appropriate icon based on current mode.
 */
export const DarkModeToggle: React.FC<DarkModeToggleProps> = ({
  variant,
  className = '',
  'data-testid': testId = 'dark-mode-toggle',
}) => {
  const { t } = useTranslation('navigation');
  const { isDarkMode, isLoading, isConfigured, toggleDarkMode } = useDarkMode();

  // Don't render if not configured (no light/dark schemes assigned)
  if (!isConfigured) {
    return null;
  }

  const handleClick = async () => {
    if (!isLoading) {
      await toggleDarkMode();
    }
  };

  const label = isDarkMode ? t('theme.lightMode') : t('theme.darkMode');
  const ariaLabel = isDarkMode ? t('theme.switchToLight') : t('theme.switchToDark');

  // Icon-only variant (for mobile header)
  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        aria-label={ariaLabel}
        title={label}
        className={`
          min-w-[44px] min-h-[44px]
          flex items-center justify-center
          text-neutral-600 hover:text-neutral-900
          hover:bg-neutral-100
          focus:outline-none focus:ring-2 focus:ring-primary-500
          rounded-md
          transition-colors duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        data-testid={testId}
      >
        {isDarkMode ? (
          <SunIcon className="w-5 h-5" aria-hidden="true" />
        ) : (
          <MoonIcon className="w-5 h-5" aria-hidden="true" />
        )}
      </button>
    );
  }

  // Full variant with label (for desktop sidebar)
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      aria-label={ariaLabel}
      className={`
        flex items-center gap-2
        px-3 py-2
        text-sm font-medium
        text-neutral-600 hover:text-neutral-900
        hover:bg-neutral-100
        focus:outline-none focus:ring-2 focus:ring-primary-500
        rounded-md
        transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        w-full
        ${className}
      `}
      data-testid={testId}
    >
      {isDarkMode ? (
        <SunIcon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
      ) : (
        <MoonIcon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
      )}
      <span className="truncate">{label}</span>
    </button>
  );
};

export default DarkModeToggle;
