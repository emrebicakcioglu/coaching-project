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

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:14102/api/v1';

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
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
   * Validate hex color
   */
  isValidHexColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  },
};

export default designService;
