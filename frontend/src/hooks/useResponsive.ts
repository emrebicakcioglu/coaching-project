/**
 * useResponsive Hook
 * STORY-017B: Component Responsiveness
 *
 * Custom hook for detecting viewport size and responsive breakpoints.
 * Provides utilities for mobile-first responsive design.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isMobile, isTablet, isDesktop, breakpoint } = useResponsive();
 *
 *   if (isMobile) {
 *     return <MobileLayout />;
 *   }
 *   return <DesktopLayout />;
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Breakpoint values matching Tailwind CSS configuration
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

/**
 * Breakpoint names
 */
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Return type for useResponsive hook
 */
export interface UseResponsiveReturn {
  /** Current viewport width in pixels */
  width: number;
  /** Current viewport height in pixels */
  height: number;
  /** Current breakpoint name */
  breakpoint: Breakpoint;
  /** True if viewport is below md breakpoint (< 768px) */
  isMobile: boolean;
  /** True if viewport is at md breakpoint (768px - 1023px) */
  isTablet: boolean;
  /** True if viewport is at or above lg breakpoint (>= 1024px) */
  isDesktop: boolean;
  /** True if viewport matches or exceeds the given breakpoint */
  isBreakpoint: (bp: Breakpoint) => boolean;
  /** True if viewport is below the given breakpoint */
  isBelowBreakpoint: (bp: Breakpoint) => boolean;
}

/**
 * Get current breakpoint based on window width
 */
function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

/**
 * Get breakpoint value in pixels
 */
function getBreakpointValue(bp: Breakpoint): number {
  switch (bp) {
    case 'xs':
      return 0;
    case 'sm':
      return BREAKPOINTS.sm;
    case 'md':
      return BREAKPOINTS.md;
    case 'lg':
      return BREAKPOINTS.lg;
    case 'xl':
      return BREAKPOINTS.xl;
    default:
      return 0;
  }
}

/**
 * Hook for responsive viewport detection
 *
 * Uses debounced resize listener for performance.
 * Returns current breakpoint, viewport dimensions, and helper methods.
 */
export function useResponsive(): UseResponsiveReturn {
  const [dimensions, setDimensions] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  }));

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      // Debounce resize events for performance
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 100);
    };

    window.addEventListener('resize', handleResize);

    // Set initial dimensions
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const breakpoint = getBreakpoint(dimensions.width);

  const isBreakpoint = useCallback(
    (bp: Breakpoint): boolean => {
      return dimensions.width >= getBreakpointValue(bp);
    },
    [dimensions.width]
  );

  const isBelowBreakpoint = useCallback(
    (bp: Breakpoint): boolean => {
      return dimensions.width < getBreakpointValue(bp);
    },
    [dimensions.width]
  );

  return {
    width: dimensions.width,
    height: dimensions.height,
    breakpoint,
    isMobile: dimensions.width < BREAKPOINTS.md,
    isTablet: dimensions.width >= BREAKPOINTS.md && dimensions.width < BREAKPOINTS.lg,
    isDesktop: dimensions.width >= BREAKPOINTS.lg,
    isBreakpoint,
    isBelowBreakpoint,
  };
}

/**
 * Hook for detecting if viewport matches a media query
 *
 * @param query - CSS media query string
 * @returns boolean indicating if the media query matches
 *
 * @example
 * ```tsx
 * const isPortrait = useMediaQuery('(orientation: portrait)');
 * const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Set initial value
    setMatches(mediaQuery.matches);

    // Add listener
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}

export default useResponsive;
