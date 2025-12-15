/**
 * Version Response DTO
 *
 * Data transfer object for application version information.
 *
 * Stories:
 * - STORY-030: Application Versioning
 *
 * @example Response:
 * ```json
 * {
 *   "version": "1.0.0",
 *   "build": "202312150930",
 *   "commit": "abc123def456"
 * }
 * ```
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Version Response DTO
 *
 * Contains application version information including
 * semantic version, optional build number, and optional git commit hash.
 */
export class VersionResponseDto {
  @ApiProperty({
    description: 'Application version in semantic versioning format (MAJOR.MINOR.PATCH)',
    example: '1.0.0',
    pattern: '^\\d+\\.\\d+\\.\\d+$',
  })
  version: string;

  @ApiPropertyOptional({
    description: 'Build number or timestamp (optional)',
    example: '202312150930',
  })
  build?: string;

  @ApiPropertyOptional({
    description: 'Git commit hash for traceability (optional)',
    example: 'abc123def456789',
  })
  commit?: string;

  @ApiProperty({
    description: 'Application name',
    example: 'core-app-backend',
  })
  name: string;

  @ApiProperty({
    description: 'Application description',
    example: 'Core Application Backend API',
  })
  description: string;

  @ApiProperty({
    description: 'Timestamp when version info was retrieved',
    example: '2025-12-08T10:00:00.000Z',
  })
  timestamp: string;
}
