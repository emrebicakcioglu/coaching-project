/**
 * General Settings Service
 * STORY-035: Support-E-Mail & Session-Timeout
 *
 * Business logic for general settings management including:
 * - Support email configuration
 * - Session timeout settings
 * - Timeout warning configuration
 */

import { Injectable, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { WinstonLoggerService } from '../common/services/logger.service';
import { AuditService } from '../common/services/audit.service';
import type { AppSettings } from '../database/types';
import {
  UpdateGeneralSettingsDto,
  GeneralSettingsResponseDto,
  SessionTimeoutConfigDto,
} from './dto/general-settings.dto';
import { Request } from 'express';

/**
 * Extended Request interface with user
 */
interface AuthRequest extends Request {
  user?: { id?: number; email?: string };
  requestId?: string;
}

/**
 * Default values for general settings
 */
const DEFAULT_SESSION_TIMEOUT_MINUTES = 30;
const DEFAULT_SHOW_TIMEOUT_WARNING = true;
const DEFAULT_WARNING_BEFORE_TIMEOUT = 5;

/**
 * General Settings Service
 * Handles support email and session timeout configuration
 */
@Injectable()
export class GeneralSettingsService {
  // In-memory cache for session timeout (frequently accessed)
  private cachedSessionTimeout: number | null = null;
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
   * Get general settings (support email and session timeout)
   *
   * @returns General settings
   */
  async getGeneralSettings(): Promise<GeneralSettingsResponseDto> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const result = await pool.query<AppSettings>(
      `SELECT support_email, session_timeout_minutes, show_timeout_warning,
              warning_before_timeout_minutes, updated_at, last_updated_by
       FROM app_settings WHERE id = 1`,
    );

    if (result.rows.length === 0) {
      // Return defaults if no settings exist
      return GeneralSettingsResponseDto.fromEntity({
        support_email: null,
        session_timeout_minutes: DEFAULT_SESSION_TIMEOUT_MINUTES,
        show_timeout_warning: DEFAULT_SHOW_TIMEOUT_WARNING,
        warning_before_timeout_minutes: DEFAULT_WARNING_BEFORE_TIMEOUT,
        updated_at: new Date(),
        updated_by: null,
      });
    }

    const row = result.rows[0];
    return GeneralSettingsResponseDto.fromEntity({
      support_email: row.support_email ?? null,
      session_timeout_minutes: row.session_timeout_minutes ?? DEFAULT_SESSION_TIMEOUT_MINUTES,
      show_timeout_warning: row.show_timeout_warning ?? DEFAULT_SHOW_TIMEOUT_WARNING,
      warning_before_timeout_minutes: row.warning_before_timeout_minutes ?? DEFAULT_WARNING_BEFORE_TIMEOUT,
      updated_at: row.updated_at,
      updated_by: row.last_updated_by ?? null,
    });
  }

  /**
   * Update general settings
   *
   * @param updateDto - Settings to update
   * @param userId - User ID making the change (for audit)
   * @param request - Express request for audit logging
   * @returns Updated settings
   */
  async updateGeneralSettings(
    updateDto: UpdateGeneralSettingsDto,
    userId: number | undefined,
    request: AuthRequest,
  ): Promise<GeneralSettingsResponseDto> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    // Get current settings for audit
    const currentSettings = await this.getGeneralSettings();

    // Validate warning_before_timeout_minutes
    const newTimeout = updateDto.session_timeout_minutes ?? currentSettings.session_timeout_minutes;
    const newWarning = updateDto.warning_before_timeout_minutes ?? currentSettings.warning_before_timeout_minutes;

    if (newWarning >= newTimeout) {
      throw new BadRequestException(
        `Warning time (${newWarning} minutes) must be less than session timeout (${newTimeout} minutes)`,
      );
    }

    // Build update query dynamically - track actual content changes
    const contentUpdates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (updateDto.support_email !== undefined) {
      contentUpdates.push(`support_email = $${paramIndex++}`);
      params.push(updateDto.support_email);
    }

    if (updateDto.session_timeout_minutes !== undefined) {
      contentUpdates.push(`session_timeout_minutes = $${paramIndex++}`);
      params.push(updateDto.session_timeout_minutes);
    }

    if (updateDto.show_timeout_warning !== undefined) {
      contentUpdates.push(`show_timeout_warning = $${paramIndex++}`);
      params.push(updateDto.show_timeout_warning);
    }

    if (updateDto.warning_before_timeout_minutes !== undefined) {
      contentUpdates.push(`warning_before_timeout_minutes = $${paramIndex++}`);
      params.push(updateDto.warning_before_timeout_minutes);
    }

    // If no actual content updates, return current settings
    if (contentUpdates.length === 0) {
      return currentSettings;
    }

    // Add timestamp and updated_by to the update
    const updates = [...contentUpdates, `updated_at = NOW()`];
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

    // Get updated settings
    const updatedSettings = await this.getGeneralSettings();

    // Log settings change
    if (userId) {
      await this.auditService.logSettingsChange(
        userId,
        request,
        'general_settings',
        currentSettings,
        updatedSettings,
      );
    }

    this.logger.log('General settings updated', 'GeneralSettingsService');

    return updatedSettings;
  }

  /**
   * Get session timeout configuration for clients
   * Returns minimal data needed for client-side session management
   *
   * @returns Session timeout configuration
   */
  async getSessionTimeoutConfig(): Promise<SessionTimeoutConfigDto> {
    const settings = await this.getGeneralSettings();
    return SessionTimeoutConfigDto.fromGeneralSettings({
      support_email: settings.support_email,
      session_timeout_minutes: settings.session_timeout_minutes,
      show_timeout_warning: settings.show_timeout_warning,
      warning_before_timeout_minutes: settings.warning_before_timeout_minutes,
      updated_at: settings.updated_at,
      updated_by: settings.updated_by,
    });
  }

  /**
   * Get session timeout in minutes (cached for performance)
   * Used by middleware for session validation
   *
   * @returns Session timeout in minutes
   */
  async getSessionTimeoutMinutes(): Promise<number> {
    // Check cache
    if (this.cachedSessionTimeout !== null && Date.now() - this.cacheTimestamp < this.CACHE_TTL_MS) {
      return this.cachedSessionTimeout;
    }

    // Fetch from database
    const pool = this.databaseService.getPool();
    if (!pool) {
      return DEFAULT_SESSION_TIMEOUT_MINUTES;
    }

    try {
      const result = await pool.query<{ session_timeout_minutes: number }>(
        'SELECT session_timeout_minutes FROM app_settings WHERE id = 1',
      );

      this.cachedSessionTimeout = result.rows[0]?.session_timeout_minutes ?? DEFAULT_SESSION_TIMEOUT_MINUTES;
      this.cacheTimestamp = Date.now();

      return this.cachedSessionTimeout;
    } catch (error) {
      this.logger.error(
        `Failed to get session timeout: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'GeneralSettingsService',
      );
      return DEFAULT_SESSION_TIMEOUT_MINUTES;
    }
  }

  /**
   * Get support email address
   *
   * @returns Support email or null if not configured
   */
  async getSupportEmail(): Promise<string | null> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      return null;
    }

    try {
      const result = await pool.query<{ support_email: string | null }>(
        'SELECT support_email FROM app_settings WHERE id = 1',
      );

      return result.rows[0]?.support_email ?? null;
    } catch (error) {
      this.logger.error(
        `Failed to get support email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'GeneralSettingsService',
      );
      return null;
    }
  }

  /**
   * Invalidate the session timeout cache
   * Called when settings are updated
   */
  invalidateCache(): void {
    this.cachedSessionTimeout = null;
    this.cacheTimestamp = 0;
  }
}
