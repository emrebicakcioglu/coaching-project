/**
 * Health Check Controller
 *
 * Provides health check endpoints for container orchestration and monitoring.
 * Returns service status including database, SMTP, and storage connectivity.
 *
 * Stories:
 * - STORY-021A: API-Basis-Infrastruktur
 * - STORY-021B: API Middleware & Error Handling (Skip rate limiting)
 * - STORY-022: Swagger/OpenAPI Documentation
 * - STORY-029: Health Status (SMTP, MinIO checks, /api/health endpoint)
 *
 * Endpoints:
 * - GET /health - Legacy health endpoint (backward compatibility)
 * - GET /api/health - Full health check with all components (STORY-029)
 *
 * Status Codes:
 * - 200 OK: System healthy or degraded
 * - 503 Service Unavailable: System unhealthy
 */

import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService, HealthCheckResponse } from './health.service';
import { SkipRateLimit } from '../common/guards/rate-limit.guard';
import { HealthCheckResponseDto } from './dto';

@ApiTags('Health')
@Controller()
@SkipRateLimit() // Health checks should always be accessible (STORY-021B)
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Legacy health check endpoint (backward compatibility)
   *
   * Maintains backward compatibility with existing health checks.
   * Only checks database connectivity.
   */
  @Get('health')
  @ApiOperation({
    summary: 'Legacy health check',
    description:
      'Returns health status including overall service status, database connectivity, and uptime information. This endpoint maintains backward compatibility with existing health checks.',
  })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['ok', 'degraded', 'unhealthy'],
          example: 'ok',
        },
        timestamp: {
          type: 'string',
          example: '2024-01-15T12:00:00.000Z',
        },
        uptime: {
          type: 'number',
          description: 'Uptime in seconds',
          example: 3600,
        },
        environment: {
          type: 'string',
          example: 'development',
        },
        version: {
          type: 'string',
          example: '1.0.0',
        },
        services: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['up', 'down'], example: 'up' },
                latency: {
                  type: 'number',
                  description: 'Latency in ms',
                  example: 5,
                },
              },
            },
          },
        },
      },
    },
  })
  async check(): Promise<HealthCheckResponse> {
    return this.healthService.check();
  }

  /**
   * Full health check endpoint (STORY-029)
   *
   * Returns comprehensive health status including database, SMTP, and storage.
   * Returns 200 for healthy/degraded, 503 for unhealthy.
   */
  @Get('api/health')
  @ApiOperation({
    summary: 'Full health check',
    description:
      'Returns comprehensive health status including database, SMTP server, and MinIO storage connectivity. Returns 200 for healthy/degraded status and 503 for unhealthy status. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'System healthy or degraded',
    type: HealthCheckResponseDto,
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['healthy', 'degraded', 'unhealthy'],
          example: 'healthy',
        },
        timestamp: {
          type: 'string',
          example: '2025-11-19T10:00:00Z',
        },
        uptime: {
          type: 'number',
          description: 'Uptime in seconds',
          example: 3600,
        },
        checks: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['healthy', 'unhealthy'],
                  example: 'healthy',
                },
                responseTime: {
                  type: 'number',
                  description: 'Response time in ms',
                  example: 5,
                },
              },
            },
            smtp: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['healthy', 'unhealthy'],
                  example: 'healthy',
                },
                responseTime: {
                  type: 'number',
                  description: 'Response time in ms',
                  example: 120,
                },
              },
            },
            storage: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['healthy', 'unhealthy'],
                  example: 'healthy',
                },
                responseTime: {
                  type: 'number',
                  description: 'Response time in ms',
                  example: 15,
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'System unhealthy',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['unhealthy'],
          example: 'unhealthy',
        },
        timestamp: {
          type: 'string',
          example: '2025-11-19T10:00:00Z',
        },
        uptime: {
          type: 'number',
          example: 3600,
        },
        checks: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'unhealthy' },
                responseTime: { type: 'number', example: 5000 },
                error: { type: 'string', example: 'Connection refused' },
              },
            },
            smtp: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'healthy' },
                responseTime: { type: 'number', example: 120 },
              },
            },
            storage: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'healthy' },
                responseTime: { type: 'number', example: 15 },
              },
            },
          },
        },
      },
    },
  })
  async checkAllComponents(
    @Res() res: Response,
  ): Promise<Response<HealthCheckResponseDto>> {
    const health = await this.healthService.checkAll();

    // Return 503 for unhealthy status, 200 for healthy/degraded
    const statusCode =
      health.status === 'unhealthy'
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.OK;

    return res.status(statusCode).json(health);
  }
}
