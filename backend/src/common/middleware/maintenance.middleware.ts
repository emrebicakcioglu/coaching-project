/**
 * Maintenance Middleware
 * STORY-034: Maintenance Mode
 *
 * Checks maintenance status on each request.
 * If maintenance mode is active, returns 503 Service Unavailable for non-admin users.
 * Admin users (with settings.update, admin.*, or * permissions) can bypass.
 */

import {
  Injectable,
  NestMiddleware,
  ServiceUnavailableException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DatabaseService } from '../../database/database.service';
import { WinstonLoggerService } from '../services/logger.service';
import { AppSettings, MaintenanceSettings } from '../../database/types';

/**
 * Extended Request interface with user and requestId
 */
interface AuthenticatedRequest extends Request {
  user?: { id?: number; email?: string; permissions?: string[] };
  requestId?: string;
}

/**
 * Default maintenance message
 */
const DEFAULT_MAINTENANCE_MESSAGE =
  'We are currently performing scheduled maintenance. Please check back soon.';

/**
 * Maintenance Middleware
 * Checks maintenance status and blocks non-admin requests when maintenance is active
 */
@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  // Routes that should skip maintenance check (must always be accessible)
  private readonly skipRoutes = [
    '/api/v1/settings/maintenance', // Admins must be able to check/toggle maintenance
    '/api/v1/auth/login', // Allow login to check user permissions
    '/api/v1/auth/refresh', // Allow token refresh
    '/api/health', // Health checks should always work
    '/health',
    '/api/docs', // Swagger docs
    '/api/docs-json',
  ];

  constructor(
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
  ) {}

  async use(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    // Skip for certain routes
    if (this.shouldSkipRoute(req.path)) {
      return next();
    }

    try {
      // Get maintenance status from database
      const pool = this.databaseService.getPool();
      if (!pool) {
        // If database is unavailable, don't block requests
        return next();
      }

      const result = await pool.query<AppSettings>(
        'SELECT maintenance FROM app_settings WHERE id = 1',
      );

      if (result.rows.length === 0) {
        return next();
      }

      const maintenance: MaintenanceSettings = result.rows[0].maintenance || {
        enabled: false,
      };

      // If maintenance mode is not enabled, proceed
      if (!maintenance.enabled) {
        return next();
      }

      // Check if user has admin bypass
      const hasBypass = await this.checkAdminBypass(req);
      if (hasBypass) {
        // Add header to indicate admin bypass
        res.setHeader('X-Maintenance-Bypass', 'true');
        return next();
      }

      // Block the request with 503 Service Unavailable
      this.logger.log(
        `Maintenance mode: Blocking request from ${req.ip} to ${req.path}`,
        'MaintenanceMiddleware',
      );

      throw new ServiceUnavailableException({
        statusCode: 503,
        error: 'Service Unavailable',
        message: maintenance.message || DEFAULT_MAINTENANCE_MESSAGE,
        maintenance: true,
        estimatedEndTime: maintenance.scheduled_end || null,
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      // Log unexpected errors but don't block the request
      this.logger.error(
        `Maintenance check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'MaintenanceMiddleware',
      );

      next();
    }
  }

  /**
   * Check if route should skip maintenance check
   */
  private shouldSkipRoute(path: string): boolean {
    const normalizedPath = path.toLowerCase();

    // Check exact matches and prefixes
    return this.skipRoutes.some(
      (route) =>
        normalizedPath === route || normalizedPath.startsWith(route + '/'),
    );
  }

  /**
   * Check if user has admin bypass permission
   */
  private async checkAdminBypass(req: AuthenticatedRequest): Promise<boolean> {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    try {
      const token = authHeader.slice(7);
      const userId = this.extractUserIdFromToken(token);

      if (!userId) {
        return false;
      }

      // Get user permissions from database
      const pool = this.databaseService.getPool();
      if (!pool) {
        return false;
      }

      const result = await pool.query<{ name: string }>(
        `SELECT DISTINCT p.name
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         JOIN user_roles ur ON rp.role_id = ur.role_id
         WHERE ur.user_id = $1`,
        [userId],
      );

      const permissions = result.rows.map((row) => row.name);

      // Check for admin bypass permissions
      return (
        permissions.includes('admin.*') ||
        permissions.includes('settings.update') ||
        permissions.includes('settings.*') ||
        permissions.includes('*')
      );
    } catch (error) {
      this.logger.error(
        `Admin bypass check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        'MaintenanceMiddleware',
      );
      return false;
    }
  }

  /**
   * Extract user ID from JWT token without full validation
   */
  private extractUserIdFromToken(token: string): number | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      return typeof payload.sub === 'number' ? payload.sub : null;
    } catch {
      return null;
    }
  }
}
