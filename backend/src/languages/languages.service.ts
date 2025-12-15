/**
 * Languages Service
 * Multi-Language Management System
 *
 * Manages languages and translations.
 * Features:
 * - Language CRUD operations (database)
 * - Translation file management (JSON)
 * - Import/export functionality
 * - Namespace management
 */

import {
  Injectable,
  Inject,
  forwardRef,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { WinstonLoggerService } from '../common/services/logger.service';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../common/services/audit.service';
import {
  CreateLanguageDto,
  UpdateLanguageDto,
  LanguageResponseDto,
  UpdateTranslationsDto,
  ImportTranslationsDto,
  TranslationsResponseDto,
  AllTranslationsResponseDto,
} from './dto/language.dto';

/**
 * Database language record
 */
interface LanguageRecord {
  id: number;
  code: string;
  name: string;
  native_name: string;
  emoji_flag: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Available translation namespaces
 */
export const TRANSLATION_NAMESPACES = [
  'common',
  'navigation',
  'validation',
  'emails',
  'errors',
] as const;

export type TranslationNamespace = (typeof TRANSLATION_NAMESPACES)[number];

@Injectable()
export class LanguagesService {
  private readonly localesPath: string;

  constructor(
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
  ) {
    // Set locales path
    const distLocalesPath = path.resolve(__dirname, '..', 'locales');
    const srcLocalesPath = path.resolve(__dirname, '..', '..', 'locales');
    this.localesPath = fs.existsSync(distLocalesPath) ? distLocalesPath : srcLocalesPath;
    this.logger.log(`LanguagesService initialized, locales path: ${this.localesPath}`, 'LanguagesService');
  }

  // =====================================
  // Language CRUD Operations
  // =====================================

  /**
   * Get all languages
   */
  async findAll(includeInactive = false): Promise<LanguageResponseDto[]> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const query = includeInactive
      ? 'SELECT * FROM languages ORDER BY sort_order ASC, code ASC'
      : 'SELECT * FROM languages WHERE is_active = true ORDER BY sort_order ASC, code ASC';

    const result = await pool.query<LanguageRecord>(query);
    return result.rows.map(this.mapToResponseDto);
  }

  /**
   * Get a language by code
   */
  async findByCode(code: string): Promise<LanguageResponseDto> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const result = await pool.query<LanguageRecord>(
      'SELECT * FROM languages WHERE code = $1',
      [code.toLowerCase()],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Language with code "${code}" not found`);
    }

    return this.mapToResponseDto(result.rows[0]);
  }

  /**
   * Create a new language
   */
  async create(
    dto: CreateLanguageDto,
    userId?: number,
    requestContext?: { ip?: string; userAgent?: string; requestId?: string },
  ): Promise<LanguageResponseDto> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const code = dto.code.toLowerCase();

    // Check if language already exists
    const existing = await pool.query(
      'SELECT id FROM languages WHERE code = $1',
      [code],
    );
    if (existing.rows.length > 0) {
      throw new ConflictException(`Language with code "${code}" already exists`);
    }

    // Get next sort order if not provided
    const sortOrder = dto.sort_order ?? await this.getNextSortOrder();

    // Create language in database
    const result = await pool.query<LanguageRecord>(
      `INSERT INTO languages (code, name, native_name, emoji_flag, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [code, dto.name, dto.native_name, dto.emoji_flag, sortOrder],
    );

    const language = this.mapToResponseDto(result.rows[0]);

    // Create locale directory and empty translation files
    await this.createLocaleDirectory(code);

    // Audit log
    await this.auditService.log({
      userId,
      action: 'LANGUAGE_CREATE',
      resource: 'language',
      resourceId: language.id,
      details: { code, name: dto.name },
      ipAddress: requestContext?.ip,
      userAgent: requestContext?.userAgent,
      requestId: requestContext?.requestId,
    });

    this.logger.log(`Language "${code}" created`, 'LanguagesService');
    return language;
  }

  /**
   * Update a language
   */
  async update(
    code: string,
    dto: UpdateLanguageDto,
    userId?: number,
    requestContext?: { ip?: string; userAgent?: string; requestId?: string },
  ): Promise<LanguageResponseDto> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    code = code.toLowerCase();

    // Get current language
    const current = await this.findByCode(code);

    // Build update query
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dto.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(dto.name);
    }
    if (dto.native_name !== undefined) {
      updates.push(`native_name = $${paramIndex++}`);
      values.push(dto.native_name);
    }
    if (dto.emoji_flag !== undefined) {
      updates.push(`emoji_flag = $${paramIndex++}`);
      values.push(dto.emoji_flag);
    }
    if (dto.is_active !== undefined) {
      // Cannot deactivate default language
      if (current.is_default && !dto.is_active) {
        throw new BadRequestException('Cannot deactivate the default language');
      }
      updates.push(`is_active = $${paramIndex++}`);
      values.push(dto.is_active);
    }
    if (dto.sort_order !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      values.push(dto.sort_order);
    }

    if (updates.length === 0) {
      return current;
    }

    values.push(code);

    const result = await pool.query<LanguageRecord>(
      `UPDATE languages SET ${updates.join(', ')} WHERE code = $${paramIndex} RETURNING *`,
      values,
    );

    const language = this.mapToResponseDto(result.rows[0]);

    // Audit log
    await this.auditService.log({
      userId,
      action: 'LANGUAGE_UPDATE',
      resource: 'language',
      resourceId: language.id,
      details: { code, changes: dto },
      ipAddress: requestContext?.ip,
      userAgent: requestContext?.userAgent,
      requestId: requestContext?.requestId,
    });

    this.logger.log(`Language "${code}" updated`, 'LanguagesService');
    return language;
  }

  /**
   * Delete a language
   */
  async delete(
    code: string,
    userId?: number,
    requestContext?: { ip?: string; userAgent?: string; requestId?: string },
  ): Promise<{ message: string; language: LanguageResponseDto }> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    code = code.toLowerCase();

    // Get current language
    const language = await this.findByCode(code);

    // Cannot delete default language (German)
    if (language.is_default) {
      throw new ForbiddenException('Cannot delete the default language');
    }

    // Delete from database
    await pool.query('DELETE FROM languages WHERE code = $1', [code]);

    // Note: We keep the locale files for backup purposes
    // They can be manually deleted if needed

    // Audit log
    await this.auditService.log({
      userId,
      action: 'LANGUAGE_DELETE',
      resource: 'language',
      resourceId: language.id,
      details: { code, name: language.name },
      ipAddress: requestContext?.ip,
      userAgent: requestContext?.userAgent,
      requestId: requestContext?.requestId,
    });

    this.logger.log(`Language "${code}" deleted`, 'LanguagesService');
    return {
      message: `Language "${language.name}" (${code}) deleted successfully`,
      language,
    };
  }

  // =====================================
  // Translation Operations
  // =====================================

  /**
   * Get translations for a language and namespace
   */
  async getTranslations(
    code: string,
    namespace: string,
  ): Promise<TranslationsResponseDto> {
    code = code.toLowerCase();

    const translations = await this.loadTranslationFile(code, namespace);

    return {
      language: code,
      namespace,
      translations,
    };
  }

  /**
   * Get all translations for a language
   */
  async getAllTranslations(code: string): Promise<AllTranslationsResponseDto> {
    code = code.toLowerCase();

    const namespaces: Record<string, Record<string, unknown>> = {};

    for (const namespace of TRANSLATION_NAMESPACES) {
      try {
        namespaces[namespace] = await this.loadTranslationFile(code, namespace);
      } catch {
        namespaces[namespace] = {};
      }
    }

    return {
      language: code,
      namespaces,
    };
  }

  /**
   * Update translations for a language
   */
  async updateTranslations(
    code: string,
    dto: UpdateTranslationsDto,
    userId?: number,
    requestContext?: { ip?: string; userAgent?: string; requestId?: string },
  ): Promise<TranslationsResponseDto> {
    code = code.toLowerCase();

    // Verify language exists
    await this.findByCode(code);

    // Load existing translations
    let existing: Record<string, unknown> = {};
    try {
      existing = await this.loadTranslationFile(code, dto.namespace);
    } catch {
      // File doesn't exist, start fresh
    }

    // Merge translations
    const merged = this.deepMerge(existing, dto.translations);

    // Save translations
    await this.saveTranslationFile(code, dto.namespace, merged);

    // Audit log
    await this.auditService.log({
      userId,
      action: 'TRANSLATIONS_UPDATE',
      resource: 'translations',
      details: { language: code, namespace: dto.namespace, keys: Object.keys(dto.translations) },
      ipAddress: requestContext?.ip,
      userAgent: requestContext?.userAgent,
      requestId: requestContext?.requestId,
    });

    this.logger.log(
      `Translations updated for ${code}/${dto.namespace}`,
      'LanguagesService',
    );

    return {
      language: code,
      namespace: dto.namespace,
      translations: merged,
    };
  }

  /**
   * Import translations from JSON
   */
  async importTranslations(
    code: string,
    dto: ImportTranslationsDto,
    userId?: number,
    requestContext?: { ip?: string; userAgent?: string; requestId?: string },
  ): Promise<{ message: string; imported: number }> {
    code = code.toLowerCase();

    // Verify language exists
    await this.findByCode(code);

    const merge = dto.merge !== false; // Default to merge

    if (dto.namespace) {
      // Import single namespace
      let existing: Record<string, unknown> = {};
      if (merge) {
        try {
          existing = await this.loadTranslationFile(code, dto.namespace);
        } catch {
          // File doesn't exist
        }
      }

      const content = merge ? this.deepMerge(existing, dto.content) : dto.content;
      await this.saveTranslationFile(code, dto.namespace, content);

      const keyCount = this.countKeys(dto.content);

      // Audit log
      await this.auditService.log({
        userId,
        action: 'TRANSLATIONS_IMPORT',
        resource: 'translations',
        details: { language: code, namespace: dto.namespace, keyCount, merge },
        ipAddress: requestContext?.ip,
        userAgent: requestContext?.userAgent,
        requestId: requestContext?.requestId,
      });

      return {
        message: `Imported ${keyCount} keys to ${code}/${dto.namespace}`,
        imported: keyCount,
      };
    } else {
      // Import multiple namespaces (content should be { namespace: { keys } })
      let totalKeys = 0;
      const namespaces: string[] = [];

      for (const [namespace, translations] of Object.entries(dto.content)) {
        if (typeof translations === 'object' && translations !== null) {
          let existing: Record<string, unknown> = {};
          if (merge) {
            try {
              existing = await this.loadTranslationFile(code, namespace);
            } catch {
              // File doesn't exist
            }
          }

          const content = merge
            ? this.deepMerge(existing, translations as Record<string, unknown>)
            : translations as Record<string, unknown>;
          await this.saveTranslationFile(code, namespace, content);

          const keyCount = this.countKeys(translations as Record<string, unknown>);
          totalKeys += keyCount;
          namespaces.push(namespace);
        }
      }

      // Audit log
      await this.auditService.log({
        userId,
        action: 'TRANSLATIONS_IMPORT',
        resource: 'translations',
        details: { language: code, namespaces, totalKeys, merge },
        ipAddress: requestContext?.ip,
        userAgent: requestContext?.userAgent,
        requestId: requestContext?.requestId,
      });

      return {
        message: `Imported ${totalKeys} keys across ${namespaces.length} namespaces`,
        imported: totalKeys,
      };
    }
  }

  /**
   * Export translations for a language
   */
  async exportTranslations(
    code: string,
    namespace?: string,
  ): Promise<Record<string, unknown>> {
    code = code.toLowerCase();

    if (namespace) {
      return this.loadTranslationFile(code, namespace);
    }

    // Export all namespaces
    const result: Record<string, Record<string, unknown>> = {};
    for (const ns of TRANSLATION_NAMESPACES) {
      try {
        result[ns] = await this.loadTranslationFile(code, ns);
      } catch {
        result[ns] = {};
      }
    }
    return result;
  }

  /**
   * Get flat translations for table view
   */
  async getFlatTranslations(code: string): Promise<Record<string, string>> {
    code = code.toLowerCase();

    const result: Record<string, string> = {};

    for (const namespace of TRANSLATION_NAMESPACES) {
      try {
        const translations = await this.loadTranslationFile(code, namespace);
        const flat = this.flattenObject(translations, namespace);
        Object.assign(result, flat);
      } catch {
        // Namespace doesn't exist
      }
    }

    return result;
  }

  /**
   * Get available namespaces
   */
  getNamespaces(): string[] {
    return [...TRANSLATION_NAMESPACES];
  }

  // =====================================
  // Private Helper Methods
  // =====================================

  private mapToResponseDto(record: LanguageRecord): LanguageResponseDto {
    return {
      id: record.id,
      code: record.code,
      name: record.name,
      native_name: record.native_name,
      emoji_flag: record.emoji_flag,
      is_default: record.is_default,
      is_active: record.is_active,
      sort_order: record.sort_order,
      created_at: record.created_at,
      updated_at: record.updated_at,
    };
  }

  private async getNextSortOrder(): Promise<number> {
    const pool = this.databaseService.getPool();
    if (!pool) return 0;

    const result = await pool.query<{ max: number }>(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 as max FROM languages',
    );
    return result.rows[0].max;
  }

  private async createLocaleDirectory(code: string): Promise<void> {
    const localePath = path.join(this.localesPath, code);

    if (!fs.existsSync(localePath)) {
      fs.mkdirSync(localePath, { recursive: true });
    }

    // Create empty translation files for each namespace
    for (const namespace of TRANSLATION_NAMESPACES) {
      const filePath = path.join(localePath, `${namespace}.json`);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '{}', 'utf-8');
      }
    }

    this.logger.log(`Created locale directory for ${code}`, 'LanguagesService');
  }

  private async loadTranslationFile(
    code: string,
    namespace: string,
  ): Promise<Record<string, unknown>> {
    const filePath = path.join(this.localesPath, code, `${namespace}.json`);

    if (!fs.existsSync(filePath)) {
      return {};
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  }

  private async saveTranslationFile(
    code: string,
    namespace: string,
    content: Record<string, unknown>,
  ): Promise<void> {
    const localePath = path.join(this.localesPath, code);
    const filePath = path.join(localePath, `${namespace}.json`);

    // Ensure directory exists
    if (!fs.existsSync(localePath)) {
      fs.mkdirSync(localePath, { recursive: true });
    }

    // Write formatted JSON
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
  }

  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
  ): Record<string, unknown> {
    const result = { ...target };

    for (const key of Object.keys(source)) {
      if (
        source[key] !== null &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        target[key] !== null &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key])
      ) {
        result[key] = this.deepMerge(
          target[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>,
        );
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  private flattenObject(
    obj: Record<string, unknown>,
    prefix: string,
  ): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = `${prefix}.${key}`;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(result, this.flattenObject(value as Record<string, unknown>, newKey));
      } else if (typeof value === 'string') {
        result[newKey] = value;
      }
    }

    return result;
  }

  private countKeys(obj: Record<string, unknown>): number {
    let count = 0;
    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        count += this.countKeys(value as Record<string, unknown>);
      } else {
        count++;
      }
    }
    return count;
  }
}
