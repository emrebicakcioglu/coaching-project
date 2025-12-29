/**
 * Theme Context
 * STORY-017B: Theme-System Frontend
 *
 * Provides theme colors throughout the application via React Context.
 * Fetches theme from backend API on app start and applies CSS variables.
 * Supports real-time theme updates without page refresh.
 *
 * @example
 * ```tsx
 * function ThemedComponent() {
 *   const { colors, updateColors, isLoading } = useTheme();
 *
 *   return (
 *     <div style={{ color: colors.text.primary }}>
 *       Primary: {colors.primary}
 *     </div>
 *   );
 * }
 * ```
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  themeService,
  ThemeColors,
  UpdateThemeColorsDto,
  DEFAULT_THEME_COLORS,
  ThemeInputColors,
} from '../services/themeService';
import { logger } from '../services/loggerService';

/**
 * Theme context state interface
 */
export interface ThemeContextState {
  /** Current theme colors */
  colors: ThemeColors;
  /** Whether theme is being loaded */
  isLoading: boolean;
  /** Error message if theme loading failed */
  error: string | null;
  /** Update theme colors */
  updateColors: (colors: UpdateThemeColorsDto) => Promise<void>;
  /** Refresh theme from server */
  refreshTheme: () => Promise<void>;
  /** Reset to default theme */
  resetToDefault: () => void;
}

/**
 * Default context value
 */
const defaultContextValue: ThemeContextState = {
  colors: DEFAULT_THEME_COLORS,
  isLoading: true,
  error: null,
  updateColors: async () => {
    throw new Error('ThemeContext not initialized');
  },
  refreshTheme: async () => {
    throw new Error('ThemeContext not initialized');
  },
  resetToDefault: () => {
    throw new Error('ThemeContext not initialized');
  },
};

/**
 * Theme Context
 */
export const ThemeContext = createContext<ThemeContextState>(defaultContextValue);

/**
 * Theme Provider Props
 */
export interface ThemeProviderProps {
  children: React.ReactNode;
  /** Test ID for E2E testing */
  'data-testid'?: string;
}

/**
 * Apply theme colors as CSS custom properties on document root
 *
 * @param colors - Theme colors to apply
 */
function applyThemeToCss(colors: ThemeColors): void {
  const root = document.documentElement;

  // Primary color
  root.style.setProperty('--color-primary', colors.primary);
  root.style.setProperty('--color-primary-600', colors.primary);

  // Secondary color
  root.style.setProperty('--color-secondary', colors.secondary);
  root.style.setProperty('--color-secondary-600', colors.secondary);

  // Background colors
  root.style.setProperty('--color-background-page', colors.background.page);
  root.style.setProperty('--color-background-card', colors.background.card);

  // Text colors
  root.style.setProperty('--color-text-primary', colors.text.primary);
  root.style.setProperty('--color-text-secondary', colors.text.secondary);

  // Status colors
  root.style.setProperty('--color-success', colors.status.success);
  root.style.setProperty('--color-warning', colors.status.warning);
  root.style.setProperty('--color-error', colors.status.error);

  // Input colors (if provided)
  if (colors.inputs) {
    // Normal input state
    root.style.setProperty('--color-input-background', colors.inputs.normal.background);
    root.style.setProperty('--color-input-text', colors.inputs.normal.text);
    root.style.setProperty('--color-input-border', colors.inputs.normal.border);
    root.style.setProperty('--color-input-placeholder', colors.inputs.normal.placeholder);
    root.style.setProperty('--color-input-focus-border', colors.inputs.normal.focusBorder);
    root.style.setProperty('--color-input-focus-ring', colors.inputs.normal.focusRing);

    // Error input state
    root.style.setProperty('--color-input-error-background', colors.inputs.error.background);
    root.style.setProperty('--color-input-error-text', colors.inputs.error.text);
    root.style.setProperty('--color-input-error-border', colors.inputs.error.border);
    root.style.setProperty('--color-input-error-placeholder', colors.inputs.error.placeholder);
    root.style.setProperty('--color-input-error-focus-border', colors.inputs.error.focusBorder);
    root.style.setProperty('--color-input-error-focus-ring', colors.inputs.error.focusRing);

    // Disabled input state
    root.style.setProperty('--color-input-disabled-background', colors.inputs.disabled.background);
    root.style.setProperty('--color-input-disabled-text', colors.inputs.disabled.text);
    root.style.setProperty('--color-input-disabled-border', colors.inputs.disabled.border);
    root.style.setProperty('--color-input-disabled-placeholder', colors.inputs.disabled.placeholder);
  }

  // Button colors (if provided)
  if (colors.buttons) {
    const buttonTypes = ['normal', 'inactive', 'abort', 'special', 'danger', 'success'] as const;
    buttonTypes.forEach(type => {
      const btn = colors.buttons![type];
      root.style.setProperty(`--color-button-${type}-bg`, btn.background);
      root.style.setProperty(`--color-button-${type}-text`, btn.text);
      root.style.setProperty(`--color-button-${type}-border`, btn.border);
      root.style.setProperty(`--color-button-${type}-hover-bg`, btn.hoverBackground);
      root.style.setProperty(`--color-button-${type}-hover-text`, btn.hoverText);
      root.style.setProperty(`--color-button-${type}-hover-border`, btn.hoverBorder);
    });
  }

  // Typography (if provided)
  if (colors.typography) {
    // Font families
    root.style.setProperty('--font-family-primary', colors.typography.fontFamily.primary);
    root.style.setProperty('--font-family-mono', colors.typography.fontFamily.mono);

    // Headings
    const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
    headings.forEach(h => {
      const style = colors.typography!.heading[h];
      root.style.setProperty(`--typography-${h}-size`, style.fontSize);
      root.style.setProperty(`--typography-${h}-weight`, style.fontWeight);
      root.style.setProperty(`--typography-${h}-line-height`, style.lineHeight);
      if (style.color) root.style.setProperty(`--typography-${h}-color`, style.color);
    });

    // Body text
    const bodySizes = ['large', 'normal', 'small'] as const;
    bodySizes.forEach(size => {
      const style = colors.typography!.body[size];
      root.style.setProperty(`--typography-body-${size}-size`, style.fontSize);
      root.style.setProperty(`--typography-body-${size}-weight`, style.fontWeight);
      root.style.setProperty(`--typography-body-${size}-line-height`, style.lineHeight);
      if (style.color) root.style.setProperty(`--typography-body-${size}-color`, style.color);
    });
  }

  // Card colors (if provided)
  if (colors.cards) {
    const cardTypes = ['default', 'elevated', 'flat'] as const;
    cardTypes.forEach(type => {
      const card = colors.cards![type];
      root.style.setProperty(`--color-card-${type}-bg`, card.background);
      root.style.setProperty(`--color-card-${type}-border`, card.border);
      root.style.setProperty(`--color-card-${type}-shadow`, card.shadow);
      root.style.setProperty(`--color-card-${type}-radius`, card.borderRadius);
    });
  }

  // Badge colors (if provided)
  if (colors.badges) {
    const badgeTypes = ['default', 'primary', 'secondary', 'success', 'warning', 'error', 'info'] as const;
    badgeTypes.forEach(type => {
      const badge = colors.badges![type];
      root.style.setProperty(`--color-badge-${type}-bg`, badge.background);
      root.style.setProperty(`--color-badge-${type}-text`, badge.text);
    });
  }

  // Alert colors (if provided)
  if (colors.alerts) {
    const alertTypes = ['success', 'warning', 'error', 'info'] as const;
    alertTypes.forEach(type => {
      const alert = colors.alerts![type];
      root.style.setProperty(`--color-alert-${type}-bg`, alert.background);
      root.style.setProperty(`--color-alert-${type}-border`, alert.border);
      root.style.setProperty(`--color-alert-${type}-text`, alert.text);
      root.style.setProperty(`--color-alert-${type}-icon`, alert.icon);
    });
  }

  // Also update neutral colors based on background
  // This enables proper contrast for cards and page backgrounds
  const isLightTheme = isLightColor(colors.background.page);
  if (isLightTheme) {
    root.style.setProperty('--color-neutral-50', '#f9fafb');
    root.style.setProperty('--color-neutral-800', colors.text.primary);
    // Light mode: surface, input, modal, and border colors
    root.style.setProperty('--color-background-surface', '#f9fafb');
    root.style.setProperty('--color-background-input', colors.inputs?.normal.background || '#ffffff');
    root.style.setProperty('--color-background-modal', '#ffffff');
    root.style.setProperty('--color-border-default', colors.inputs?.normal.border || '#e5e7eb');
    root.style.setProperty('--color-border-light', '#f3f4f6');
    root.style.setProperty('--color-border-hover', '#9ca3af');
    root.style.setProperty('--color-text-tertiary', '#9ca3af');
    root.style.setProperty('--color-text-muted', colors.inputs?.normal.placeholder || '#9ca3af');
  } else {
    root.style.setProperty('--color-neutral-50', colors.background.page);
    root.style.setProperty('--color-neutral-800', '#f9fafb');
    // Dark mode: surface, input, modal, and border colors
    root.style.setProperty('--color-background-surface', colors.background.card);
    root.style.setProperty('--color-background-input', colors.inputs?.normal.background || colors.background.card);
    root.style.setProperty('--color-background-modal', colors.background.card);
    root.style.setProperty('--color-border-default', colors.inputs?.normal.border || '#374151');
    root.style.setProperty('--color-border-light', '#1f2937');
    root.style.setProperty('--color-border-hover', '#6b7280');
    root.style.setProperty('--color-text-tertiary', '#6b7280');
    root.style.setProperty('--color-text-muted', colors.inputs?.normal.placeholder || '#6b7280');
  }

  // Update body background color directly
  document.body.style.backgroundColor = colors.background.page;
}

/**
 * Determine if a color is light or dark
 * Used for proper contrast calculations
 *
 * @param color - Hex color string
 * @returns True if color is light
 */
function isLightColor(color: string): boolean {
  // Remove # if present
  const hex = color.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5;
}

/**
 * Theme Provider Component
 *
 * Wraps the application to provide theme colors and CSS variable application.
 * Fetches theme from backend on mount and updates CSS variables reactively.
 * Listens for 'theme-changed' custom event to refresh theme when color scheme is applied.
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  'data-testid': testId = 'theme-provider',
}) => {
  const [colors, setColors] = useState<ThemeColors>(DEFAULT_THEME_COLORS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch theme from backend API
   */
  const fetchTheme = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const themeColors = await themeService.getThemeColors();
      setColors(themeColors);
    } catch (err) {
      logger.error('Failed to fetch theme', err);
      setError('Failed to load theme. Using default colors.');
      // Colors will remain at default from state initialization
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load theme on component mount
   */
  useEffect(() => {
    fetchTheme();
  }, [fetchTheme]);

  /**
   * Listen for theme-changed events (dispatched from DesignSystemPage when scheme is applied)
   */
  useEffect(() => {
    const handleThemeChanged = () => {
      fetchTheme();
    };

    window.addEventListener('theme-changed', handleThemeChanged);
    return () => {
      window.removeEventListener('theme-changed', handleThemeChanged);
    };
  }, [fetchTheme]);

  /**
   * Apply CSS variables whenever colors change
   */
  useEffect(() => {
    applyThemeToCss(colors);
  }, [colors]);

  /**
   * Update theme colors
   * Calls backend API and updates local state
   */
  const updateColors = useCallback(async (newColors: UpdateThemeColorsDto): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const updatedColors = await themeService.updateThemeColors(newColors);
      setColors(updatedColors);
    } catch (err) {
      logger.error('Failed to update theme', err);
      setError('Failed to update theme. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh theme from server
   */
  const refreshTheme = useCallback(async (): Promise<void> => {
    await fetchTheme();
  }, [fetchTheme]);

  /**
   * Reset to default theme
   */
  const resetToDefault = useCallback((): void => {
    themeService.clearCache();
    setColors(DEFAULT_THEME_COLORS);
    setError(null);
  }, []);

  /**
   * Memoized context value
   */
  const contextValue = useMemo<ThemeContextState>(
    () => ({
      colors,
      isLoading,
      error,
      updateColors,
      refreshTheme,
      resetToDefault,
    }),
    [colors, isLoading, error, updateColors, refreshTheme, resetToDefault]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <div data-testid={testId}>{children}</div>
    </ThemeContext.Provider>
  );
};

/**
 * Hook to access theme context
 *
 * @throws Error if used outside ThemeProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { colors, updateColors } = useTheme();
 *   return <div style={{ color: colors.primary }}>Themed content</div>;
 * }
 * ```
 */
export function useTheme(): ThemeContextState {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Hook to get specific color value from theme
 *
 * @param colorPath - Dot-notation path to color (e.g., 'primary', 'text.primary', 'status.success')
 * @returns Color value string
 *
 * @example
 * ```tsx
 * function Button() {
 *   const primaryColor = useThemeColor('primary');
 *   const textColor = useThemeColor('text.primary');
 *   return <button style={{ background: primaryColor, color: textColor }}>Click</button>;
 * }
 * ```
 */
export function useThemeColor(colorPath: string): string {
  const { colors } = useTheme();

  const parts = colorPath.split('.');
  let value: unknown = colors;

  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      logger.warn(`Invalid color path: ${colorPath}`);
      return DEFAULT_THEME_COLORS.primary;
    }
  }

  return typeof value === 'string' ? value : DEFAULT_THEME_COLORS.primary;
}

export default ThemeContext;
