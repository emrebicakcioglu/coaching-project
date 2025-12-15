/**
 * Settings Service
 * STORY-021B: Resource Endpoints
 * STORY-017: Theme-System Backend
 *
 * Business logic for application settings management.
 */

import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { WinstonLoggerService } from '../common/services/logger.service';
import { AuditService } from '../common/services/audit.service';
import {
  AppSettings,
  ThemeBackgroundColors,
  ThemeTextColors,
  ThemeStatusColors,
  EnhancedThemeColors,
} from '../database/types';
import { UpdateSettingsDto, UpdateThemeSettingsDto } from './dto/update-settings.dto';
import { SettingsResponseDto, ThemeSettingsResponseDto, DEFAULT_THEME_COLORS } from './dto/settings-response.dto';
import { Request } from 'express';

/**
 * Extended Request interface with user
 */
interface AuthRequest extends Request {
  user?: { id?: number; email?: string };
  requestId?: string;
}

/**
 * Settings Service
 * Handles all settings-related business logic
 */
@Injectable()
export class SettingsService {
  constructor(
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get all settings
   * App settings is a singleton table with only one row (id = 1)
   *
   * @returns Application settings
   */
  async findAll(): Promise<SettingsResponseDto> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    // Get or create settings (singleton pattern)
    let result = await pool.query<AppSettings>(
      'SELECT * FROM app_settings WHERE id = 1',
    );

    // If no settings exist, create default
    if (result.rows.length === 0) {
      result = await pool.query<AppSettings>(
        `INSERT INTO app_settings (id) VALUES (1) RETURNING *`,
      );
    }

    return SettingsResponseDto.fromEntity(result.rows[0]);
  }

  /**
   * Update all settings
   *
   * @param updateSettingsDto - Settings to update
   * @param userId - User ID making the change (for audit)
   * @param request - Express request for audit logging
   * @returns Updated settings
   */
  async update(
    updateSettingsDto: UpdateSettingsDto,
    userId: number | undefined,
    request: AuthRequest,
  ): Promise<SettingsResponseDto> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const {
      company_name,
      app_title,
      logo_url,
      theme_colors,
      features,
      maintenance,
    } = updateSettingsDto;

    // Get current settings for audit
    const currentSettings = await this.findAll();

    // Build update query dynamically
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (company_name !== undefined) {
      updates.push(`company_name = $${paramIndex++}`);
      params.push(company_name);
    }

    if (app_title !== undefined) {
      updates.push(`app_title = $${paramIndex++}`);
      params.push(app_title);
    }

    if (logo_url !== undefined) {
      updates.push(`logo_url = $${paramIndex++}`);
      params.push(logo_url);
    }

    if (theme_colors !== undefined) {
      // Merge with existing theme colors
      const mergedThemeColors = {
        ...currentSettings.theme_colors,
        ...theme_colors,
      };
      updates.push(`theme_colors = $${paramIndex++}`);
      params.push(JSON.stringify(mergedThemeColors));
    }

    if (features !== undefined) {
      // Merge with existing features
      const mergedFeatures = {
        ...currentSettings.features,
        ...features,
      };
      updates.push(`features = $${paramIndex++}`);
      params.push(JSON.stringify(mergedFeatures));
    }

    if (maintenance !== undefined) {
      // Merge with existing maintenance settings
      const mergedMaintenance = {
        ...currentSettings.maintenance,
        ...maintenance,
      };
      updates.push(`maintenance = $${paramIndex++}`);
      params.push(JSON.stringify(mergedMaintenance));
    }

    // Always update updated_at
    updates.push(`updated_at = NOW()`);

    // If no updates, return current settings
    if (updates.length === 1) {
      return currentSettings;
    }

    // Execute update
    const result = await pool.query<AppSettings>(
      `UPDATE app_settings SET ${updates.join(', ')} WHERE id = 1 RETURNING *`,
      params,
    );

    const updatedSettings = result.rows[0];

    // Log settings change if user ID is available
    if (userId) {
      await this.auditService.logSettingsChange(
        userId,
        request,
        'app_settings',
        currentSettings,
        SettingsResponseDto.fromEntity(updatedSettings),
      );
    }

    this.logger.log('App settings updated', 'SettingsService');

    return SettingsResponseDto.fromEntity(updatedSettings);
  }

  /**
   * Get theme settings only
   *
   * @returns Theme settings
   */
  async getThemeSettings(): Promise<ThemeSettingsResponseDto> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const result = await pool.query<AppSettings>(
      'SELECT theme_colors FROM app_settings WHERE id = 1',
    );

    if (result.rows.length === 0) {
      return ThemeSettingsResponseDto.fromThemeColors(null);
    }

    return ThemeSettingsResponseDto.fromThemeColors(result.rows[0].theme_colors || null);
  }

  /**
   * Update theme settings only (enhanced)
   * STORY-017: Theme-System Backend
   *
   * @param updateThemeDto - Theme settings to update
   * @param userId - User ID making the change (for audit)
   * @param request - Express request for audit logging
   * @returns Updated theme settings
   */
  async updateThemeSettings(
    updateThemeDto: UpdateThemeSettingsDto,
    userId: number | undefined,
    request: AuthRequest,
  ): Promise<ThemeSettingsResponseDto> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    // Get current theme settings
    const currentTheme = await this.getThemeSettings();

    // Deep merge with new values using enhanced structure
    const mergedTheme: EnhancedThemeColors = {
      primary: updateThemeDto.primary ?? currentTheme.primary,
      secondary: updateThemeDto.secondary ?? currentTheme.secondary,
      background: this.mergeBackgroundColors(
        currentTheme.background,
        updateThemeDto.background,
      ),
      text: this.mergeTextColors(
        currentTheme.text,
        updateThemeDto.text,
      ),
      status: this.mergeStatusColors(
        currentTheme.status,
        updateThemeDto.status,
      ),
    };

    // Update theme colors
    const result = await pool.query<AppSettings>(
      `UPDATE app_settings SET theme_colors = $1, updated_at = NOW() WHERE id = 1 RETURNING theme_colors`,
      [JSON.stringify(mergedTheme)],
    );

    const updatedTheme = result.rows[0].theme_colors;

    // Log settings change if user ID is available
    if (userId) {
      await this.auditService.logSettingsChange(
        userId,
        request,
        'theme_colors',
        currentTheme,
        updatedTheme,
      );
    }

    this.logger.log('Theme settings updated', 'SettingsService');

    return ThemeSettingsResponseDto.fromThemeColors(updatedTheme || null);
  }

  /**
   * Merge background colors with defaults
   * STORY-017: Theme-System Backend
   */
  private mergeBackgroundColors(
    current: ThemeBackgroundColors | undefined,
    update: ThemeBackgroundColors | undefined,
  ): ThemeBackgroundColors {
    return {
      page: update?.page ?? current?.page ?? DEFAULT_THEME_COLORS.background.page,
      card: update?.card ?? current?.card ?? DEFAULT_THEME_COLORS.background.card,
    };
  }

  /**
   * Merge text colors with defaults
   * STORY-017: Theme-System Backend
   */
  private mergeTextColors(
    current: ThemeTextColors | undefined,
    update: ThemeTextColors | undefined,
  ): ThemeTextColors {
    return {
      primary: update?.primary ?? current?.primary ?? DEFAULT_THEME_COLORS.text.primary,
      secondary: update?.secondary ?? current?.secondary ?? DEFAULT_THEME_COLORS.text.secondary,
    };
  }

  /**
   * Merge status colors with defaults
   * STORY-017: Theme-System Backend
   */
  private mergeStatusColors(
    current: ThemeStatusColors | undefined,
    update: ThemeStatusColors | undefined,
  ): ThemeStatusColors {
    return {
      success: update?.success ?? current?.success ?? DEFAULT_THEME_COLORS.status.success,
      warning: update?.warning ?? current?.warning ?? DEFAULT_THEME_COLORS.status.warning,
      error: update?.error ?? current?.error ?? DEFAULT_THEME_COLORS.status.error,
    };
  }
}
