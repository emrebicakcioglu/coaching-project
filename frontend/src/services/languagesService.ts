/**
 * Languages Service
 * Multi-Language Management
 *
 * API service for language and translation management.
 */

import axios from 'axios';

// Get API base URL - ensure we have the /api/v1 prefix
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:14102/api/v1';
// Remove trailing /api/v1 if present to avoid duplication
const API_BASE_URL = BASE_URL.replace(/\/api\/v1\/?$/, '');

/**
 * Language interface
 */
export interface Language {
  id: number;
  code: string;
  name: string;
  native_name: string;
  emoji_flag: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Create language DTO
 */
export interface CreateLanguageDto {
  code: string;
  name: string;
  native_name: string;
  emoji_flag: string;
  sort_order?: number;
}

/**
 * Update language DTO
 */
export interface UpdateLanguageDto {
  name?: string;
  native_name?: string;
  emoji_flag?: string;
  is_active?: boolean;
  sort_order?: number;
}

/**
 * Translation update DTO
 */
export interface UpdateTranslationsDto {
  namespace: string;
  translations: Record<string, unknown>;
}

/**
 * Import translations DTO
 */
export interface ImportTranslationsDto {
  namespace?: string;
  content: Record<string, unknown>;
  merge?: boolean;
}

// Token storage key (shared with authService)
const ACCESS_TOKEN_KEY = 'access_token';

/**
 * Get auth header
 */
function getAuthHeader(): { Authorization: string } | undefined {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

/**
 * Languages Service
 */
export const languagesService = {
  /**
   * Get all languages
   */
  async getAll(includeInactive = false): Promise<Language[]> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/languages`, {
      params: { includeInactive: includeInactive ? 'true' : undefined },
    });
    return response.data;
  },

  /**
   * Get language by code
   */
  async getByCode(code: string): Promise<Language> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/languages/${code}`);
    return response.data;
  },

  /**
   * Create a new language
   */
  async create(dto: CreateLanguageDto): Promise<Language> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/languages`,
      dto,
      { headers: getAuthHeader() }
    );
    return response.data;
  },

  /**
   * Update a language
   */
  async update(code: string, dto: UpdateLanguageDto): Promise<Language> {
    const response = await axios.put(
      `${API_BASE_URL}/api/v1/languages/${code}`,
      dto,
      { headers: getAuthHeader() }
    );
    return response.data;
  },

  /**
   * Delete a language
   */
  async delete(code: string): Promise<{ message: string; language: Language }> {
    const response = await axios.delete(
      `${API_BASE_URL}/api/v1/languages/${code}`,
      { headers: getAuthHeader() }
    );
    return response.data;
  },

  /**
   * Get available namespaces
   */
  async getNamespaces(): Promise<string[]> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/languages/namespaces`);
    return response.data;
  },

  /**
   * Get all translations for a language
   */
  async getAllTranslations(code: string): Promise<{
    language: string;
    namespaces: Record<string, Record<string, unknown>>;
  }> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/languages/${code}/translations`
    );
    return response.data;
  },

  /**
   * Get translations for a specific namespace
   */
  async getTranslations(code: string, namespace: string): Promise<{
    language: string;
    namespace: string;
    translations: Record<string, unknown>;
  }> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/languages/${code}/translations/${namespace}`
    );
    return response.data;
  },

  /**
   * Get flat translations for table view
   */
  async getFlatTranslations(code: string): Promise<Record<string, string>> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/languages/${code}/translations/flat`,
      { headers: getAuthHeader() }
    );
    return response.data;
  },

  /**
   * Update translations
   */
  async updateTranslations(code: string, dto: UpdateTranslationsDto): Promise<{
    language: string;
    namespace: string;
    translations: Record<string, unknown>;
  }> {
    const response = await axios.put(
      `${API_BASE_URL}/api/v1/languages/${code}/translations`,
      dto,
      { headers: getAuthHeader() }
    );
    return response.data;
  },

  /**
   * Import translations
   */
  async importTranslations(code: string, dto: ImportTranslationsDto): Promise<{
    message: string;
    imported: number;
  }> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/languages/${code}/translations/import`,
      dto,
      { headers: getAuthHeader() }
    );
    return response.data;
  },

  /**
   * Export translations
   */
  async exportTranslations(
    code: string,
    namespace?: string
  ): Promise<Record<string, unknown>> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/languages/${code}/translations/export`,
      {
        params: { namespace },
        headers: getAuthHeader(),
      }
    );
    return response.data;
  },
};

export default languagesService;
