/**
 * Version Controller
 *
 * Provides API endpoint for retrieving application version information.
 * No authentication required - version info is public.
 *
 * Stories:
 * - STORY-030: Application Versioning
 *
 * Endpoints:
 * - GET /api/version - Returns application version information
 *
 * Response Format:
 * ```json
 * {
 *   "version": "1.0.0",
 *   "name": "core-app-backend",
 *   "description": "Core Application Backend API",
 *   "timestamp": "2025-12-08T10:00:00.000Z",
 *   "build": "optional-build-number",
 *   "commit": "optional-git-hash"
 * }
 * ```
 */

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VersionService } from './version.service';
import { VersionResponseDto } from './dto';
import { SkipRateLimit } from '../common/guards/rate-limit.guard';

@ApiTags('Version')
@Controller()
@SkipRateLimit() // Version endpoint should always be accessible
export class VersionController {
  constructor(private readonly versionService: VersionService) {}

  /**
   * Get application version information
   *
   * Returns the current application version along with optional
   * build number and git commit hash if available.
   *
   * @returns Version information
   */
  @Get('api/version')
  @ApiOperation({
    summary: 'Get application version',
    description:
      'Returns the current application version information including semantic version, optional build number, and optional git commit hash. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Version information retrieved successfully',
    type: VersionResponseDto,
    schema: {
      type: 'object',
      properties: {
        version: {
          type: 'string',
          description: 'Semantic version (MAJOR.MINOR.PATCH)',
          example: '1.0.0',
        },
        name: {
          type: 'string',
          description: 'Application name',
          example: 'core-app-backend',
        },
        description: {
          type: 'string',
          description: 'Application description',
          example: 'Core Application Backend API',
        },
        timestamp: {
          type: 'string',
          description: 'Timestamp of version retrieval',
          example: '2025-12-08T10:00:00.000Z',
        },
        build: {
          type: 'string',
          description: 'Optional build number',
          example: '202312150930',
        },
        commit: {
          type: 'string',
          description: 'Optional git commit hash (first 12 characters)',
          example: 'abc123def456',
        },
      },
      required: ['version', 'name', 'description', 'timestamp'],
    },
  })
  getVersion(): VersionResponseDto {
    return this.versionService.getVersion();
  }
}
