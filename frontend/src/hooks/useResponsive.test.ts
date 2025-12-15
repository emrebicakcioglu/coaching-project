/**
 * useResponsive Hook Tests
 * STORY-017B: Component Responsiveness
 *
 * Unit tests for responsive viewport detection hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResponsive, useMediaQuery, BREAKPOINTS } from './useResponsive';

// Helper to mock window dimensions
const mockWindowDimensions = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
};

describe('useResponsive', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Default to desktop size
    mockWindowDimensions(1280, 800);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial values', () => {
    it('returns correct initial dimensions', () => {
      const { result } = renderHook(() => useResponsive());

      expect(result.current.width).toBe(1280);
      expect(result.current.height).toBe(800);
    });

    it('returns xl breakpoint for 1280px width', () => {
      const { result } = renderHook(() => useResponsive());

      expect(result.current.breakpoint).toBe('xl');
    });

    it('returns isDesktop true for desktop size', () => {
      const { result } = renderHook(() => useResponsive());

      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isMobile).toBe(false);
    });
  });

  describe('breakpoint detection', () => {
    it('returns xs breakpoint for mobile size (< 640px)', () => {
      mockWindowDimensions(375, 667);
      const { result } = renderHook(() => useResponsive());

      // Trigger resize event and wait for debounce
      act(() => {
        window.dispatchEvent(new Event('resize'));
        vi.advanceTimersByTime(150);
      });

      expect(result.current.breakpoint).toBe('xs');
      expect(result.current.isMobile).toBe(true);
    });

    it('returns sm breakpoint for 640px width', () => {
      mockWindowDimensions(640, 800);
      const { result } = renderHook(() => useResponsive());

      act(() => {
        window.dispatchEvent(new Event('resize'));
        vi.advanceTimersByTime(150);
      });

      expect(result.current.breakpoint).toBe('sm');
      expect(result.current.isMobile).toBe(true);
    });

    it('returns md breakpoint for tablet size (768px)', () => {
      mockWindowDimensions(768, 1024);
      const { result } = renderHook(() => useResponsive());

      act(() => {
        window.dispatchEvent(new Event('resize'));
        vi.advanceTimersByTime(150);
      });

      expect(result.current.breakpoint).toBe('md');
      expect(result.current.isTablet).toBe(true);
    });

    it('returns lg breakpoint for 1024px width', () => {
      mockWindowDimensions(1024, 768);
      const { result } = renderHook(() => useResponsive());

      act(() => {
        window.dispatchEvent(new Event('resize'));
        vi.advanceTimersByTime(150);
      });

      expect(result.current.breakpoint).toBe('lg');
      expect(result.current.isDesktop).toBe(true);
    });

    it('returns xl breakpoint for 1280px+ width', () => {
      mockWindowDimensions(1920, 1080);
      const { result } = renderHook(() => useResponsive());

      act(() => {
        window.dispatchEvent(new Event('resize'));
        vi.advanceTimersByTime(150);
      });

      expect(result.current.breakpoint).toBe('xl');
      expect(result.current.isDesktop).toBe(true);
    });
  });

  describe('isBreakpoint helper', () => {
    it('returns true when viewport matches breakpoint', () => {
      mockWindowDimensions(768, 800);
      const { result } = renderHook(() => useResponsive());

      act(() => {
        window.dispatchEvent(new Event('resize'));
        vi.advanceTimersByTime(150);
      });

      expect(result.current.isBreakpoint('md')).toBe(true);
      expect(result.current.isBreakpoint('sm')).toBe(true);
      expect(result.current.isBreakpoint('xs')).toBe(true);
      expect(result.current.isBreakpoint('lg')).toBe(false);
    });
  });

  describe('isBelowBreakpoint helper', () => {
    it('returns true when viewport is below breakpoint', () => {
      mockWindowDimensions(600, 800);
      const { result } = renderHook(() => useResponsive());

      act(() => {
        window.dispatchEvent(new Event('resize'));
        vi.advanceTimersByTime(150);
      });

      expect(result.current.isBelowBreakpoint('md')).toBe(true);
      expect(result.current.isBelowBreakpoint('sm')).toBe(true);
      expect(result.current.isBelowBreakpoint('xs')).toBe(false);
    });
  });

  describe('resize handling', () => {
    it('updates dimensions on window resize', () => {
      const { result } = renderHook(() => useResponsive());

      expect(result.current.width).toBe(1280);

      act(() => {
        mockWindowDimensions(375, 667);
        window.dispatchEvent(new Event('resize'));
        vi.advanceTimersByTime(150);
      });

      expect(result.current.width).toBe(375);
      expect(result.current.height).toBe(667);
      expect(result.current.isMobile).toBe(true);
    });

    it('debounces resize events', () => {
      const { result } = renderHook(() => useResponsive());

      // Trigger multiple resize events quickly
      act(() => {
        mockWindowDimensions(500, 800);
        window.dispatchEvent(new Event('resize'));
      });

      act(() => {
        mockWindowDimensions(600, 800);
        window.dispatchEvent(new Event('resize'));
      });

      act(() => {
        mockWindowDimensions(375, 667);
        window.dispatchEvent(new Event('resize'));
      });

      // Should still have initial value before debounce completes
      expect(result.current.width).toBe(1280);

      // Wait for debounce
      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Should have final value
      expect(result.current.width).toBe(375);
    });

    it('cleans up event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = renderHook(() => useResponsive());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });
});

describe('useMediaQuery', () => {
  beforeEach(() => {
    // Reset matchMedia mock
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('returns false when query does not match', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));

    expect(result.current).toBe(false);
  });

  it('returns true when query matches', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));

    expect(result.current).toBe(true);
  });

  it('updates when media query changes', () => {
    let changeHandler: ((e: MediaQueryListEvent) => void) | null = null;

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
          if (event === 'change') {
            changeHandler = handler;
          }
        }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));

    expect(result.current).toBe(false);

    // Simulate media query change
    act(() => {
      if (changeHandler) {
        changeHandler({ matches: true } as MediaQueryListEvent);
      }
    });

    expect(result.current).toBe(true);
  });

  it('cleans up event listener on unmount', () => {
    const removeEventListenerMock = vi.fn();

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: removeEventListenerMock,
        dispatchEvent: vi.fn(),
      })),
    });

    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));

    unmount();

    expect(removeEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
  });
});

describe('BREAKPOINTS constant', () => {
  it('exports correct breakpoint values', () => {
    expect(BREAKPOINTS.sm).toBe(640);
    expect(BREAKPOINTS.md).toBe(768);
    expect(BREAKPOINTS.lg).toBe(1024);
    expect(BREAKPOINTS.xl).toBe(1280);
  });
});
