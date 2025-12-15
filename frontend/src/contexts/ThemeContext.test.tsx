/**
 * Theme Context Unit Tests
 * STORY-017B: Theme-System Frontend
 *
 * Tests for ThemeProvider component and useTheme hook.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { ThemeProvider, useTheme, useThemeColor, ThemeContext } from './ThemeContext';
import { themeService, DEFAULT_THEME_COLORS, ThemeColors } from '../services/themeService';
import React from 'react';

// Mock the theme service
vi.mock('../services/themeService', () => ({
  themeService: {
    getThemeColors: vi.fn(),
    updateThemeColors: vi.fn(),
    clearCache: vi.fn(),
    getCachedTheme: vi.fn(),
    getDefaultColors: vi.fn(() => ({
      primary: '#2563eb',
      secondary: '#7c3aed',
      background: { page: '#ffffff', card: '#f9fafb' },
      text: { primary: '#111827', secondary: '#6b7280' },
      status: { success: '#10b981', warning: '#f59e0b', error: '#ef4444' },
    })),
    isValidHexColor: vi.fn(),
  },
  DEFAULT_THEME_COLORS: {
    primary: '#2563eb',
    secondary: '#7c3aed',
    background: { page: '#ffffff', card: '#f9fafb' },
    text: { primary: '#111827', secondary: '#6b7280' },
    status: { success: '#10b981', warning: '#f59e0b', error: '#ef4444' },
  },
}));

// Helper component to access theme context
const ThemeConsumer: React.FC = () => {
  const { colors, isLoading, error } = useTheme();
  return (
    <div>
      <span data-testid="loading">{isLoading ? 'loading' : 'loaded'}</span>
      <span data-testid="primary-color">{colors.primary}</span>
      <span data-testid="secondary-color">{colors.secondary}</span>
      <span data-testid="background-page">{colors.background.page}</span>
      <span data-testid="text-primary">{colors.text.primary}</span>
      <span data-testid="status-success">{colors.status.success}</span>
      {error && <span data-testid="error">{error}</span>}
    </div>
  );
};

// Helper component to test useThemeColor hook
const ThemeColorConsumer: React.FC<{ colorPath: string }> = ({ colorPath }) => {
  const color = useThemeColor(colorPath);
  return <span data-testid="color-value">{color}</span>;
};

describe('ThemeContext', () => {
  const mockThemeColors: ThemeColors = {
    primary: '#ff0000',
    secondary: '#00ff00',
    background: { page: '#ffffff', card: '#f5f5f5' },
    text: { primary: '#000000', secondary: '#666666' },
    status: { success: '#00ff00', warning: '#ffff00', error: '#ff0000' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(themeService.getThemeColors).mockResolvedValue(mockThemeColors);
    vi.mocked(themeService.updateThemeColors).mockResolvedValue(mockThemeColors);
    // Reset document styles
    document.documentElement.style.cssText = '';
    document.body.style.cssText = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ThemeProvider', () => {
    it('renders children correctly', async () => {
      render(
        <ThemeProvider>
          <div data-testid="child">Child content</div>
        </ThemeProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('renders with default test id', async () => {
      render(
        <ThemeProvider>
          <div>Content</div>
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
    });

    it('renders with custom test id', async () => {
      render(
        <ThemeProvider data-testid="custom-theme-provider">
          <div>Content</div>
        </ThemeProvider>
      );

      expect(screen.getByTestId('custom-theme-provider')).toBeInTheDocument();
    });

    it('fetches theme on mount', async () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(themeService.getThemeColors).toHaveBeenCalledTimes(1);
      });
    });

    it('provides theme colors to children', async () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('primary-color')).toHaveTextContent('#ff0000');
      });

      expect(screen.getByTestId('secondary-color')).toHaveTextContent('#00ff00');
      expect(screen.getByTestId('background-page')).toHaveTextContent('#ffffff');
      expect(screen.getByTestId('text-primary')).toHaveTextContent('#000000');
      expect(screen.getByTestId('status-success')).toHaveTextContent('#00ff00');
    });

    it('shows loading state initially', async () => {
      // Make the API call hang
      vi.mocked(themeService.getThemeColors).mockImplementation(
        () => new Promise(() => {})
      );

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('loading');
    });

    it('shows loaded state after fetching theme', async () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });
    });

    it('applies CSS variables to document root', async () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Check that CSS variables were set
      const root = document.documentElement;
      expect(root.style.getPropertyValue('--color-primary')).toBe('#ff0000');
      expect(root.style.getPropertyValue('--color-secondary')).toBe('#00ff00');
      expect(root.style.getPropertyValue('--color-background-page')).toBe('#ffffff');
      expect(root.style.getPropertyValue('--color-text-primary')).toBe('#000000');
      expect(root.style.getPropertyValue('--color-success')).toBe('#00ff00');
    });

    it('handles API error gracefully', async () => {
      vi.mocked(themeService.getThemeColors).mockRejectedValue(new Error('API Error'));

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Should show error message
      expect(screen.getByTestId('error')).toHaveTextContent('Failed to load theme');

      // Should still have default colors
      expect(screen.getByTestId('primary-color')).toHaveTextContent('#2563eb');
    });
  });

  describe('useTheme hook', () => {
    it('throws error when used outside ThemeProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<ThemeConsumer />);
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleSpy.mockRestore();
    });

    it('provides updateColors function', async () => {
      const TestComponent: React.FC = () => {
        const { updateColors, colors } = useTheme();

        return (
          <div>
            <span data-testid="primary">{colors.primary}</span>
            <button
              data-testid="update-btn"
              onClick={() => updateColors({ primary: '#0000ff' })}
            >
              Update
            </button>
          </div>
        );
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('primary')).toHaveTextContent('#ff0000');
      });

      const updateBtn = screen.getByTestId('update-btn');
      await act(async () => {
        updateBtn.click();
      });

      expect(themeService.updateThemeColors).toHaveBeenCalledWith({ primary: '#0000ff' });
    });

    it('provides refreshTheme function', async () => {
      const TestComponent: React.FC = () => {
        const { refreshTheme } = useTheme();

        return (
          <button data-testid="refresh-btn" onClick={() => refreshTheme()}>
            Refresh
          </button>
        );
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(themeService.getThemeColors).toHaveBeenCalledTimes(1);
      });

      const refreshBtn = screen.getByTestId('refresh-btn');
      await act(async () => {
        refreshBtn.click();
      });

      expect(themeService.getThemeColors).toHaveBeenCalledTimes(2);
    });

    it('provides resetToDefault function', async () => {
      const TestComponent: React.FC = () => {
        const { resetToDefault, colors } = useTheme();

        return (
          <div>
            <span data-testid="primary">{colors.primary}</span>
            <button data-testid="reset-btn" onClick={() => resetToDefault()}>
              Reset
            </button>
          </div>
        );
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('primary')).toHaveTextContent('#ff0000');
      });

      const resetBtn = screen.getByTestId('reset-btn');
      await act(async () => {
        resetBtn.click();
      });

      expect(themeService.clearCache).toHaveBeenCalled();
      expect(screen.getByTestId('primary')).toHaveTextContent('#2563eb');
    });
  });

  describe('useThemeColor hook', () => {
    it('returns primary color', async () => {
      render(
        <ThemeProvider>
          <ThemeColorConsumer colorPath="primary" />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('color-value')).toHaveTextContent('#ff0000');
      });
    });

    it('returns nested color path', async () => {
      render(
        <ThemeProvider>
          <ThemeColorConsumer colorPath="text.primary" />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('color-value')).toHaveTextContent('#000000');
      });
    });

    it('returns status color', async () => {
      render(
        <ThemeProvider>
          <ThemeColorConsumer colorPath="status.success" />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('color-value')).toHaveTextContent('#00ff00');
      });
    });

    it('returns default color for invalid path', async () => {
      // Suppress console.warn for this test
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      render(
        <ThemeProvider>
          <ThemeColorConsumer colorPath="invalid.path" />
        </ThemeProvider>
      );

      await waitFor(() => {
        // Should return default primary color for invalid path
        expect(screen.getByTestId('color-value')).toHaveTextContent('#2563eb');
      });

      consoleSpy.mockRestore();
    });
  });
});
