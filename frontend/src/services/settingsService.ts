/**
 * Settings Service
 * STORY-013B: In-App Settings Frontend UI
 *
 * Service for managing application settings via API.
 * Provides methods for CRUD operations on General, Security, and Email settings.
 */

import axios from 'axios';

// API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:14102/api/v1';

// Token storage key
const ACCESS_TOKEN_KEY = 'access_token';

/**
 * Get the current access token from storage
 */
const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

/**
 * Create axios instance with auth headers
 */
const createAuthHeaders = () => {
  const token = getAccessToken();
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
  };
};

// ===========================================
// Types & Interfaces
// ===========================================

/**
 * General Settings interface
 */
export interface GeneralSettings {
  support_email: string | null;
  session_timeout_minutes: number;
  show_timeout_warning: boolean;
  warning_before_timeout_minutes: number;
  updated_at?: string;
  updated_by?: number | null;
}

/**
 * Security Settings interface
 */
export interface SecuritySettings {
  max_login_attempts: number;
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_lowercase: boolean;
  password_require_numbers: boolean;
  password_require_special_chars: boolean;
  session_inactivity_timeout: number;
}

/**
 * Email Settings interface
 */
export interface EmailSettings {
  signature: string;
}

/**
 * All Settings combined interface
 */
export interface AllSettings {
  general: GeneralSettings;
  security: SecuritySettings;
  email: EmailSettings;
  branding?: Record<string, unknown>;
  features?: Record<string, unknown>;
}

/**
 * Update General Settings DTO
 */
export interface UpdateGeneralSettingsDto {
  support_email?: string | null;
  session_timeout_minutes?: number;
  show_timeout_warning?: boolean;
  warning_before_timeout_minutes?: number;
}

/**
 * Update Security Settings DTO
 */
export interface UpdateSecuritySettingsDto {
  max_login_attempts?: number;
  password_min_length?: number;
  password_require_uppercase?: boolean;
  password_require_lowercase?: boolean;
  password_require_numbers?: boolean;
  password_require_special_chars?: boolean;
  session_inactivity_timeout?: number;
}

/**
 * Update Email Settings DTO
 */
export interface UpdateEmailSettingsDto {
  signature?: string;
}

/**
 * Settings Category type
 */
export type SettingsCategory = 'general' | 'security' | 'email';

/**
 * Reset response interface
 */
export interface ResetResponse {
  message: string;
  settings: Record<string, unknown>;
}

// ===========================================
// Settings Service
// ===========================================

/**
 * Settings Service
 * Provides methods for managing application settings
 */
export const settingsService = {
  /**
   * Get all settings (all categories)
   * Admin only
   */
  async getAllSettings(): Promise<AllSettings> {
    const response = await axios.get<AllSettings>(
      `${API_BASE_URL}/settings/all`,
      createAuthHeaders()
    );
    return response.data;
  },

  /**
   * Get settings by category
   * Admin only
   */
  async getSettingsByCategory<T = Record<string, unknown>>(
    category: SettingsCategory
  ): Promise<T> {
    const response = await axios.get<T>(
      `${API_BASE_URL}/settings/category/${category}`,
      createAuthHeaders()
    );
    return response.data;
  },

  /**
   * Get general settings
   * Admin only
   */
  async getGeneralSettings(): Promise<GeneralSettings> {
    const response = await axios.get<GeneralSettings>(
      `${API_BASE_URL}/settings/general`,
      createAuthHeaders()
    );
    return response.data;
  },

  /**
   * Update general settings
   * Admin only
   */
  async updateGeneralSettings(
    data: UpdateGeneralSettingsDto
  ): Promise<GeneralSettings> {
    const response = await axios.put<GeneralSettings>(
      `${API_BASE_URL}/settings/general`,
      data,
      createAuthHeaders()
    );
    return response.data;
  },

  /**
   * Get security settings
   * Admin only
   */
  async getSecuritySettings(): Promise<SecuritySettings> {
    const response = await axios.get<SecuritySettings>(
      `${API_BASE_URL}/settings/security`,
      createAuthHeaders()
    );
    return response.data;
  },

  /**
   * Update security settings
   * Admin only
   */
  async updateSecuritySettings(
    data: UpdateSecuritySettingsDto
  ): Promise<SecuritySettings> {
    const response = await axios.put<SecuritySettings>(
      `${API_BASE_URL}/settings/security`,
      data,
      createAuthHeaders()
    );
    return response.data;
  },

  /**
   * Reset security settings to defaults
   * Admin only
   */
  async resetSecuritySettings(): Promise<SecuritySettings> {
    const response = await axios.post<SecuritySettings>(
      `${API_BASE_URL}/settings/security/reset`,
      {},
      createAuthHeaders()
    );
    return response.data;
  },

  /**
   * Get email settings
   * Admin only
   */
  async getEmailSettings(): Promise<EmailSettings> {
    const response = await axios.get<EmailSettings>(
      `${API_BASE_URL}/settings/category/email`,
      createAuthHeaders()
    );
    return response.data;
  },

  /**
   * Update email settings
   * Admin only
   */
  async updateEmailSettings(data: UpdateEmailSettingsDto): Promise<EmailSettings> {
    const response = await axios.put<EmailSettings>(
      `${API_BASE_URL}/settings/category/email`,
      data,
      createAuthHeaders()
    );
    return response.data;
  },

  /**
   * Update settings by category
   * Admin only
   */
  async updateSettingsByCategory<T = Record<string, unknown>>(
    category: SettingsCategory,
    data: Record<string, unknown>
  ): Promise<T> {
    const response = await axios.put<T>(
      `${API_BASE_URL}/settings/category/${category}`,
      data,
      createAuthHeaders()
    );
    return response.data;
  },

  /**
   * Reset settings by category to defaults
   * Admin only
   */
  async resetSettingsByCategory(category: SettingsCategory): Promise<ResetResponse> {
    const response = await axios.post<ResetResponse>(
      `${API_BASE_URL}/settings/category/${category}/reset`,
      {},
      createAuthHeaders()
    );
    return response.data;
  },
};

export default settingsService;
