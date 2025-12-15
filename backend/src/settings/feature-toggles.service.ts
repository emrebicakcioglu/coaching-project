/**
 * Feature Toggles Service
 * STORY-014A: Feature Toggles Backend
 *
 * Business logic for feature toggle management including:
 * - Get all features
 * - Check if a specific feature is enabled
 * - Toggle feature on/off
 * - Caching for performance
 * - Validation and audit logging
 */

import { Injectable, Inject, forwardRef, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { WinstonLoggerService } from '../common/services/logger.service';
import { AuditService } from '../common/services/audit.service';
import type { AppSettings, SettingsHistoryInsert } from '../database/types';
import { Request } from 'express';
import { FeaturesMap, FeatureData, FeatureResponseDto, UpdateFeatureDto } from './dto/feature-toggles.dto';

/**
 * Extended Request interface with user
 */
interface AuthRequest extends Request {
  user?: { id?: number; email?: string };
  requestId?: string;
}

/**
 * Default features configuration
 * Used when database has no features or for initialization
 */
export const DEFAULT_FEATURES: FeaturesMap = {
  'user-registration': {
    enabled: true,
    name: 'User Registration',
    description: 'Allow users to self-register',
    category: 'authentication',
  },
  'mfa': {
    enabled: false,
    name: 'Multi-Factor Authentication',
    description: 'Enable 2FA for users',
    category: 'security',
  },
  'feedback-button': {
    enabled: true,
    name: 'Feedback Button',
    description: 'Show feedback button with screenshot',
    category: 'support',
  },
  'dark-mode': {
    enabled: false,
    name: 'Dark Mode',
    description: 'Allow users to switch to dark theme',
    category: 'ui',
  },
};

/**
 * Feature Toggles Service
 * Handles feature flag management with caching
 */
@Injectable()
export class FeatureTogglesService {
  // In-memory cache for features (singleton pattern)
  private cachedFeatures: FeaturesMap | null = null;
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
   * Get all features
   * Uses cache if available
   *
   * @returns All features map
   */
  async getFeatures(): Promise<FeaturesMap> {
    // Check cache
    if (this.cachedFeatures && Date.now() - this.cacheTimestamp < this.CACHE_TTL_MS) {
      return this.cachedFeatures;
    }

    const pool = this.databaseService.getPool();
    if (!pool) {
      this.logger.warn('Database pool not available, returning default features', 'FeatureTogglesService');
      return DEFAULT_FEATURES;
    }

    try {
      const result = await pool.query<AppSettings>(
        `SELECT features FROM app_settings WHERE id = 1`,
      );

      if (result.rows.length === 0 || !result.rows[0].features) {
        this.logger.warn('No features found in database, returning defaults', 'FeatureTogglesService');
        return DEFAULT_FEATURES;
      }

      // Parse features - handle both old and new format
      const rawFeatures = result.rows[0].features;
      let features: FeaturesMap;

      // Check if it's the new format (objects with enabled, name, description, category)
      const firstKey = Object.keys(rawFeatures)[0];
      if (firstKey && typeof rawFeatures[firstKey] === 'object' && 'enabled' in rawFeatures[firstKey]) {
        features = rawFeatures as unknown as FeaturesMap;
      } else {
        // Convert old format (simple booleans) to new format
        features = this.convertLegacyFeatures(rawFeatures);
      }

      // Update cache
      this.cachedFeatures = features;
      this.cacheTimestamp = Date.now();

      return features;
    } catch (error) {
      this.logger.error(
        `Failed to get features: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'FeatureTogglesService',
      );
      return DEFAULT_FEATURES;
    }
  }

  /**
   * Convert legacy features format to new format
   * Handles old format like { mfa_enabled: true, registration_enabled: true }
   */
  private convertLegacyFeatures(legacyFeatures: Record<string, unknown>): FeaturesMap {
    const converted: FeaturesMap = { ...DEFAULT_FEATURES };

    // Map old keys to new keys
    if ('mfa_enabled' in legacyFeatures) {
      converted['mfa'].enabled = !!legacyFeatures['mfa_enabled'];
    }
    if ('registration_enabled' in legacyFeatures) {
      converted['user-registration'].enabled = !!legacyFeatures['registration_enabled'];
    }
    if ('password_reset_enabled' in legacyFeatures) {
      // If this key exists, map it accordingly or ignore
    }

    return converted;
  }

  /**
   * Check if a specific feature is enabled
   * Uses cache for performance
   *
   * @param featureKey - Feature key to check
   * @returns Whether the feature is enabled
   */
  async isEnabled(featureKey: string): Promise<boolean> {
    const features = await this.getFeatures();
    const feature = features[featureKey];

    if (!feature) {
      this.logger.warn(`Feature '${featureKey}' not found, returning false`, 'FeatureTogglesService');
      return false;
    }

    return feature.enabled;
  }

  /**
   * Get a single feature by key
   *
   * @param featureKey - Feature key to get
   * @returns Feature data or throws NotFoundException
   */
  async getFeature(featureKey: string): Promise<FeatureResponseDto> {
    const features = await this.getFeatures();
    const feature = features[featureKey];

    if (!feature) {
      throw new NotFoundException(`Feature '${featureKey}' not found`);
    }

    return FeatureResponseDto.fromData(featureKey, feature);
  }

  /**
   * Toggle a feature on/off
   * Admin only
   *
   * @param featureKey - Feature key to toggle
   * @param enabled - New enabled state
   * @param userId - User ID making the change (for audit)
   * @param request - Express request for audit logging
   * @returns Updated feature
   */
  async toggleFeature(
    featureKey: string,
    enabled: boolean,
    userId: number | undefined,
    request: AuthRequest,
  ): Promise<FeatureResponseDto> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new BadRequestException('Database pool not available');
    }

    // Get current features
    const currentFeatures = await this.getFeatures();
    const currentFeature = currentFeatures[featureKey];

    if (!currentFeature) {
      throw new NotFoundException(`Feature '${featureKey}' not found`);
    }

    // Skip if no change
    if (currentFeature.enabled === enabled) {
      return FeatureResponseDto.fromData(featureKey, currentFeature);
    }

    // Create updated features map
    const updatedFeatures: FeaturesMap = {
      ...currentFeatures,
      [featureKey]: {
        ...currentFeature,
        enabled,
      },
    };

    // Update database
    await pool.query(
      `UPDATE app_settings SET features = $1::jsonb, updated_at = NOW() WHERE id = 1`,
      [JSON.stringify(updatedFeatures)],
    );

    // Invalidate cache
    this.invalidateCache();

    // Log settings change to settings_history
    await this.logSettingsHistory(
      'features',
      { [featureKey]: currentFeature },
      { [featureKey]: updatedFeatures[featureKey] },
      userId,
      request,
    );

    // Also log to audit service
    if (userId) {
      await this.auditService.logSettingsChange(
        userId,
        request,
        'feature_toggles',
        { [featureKey]: currentFeature },
        { [featureKey]: updatedFeatures[featureKey] },
      );
    }

    this.logger.log(`Feature '${featureKey}' toggled to ${enabled}`, 'FeatureTogglesService');

    return FeatureResponseDto.fromData(featureKey, updatedFeatures[featureKey]);
  }

  /**
   * Update a feature with full data
   * Admin only
   *
   * @param featureKey - Feature key to update
   * @param updateDto - Update data
   * @param userId - User ID making the change (for audit)
   * @param request - Express request for audit logging
   * @returns Updated feature
   */
  async updateFeature(
    featureKey: string,
    updateDto: UpdateFeatureDto,
    userId: number | undefined,
    request: AuthRequest,
  ): Promise<FeatureResponseDto> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new BadRequestException('Database pool not available');
    }

    // Get current features
    const currentFeatures = await this.getFeatures();
    const currentFeature = currentFeatures[featureKey];

    if (!currentFeature) {
      throw new NotFoundException(`Feature '${featureKey}' not found`);
    }

    // Merge updates
    const updatedFeature: FeatureData = {
      enabled: updateDto.enabled ?? currentFeature.enabled,
      name: updateDto.name ?? currentFeature.name,
      description: updateDto.description ?? currentFeature.description,
      category: updateDto.category ?? currentFeature.category,
    };

    // Create updated features map
    const updatedFeatures: FeaturesMap = {
      ...currentFeatures,
      [featureKey]: updatedFeature,
    };

    // Update database
    await pool.query(
      `UPDATE app_settings SET features = $1::jsonb, updated_at = NOW() WHERE id = 1`,
      [JSON.stringify(updatedFeatures)],
    );

    // Invalidate cache
    this.invalidateCache();

    // Log settings change to settings_history
    await this.logSettingsHistory(
      'features',
      { [featureKey]: currentFeature },
      { [featureKey]: updatedFeature },
      userId,
      request,
    );

    // Also log to audit service
    if (userId) {
      await this.auditService.logSettingsChange(
        userId,
        request,
        'feature_toggles',
        { [featureKey]: currentFeature },
        { [featureKey]: updatedFeature },
      );
    }

    this.logger.log(`Feature '${featureKey}' updated`, 'FeatureTogglesService');

    return FeatureResponseDto.fromData(featureKey, updatedFeature);
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
        'FeatureTogglesService',
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
   * Invalidate the features cache
   * Called when features are updated
   */
  invalidateCache(): void {
    this.cachedFeatures = null;
    this.cacheTimestamp = 0;
    this.logger.log('Features cache invalidated', 'FeatureTogglesService');
  }

  /**
   * Clear the cache (public method for external use)
   * Can be called when cache needs to be refreshed
   */
  clearCache(): void {
    this.invalidateCache();
  }
}
