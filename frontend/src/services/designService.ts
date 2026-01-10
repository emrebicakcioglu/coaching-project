/**
 * Design Service
 * Design System: Color Schemes Management
 *
 * Frontend service for managing color schemes and design tokens.
 *
 * API Endpoints:
 * - GET    /api/v1/design/schemes         - List all color schemes
 * - GET    /api/v1/design/schemes/active  - Get active scheme
 * - GET    /api/v1/design/schemes/:id     - Get single scheme
 * - POST   /api/v1/design/schemes         - Create scheme
 * - PUT    /api/v1/design/schemes/:id     - Update scheme
 * - DELETE /api/v1/design/schemes/:id     - Delete scheme
 * - POST   /api/v1/design/schemes/:id/apply     - Apply scheme
 * - POST   /api/v1/design/schemes/:id/duplicate - Duplicate scheme
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:14102/api/v1';

// Token storage keys (shared with authService)
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

/**
 * Button style configuration
 */
export interface ButtonStyle {
  background: string;
  text: string;
  border: string;
  hoverBackground: string;
  hoverText: string;
  hoverBorder: string;
}

/**
 * Typography style configuration
 */
export interface TypographyStyle {
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  color?: string;
  fontFamily?: string;
  textTransform?: string;
  letterSpacing?: string;
  background?: string;
}

/**
 * Color scheme colors structure
 */
export interface ColorSchemeColors {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  secondary: string;
  secondaryHover: string;
  secondaryLight: string;
  accent: string;
  accentHover: string;
  accentLight: string;
  background: {
    page: string;
    card: string;
    sidebar: string;
    modal: string;
    input: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
    link: string;
  };
  border: {
    light: string;
    default: string;
    dark: string;
  };
  status: {
    success: string;
    successLight: string;
    warning: string;
    warningLight: string;
    error: string;
    errorLight: string;
    info: string;
    infoLight: string;
  };
}

/**
 * Button styles structure
 */
export interface ColorSchemeButtons {
  normal: ButtonStyle;
  inactive: ButtonStyle;
  abort: ButtonStyle;
  special: ButtonStyle;
  danger: ButtonStyle;
  success: ButtonStyle;
}

/**
 * Typography structure
 */
export interface ColorSchemeTypography {
  fontFamily: {
    primary: string;
    mono: string;
  };
  heading: {
    h1: TypographyStyle;
    h2: TypographyStyle;
    h3: TypographyStyle;
    h4: TypographyStyle;
    h5: TypographyStyle;
    h6: TypographyStyle;
  };
  body: {
    large: TypographyStyle;
    normal: TypographyStyle;
    small: TypographyStyle;
  };
  label: {
    large: TypographyStyle;
    normal: TypographyStyle;
    small: TypographyStyle;
  };
  code: TypographyStyle;
}

/**
 * Input styles structure
 */
export interface ColorSchemeInputs {
  normal: {
    background: string;
    text: string;
    border: string;
    placeholder: string;
    focusBorder: string;
    focusRing: string;
  };
  error: {
    background: string;
    text: string;
    border: string;
    placeholder: string;
    focusBorder: string;
    focusRing: string;
  };
  disabled: {
    background: string;
    text: string;
    border: string;
    placeholder: string;
    focusBorder: string;
    focusRing: string;
  };
}

/**
 * Card styles structure
 */
export interface ColorSchemeCards {
  default: {
    background: string;
    border: string;
    shadow: string;
    borderRadius: string;
  };
  elevated: {
    background: string;
    border: string;
    shadow: string;
    borderRadius: string;
  };
  flat: {
    background: string;
    border: string;
    shadow: string;
    borderRadius: string;
  };
}

/**
 * Badge styles structure
 */
export interface ColorSchemeBadges {
  default: { background: string; text: string };
  primary: { background: string; text: string };
  secondary: { background: string; text: string };
  success: { background: string; text: string };
  warning: { background: string; text: string };
  error: { background: string; text: string };
  info: { background: string; text: string };
}

/**
 * Alert styles structure
 */
export interface ColorSchemeAlerts {
  success: { background: string; border: string; text: string; icon: string };
  warning: { background: string; border: string; text: string; icon: string };
  error: { background: string; border: string; text: string; icon: string };
  info: { background: string; border: string; text: string; icon: string };
}

/**
 * Complete color scheme
 */
export interface ColorScheme {
  id: number;
  name: string;
  description?: string;
  description_key?: string;
  is_active: boolean;
  is_default: boolean;
  is_light_scheme: boolean;
  is_dark_scheme: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
  colors: ColorSchemeColors;
  buttons: ColorSchemeButtons;
  typography: ColorSchemeTypography;
  inputs: ColorSchemeInputs;
  cards: ColorSchemeCards;
  badges: ColorSchemeBadges;
  alerts: ColorSchemeAlerts;
}

/**
 * Active scheme response
 */
export interface ActiveColorScheme {
  id: number;
  name: string;
  tokens: {
    colors: ColorSchemeColors;
    buttons: ColorSchemeButtons;
    typography: ColorSchemeTypography;
    inputs: ColorSchemeInputs;
    cards: ColorSchemeCards;
    badges: ColorSchemeBadges;
    alerts: ColorSchemeAlerts;
  };
}

/**
 * Create color scheme DTO
 */
export interface CreateColorSchemeDto {
  name: string;
  description?: string;
  colors?: Partial<ColorSchemeColors>;
  buttons?: Partial<ColorSchemeButtons>;
  typography?: Partial<ColorSchemeTypography>;
  inputs?: Partial<ColorSchemeInputs>;
  cards?: Partial<ColorSchemeCards>;
  badges?: Partial<ColorSchemeBadges>;
  alerts?: Partial<ColorSchemeAlerts>;
}

/**
 * Update color scheme DTO
 */
export interface UpdateColorSchemeDto {
  name?: string;
  description?: string;
  is_active?: boolean;
  colors?: Partial<ColorSchemeColors>;
  buttons?: Partial<ColorSchemeButtons>;
  typography?: Partial<ColorSchemeTypography>;
  inputs?: Partial<ColorSchemeInputs>;
  cards?: Partial<ColorSchemeCards>;
  badges?: Partial<ColorSchemeBadges>;
  alerts?: Partial<ColorSchemeAlerts>;
}

/**
 * Axios instance for design API requests
 */
const designApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Add auth token to requests
 */
designApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Handle 401 errors with token refresh
 * Note: Design API calls should not redirect to login on failure
 * as they may be used on public pages for theme loading
 */
designApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Don't try to refresh or redirect for design requests - just reject
      // The design service will handle fallbacks appropriately
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
        return designApi(originalRequest);
      } catch {
        // Refresh failed - don't redirect, just reject the error
        // The calling code will handle fallbacks
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Design Service
 */
export const designService = {
  /**
   * Get all color schemes
   */
  async getSchemes(): Promise<ColorScheme[]> {
    const response = await designApi.get<ColorScheme[]>('/design/schemes');
    return response.data;
  },

  /**
   * Get active color scheme (public)
   */
  async getActiveScheme(): Promise<ActiveColorScheme> {
    const response = await designApi.get<ActiveColorScheme>('/design/schemes/active');
    return response.data;
  },

  /**
   * Get a single color scheme
   */
  async getScheme(id: number): Promise<ColorScheme> {
    const response = await designApi.get<ColorScheme>(`/design/schemes/${id}`);
    return response.data;
  },

  /**
   * Create a new color scheme
   */
  async createScheme(data: CreateColorSchemeDto): Promise<ColorScheme> {
    const response = await designApi.post<ColorScheme>('/design/schemes', data);
    return response.data;
  },

  /**
   * Update a color scheme
   */
  async updateScheme(id: number, data: UpdateColorSchemeDto): Promise<ColorScheme> {
    const response = await designApi.put<ColorScheme>(`/design/schemes/${id}`, data);
    return response.data;
  },

  /**
   * Delete a color scheme
   */
  async deleteScheme(id: number): Promise<void> {
    await designApi.delete(`/design/schemes/${id}`);
  },

  /**
   * Apply a color scheme
   */
  async applyScheme(id: number): Promise<ColorScheme> {
    const response = await designApi.post<ColorScheme>(`/design/schemes/${id}/apply`);
    return response.data;
  },

  /**
   * Duplicate a color scheme
   */
  async duplicateScheme(id: number, newName: string): Promise<ColorScheme> {
    const response = await designApi.post<ColorScheme>(`/design/schemes/${id}/duplicate`, { name: newName });
    return response.data;
  },

  /**
   * Rename a color scheme
   */
  async renameScheme(id: number, newName: string): Promise<ColorScheme> {
    const response = await designApi.put<ColorScheme>(`/design/schemes/${id}`, { name: newName });
    return response.data;
  },

  /**
   * Validate hex color
   */
  /**
   * Get scheme mode assignments (light and dark scheme IDs)
   */
  async getSchemeModes(): Promise<{ lightSchemeId: number | null; darkSchemeId: number | null }> {
    const response = await designApi.get<{ lightSchemeId: number | null; darkSchemeId: number | null }>('/design/schemes/modes');
    return response.data;
  },

  /**
   * Set a scheme as light mode
   */
  async setAsLightScheme(id: number): Promise<ColorScheme> {
    const response = await designApi.post<ColorScheme>(`/design/schemes/${id}/set-light-mode`);
    return response.data;
  },

  /**
   * Set a scheme as dark mode
   */
  async setAsDarkScheme(id: number): Promise<ColorScheme> {
    const response = await designApi.post<ColorScheme>(`/design/schemes/${id}/set-dark-mode`);
    return response.data;
  },

  /**
   * Clear light mode flag from a scheme
   */
  async clearLightScheme(id: number): Promise<ColorScheme> {
    const response = await designApi.post<ColorScheme>(`/design/schemes/${id}/clear-light-mode`);
    return response.data;
  },

  /**
   * Clear dark mode flag from a scheme
   */
  async clearDarkScheme(id: number): Promise<ColorScheme> {
    const response = await designApi.post<ColorScheme>(`/design/schemes/${id}/clear-dark-mode`);
    return response.data;
  },

  /**
   * Export a color scheme to JSON
   */
  async exportScheme(id: number): Promise<ColorSchemeExportDto> {
    const response = await designApi.get<ColorSchemeExportDto>(`/design/schemes/${id}/export`);
    return response.data;
  },

  /**
   * Import a color scheme from JSON
   */
  async importScheme(data: ImportColorSchemeDto): Promise<ColorScheme> {
    const response = await designApi.post<ColorScheme>('/design/schemes/import', data);
    return response.data;
  },

  /**
   * Validate hex color
   */
  isValidHexColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  },
};

/**
 * Export format for color schemes
 */
export interface ColorSchemeExportDto {
  name: string;
  description?: string;
  colors: ColorSchemeColors;
  buttons: ColorSchemeButtons;
  typography: ColorSchemeTypography;
  inputs: ColorSchemeInputs;
  cards: ColorSchemeCards;
  badges: ColorSchemeBadges;
  alerts: ColorSchemeAlerts;
  exportedAt: string;
  version: string;
}

/**
 * Import color scheme DTO
 */
export interface ImportColorSchemeDto {
  name: string;
  description?: string;
  colors: ColorSchemeColors;
  buttons: ColorSchemeButtons;
  typography: ColorSchemeTypography;
  inputs: ColorSchemeInputs;
  cards: ColorSchemeCards;
  badges: ColorSchemeBadges;
  alerts: ColorSchemeAlerts;
}

export default designService;
