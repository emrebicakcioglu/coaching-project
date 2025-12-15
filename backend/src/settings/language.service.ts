/**
 * Language Service
 * STORY-018A: Standard-Sprache Backend (i18n Setup)
 *
 * Manages language settings and translations.
 * Features:
 * - User language preference management
 * - Admin language settings configuration
 * - Translation loading from JSON files
 * - Fallback language support
 * - Caching for translations
 *
 * Environment Variables Required:
 * - DEFAULT_LANGUAGE (optional, defaults to 'en')
 * - SUPPORTED_LANGUAGES (optional, defaults to 'en,de')
 */

import {
  Injectable,
  Inject,
  forwardRef,
  OnModuleInit,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { WinstonLoggerService } from '../common/services/logger.service';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../common/services/audit.service';
import {
  AdminLanguageSettings,
  UserLanguagePreference,
} from '../database/types';
import {
  SUPPORTED_LANGUAGE_CODES,
  LanguageCode,
  LANGUAGE_METADATA,
  LanguageMetadata,
} from './dto/language-settings.dto';

/**
 * Translation cache entry
 */
interface TranslationCacheEntry {
  translations: Record<string, unknown>;
  loadedAt: Date;
}

/**
 * Default admin language settings
 */
export const DEFAULT_ADMIN_LANGUAGE_SETTINGS: AdminLanguageSettings = {
  default_language: process.env.DEFAULT_LANGUAGE || 'en',
  supported_languages: (process.env.SUPPORTED_LANGUAGES || 'en,de').split(','),
  fallback_language: 'en',
};

/**
 * Default user language preference
 */
export const DEFAULT_USER_LANGUAGE_PREFERENCE: UserLanguagePreference = {
  language: 'en',
  date_format: 'YYYY-MM-DD',
  number_format: 'en-US',
};

/**
 * Translation namespace type
 */
export type TranslationNamespace = 'common' | 'validation' | 'emails' | 'errors';

@Injectable()
export class LanguageService implements OnModuleInit {
  private translationCache: Map<string, Map<string, TranslationCacheEntry>> = new Map();
  private readonly localesPath: string;
  private readonly cacheTimeMs = 60000; // 1 minute cache

  constructor(
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
  ) {
    // Set locales path - when running from dist/settings, go up one level to dist, then to locales
    // When running tests with ts-jest, __dirname is src/settings, so we check both paths
    const distLocalesPath = path.resolve(__dirname, '..', 'locales');
    const srcLocalesPath = path.resolve(__dirname, '..', '..', 'locales');

    // Use dist path if it exists (production), otherwise use src path (development/testing)
    this.localesPath = fs.existsSync(distLocalesPath) ? distLocalesPath : srcLocalesPath;
    this.logger.log('LanguageService initialized', 'LanguageService');
  }

  /**
   * Module initialization - preload translations
   */
  async onModuleInit(): Promise<void> {
    await this.preloadTranslations();
  }

  /**
   * Preload all translations into cache
   */
  private async preloadTranslations(): Promise<void> {
    try {
      for (const langCode of SUPPORTED_LANGUAGE_CODES) {
        await this.loadLanguageTranslations(langCode);
      }
      this.logger.log(
        `Preloaded translations for ${SUPPORTED_LANGUAGE_CODES.length} languages`,
        'LanguageService',
      );
    } catch (error) {
      this.logger.warn(
        `Failed to preload translations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'LanguageService',
      );
    }
  }

  /**
   * Load all translations for a language
   */
  private async loadLanguageTranslations(langCode: string): Promise<void> {
    const namespaces: TranslationNamespace[] = ['common', 'validation', 'emails', 'errors'];
    const langCache = new Map<string, TranslationCacheEntry>();

    for (const namespace of namespaces) {
      try {
        const translations = await this.loadTranslationFile(langCode, namespace);
        langCache.set(namespace, {
          translations,
          loadedAt: new Date(),
        });
      } catch (error) {
        this.logger.debug(
          `No translation file for ${langCode}/${namespace}: ${error instanceof Error ? error.message : 'Unknown'}`,
          'LanguageService',
        );
        // Set empty translations if file doesn't exist
        langCache.set(namespace, {
          translations: {},
          loadedAt: new Date(),
        });
      }
    }

    this.translationCache.set(langCode, langCache);
  }

  /**
   * Load a translation file from disk
   */
  private async loadTranslationFile(
    langCode: string,
    namespace: string,
  ): Promise<Record<string, unknown>> {
    const filePath = path.join(this.localesPath, langCode, `${namespace}.json`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`Translation file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Get translations for a specific language and namespace
   */
  async getTranslations(
    langCode: string,
    namespace: TranslationNamespace = 'common',
  ): Promise<Record<string, unknown>> {
    // Validate language code
    if (!this.isValidLanguageCode(langCode)) {
      const settings = await this.getAdminSettings();
      langCode = settings.fallback_language;
    }

    // Check cache
    let langCache = this.translationCache.get(langCode);
    if (!langCache) {
      await this.loadLanguageTranslations(langCode);
      langCache = this.translationCache.get(langCode);
    }

    const cached = langCache?.get(namespace);
    if (cached) {
      // Check if cache is still valid
      const now = new Date();
      if (now.getTime() - cached.loadedAt.getTime() < this.cacheTimeMs) {
        return cached.translations;
      }
    }

    // Reload from file
    try {
      const translations = await this.loadTranslationFile(langCode, namespace);
      langCache?.set(namespace, {
        translations,
        loadedAt: new Date(),
      });
      return translations;
    } catch {
      // Return fallback translations
      const fallbackCache = this.translationCache.get(DEFAULT_ADMIN_LANGUAGE_SETTINGS.fallback_language);
      return fallbackCache?.get(namespace)?.translations || {};
    }
  }

  /**
   * Get all translations for a language (all namespaces)
   */
  async getAllTranslations(langCode: string): Promise<Record<string, Record<string, unknown>>> {
    const namespaces: TranslationNamespace[] = ['common', 'validation', 'emails', 'errors'];
    const result: Record<string, Record<string, unknown>> = {};

    for (const namespace of namespaces) {
      result[namespace] = await this.getTranslations(langCode, namespace);
    }

    return result;
  }

  /**
   * Translate a single key
   */
  async translate(
    langCode: string,
    key: string,
    namespace: TranslationNamespace = 'common',
    variables?: Record<string, string | number>,
  ): Promise<string> {
    const translations = await this.getTranslations(langCode, namespace);
    const rawTranslation = this.getNestedValue(translations, key);

    if (typeof rawTranslation !== 'string') {
      // Fallback to key itself
      return key;
    }

    let translation: string = rawTranslation;

    // Replace variables
    if (variables) {
      for (const [varName, value] of Object.entries(variables)) {
        translation = translation.replace(new RegExp(`{{${varName}}}`, 'g'), String(value));
      }
    }

    return translation;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, unknown>, key: string): unknown {
    const keys = key.split('.');
    let result: unknown = obj;

    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = (result as Record<string, unknown>)[k];
      } else {
        return undefined;
      }
    }

    return result;
  }

  /**
   * Check if language code is valid
   */
  isValidLanguageCode(code: string): code is LanguageCode {
    return SUPPORTED_LANGUAGE_CODES.includes(code as LanguageCode);
  }

  /**
   * Get language metadata
   */
  getLanguageMetadata(code: string): LanguageMetadata | null {
    if (!this.isValidLanguageCode(code)) {
      return null;
    }
    return LANGUAGE_METADATA[code];
  }

  /**
   * Get all supported languages with metadata
   */
  getSupportedLanguages(): LanguageMetadata[] {
    return SUPPORTED_LANGUAGE_CODES.map((code) => LANGUAGE_METADATA[code]);
  }

  // =====================================
  // Admin Settings Management
  // =====================================

  /**
   * Get admin language settings
   */
  async getAdminSettings(): Promise<AdminLanguageSettings> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      return DEFAULT_ADMIN_LANGUAGE_SETTINGS;
    }

    try {
      const result = await pool.query(
        `SELECT default_language, supported_languages, fallback_language
         FROM app_settings WHERE id = 1`,
      );

      if (result.rows.length === 0) {
        return DEFAULT_ADMIN_LANGUAGE_SETTINGS;
      }

      const row = result.rows[0];
      return {
        default_language: row.default_language || DEFAULT_ADMIN_LANGUAGE_SETTINGS.default_language,
        supported_languages: row.supported_languages || DEFAULT_ADMIN_LANGUAGE_SETTINGS.supported_languages,
        fallback_language: row.fallback_language || DEFAULT_ADMIN_LANGUAGE_SETTINGS.fallback_language,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to get admin language settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'LanguageService',
      );
      return DEFAULT_ADMIN_LANGUAGE_SETTINGS;
    }
  }

  /**
   * Update admin language settings
   */
  async updateAdminSettings(
    settings: Partial<AdminLanguageSettings>,
    userId?: number,
    requestContext?: { ip?: string; userAgent?: string; requestId?: string },
  ): Promise<AdminLanguageSettings> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    // Validate settings
    if (settings.default_language && !this.isValidLanguageCode(settings.default_language)) {
      throw new BadRequestException(`Invalid default language: ${settings.default_language}`);
    }
    if (settings.fallback_language && !this.isValidLanguageCode(settings.fallback_language)) {
      throw new BadRequestException(`Invalid fallback language: ${settings.fallback_language}`);
    }

    // Get current settings for audit
    const current = await this.getAdminSettings();

    // Build update query
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (settings.default_language !== undefined) {
      updates.push(`default_language = $${paramIndex++}`);
      values.push(settings.default_language);
    }
    if (settings.supported_languages !== undefined) {
      updates.push(`supported_languages = $${paramIndex++}`);
      values.push(JSON.stringify(settings.supported_languages));
    }
    if (settings.fallback_language !== undefined) {
      updates.push(`fallback_language = $${paramIndex++}`);
      values.push(settings.fallback_language);
    }

    if (updates.length === 0) {
      return current;
    }

    updates.push(`last_updated_by = $${paramIndex++}`);
    values.push(userId || null);

    await pool.query(
      `UPDATE app_settings SET ${updates.join(', ')}, updated_at = NOW() WHERE id = 1`,
      values,
    );

    // Get updated settings
    const updated = await this.getAdminSettings();

    // Audit log
    await this.auditService.log({
      userId: userId || undefined,
      action: 'SETTINGS_UPDATE',
      resource: 'language_settings',
      resourceId: 1,
      details: {
        old_value: current,
        new_value: updated,
        changed_fields: Object.keys(settings),
      },
      ipAddress: requestContext?.ip,
      userAgent: requestContext?.userAgent,
      requestId: requestContext?.requestId,
    });

    this.logger.log(
      `Admin language settings updated by user ${userId}`,
      'LanguageService',
    );

    return updated;
  }

  // =====================================
  // User Language Preference Management
  // =====================================

  /**
   * Get user language preference
   */
  async getUserLanguagePreference(userId: number): Promise<UserLanguagePreference> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      return DEFAULT_USER_LANGUAGE_PREFERENCE;
    }

    try {
      const result = await pool.query(
        `SELECT language, date_format, number_format
         FROM users WHERE id = $1 AND deleted_at IS NULL`,
        [userId],
      );

      if (result.rows.length === 0) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      const row = result.rows[0];
      return {
        language: row.language || DEFAULT_USER_LANGUAGE_PREFERENCE.language,
        date_format: row.date_format || DEFAULT_USER_LANGUAGE_PREFERENCE.date_format,
        number_format: row.number_format || DEFAULT_USER_LANGUAGE_PREFERENCE.number_format,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.warn(
        `Failed to get user language preference: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'LanguageService',
      );
      return DEFAULT_USER_LANGUAGE_PREFERENCE;
    }
  }

  /**
   * Update user language preference
   */
  async updateUserLanguagePreference(
    userId: number,
    preference: Partial<UserLanguagePreference>,
    requestContext?: { ip?: string; userAgent?: string; requestId?: string },
  ): Promise<UserLanguagePreference> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    // Validate language
    if (preference.language && !this.isValidLanguageCode(preference.language)) {
      throw new BadRequestException(`Invalid language: ${preference.language}`);
    }

    // Get current preference for audit
    const current = await this.getUserLanguagePreference(userId);

    // Build update query
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (preference.language !== undefined) {
      updates.push(`language = $${paramIndex++}`);
      values.push(preference.language);
    }
    if (preference.date_format !== undefined) {
      updates.push(`date_format = $${paramIndex++}`);
      values.push(preference.date_format);
    }
    if (preference.number_format !== undefined) {
      updates.push(`number_format = $${paramIndex++}`);
      values.push(preference.number_format);
    }

    if (updates.length === 0) {
      return current;
    }

    values.push(userId);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex} AND deleted_at IS NULL
       RETURNING language, date_format, number_format`,
      values,
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const updated: UserLanguagePreference = {
      language: result.rows[0].language,
      date_format: result.rows[0].date_format,
      number_format: result.rows[0].number_format,
    };

    // Audit log
    await this.auditService.log({
      userId,
      action: 'USER_PROFILE_UPDATE',
      resource: 'user_language_preference',
      resourceId: userId,
      details: {
        old_value: current,
        new_value: updated,
        changed_fields: Object.keys(preference),
      },
      ipAddress: requestContext?.ip,
      userAgent: requestContext?.userAgent,
      requestId: requestContext?.requestId,
    });

    this.logger.log(
      `User ${userId} language preference updated to ${updated.language}`,
      'LanguageService',
    );

    return updated;
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    this.translationCache.clear();
    this.logger.log('Translation cache cleared', 'LanguageService');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { languages: number; namespaces: number } {
    let namespaceCount = 0;
    for (const langCache of this.translationCache.values()) {
      namespaceCount += langCache.size;
    }

    return {
      languages: this.translationCache.size,
      namespaces: namespaceCount,
    };
  }
}
