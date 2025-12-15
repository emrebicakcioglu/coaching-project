/**
 * Security Settings Service
 * STORY-013A: In-App Settings Backend
 *
 * Business logic for security settings management including:
 * - Max login attempts configuration
 * - Password policy settings
 * - Session inactivity timeout
 * - Caching for performance
 * - Validation and audit logging
 */

import { Injectable, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { WinstonLoggerService } from '../common/services/logger.service';
import { AuditService } from '../common/services/audit.service';
import type { AppSettings, SecuritySettings, SettingsHistoryInsert } from '../database/types';
import { Request } from 'express';

/**
 * Extended Request interface with user
 */
interface AuthRequest extends Request {
  user?: { id?: number; email?: string };
  requestId?: string;
}

/**
 * Default security settings
 * STORY-013A: In-App Settings Backend
 */
export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  max_login_attempts: 5,
  password_min_length: 8,
  password_require_uppercase: true,
  password_require_lowercase: true,
  password_require_numbers: true,
  password_require_special_chars: true,
  session_inactivity_timeout: 15,
};

/**
 * Security Settings Service
 * Handles security configuration with caching
 */
@Injectable()
export class SecuritySettingsService {
  // In-memory cache for security settings (frequently accessed)
  private cachedSettings: SecuritySettings | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL_MS = 60000; // 1 minute cache

  constructor(
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get security settings
   * Uses cache if available
   *
   * @returns Security settings
   */
  async getSecuritySettings(): Promise<SecuritySettings> {
    // Check cache
    if (this.cachedSettings && Date.now() - this.cacheTimestamp < this.CACHE_TTL_MS) {
      return this.cachedSettings;
    }

    const pool = this.databaseService.getPool();
    if (!pool) {
      return DEFAULT_SECURITY_SETTINGS;
    }

    try {
      const result = await pool.query<AppSettings>(
        `SELECT max_login_attempts, password_min_length,
                password_require_uppercase, password_require_lowercase,
                password_require_numbers, password_require_special_chars,
                session_inactivity_timeout
         FROM app_settings WHERE id = 1`,
      );

      if (result.rows.length === 0) {
        return DEFAULT_SECURITY_SETTINGS;
      }

      const row = result.rows[0];
      const settings: SecuritySettings = {
        max_login_attempts: row.max_login_attempts ?? DEFAULT_SECURITY_SETTINGS.max_login_attempts,
        password_min_length: row.password_min_length ?? DEFAULT_SECURITY_SETTINGS.password_min_length,
        password_require_uppercase: row.password_require_uppercase ?? DEFAULT_SECURITY_SETTINGS.password_require_uppercase,
        password_require_lowercase: row.password_require_lowercase ?? DEFAULT_SECURITY_SETTINGS.password_require_lowercase,
        password_require_numbers: row.password_require_numbers ?? DEFAULT_SECURITY_SETTINGS.password_require_numbers,
        password_require_special_chars: row.password_require_special_chars ?? DEFAULT_SECURITY_SETTINGS.password_require_special_chars,
        session_inactivity_timeout: row.session_inactivity_timeout ?? DEFAULT_SECURITY_SETTINGS.session_inactivity_timeout,
      };

      // Update cache
      this.cachedSettings = settings;
      this.cacheTimestamp = Date.now();

      return settings;
    } catch (error) {
      this.logger.error(
        `Failed to get security settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'SecuritySettingsService',
      );
      return DEFAULT_SECURITY_SETTINGS;
    }
  }

  /**
   * Update security settings
   * Validates input and logs changes
   *
   * @param settings - Partial security settings to update
   * @param userId - User ID making the change (for audit)
   * @param request - Express request for audit logging
   * @returns Updated security settings
   */
  async updateSecuritySettings(
    settings: Partial<SecuritySettings>,
    userId: number | undefined,
    request: AuthRequest,
  ): Promise<SecuritySettings> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    // Get current settings for audit and merge
    const currentSettings = await this.getSecuritySettings();

    // Merge with current settings
    const updatedSettings: SecuritySettings = {
      max_login_attempts: settings.max_login_attempts ?? currentSettings.max_login_attempts,
      password_min_length: settings.password_min_length ?? currentSettings.password_min_length,
      password_require_uppercase: settings.password_require_uppercase ?? currentSettings.password_require_uppercase,
      password_require_lowercase: settings.password_require_lowercase ?? currentSettings.password_require_lowercase,
      password_require_numbers: settings.password_require_numbers ?? currentSettings.password_require_numbers,
      password_require_special_chars: settings.password_require_special_chars ?? currentSettings.password_require_special_chars,
      session_inactivity_timeout: settings.session_inactivity_timeout ?? currentSettings.session_inactivity_timeout,
    };

    // Validate settings
    this.validateSecuritySettings(updatedSettings);

    // Build update query
    const params: unknown[] = [];
    let paramIndex = 1;

    const updates: string[] = [
      `max_login_attempts = $${paramIndex++}`,
      `password_min_length = $${paramIndex++}`,
      `password_require_uppercase = $${paramIndex++}`,
      `password_require_lowercase = $${paramIndex++}`,
      `password_require_numbers = $${paramIndex++}`,
      `password_require_special_chars = $${paramIndex++}`,
      `session_inactivity_timeout = $${paramIndex++}`,
      `updated_at = NOW()`,
    ];

    params.push(
      updatedSettings.max_login_attempts,
      updatedSettings.password_min_length,
      updatedSettings.password_require_uppercase,
      updatedSettings.password_require_lowercase,
      updatedSettings.password_require_numbers,
      updatedSettings.password_require_special_chars,
      updatedSettings.session_inactivity_timeout,
    );

    if (userId) {
      updates.push(`last_updated_by = $${paramIndex++}`);
      params.push(userId);
    }

    // Execute update
    await pool.query(
      `UPDATE app_settings SET ${updates.join(', ')} WHERE id = 1`,
      params,
    );

    // Invalidate cache
    this.invalidateCache();

    // Log settings change to settings_history
    await this.logSettingsHistory(
      'security',
      currentSettings as unknown as Record<string, unknown>,
      updatedSettings as unknown as Record<string, unknown>,
      userId,
      request,
    );

    // Also log to audit service
    if (userId) {
      await this.auditService.logSettingsChange(
        userId,
        request,
        'security_settings',
        currentSettings,
        updatedSettings,
      );
    }

    this.logger.log('Security settings updated', 'SecuritySettingsService');

    return updatedSettings;
  }

  /**
   * Reset security settings to defaults
   *
   * @param userId - User ID making the change (for audit)
   * @param request - Express request for audit logging
   * @returns Default security settings
   */
  async resetSecuritySettings(
    userId: number | undefined,
    request: AuthRequest,
  ): Promise<SecuritySettings> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    // Get current settings for audit
    const currentSettings = await this.getSecuritySettings();

    // Build update query with default values
    const params: unknown[] = [
      DEFAULT_SECURITY_SETTINGS.max_login_attempts,
      DEFAULT_SECURITY_SETTINGS.password_min_length,
      DEFAULT_SECURITY_SETTINGS.password_require_uppercase,
      DEFAULT_SECURITY_SETTINGS.password_require_lowercase,
      DEFAULT_SECURITY_SETTINGS.password_require_numbers,
      DEFAULT_SECURITY_SETTINGS.password_require_special_chars,
      DEFAULT_SECURITY_SETTINGS.session_inactivity_timeout,
    ];

    const updates = [
      'max_login_attempts = $1',
      'password_min_length = $2',
      'password_require_uppercase = $3',
      'password_require_lowercase = $4',
      'password_require_numbers = $5',
      'password_require_special_chars = $6',
      'session_inactivity_timeout = $7',
      'updated_at = NOW()',
    ];

    let paramIndex = 8;
    if (userId) {
      updates.push(`last_updated_by = $${paramIndex++}`);
      params.push(userId);
    }

    // Execute update
    await pool.query(
      `UPDATE app_settings SET ${updates.join(', ')} WHERE id = 1`,
      params,
    );

    // Invalidate cache
    this.invalidateCache();

    // Log settings change to settings_history
    await this.logSettingsHistory(
      'security',
      currentSettings as unknown as Record<string, unknown>,
      DEFAULT_SECURITY_SETTINGS as unknown as Record<string, unknown>,
      userId,
      request,
    );

    // Also log to audit service
    if (userId) {
      await this.auditService.logSettingsChange(
        userId,
        request,
        'security_settings',
        currentSettings,
        DEFAULT_SECURITY_SETTINGS,
      );
    }

    this.logger.log('Security settings reset to defaults', 'SecuritySettingsService');

    return DEFAULT_SECURITY_SETTINGS;
  }

  /**
   * Validate security settings
   * Throws BadRequestException if validation fails
   *
   * @param settings - Settings to validate
   */
  private validateSecuritySettings(settings: SecuritySettings): void {
    // Validate max login attempts
    if (settings.max_login_attempts < 1) {
      throw new BadRequestException('Max login attempts must be at least 1');
    }
    if (settings.max_login_attempts > 100) {
      throw new BadRequestException('Max login attempts cannot exceed 100');
    }

    // Validate password min length
    if (settings.password_min_length < 6) {
      throw new BadRequestException('Password min length must be at least 6');
    }
    if (settings.password_min_length > 128) {
      throw new BadRequestException('Password min length cannot exceed 128');
    }

    // Validate session inactivity timeout
    if (settings.session_inactivity_timeout < 1) {
      throw new BadRequestException('Session inactivity timeout must be at least 1 minute');
    }
    if (settings.session_inactivity_timeout > 1440) {
      throw new BadRequestException('Session inactivity timeout cannot exceed 1440 minutes (24 hours)');
    }
  }

  /**
   * Log settings change to settings_history table
   *
   * @param category - Settings category
   * @param oldValue - Previous settings value
   * @param newValue - New settings value
   * @param userId - User ID making the change
   * @param request - Express request for context
   */
  private async logSettingsHistory(
    category: string,
    oldValue: Record<string, unknown>,
    newValue: Record<string, unknown>,
    userId: number | undefined,
    request: AuthRequest,
  ): Promise<void> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      return;
    }

    try {
      const historyEntry: SettingsHistoryInsert = {
        category,
        old_value: oldValue,
        new_value: newValue,
        changed_by: userId ?? null,
        ip_address: this.extractIpAddress(request) ?? null,
        user_agent: request.headers['user-agent'] ?? null,
        request_id: request.requestId ?? null,
      };

      await pool.query(
        `INSERT INTO settings_history (category, old_value, new_value, changed_by, ip_address, user_agent, request_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          historyEntry.category,
          JSON.stringify(historyEntry.old_value),
          JSON.stringify(historyEntry.new_value),
          historyEntry.changed_by,
          historyEntry.ip_address,
          historyEntry.user_agent,
          historyEntry.request_id,
        ],
      );
    } catch (error) {
      // Log but don't fail the main operation
      this.logger.error(
        `Failed to log settings history: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'SecuritySettingsService',
      );
    }
  }

  /**
   * Extract IP address from request
   */
  private extractIpAddress(request: AuthRequest): string | null {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      return ips.split(',')[0].trim();
    }
    return request.ip ?? null;
  }

  /**
   * Invalidate the settings cache
   * Called when settings are updated
   */
  invalidateCache(): void {
    this.cachedSettings = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Get max login attempts (cached for performance)
   * Used by authentication middleware
   *
   * @returns Max login attempts
   */
  async getMaxLoginAttempts(): Promise<number> {
    const settings = await this.getSecuritySettings();
    return settings.max_login_attempts;
  }

  /**
   * Get password policy (cached for performance)
   * Used by password validation
   *
   * @returns Password policy settings
   */
  async getPasswordPolicy(): Promise<{
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  }> {
    const settings = await this.getSecuritySettings();
    return {
      minLength: settings.password_min_length,
      requireUppercase: settings.password_require_uppercase,
      requireLowercase: settings.password_require_lowercase,
      requireNumbers: settings.password_require_numbers,
      requireSpecialChars: settings.password_require_special_chars,
    };
  }
}
