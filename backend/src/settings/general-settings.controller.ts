/**
 * General Settings Controller
 * STORY-035: Support-E-Mail & Session-Timeout
 * STORY-022: Swagger/OpenAPI Documentation
 * STORY-041: Feedback Feature Flag
 *
 * REST API controller for general settings management.
 * Provides endpoints for getting and updating support email and session timeout.
 *
 * Routes:
 * - GET  /api/v1/settings/general                - Get general settings (admin)
 * - PUT  /api/v1/settings/general                - Update general settings (admin)
 * - GET  /api/v1/settings/general/timeout-config - Get session timeout config (public)
 * - GET  /api/v1/settings/general/support-email  - Get support email (public)
 * - GET  /api/v1/settings/public                 - Get public settings (no auth) (STORY-041)
 */

import {
  Controller,
  Get,
  Put,
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
import { GeneralSettingsService } from './general-settings.service';
import {
  UpdateGeneralSettingsDto,
  GeneralSettingsResponseDto,
  SessionTimeoutConfigDto,
} from './dto/general-settings.dto';
import { RateLimit } from '../common/guards/rate-limit.guard';
import { JwtAuthGuard, Public } from '../common/guards/jwt-auth.guard';
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
 * Support email response DTO
 */
class SupportEmailResponseDto {
  support_email: string | null;
}

/**
 * General Settings Controller
 * Handles support email and session timeout configuration
 */
@ApiTags('General Settings')
@Controller('api/v1/settings/general')
export class GeneralSettingsController {
  constructor(
    @Inject(forwardRef(() => GeneralSettingsService))
    private readonly generalSettingsService: GeneralSettingsService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  /**
   * Get general settings (support email, session timeout)
   * Admin only
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @RateLimit(100, 60) // 100 requests per minute
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Get general settings',
    description: 'Retrieve support email and session timeout settings. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'General settings retrieved successfully',
    type: GeneralSettingsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async getGeneralSettings(): Promise<GeneralSettingsResponseDto> {
    return this.generalSettingsService.getGeneralSettings();
  }

  /**
   * Update general settings
   * Admin only
   */
  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @RateLimit(30, 60) // 30 requests per minute
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Update general settings',
    description: 'Update support email and session timeout settings. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'General settings updated successfully',
    type: GeneralSettingsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async updateGeneralSettings(
    @Body() updateDto: UpdateGeneralSettingsDto,
    @Headers('authorization') authHeader: string,
    @Req() request: AuthRequest,
  ): Promise<GeneralSettingsResponseDto> {
    const userId = this.extractUserIdFromAuthHeader(authHeader);
    return this.generalSettingsService.updateGeneralSettings(updateDto, userId, request);
  }

  /**
   * Get session timeout configuration
   * Public endpoint for client-side session management
   */
  @Get('timeout-config')
  @Public()
  @RateLimit(200, 60) // 200 requests per minute
  @ApiOperation({
    summary: 'Get session timeout configuration',
    description: 'Get session timeout settings for client-side session management. Public endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Session timeout configuration retrieved successfully',
    type: SessionTimeoutConfigDto,
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async getSessionTimeoutConfig(): Promise<SessionTimeoutConfigDto> {
    return this.generalSettingsService.getSessionTimeoutConfig();
  }

  /**
   * Get support email
   * Public endpoint for displaying in footer
   */
  @Get('support-email')
  @Public()
  @RateLimit(200, 60) // 200 requests per minute
  @ApiOperation({
    summary: 'Get support email',
    description: 'Get support email address for display in footer. Public endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Support email retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        support_email: {
          type: 'string',
          nullable: true,
          example: 'support@example.com',
        },
      },
    },
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async getSupportEmail(): Promise<SupportEmailResponseDto> {
    const email = await this.generalSettingsService.getSupportEmail();
    return { support_email: email };
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
