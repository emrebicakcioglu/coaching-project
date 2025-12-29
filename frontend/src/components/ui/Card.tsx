/**
 * Card Component
 * UI-AUDIT: Standardized card component with consistent styling
 *
 * Provides consistent card styling (border, shadow, padding) across
 * Dashboard, Settings, and Help pages.
 *
 * @example
 * ```tsx
 * <Card>
 *   <Card.Header>
 *     <Card.Title>Card Title</Card.Title>
 *   </Card.Header>
 *   <Card.Body>
 *     Card content goes here
 *   </Card.Body>
 *   <Card.Footer>
 *     <Button>Action</Button>
 *   </Card.Footer>
 * </Card>
 * ```
 */

import React from 'react';

/**
 * Card variant types
 */
export type CardVariant = 'default' | 'elevated' | 'outlined' | 'subtle';

/**
 * Card padding options
 */
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

/**
 * Card props
 */
export interface CardProps {
  /** Card content */
  children: React.ReactNode;
  /** Card variant */
  variant?: CardVariant;
  /** Card padding */
  padding?: CardPadding;
  /** Whether card is interactive (hover effects) */
  interactive?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for E2E testing */
  'data-testid'?: string;
}

/**
 * Card header props
 */
export interface CardHeaderProps {
  children: React.ReactNode;
  /** Whether to add a border below */
  borderBottom?: boolean;
  className?: string;
}

/**
 * Card title props
 */
export interface CardTitleProps {
  children: React.ReactNode;
  /** Title size */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Card body props
 */
export interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Card footer props
 */
export interface CardFooterProps {
  children: React.ReactNode;
  /** Whether to add a border above */
  borderTop?: boolean;
  className?: string;
}

/**
 * Map card variants to theme card types
 */
const variantToThemeType: Record<CardVariant, string> = {
  default: 'default',
  elevated: 'elevated',
  outlined: 'default',
  subtle: 'flat',
};

/**
 * Get variant-specific inline styles using CSS variables
 */
const getVariantStyles = (variant: CardVariant): React.CSSProperties => {
  const themeType = variantToThemeType[variant];

  return {
    backgroundColor: `var(--color-card-${themeType}-bg, var(--color-background-card, #ffffff))`,
    borderColor: `var(--color-card-${themeType}-border, var(--color-border-default, #e5e7eb))`,
    boxShadow: `var(--color-card-${themeType}-shadow, ${variant === 'elevated' ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : '0 1px 2px rgba(0, 0, 0, 0.05)'})`,
    borderRadius: `var(--color-card-${themeType}-radius, 8px)`,
  };
};

/**
 * Get variant-specific CSS classes (for non-style properties)
 */
const getVariantClasses = (variant: CardVariant): string => {
  switch (variant) {
    case 'outlined':
      return 'border';
    default:
      return 'border';
  }
};

/**
 * Get padding-specific CSS classes
 */
const getPaddingClasses = (padding: CardPadding): string => {
  switch (padding) {
    case 'none':
      return '';
    case 'sm':
      return 'p-3';
    case 'md':
      return 'p-4';
    case 'lg':
      return 'p-6';
    default:
      return '';
  }
};

/**
 * Card Component
 *
 * A standardized card component with consistent styling.
 */
export const Card: React.FC<CardProps> & {
  Header: React.FC<CardHeaderProps>;
  Title: React.FC<CardTitleProps>;
  Body: React.FC<CardBodyProps>;
  Footer: React.FC<CardFooterProps>;
} = ({
  children,
  variant = 'default',
  padding = 'none',
  interactive = false,
  className = '',
  'data-testid': testId,
}) => {
  const variantClasses = getVariantClasses(variant);
  const variantStyles = getVariantStyles(variant);
  const paddingClasses = getPaddingClasses(padding);
  const interactiveClasses = interactive
    ? 'cursor-pointer hover:shadow-md transition-shadow duration-200'
    : '';

  const cardClasses = [
    'overflow-hidden',
    variantClasses,
    paddingClasses,
    interactiveClasses,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses} style={variantStyles} data-testid={testId}>
      {children}
    </div>
  );
};

/**
 * Card Header Component
 */
const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  borderBottom = true,
  className = '',
}) => {
  const borderClasses = borderBottom ? 'border-b border-[var(--color-border-default,#e5e7eb)]' : '';

  return (
    <div className={`p-4 ${borderClasses} ${className}`}>
      {children}
    </div>
  );
};

/**
 * Card Title Component
 */
const CardTitle: React.FC<CardTitleProps> = ({
  children,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-sm font-medium',
    md: 'text-lg font-semibold',
    lg: 'text-xl font-bold',
  };

  return (
    <h3 className={`${sizeClasses[size]} text-[var(--color-text-primary,#111827)] ${className}`}>
      {children}
    </h3>
  );
};

/**
 * Card Body Component
 */
const CardBody: React.FC<CardBodyProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`p-4 ${className}`}>
      {children}
    </div>
  );
};

/**
 * Card Footer Component
 */
const CardFooter: React.FC<CardFooterProps> = ({
  children,
  borderTop = true,
  className = '',
}) => {
  const borderClasses = borderTop ? 'border-t border-[var(--color-border-default,#e5e7eb)]' : '';

  return (
    <div className={`p-4 ${borderClasses} ${className}`}>
      {children}
    </div>
  );
};

// Assign sub-components
Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
