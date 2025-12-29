/**
 * Health Check Response DTOs
 *
 * DTOs for the health check endpoint responses.
 *
 * Story: STORY-029 (Health Status)
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Individual component health check result
 */
export class ComponentHealthDto {
  @ApiProperty({
    description: 'Health status of the component',
    enum: ['healthy', 'unhealthy'],
    example: 'healthy',
  })
  status: 'healthy' | 'unhealthy';

  @ApiProperty({
    description: 'Response time of the health check in milliseconds',
    example: 5,
  })
  responseTime: number;

  @ApiPropertyOptional({
    description: 'Error message if the check failed',
    example: 'Connection refused',
  })
  error?: string;
}

/**
 * Health checks object containing all component health results
 */
export class HealthChecksDto {
  @ApiProperty({
    description: 'Database (PostgreSQL) connectivity check',
    type: ComponentHealthDto,
  })
  database: ComponentHealthDto;

  @ApiProperty({
    description: 'SMTP server connectivity check',
    type: ComponentHealthDto,
  })
  smtp: ComponentHealthDto;

  @ApiProperty({
    description: 'MinIO/Storage connectivity check (optional service)',
    type: ComponentHealthDto,
  })
  storage: ComponentHealthDto;
}

/**
 * Health check response matching STORY-029 specification
 *
 * Response format:
 * {
 *   "status": "healthy",
 *   "timestamp": "2025-11-19T10:00:00Z",
 *   "uptime": 3600,
 *   "checks": {
 *     "database": { "status": "healthy", "responseTime": 5 },
 *     "smtp": { "status": "healthy", "responseTime": 120 },
 *     "storage": { "status": "healthy", "responseTime": 15 }
 *   }
 * }
 */
export class HealthCheckResponseDto {
  @ApiProperty({
    description: 'Overall health status of the application',
    enum: ['healthy', 'degraded', 'unhealthy'],
    example: 'healthy',
  })
  status: 'healthy' | 'degraded' | 'unhealthy';

  @ApiProperty({
    description: 'Timestamp of the health check in ISO 8601 format',
    example: '2025-11-19T10:00:00Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Application uptime in seconds',
    example: 3600,
  })
  uptime: number;

  @ApiProperty({
    description: 'Health check results for each component',
    type: HealthChecksDto,
  })
  checks: HealthChecksDto;
}

/**
 * Extended health check response with additional metadata
 * Used for backward compatibility with existing /health endpoint
 */
export class ExtendedHealthCheckResponseDto extends HealthCheckResponseDto {
  @ApiPropertyOptional({
    description: 'Application environment',
    example: 'development',
  })
  environment?: string;

  @ApiPropertyOptional({
    description: 'Application version',
    example: '1.0.0',
  })
  version?: string;
}

/**
 * Liveness probe response DTO
 * Minimal response for Kubernetes liveness probes
 *
 * Story: 002-REWORK-002 (Fehlende Health-Check Endpoints)
 */
export class LivenessResponseDto {
  @ApiProperty({
    description: 'Liveness status indicating the application is running',
    enum: ['ok'],
    example: 'ok',
  })
  status: 'ok';
}

/**
 * Readiness check component health result
 * Used in readiness probe response
 *
 * Story: 002-REWORK-002 (Fehlende Health-Check Endpoints)
 */
export class ReadinessComponentDto {
  @ApiProperty({
    description: 'Health status of the component',
    enum: ['healthy', 'unhealthy'],
    example: 'healthy',
  })
  status: 'healthy' | 'unhealthy';
}

/**
 * Readiness checks object containing all dependency health results
 *
 * Story: 002-REWORK-002 (Fehlende Health-Check Endpoints)
 */
export class ReadinessChecksDto {
  @ApiProperty({
    description: 'Database (PostgreSQL) connectivity check',
    type: ReadinessComponentDto,
  })
  database: ReadinessComponentDto;

  @ApiPropertyOptional({
    description: 'Redis connectivity check (if configured)',
    type: ReadinessComponentDto,
  })
  redis?: ReadinessComponentDto;
}

/**
 * Readiness probe response DTO
 * Response for Kubernetes readiness probes
 *
 * Story: 002-REWORK-002 (Fehlende Health-Check Endpoints)
 *
 * Response format:
 * {
 *   "status": "ok",
 *   "checks": {
 *     "database": { "status": "healthy" },
 *     "redis": { "status": "healthy" }
 *   }
 * }
 */
export class ReadinessResponseDto {
  @ApiProperty({
    description: 'Overall readiness status',
    enum: ['ok'],
    example: 'ok',
  })
  status: 'ok';

  @ApiProperty({
    description: 'Health check results for each dependency',
    type: ReadinessChecksDto,
  })
  checks: ReadinessChecksDto;
}
