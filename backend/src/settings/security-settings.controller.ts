/**
 * Security Settings Controller
 * STORY-013A: In-App Settings Backend
 * STORY-022: Swagger/OpenAPI Documentation
 *
 * REST API controller for security settings management.
 * Provides admin-only endpoints for security configuration.
 *
 * Routes:
 * - GET  /api/v1/settings/security       - Get security settings (admin)
 * - PUT  /api/v1/settings/security       - Update security settings (admin)
 * - POST /api/v1/settings/security/reset - Reset to defaults (admin)
 * - GET  /api/v1/settings/security/password-policy - Get password policy (public)
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
import { SecuritySettingsService } from './security-settings.service';
import {
  UpdateSecuritySettingsDto,
  SecuritySettingsResponseDto,
  PasswordPolicyResponseDto,
} from './dto/security-settings.dto';
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
 * Security Settings Controller
 * Handles security configuration with admin-only access
 */
@ApiTags('Security Settings')
@Controller('api/v1/settings/security')
export class SecuritySettingsController {
  constructor(
    @Inject(forwardRef(() => SecuritySettingsService))
    private readonly securitySettingsService: SecuritySettingsService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  /**
   * Get security settings
   * Admin only
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @RateLimit(100, 60) // 100 requests per minute
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Get security settings',
    description: 'Retrieve security configuration including password policy and login limits. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Security settings retrieved successfully',
    type: SecuritySettingsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async getSecuritySettings(): Promise<SecuritySettingsResponseDto> {
    const settings = await this.securitySettingsService.getSecuritySettings();
    return SecuritySettingsResponseDto.fromEntity(settings);
  }

  /**
   * Update security settings
   * Admin only
   */
  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @RateLimit(30, 60) // 30 requests per minute
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Update security settings',
    description: 'Update security configuration. Admin only. Changes take effect immediately.',
  })
  @ApiResponse({
    status: 200,
    description: 'Security settings updated successfully',
    type: SecuritySettingsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async updateSecuritySettings(
    @Body() updateDto: UpdateSecuritySettingsDto,
    @Headers('authorization') authHeader: string,
    @Req() request: AuthRequest,
  ): Promise<SecuritySettingsResponseDto> {
    const userId = this.extractUserIdFromAuthHeader(authHeader);
    const settings = await this.securitySettingsService.updateSecuritySettings(
      updateDto,
      userId,
      request,
    );
    return SecuritySettingsResponseDto.fromEntity(settings);
  }

  /**
   * Reset security settings to defaults
   * Admin only
   */
  @Post('reset')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @RateLimit(10, 60) // 10 requests per minute
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Reset security settings to defaults',
    description: 'Reset all security settings to default values. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Security settings reset successfully',
    type: SecuritySettingsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async resetSecuritySettings(
    @Headers('authorization') authHeader: string,
    @Req() request: AuthRequest,
  ): Promise<SecuritySettingsResponseDto> {
    const userId = this.extractUserIdFromAuthHeader(authHeader);
    const settings = await this.securitySettingsService.resetSecuritySettings(
      userId,
      request,
    );
    return SecuritySettingsResponseDto.fromEntity(settings);
  }

  /**
   * Get password policy
   * Public endpoint for client-side validation
   */
  @Get('password-policy')
  @Public()
  @RateLimit(200, 60) // 200 requests per minute
  @ApiOperation({
    summary: 'Get password policy',
    description: 'Get password policy for client-side validation. Public endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password policy retrieved successfully',
    type: PasswordPolicyResponseDto,
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async getPasswordPolicy(): Promise<PasswordPolicyResponseDto> {
    return this.securitySettingsService.getPasswordPolicy();
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
