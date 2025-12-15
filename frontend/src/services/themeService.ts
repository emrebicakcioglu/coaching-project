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

import axios from 'axios';

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
 * Complete theme colors configuration
 * Matches the backend EnhancedThemeColors structure
 */
export interface ThemeColors {
  primary: string;
  secondary: string;
  background: ThemeBackgroundColors;
  text: ThemeTextColors;
  status: ThemeStatusColors;
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
};

/**
 * Storage key for cached theme
 */
const THEME_STORAGE_KEY = 'app_theme_colors';
const DARK_MODE_PREFERENCE_KEY = 'app_dark_mode_preference';

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
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
        };

        // Cache the theme colors
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(colors));
        return colors;
      }
    } catch (designError) {
      console.warn('Design system endpoint not available, trying settings endpoint:', designError);
    }

    try {
      // Fallback to settings theme endpoint
      const response = await themeApi.get<ThemeColors>('/settings/theme');
      const colors = response.data;

      // Cache the theme colors
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(colors));

      return colors;
    } catch (error) {
      console.warn('Failed to fetch theme from API, using cached or default:', error);

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
      console.warn('Failed to parse cached theme:', error);
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
      console.warn('Failed to get dark mode preference:', error);
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
      console.warn('Failed to set dark mode preference:', error);
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
