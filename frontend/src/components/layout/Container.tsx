/**
 * Container Component
 * STORY-017A: Layout & Grid-System
 *
 * Max-width wrapper with responsive padding for content containment.
 * Provides consistent horizontal spacing across all breakpoints.
 *
 * @example
 * ```tsx
 * <Container>
 *   <h1>Page Title</h1>
 *   <p>Content goes here...</p>
 * </Container>
 *
 * <Container fluid>
 *   <FullWidthContent />
 * </Container>
 *
 * <Container maxWidth="md" className="py-8">
 *   <NarrowContent />
 * </Container>
 * ```
 */

import React from 'react';

/**
 * Maximum width variants for the container.
 * Maps to responsive breakpoint values.
 */
export type ContainerMaxWidth = 'sm' | 'md' | 'lg' | 'xl' | 'full';

/**
 * Container component props
 */
export interface ContainerProps {
  /** Content to render inside the container */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Maximum width variant (default: 'xl') */
  maxWidth?: ContainerMaxWidth;
  /** If true, container spans full width without max-width constraint */
  fluid?: boolean;
  /** HTML element to render as (default: 'div') */
  as?: keyof JSX.IntrinsicElements;
  /** Accessible label for the container */
  'aria-label'?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Maps maxWidth prop to Tailwind CSS max-width classes
 */
const maxWidthClasses: Record<ContainerMaxWidth, string> = {
  sm: 'max-w-screen-sm',   // 640px
  md: 'max-w-screen-md',   // 768px
  lg: 'max-w-screen-lg',   // 1024px
  xl: 'max-w-screen-xl',   // 1280px
  full: 'max-w-full',      // 100%
};

/**
 * Container Component
 *
 * Provides a responsive max-width container with centered content
 * and consistent horizontal padding across breakpoints.
 */
export const Container: React.FC<ContainerProps> = ({
  children,
  className = '',
  maxWidth = 'xl',
  fluid = false,
  as: Component = 'div',
  'aria-label': ariaLabel,
  'data-testid': testId,
}) => {
  // Base container classes with responsive padding
  const baseClasses = [
    'w-full',
    'mx-auto',
    'px-4',           // 16px padding on mobile
    'sm:px-6',        // 24px padding on sm screens
    'md:px-8',        // 32px padding on md screens
    'lg:px-10',       // 40px padding on lg screens
    'xl:px-12',       // 48px padding on xl screens
  ].join(' ');

  // Determine max-width class
  const maxWidthClass = fluid ? '' : maxWidthClasses[maxWidth];

  // Combine all classes
  const containerClasses = [
    baseClasses,
    maxWidthClass,
    className,
  ].filter(Boolean).join(' ');

  return (
    <Component
      className={containerClasses}
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {children}
    </Component>
  );
};

export default Container;
