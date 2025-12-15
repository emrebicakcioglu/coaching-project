/**
 * Health Check Service
 *
 * Performs health checks on application services including database,
 * SMTP server, and MinIO storage with parallel execution.
 *
 * Stories:
 * - STORY-021A: API-Basis-Infrastruktur
 * - STORY-029: Health Status (SMTP, MinIO checks, parallel execution)
 *
 * Status Levels:
 * - healthy: All checks passing
 * - degraded: Some non-critical checks failing (e.g., storage)
 * - unhealthy: Critical checks failing (e.g., database)
 *
 * Critical Services: Database
 * Non-Critical Services: SMTP, Storage (MinIO)
 */

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SmtpHealthService } from './services/smtp-health.service';
import { StorageHealthService } from './services/storage-health.service';
import {
  HealthCheckResponseDto,
  ExtendedHealthCheckResponseDto,
  ComponentHealthDto,
} from './dto';

/**
 * Legacy health check response interface for backward compatibility
 * @deprecated Use HealthCheckResponseDto instead
 */
export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  services: {
    database: {
      status: 'up' | 'down';
      latency?: number;
      error?: string;
    };
  };
}

@Injectable()
export class HealthService {
  private readonly startTime: Date;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly smtpHealthService: SmtpHealthService,
    private readonly storageHealthService: StorageHealthService,
  ) {
    this.startTime = new Date();
  }

  /**
   * Perform comprehensive health check (STORY-029 specification)
   *
   * Executes all health checks in parallel for optimal performance.
   * Returns response format matching STORY-029 specification.
   *
   * @returns Promise<HealthCheckResponseDto> - Health check result
   */
  async checkAll(): Promise<HealthCheckResponseDto> {
    // Execute all health checks in parallel for better performance
    const [dbHealth, smtpHealth, storageHealth] = await Promise.all([
      this.checkDatabase(),
      this.checkSmtp(),
      this.checkStorage(),
    ]);

    // Determine overall status based on service health
    // Database is critical - if down, system is unhealthy
    // SMTP and Storage are non-critical - if down, system is degraded
    const status = this.determineOverallStatus(dbHealth, smtpHealth, storageHealth);

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      checks: {
        database: dbHealth,
        smtp: smtpHealth,
        storage: storageHealth,
      },
    };
  }

  /**
   * Perform comprehensive health check (backward compatible)
   *
   * Legacy method for backward compatibility with existing /health endpoint.
   *
   * @returns Promise<HealthCheckResponse> - Legacy health check result
   * @deprecated Use checkAll() instead for new implementations
   */
  async check(): Promise<HealthCheckResponse> {
    const dbHealth = await this.checkDatabaseLegacy();

    // Determine overall status based on service health
    let status: 'ok' | 'degraded' | 'unhealthy';
    if (dbHealth.status === 'up') {
      status = 'ok';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: dbHealth,
      },
    };
  }

  /**
   * Get extended health check response with environment info
   *
   * @returns Promise<ExtendedHealthCheckResponseDto> - Extended health check result
   */
  async checkExtended(): Promise<ExtendedHealthCheckResponseDto> {
    const healthCheck = await this.checkAll();

    return {
      ...healthCheck,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  /**
   * Determine overall health status based on individual component checks
   *
   * @param database - Database health check result
   * @param smtp - SMTP health check result
   * @param storage - Storage health check result
   * @returns Overall health status
   */
  private determineOverallStatus(
    database: ComponentHealthDto,
    smtp: ComponentHealthDto,
    storage: ComponentHealthDto,
  ): 'healthy' | 'degraded' | 'unhealthy' {
    // Database is critical - if unhealthy, system is unhealthy
    if (database.status === 'unhealthy') {
      return 'unhealthy';
    }

    // SMTP and Storage are non-critical
    // If any non-critical service is unhealthy, system is degraded
    const smtpUnhealthy = smtp.status === 'unhealthy' && !smtp.error?.includes('not configured');
    const storageUnhealthy = storage.status === 'unhealthy' && !storage.error?.includes('not configured');

    if (smtpUnhealthy || storageUnhealthy) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Check database connectivity (STORY-029 format)
   */
  private async checkDatabase(): Promise<ComponentHealthDto> {
    const startTime = Date.now();
    try {
      const health = await this.databaseService.healthCheck();
      const responseTime = health.latencyMs || (Date.now() - startTime);

      if (health.healthy) {
        return {
          status: 'healthy',
          responseTime,
        };
      }
      return {
        status: 'unhealthy',
        responseTime,
        error: 'Database health check failed',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check database connectivity (legacy format)
   * @deprecated Use checkDatabase() instead
   */
  private async checkDatabaseLegacy(): Promise<{
    status: 'up' | 'down';
    latency?: number;
    error?: string;
  }> {
    try {
      const health = await this.databaseService.healthCheck();
      if (health.healthy) {
        return {
          status: 'up',
          latency: health.latencyMs,
        };
      }
      return {
        status: 'down',
        error: 'Database health check failed',
      };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check SMTP server connectivity
   */
  private async checkSmtp(): Promise<ComponentHealthDto> {
    try {
      const health = await this.smtpHealthService.healthCheck();
      return {
        status: health.healthy ? 'healthy' : 'unhealthy',
        responseTime: health.responseTimeMs,
        error: health.error,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check MinIO/Storage connectivity
   */
  private async checkStorage(): Promise<ComponentHealthDto> {
    try {
      const health = await this.storageHealthService.healthCheck();
      return {
        status: health.healthy ? 'healthy' : 'unhealthy',
        responseTime: health.responseTimeMs,
        error: health.error,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Calculate application uptime in seconds
   */
  private getUptime(): number {
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }
}
