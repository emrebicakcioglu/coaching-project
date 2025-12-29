/**
 * Jira Settings Controller
 * STORY-041D: Jira Settings API
 *
 * REST API controller for Jira Cloud integration settings.
 * Provides endpoints for getting, updating, and testing Jira connection.
 *
 * Routes:
 * - GET  /api/v1/settings/jira      - Get Jira settings (token masked)
 * - PUT  /api/v1/settings/jira      - Update Jira settings
 * - POST /api/v1/settings/jira/test - Test Jira connection
 *
 * Security:
 * - All endpoints require admin role
 * - API tokens are encrypted at rest
 * - Tokens are masked in GET responses
 */

import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Req,
  Headers,
  UseGuards,
  Inject,
  forwardRef,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JiraSettingsService } from './jira-settings.service';
import {
  UpdateJiraSettingsDto,
  JiraSettingsResponseDto,
  JiraTestConnectionResponseDto,
} from './dto/jira-settings.dto';
import { RateLimit } from '../common/guards/rate-limit.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthService } from '../auth/auth.service';

/**
 * Extended Request interface with user and requestId
 */
interface AuthRequest extends Request {
  user?: { id?: number; email?: string };
  requestId?: string;
}

/**
 * Jira Settings Controller
 * Handles Jira Cloud integration configuration
 */
@ApiTags('Jira Settings')
@Controller('api/v1/settings/jira')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth('bearerAuth')
export class JiraSettingsController {
  constructor(
    @Inject(forwardRef(() => JiraSettingsService))
    private readonly jiraSettingsService: JiraSettingsService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  /**
   * Get Jira settings
   * API token is masked in response
   */
  @Get()
  @RateLimit(100, 60) // 100 requests per minute
  @ApiOperation({
    summary: 'Get Jira settings',
    description: 'Retrieve Jira Cloud integration settings. API token is masked for security. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Jira settings retrieved successfully',
    type: JiraSettingsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async getJiraSettings(): Promise<JiraSettingsResponseDto> {
    return this.jiraSettingsService.getJiraSettings();
  }

  /**
   * Update Jira settings
   * API token is encrypted before storage
   */
  @Put()
  @RateLimit(30, 60) // 30 requests per minute
  @ApiOperation({
    summary: 'Update Jira settings',
    description: 'Update Jira Cloud integration settings. API token is encrypted at rest. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Jira settings updated successfully',
    type: JiraSettingsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiResponse({ status: 500, description: 'Encryption error (ENCRYPTION_KEY not configured)' })
  async updateJiraSettings(
    @Body() updateDto: UpdateJiraSettingsDto,
    @Headers('authorization') authHeader: string,
    @Req() request: AuthRequest,
  ): Promise<JiraSettingsResponseDto> {
    const userId = this.extractUserIdFromAuthHeader(authHeader);
    return this.jiraSettingsService.updateJiraSettings(updateDto, userId, request);
  }

  /**
   * Test Jira connection
   * Verifies credentials and project access
   */
  @Post('test')
  @RateLimit(10, 60) // 10 requests per minute (prevent abuse)
  @ApiOperation({
    summary: 'Test Jira connection',
    description: 'Test connection to Jira Cloud using stored settings. Verifies credentials and project access. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Connection test completed',
    type: JiraTestConnectionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async testJiraConnection(): Promise<JiraTestConnectionResponseDto> {
    return this.jiraSettingsService.testConnection(true);
  }

  /**
   * Extract user ID from Authorization header
   *
   * @param authHeader - Authorization header value
   * @returns User ID or undefined
   */
  private extractUserIdFromAuthHeader(authHeader: string | undefined): number | undefined {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return undefined;
    }

    try {
      const token = authHeader.slice(7);
      const payload = this.authService.decodeToken(token);
      return payload?.sub;
    } catch {
      return undefined;
    }
  }
}
