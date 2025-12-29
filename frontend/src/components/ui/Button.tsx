/**
 * Button Component
 * UI-AUDIT: Standardized button component with consistent variants
 *
 * Usage recommendations from MFA Setup Page (reference design):
 * - Primary Action: Filled blue (variant="primary")
 * - Secondary Action: Outlined (variant="outline")
 * - Destructive Action: Red (variant="destructive")
 *
 * @example
 * ```tsx
 * <Button variant="primary">Save Changes</Button>
 * <Button variant="outline" onClick={handleCancel}>Cancel</Button>
 * <Button variant="destructive" onClick={handleDelete}>Delete</Button>
 * <Button variant="primary" isLoading>Saving...</Button>
 * ```
 */

import React from 'react';

/**
 * Button variant types
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost' | 'link';

/**
 * Button size types
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Button props
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Whether button is in loading state */
  isLoading?: boolean;
  /** Whether button takes full width */
  fullWidth?: boolean;
  /** Icon to display before button text */
  leftIcon?: React.ReactNode;
  /** Icon to display after button text */
  rightIcon?: React.ReactNode;
  /** Test ID for E2E testing */
  'data-testid'?: string;
}

/**
 * Map button variants to theme button types
 */
const variantToThemeType: Record<ButtonVariant, string> = {
  primary: 'normal',
  secondary: 'inactive',
  outline: 'abort',
  destructive: 'danger',
  ghost: 'inactive',
  link: 'normal',
};

/**
 * Default colors for each button type (fallbacks if CSS variables not set)
 */
const defaultButtonColors: Record<string, { bg: string; text: string; border: string; hoverBg: string; hoverText: string; hoverBorder: string }> = {
  normal: { bg: '#2563eb', text: '#ffffff', border: '#2563eb', hoverBg: '#1d4ed8', hoverText: '#ffffff', hoverBorder: '#1d4ed8' },
  inactive: { bg: '#e5e7eb', text: '#6b7280', border: '#e5e7eb', hoverBg: '#d1d5db', hoverText: '#4b5563', hoverBorder: '#d1d5db' },
  abort: { bg: '#ffffff', text: '#6b7280', border: '#d1d5db', hoverBg: '#f3f4f6', hoverText: '#374151', hoverBorder: '#9ca3af' },
  special: { bg: '#7c3aed', text: '#ffffff', border: '#7c3aed', hoverBg: '#6d28d9', hoverText: '#ffffff', hoverBorder: '#6d28d9' },
  danger: { bg: '#ef4444', text: '#ffffff', border: '#ef4444', hoverBg: '#dc2626', hoverText: '#ffffff', hoverBorder: '#dc2626' },
  success: { bg: '#10b981', text: '#ffffff', border: '#10b981', hoverBg: '#059669', hoverText: '#ffffff', hoverBorder: '#059669' },
};

/**
 * Get variant-specific inline styles using CSS variables
 */
const getVariantStyles = (variant: ButtonVariant): React.CSSProperties => {
  const themeType = variantToThemeType[variant];
  const defaults = defaultButtonColors[themeType] || defaultButtonColors.normal;

  // Link variant doesn't use button theming
  if (variant === 'link') {
    return {
      backgroundColor: 'transparent',
      color: 'var(--color-primary, #2563eb)',
      borderColor: 'transparent',
    };
  }

  // Ghost variant uses transparent background
  if (variant === 'ghost') {
    return {
      backgroundColor: 'transparent',
      color: `var(--color-button-${themeType}-text, ${defaults.text})`,
      borderColor: 'transparent',
    };
  }

  return {
    backgroundColor: `var(--color-button-${themeType}-bg, ${defaults.bg})`,
    color: `var(--color-button-${themeType}-text, ${defaults.text})`,
    borderColor: `var(--color-button-${themeType}-border, ${defaults.border})`,
    // CSS custom properties for hover states (used with CSS)
    '--btn-hover-bg': `var(--color-button-${themeType}-hover-bg, ${defaults.hoverBg})`,
    '--btn-hover-text': `var(--color-button-${themeType}-hover-text, ${defaults.hoverText})`,
    '--btn-hover-border': `var(--color-button-${themeType}-hover-border, ${defaults.hoverBorder})`,
  } as React.CSSProperties;
};

/**
 * Get variant-specific CSS classes (for non-color styles)
 */
const getVariantClasses = (variant: ButtonVariant): string => {
  const baseClasses = 'focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 border';

  switch (variant) {
    case 'link':
      return `${baseClasses} hover:underline focus:ring-primary-500`;
    case 'ghost':
      return `${baseClasses} hover:bg-neutral-100 focus:ring-neutral-500`;
    default:
      return `${baseClasses} focus:ring-primary-500 hover:brightness-95`;
  }
};

/**
 * Get size-specific CSS classes
 */
const getSizeClasses = (size: ButtonSize): string => {
  switch (size) {
    case 'sm':
      return 'px-3 py-1.5 text-sm rounded-md';
    case 'md':
      return 'px-4 py-2 text-sm rounded-md';
    case 'lg':
      return 'px-6 py-3 text-base rounded-lg';
    default:
      return 'px-4 py-2 text-sm rounded-md';
  }
};

/**
 * Button Component
 *
 * A standardized button component with consistent styling across the application.
 * Based on the MFA Setup Page design patterns.
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  children,
  style,
  'data-testid': testId,
  ...props
}) => {
  const variantClasses = getVariantClasses(variant);
  const variantStyles = getVariantStyles(variant);
  const sizeClasses = getSizeClasses(size);
  const widthClasses = fullWidth ? 'w-full' : '';
  const disabledClasses = disabled || isLoading ? 'opacity-60 cursor-not-allowed' : '';

  const buttonClasses = [
    'inline-flex items-center justify-center font-medium',
    variantClasses,
    sizeClasses,
    widthClasses,
    disabledClasses,
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={buttonClasses}
      style={{ ...variantStyles, ...style }}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      data-testid={testId}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {leftIcon && !isLoading && (
        <span className="mr-2">{leftIcon}</span>
      )}
      {children}
      {rightIcon && (
        <span className="ml-2">{rightIcon}</span>
      )}
    </button>
  );
};

export default Button;
