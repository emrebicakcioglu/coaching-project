/**
 * Maintenance Service
 * STORY-034: Maintenance Mode
 *
 * Business logic for maintenance mode management.
 */

import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { WinstonLoggerService } from '../common/services/logger.service';
import { AuditService } from '../common/services/audit.service';
import { AppSettings, MaintenanceSettings } from '../database/types';
import { UpdateMaintenanceDto, MaintenanceResponseDto } from './dto/maintenance.dto';
import { Request } from 'express';

/**
 * Extended Request interface with user
 */
interface AuthRequest extends Request {
  user?: { id?: number; email?: string };
  requestId?: string;
}

/**
 * Default maintenance message
 */
const DEFAULT_MAINTENANCE_MESSAGE =
  'We are currently performing scheduled maintenance. Please check back soon.';

/**
 * Maintenance Service
 * Handles all maintenance-related business logic
 */
@Injectable()
export class MaintenanceService {
  constructor(
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get current maintenance status
   *
   * @returns Current maintenance status
   */
  async getMaintenanceStatus(): Promise<MaintenanceResponseDto> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const result = await pool.query<AppSettings>(
      'SELECT maintenance FROM app_settings WHERE id = 1',
    );

    if (result.rows.length === 0) {
      // Return default maintenance status
      return {
        enabled: false,
        message: DEFAULT_MAINTENANCE_MESSAGE,
        estimatedEndTime: null,
        startedAt: null,
      };
    }

    const maintenance = result.rows[0].maintenance || { enabled: false };

    return {
      enabled: maintenance.enabled || false,
      message: maintenance.message || DEFAULT_MAINTENANCE_MESSAGE,
      estimatedEndTime: maintenance.scheduled_end
        ? new Date(maintenance.scheduled_end).toISOString()
        : null,
      startedAt: maintenance.scheduled_start
        ? new Date(maintenance.scheduled_start).toISOString()
        : null,
    };
  }

  /**
   * Update maintenance mode settings
   *
   * @param updateDto - Maintenance settings to update
   * @param userId - User ID making the change (for audit)
   * @param request - Express request for audit logging
   * @returns Updated maintenance status
   */
  async updateMaintenanceMode(
    updateDto: UpdateMaintenanceDto,
    userId: number,
    request: AuthRequest,
  ): Promise<MaintenanceResponseDto> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    // Get current maintenance settings for audit
    const currentStatus = await this.getMaintenanceStatus();

    // Build new maintenance settings
    const now = new Date();
    const newMaintenance: MaintenanceSettings = {
      enabled: updateDto.enabled,
      message: updateDto.message || DEFAULT_MAINTENANCE_MESSAGE,
      scheduled_start: updateDto.enabled ? now.toISOString() : undefined,
      scheduled_end: updateDto.enabled && updateDto.estimatedDurationMinutes
        ? new Date(now.getTime() + updateDto.estimatedDurationMinutes * 60 * 1000).toISOString()
        : undefined,
    };

    // If disabling maintenance, clear the timestamps
    if (!updateDto.enabled) {
      newMaintenance.scheduled_start = undefined;
      newMaintenance.scheduled_end = undefined;
    }

    // Update database
    const result = await pool.query<AppSettings>(
      `UPDATE app_settings
       SET maintenance = $1, updated_at = NOW(), last_updated_by = $2
       WHERE id = 1
       RETURNING maintenance`,
      [JSON.stringify(newMaintenance), userId],
    );

    const updatedMaintenance = result.rows[0]?.maintenance || newMaintenance;

    // Log the change
    await this.auditService.logSettingsChange(
      userId,
      request,
      'maintenance',
      currentStatus,
      {
        enabled: updatedMaintenance.enabled,
        message: updatedMaintenance.message,
        estimatedEndTime: updatedMaintenance.scheduled_end,
        startedAt: updatedMaintenance.scheduled_start,
      },
    );

    this.logger.log(
      `Maintenance mode ${updateDto.enabled ? 'enabled' : 'disabled'} by user ${userId}`,
      'MaintenanceService',
    );

    return {
      enabled: updatedMaintenance.enabled || false,
      message: updatedMaintenance.message || DEFAULT_MAINTENANCE_MESSAGE,
      estimatedEndTime: updatedMaintenance.scheduled_end
        ? new Date(updatedMaintenance.scheduled_end).toISOString()
        : null,
      startedAt: updatedMaintenance.scheduled_start
        ? new Date(updatedMaintenance.scheduled_start).toISOString()
        : null,
    };
  }

  /**
   * Check if maintenance mode is currently active
   *
   * @returns Boolean indicating if maintenance is active
   */
  async isMaintenanceActive(): Promise<boolean> {
    const status = await this.getMaintenanceStatus();
    return status.enabled;
  }

  /**
   * Get user permissions by user ID
   *
   * @param userId - User ID to get permissions for
   * @returns Array of permission names
   */
  async getUserPermissions(userId: number): Promise<string[]> {
    const pool = this.databaseService.getPool();
    if (!pool) {
      return [];
    }

    try {
      const result = await pool.query<{ name: string }>(
        `SELECT DISTINCT p.name
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         JOIN user_roles ur ON rp.role_id = ur.role_id
         WHERE ur.user_id = $1`,
        [userId],
      );

      return result.rows.map((row) => row.name);
    } catch (error) {
      this.logger.error(
        `Error fetching permissions for user ${userId}: ${error}`,
        undefined,
        'MaintenanceService',
      );
      return [];
    }
  }

  /**
   * Check if user has admin bypass permission
   *
   * @param userId - User ID to check
   * @returns Boolean indicating if user can bypass maintenance
   */
  async hasAdminBypass(userId: number): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return (
      permissions.includes('admin.*') ||
      permissions.includes('settings.update') ||
      permissions.includes('settings.*') ||
      permissions.includes('*')
    );
  }
}
