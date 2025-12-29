/**
 * Theme Service
 * STORY-017B: Theme-System Frontend
 *
 * Service for fetching and updating theme colors from the backend API.
 * Provides methods to get and update theme settings.
 *
 * API Endpoints:
 * - GET  /api/v1/design/schemes/active - Get active color scheme (primary)
 * - GET  /api/v1/settings/theme - Get current theme colors (fallback)
 * - PUT  /api/v1/settings/theme - Update theme colors (requires auth)
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { logger } from './loggerService';

/**
 * Base URL for API requests
 * Uses environment variable or defaults to localhost
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:14102/api/v1';

/**
 * Background colors configuration
 */
export interface ThemeBackgroundColors {
  page: string;
  card: string;
}

/**
 * Text colors configuration
 */
export interface ThemeTextColors {
  primary: string;
  secondary: string;
}

/**
 * Status colors configuration
 */
export interface ThemeStatusColors {
  success: string;
  warning: string;
  error: string;
}

/**
 * Input field colors configuration for a specific state
 */
export interface ThemeInputStateColors {
  background: string;
  text: string;
  border: string;
  placeholder: string;
  focusBorder: string;
  focusRing: string;
}

/**
 * Input field colors configuration
 */
export interface ThemeInputColors {
  normal: ThemeInputStateColors;
  error: ThemeInputStateColors;
  disabled: ThemeInputStateColors;
}

/**
 * Button style configuration
 */
export interface ThemeButtonStyle {
  background: string;
  text: string;
  border: string;
  hoverBackground: string;
  hoverText: string;
  hoverBorder: string;
}

/**
 * Button colors configuration
 */
export interface ThemeButtonColors {
  normal: ThemeButtonStyle;
  inactive: ThemeButtonStyle;
  abort: ThemeButtonStyle;
  special: ThemeButtonStyle;
  danger: ThemeButtonStyle;
  success: ThemeButtonStyle;
}

/**
 * Typography style configuration
 */
export interface ThemeTypographyStyle {
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  color?: string;
}

/**
 * Typography configuration
 */
export interface ThemeTypography {
  fontFamily: {
    primary: string;
    mono: string;
  };
  heading: {
    h1: ThemeTypographyStyle;
    h2: ThemeTypographyStyle;
    h3: ThemeTypographyStyle;
    h4: ThemeTypographyStyle;
    h5: ThemeTypographyStyle;
    h6: ThemeTypographyStyle;
  };
  body: {
    large: ThemeTypographyStyle;
    normal: ThemeTypographyStyle;
    small: ThemeTypographyStyle;
  };
}

/**
 * Card style configuration
 */
export interface ThemeCardStyle {
  background: string;
  border: string;
  shadow: string;
  borderRadius: string;
}

/**
 * Card colors configuration
 */
export interface ThemeCardColors {
  default: ThemeCardStyle;
  elevated: ThemeCardStyle;
  flat: ThemeCardStyle;
}

/**
 * Badge style configuration
 */
export interface ThemeBadgeStyle {
  background: string;
  text: string;
}

/**
 * Badge colors configuration
 */
export interface ThemeBadgeColors {
  default: ThemeBadgeStyle;
  primary: ThemeBadgeStyle;
  secondary: ThemeBadgeStyle;
  success: ThemeBadgeStyle;
  warning: ThemeBadgeStyle;
  error: ThemeBadgeStyle;
  info: ThemeBadgeStyle;
}

/**
 * Alert style configuration
 */
export interface ThemeAlertStyle {
  background: string;
  border: string;
  text: string;
  icon: string;
}

/**
 * Alert colors configuration
 */
export interface ThemeAlertColors {
  success: ThemeAlertStyle;
  warning: ThemeAlertStyle;
  error: ThemeAlertStyle;
  info: ThemeAlertStyle;
}

/**
 * Complete theme colors configuration
 * Matches the backend EnhancedThemeColors structure
 */
export interface ThemeColors {
  primary: string;
  secondary: string;
  background: ThemeBackgroundColors;
  text: ThemeTextColors;
  status: ThemeStatusColors;
  inputs?: ThemeInputColors;
  buttons?: ThemeButtonColors;
  typography?: ThemeTypography;
  cards?: ThemeCardColors;
  badges?: ThemeBadgeColors;
  alerts?: ThemeAlertColors;
}

/**
 * Theme update request DTO
 */
export interface UpdateThemeColorsDto {
  primary?: string;
  secondary?: string;
  background?: Partial<ThemeBackgroundColors>;
  text?: Partial<ThemeTextColors>;
  status?: Partial<ThemeStatusColors>;
}

/**
 * Default input colors
 */
const DEFAULT_INPUT_COLORS: ThemeInputColors = {
  normal: {
    background: '#ffffff',
    text: '#111827',
    border: '#d1d5db',
    placeholder: '#9ca3af',
    focusBorder: '#2563eb',
    focusRing: 'rgba(37, 99, 235, 0.2)',
  },
  error: {
    background: '#fef2f2',
    text: '#991b1b',
    border: '#ef4444',
    placeholder: '#f87171',
    focusBorder: '#dc2626',
    focusRing: 'rgba(239, 68, 68, 0.2)',
  },
  disabled: {
    background: '#f3f4f6',
    text: '#9ca3af',
    border: '#e5e7eb',
    placeholder: '#d1d5db',
    focusBorder: '#e5e7eb',
    focusRing: 'transparent',
  },
};

/**
 * Default button colors
 */
const DEFAULT_BUTTON_COLORS: ThemeButtonColors = {
  normal: {
    background: '#2563eb',
    text: '#ffffff',
    border: '#2563eb',
    hoverBackground: '#1d4ed8',
    hoverText: '#ffffff',
    hoverBorder: '#1d4ed8',
  },
  inactive: {
    background: '#e5e7eb',
    text: '#6b7280',
    border: '#e5e7eb',
    hoverBackground: '#d1d5db',
    hoverText: '#4b5563',
    hoverBorder: '#d1d5db',
  },
  abort: {
    background: '#ffffff',
    text: '#6b7280',
    border: '#d1d5db',
    hoverBackground: '#f3f4f6',
    hoverText: '#374151',
    hoverBorder: '#9ca3af',
  },
  special: {
    background: '#7c3aed',
    text: '#ffffff',
    border: '#7c3aed',
    hoverBackground: '#6d28d9',
    hoverText: '#ffffff',
    hoverBorder: '#6d28d9',
  },
  danger: {
    background: '#ef4444',
    text: '#ffffff',
    border: '#ef4444',
    hoverBackground: '#dc2626',
    hoverText: '#ffffff',
    hoverBorder: '#dc2626',
  },
  success: {
    background: '#10b981',
    text: '#ffffff',
    border: '#10b981',
    hoverBackground: '#059669',
    hoverText: '#ffffff',
    hoverBorder: '#059669',
  },
};

/**
 * Default typography
 */
const DEFAULT_TYPOGRAPHY: ThemeTypography = {
  fontFamily: {
    primary: 'ui-sans-serif, system-ui, sans-serif',
    mono: 'ui-monospace, monospace',
  },
  heading: {
    h1: { fontSize: '2.25rem', fontWeight: '700', lineHeight: '2.5rem', color: '#111827' },
    h2: { fontSize: '1.875rem', fontWeight: '600', lineHeight: '2.25rem', color: '#111827' },
    h3: { fontSize: '1.5rem', fontWeight: '600', lineHeight: '2rem', color: '#111827' },
    h4: { fontSize: '1.25rem', fontWeight: '600', lineHeight: '1.75rem', color: '#111827' },
    h5: { fontSize: '1.125rem', fontWeight: '600', lineHeight: '1.75rem', color: '#111827' },
    h6: { fontSize: '1rem', fontWeight: '600', lineHeight: '1.5rem', color: '#111827' },
  },
  body: {
    large: { fontSize: '1.125rem', fontWeight: '400', lineHeight: '1.75rem', color: '#374151' },
    normal: { fontSize: '1rem', fontWeight: '400', lineHeight: '1.5rem', color: '#374151' },
    small: { fontSize: '0.875rem', fontWeight: '400', lineHeight: '1.25rem', color: '#6b7280' },
  },
};

/**
 * Default card colors
 * DESIGN_SYSTEM: border-radius: 8px, shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05), border: #2b2d31
 */
const DEFAULT_CARD_COLORS: ThemeCardColors = {
  default: {
    background: '#ffffff',
    border: '#2b2d31',
    shadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    borderRadius: '8px',
  },
  elevated: {
    background: '#ffffff',
    border: 'transparent',
    shadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    borderRadius: '8px',
  },
  flat: {
    background: '#f9fafb',
    border: 'transparent',
    shadow: 'none',
    borderRadius: '8px',
  },
};

/**
 * Default badge colors
 */
const DEFAULT_BADGE_COLORS: ThemeBadgeColors = {
  default: { background: '#e5e7eb', text: '#374151' },
  primary: { background: '#dbeafe', text: '#1e40af' },
  secondary: { background: '#e0e7ff', text: '#3730a3' },
  success: { background: '#d1fae5', text: '#065f46' },
  warning: { background: '#fef3c7', text: '#92400e' },
  error: { background: '#fee2e2', text: '#991b1b' },
  info: { background: '#dbeafe', text: '#1e40af' },
};

/**
 * Default alert colors
 */
const DEFAULT_ALERT_COLORS: ThemeAlertColors = {
  success: { background: '#ecfdf5', border: '#10b981', text: '#065f46', icon: '#10b981' },
  warning: { background: '#fffbeb', border: '#f59e0b', text: '#92400e', icon: '#f59e0b' },
  error: { background: '#fef2f2', border: '#ef4444', text: '#991b1b', icon: '#ef4444' },
  info: { background: '#eff6ff', border: '#3b82f6', text: '#1e40af', icon: '#3b82f6' },
};

/**
 * Default theme colors
 * Used as fallback when API is unavailable
 */
export const DEFAULT_THEME_COLORS: ThemeColors = {
  primary: '#2563eb',
  secondary: '#7c3aed',
  background: {
    page: '#ffffff',
    card: '#f9fafb',
  },
  text: {
    primary: '#111827',
    secondary: '#6b7280',
  },
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  inputs: DEFAULT_INPUT_COLORS,
  buttons: DEFAULT_BUTTON_COLORS,
  typography: DEFAULT_TYPOGRAPHY,
  cards: DEFAULT_CARD_COLORS,
  badges: DEFAULT_BADGE_COLORS,
  alerts: DEFAULT_ALERT_COLORS,
};

/**
 * Storage key for cached theme
 */
const THEME_STORAGE_KEY = 'app_theme_colors';
const DARK_MODE_PREFERENCE_KEY = 'app_dark_mode_preference';

// Token storage keys (shared with authService)
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

/**
 * Axios instance for theme API requests
 */
const themeApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Add auth token to requests if available
 */
themeApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Handle 401 errors with token refresh
 * Note: Theme API calls should not redirect to login on failure
 * as they are used on public pages (login, register, etc.)
 */
themeApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Don't try to refresh or redirect for theme requests - just reject
      // Theme service will fall back to cached/default colors
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        // Store new tokens
        localStorage.setItem(ACCESS_TOKEN_KEY, response.data.access_token);
        localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refresh_token);

        // Retry the original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
        }
        return themeApi(originalRequest);
      } catch {
        // Refresh failed - don't redirect, just reject the error
        // The theme service will fall back to cached/default colors
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Helper function to map button colors from API response
 */
function mapButtonColors(schemeButtons: any): ThemeButtonColors {
  const mapButtonStyle = (style: any, defaultStyle: ThemeButtonStyle): ThemeButtonStyle => ({
    background: style?.background || defaultStyle.background,
    text: style?.text || defaultStyle.text,
    border: style?.border || defaultStyle.border,
    hoverBackground: style?.hoverBackground || defaultStyle.hoverBackground,
    hoverText: style?.hoverText || defaultStyle.hoverText,
    hoverBorder: style?.hoverBorder || defaultStyle.hoverBorder,
  });

  return {
    normal: mapButtonStyle(schemeButtons.normal, DEFAULT_BUTTON_COLORS.normal),
    inactive: mapButtonStyle(schemeButtons.inactive, DEFAULT_BUTTON_COLORS.inactive),
    abort: mapButtonStyle(schemeButtons.abort, DEFAULT_BUTTON_COLORS.abort),
    special: mapButtonStyle(schemeButtons.special, DEFAULT_BUTTON_COLORS.special),
    danger: mapButtonStyle(schemeButtons.danger, DEFAULT_BUTTON_COLORS.danger),
    success: mapButtonStyle(schemeButtons.success, DEFAULT_BUTTON_COLORS.success),
  };
}

/**
 * Helper function to map typography from API response
 */
function mapTypography(schemeTypo: any): ThemeTypography {
  const mapStyle = (style: any, defaultStyle: ThemeTypographyStyle): ThemeTypographyStyle => ({
    fontSize: style?.fontSize || defaultStyle.fontSize,
    fontWeight: style?.fontWeight || defaultStyle.fontWeight,
    lineHeight: style?.lineHeight || defaultStyle.lineHeight,
    color: style?.color || defaultStyle.color,
  });

  return {
    fontFamily: {
      primary: schemeTypo.fontFamily?.primary || DEFAULT_TYPOGRAPHY.fontFamily.primary,
      mono: schemeTypo.fontFamily?.mono || DEFAULT_TYPOGRAPHY.fontFamily.mono,
    },
    heading: {
      h1: mapStyle(schemeTypo.heading?.h1, DEFAULT_TYPOGRAPHY.heading.h1),
      h2: mapStyle(schemeTypo.heading?.h2, DEFAULT_TYPOGRAPHY.heading.h2),
      h3: mapStyle(schemeTypo.heading?.h3, DEFAULT_TYPOGRAPHY.heading.h3),
      h4: mapStyle(schemeTypo.heading?.h4, DEFAULT_TYPOGRAPHY.heading.h4),
      h5: mapStyle(schemeTypo.heading?.h5, DEFAULT_TYPOGRAPHY.heading.h5),
      h6: mapStyle(schemeTypo.heading?.h6, DEFAULT_TYPOGRAPHY.heading.h6),
    },
    body: {
      large: mapStyle(schemeTypo.body?.large, DEFAULT_TYPOGRAPHY.body.large),
      normal: mapStyle(schemeTypo.body?.normal, DEFAULT_TYPOGRAPHY.body.normal),
      small: mapStyle(schemeTypo.body?.small, DEFAULT_TYPOGRAPHY.body.small),
    },
  };
}

/**
 * Helper function to map card colors from API response
 */
function mapCardColors(schemeCards: any): ThemeCardColors {
  const mapCardStyle = (style: any, defaultStyle: ThemeCardStyle): ThemeCardStyle => ({
    background: style?.background || defaultStyle.background,
    border: style?.border || defaultStyle.border,
    shadow: style?.shadow || defaultStyle.shadow,
    borderRadius: style?.borderRadius || defaultStyle.borderRadius,
  });

  return {
    default: mapCardStyle(schemeCards.default, DEFAULT_CARD_COLORS.default),
    elevated: mapCardStyle(schemeCards.elevated, DEFAULT_CARD_COLORS.elevated),
    flat: mapCardStyle(schemeCards.flat, DEFAULT_CARD_COLORS.flat),
  };
}

/**
 * Helper function to map badge colors from API response
 */
function mapBadgeColors(schemeBadges: any): ThemeBadgeColors {
  const mapBadgeStyle = (style: any, defaultStyle: ThemeBadgeStyle): ThemeBadgeStyle => ({
    background: style?.background || defaultStyle.background,
    text: style?.text || defaultStyle.text,
  });

  return {
    default: mapBadgeStyle(schemeBadges.default, DEFAULT_BADGE_COLORS.default),
    primary: mapBadgeStyle(schemeBadges.primary, DEFAULT_BADGE_COLORS.primary),
    secondary: mapBadgeStyle(schemeBadges.secondary, DEFAULT_BADGE_COLORS.secondary),
    success: mapBadgeStyle(schemeBadges.success, DEFAULT_BADGE_COLORS.success),
    warning: mapBadgeStyle(schemeBadges.warning, DEFAULT_BADGE_COLORS.warning),
    error: mapBadgeStyle(schemeBadges.error, DEFAULT_BADGE_COLORS.error),
    info: mapBadgeStyle(schemeBadges.info, DEFAULT_BADGE_COLORS.info),
  };
}

/**
 * Helper function to map alert colors from API response
 */
function mapAlertColors(schemeAlerts: any): ThemeAlertColors {
  const mapAlertStyle = (style: any, defaultStyle: ThemeAlertStyle): ThemeAlertStyle => ({
    background: style?.background || defaultStyle.background,
    border: style?.border || defaultStyle.border,
    text: style?.text || defaultStyle.text,
    icon: style?.icon || defaultStyle.icon,
  });

  return {
    success: mapAlertStyle(schemeAlerts.success, DEFAULT_ALERT_COLORS.success),
    warning: mapAlertStyle(schemeAlerts.warning, DEFAULT_ALERT_COLORS.warning),
    error: mapAlertStyle(schemeAlerts.error, DEFAULT_ALERT_COLORS.error),
    info: mapAlertStyle(schemeAlerts.info, DEFAULT_ALERT_COLORS.info),
  };
}

/**
 * Theme Service
 * Provides methods for theme management
 */
export const themeService = {
  /**
   * Get theme colors from the backend API
   * First tries the design system endpoint, then falls back to settings
   * Falls back to cached or default colors on error
   *
   * @returns Promise resolving to theme colors
   */
  async getThemeColors(): Promise<ThemeColors> {
    try {
      // First try the design system active scheme endpoint
      const designResponse = await themeApi.get('/design/schemes/active');
      const activeScheme = designResponse.data;

      // Map the design system response to ThemeColors format
      if (activeScheme?.tokens?.colors) {
        const schemeColors = activeScheme.tokens.colors;
        const schemeInputs = activeScheme.tokens.inputs;
        const schemeButtons = activeScheme.tokens.buttons;
        const schemeTypography = activeScheme.tokens.typography;
        const schemeCards = activeScheme.tokens.cards;
        const schemeBadges = activeScheme.tokens.badges;
        const schemeAlerts = activeScheme.tokens.alerts;

        const colors: ThemeColors = {
          primary: schemeColors.primary || DEFAULT_THEME_COLORS.primary,
          secondary: schemeColors.secondary || DEFAULT_THEME_COLORS.secondary,
          background: {
            page: schemeColors.background?.page || DEFAULT_THEME_COLORS.background.page,
            card: schemeColors.background?.card || DEFAULT_THEME_COLORS.background.card,
          },
          text: {
            primary: schemeColors.text?.primary || DEFAULT_THEME_COLORS.text.primary,
            secondary: schemeColors.text?.secondary || DEFAULT_THEME_COLORS.text.secondary,
          },
          status: {
            success: schemeColors.status?.success || DEFAULT_THEME_COLORS.status.success,
            warning: schemeColors.status?.warning || DEFAULT_THEME_COLORS.status.warning,
            error: schemeColors.status?.error || DEFAULT_THEME_COLORS.status.error,
          },
          inputs: schemeInputs ? {
            normal: {
              background: schemeInputs.normal?.background || DEFAULT_INPUT_COLORS.normal.background,
              text: schemeInputs.normal?.text || DEFAULT_INPUT_COLORS.normal.text,
              border: schemeInputs.normal?.border || DEFAULT_INPUT_COLORS.normal.border,
              placeholder: schemeInputs.normal?.placeholder || DEFAULT_INPUT_COLORS.normal.placeholder,
              focusBorder: schemeInputs.normal?.focusBorder || DEFAULT_INPUT_COLORS.normal.focusBorder,
              focusRing: schemeInputs.normal?.focusRing || DEFAULT_INPUT_COLORS.normal.focusRing,
            },
            error: {
              background: schemeInputs.error?.background || DEFAULT_INPUT_COLORS.error.background,
              text: schemeInputs.error?.text || DEFAULT_INPUT_COLORS.error.text,
              border: schemeInputs.error?.border || DEFAULT_INPUT_COLORS.error.border,
              placeholder: schemeInputs.error?.placeholder || DEFAULT_INPUT_COLORS.error.placeholder,
              focusBorder: schemeInputs.error?.focusBorder || DEFAULT_INPUT_COLORS.error.focusBorder,
              focusRing: schemeInputs.error?.focusRing || DEFAULT_INPUT_COLORS.error.focusRing,
            },
            disabled: {
              background: schemeInputs.disabled?.background || DEFAULT_INPUT_COLORS.disabled.background,
              text: schemeInputs.disabled?.text || DEFAULT_INPUT_COLORS.disabled.text,
              border: schemeInputs.disabled?.border || DEFAULT_INPUT_COLORS.disabled.border,
              placeholder: schemeInputs.disabled?.placeholder || DEFAULT_INPUT_COLORS.disabled.placeholder,
              focusBorder: schemeInputs.disabled?.focusBorder || DEFAULT_INPUT_COLORS.disabled.focusBorder,
              focusRing: schemeInputs.disabled?.focusRing || DEFAULT_INPUT_COLORS.disabled.focusRing,
            },
          } : DEFAULT_INPUT_COLORS,
          buttons: schemeButtons ? mapButtonColors(schemeButtons) : DEFAULT_BUTTON_COLORS,
          typography: schemeTypography ? mapTypography(schemeTypography) : DEFAULT_TYPOGRAPHY,
          cards: schemeCards ? mapCardColors(schemeCards) : DEFAULT_CARD_COLORS,
          badges: schemeBadges ? mapBadgeColors(schemeBadges) : DEFAULT_BADGE_COLORS,
          alerts: schemeAlerts ? mapAlertColors(schemeAlerts) : DEFAULT_ALERT_COLORS,
        };

        // Cache the theme colors
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(colors));
        return colors;
      }
    } catch (designError) {
      logger.warn('Design system endpoint not available, trying settings endpoint', designError);
    }

    try {
      // Fallback to settings theme endpoint
      const response = await themeApi.get<ThemeColors>('/settings/theme');
      const colors = response.data;

      // Cache the theme colors
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(colors));

      return colors;
    } catch (error) {
      logger.warn('Failed to fetch theme from API, using cached or default', error);

      // Try to return cached theme
      const cached = this.getCachedTheme();
      if (cached) {
        return cached;
      }

      // Return default theme as fallback
      return DEFAULT_THEME_COLORS;
    }
  },

  /**
   * Update theme colors on the backend
   * Requires authentication
   *
   * @param colors - Partial theme colors to update
   * @returns Promise resolving to updated theme colors
   */
  async updateThemeColors(colors: UpdateThemeColorsDto): Promise<ThemeColors> {
    const response = await themeApi.put<ThemeColors>('/settings/theme', colors);
    const updatedColors = response.data;

    // Update cache with new colors
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(updatedColors));

    return updatedColors;
  },

  /**
   * Get cached theme colors from localStorage
   *
   * @returns Cached theme colors or null if not available
   */
  getCachedTheme(): ThemeColors | null {
    try {
      const cached = localStorage.getItem(THEME_STORAGE_KEY);
      if (cached) {
        return JSON.parse(cached) as ThemeColors;
      }
    } catch (error) {
      logger.warn('Failed to parse cached theme', error);
    }
    return null;
  },

  /**
   * Clear cached theme colors
   */
  clearCache(): void {
    localStorage.removeItem(THEME_STORAGE_KEY);
  },

  /**
   * Get default theme colors
   *
   * @returns Default theme colors
   */
  getDefaultColors(): ThemeColors {
    return { ...DEFAULT_THEME_COLORS };
  },

  /**
   * Validate hex color format
   *
   * @param color - Color string to validate
   * @returns True if valid hex color
   */
  /**
   * Get dark mode preference from localStorage
   *
   * @returns True if dark mode is preferred, false otherwise
   */
  getDarkModePreference(): boolean {
    try {
      const preference = localStorage.getItem(DARK_MODE_PREFERENCE_KEY);
      return preference === 'true';
    } catch (error) {
      logger.warn('Failed to get dark mode preference', error);
      return false;
    }
  },

  /**
   * Set dark mode preference in localStorage
   *
   * @param isDark - True to prefer dark mode
   */
  setDarkModePreference(isDark: boolean): void {
    try {
      localStorage.setItem(DARK_MODE_PREFERENCE_KEY, String(isDark));
    } catch (error) {
      logger.warn('Failed to set dark mode preference', error);
    }
  },

  /**
   * Validate hex color format
   *
   * @param color - Color string to validate
   * @returns True if valid hex color
   */
  isValidHexColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  },
};

export default themeService;
