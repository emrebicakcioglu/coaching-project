/**
 * Settings Controller
 * STORY-021B: Resource Endpoints
 * STORY-022: Swagger/OpenAPI Documentation
 * STORY-017: Theme-System Backend
 * STORY-041: Feedback Feature Flag
 *
 * REST API controller for application settings management.
 * Provides endpoints for getting and updating app settings.
 *
 * Routes:
 * - GET  /api/v1/settings         - Get all settings
 * - PUT  /api/v1/settings         - Update settings
 * - GET  /api/v1/settings/theme   - Get theme settings (enhanced with nested colors)
 * - PUT  /api/v1/settings/theme   - Update theme settings (with hex color validation)
 * - GET  /api/v1/settings/public  - Get public settings (no auth) (STORY-041)
 */

import {
  Controller,
  Get,
  Put,
  Body,
  Req,
  Headers,
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
import { SettingsService } from './settings.service';
import { GeneralSettingsService } from './general-settings.service';
import { UpdateSettingsDto, UpdateThemeSettingsDto } from './dto/update-settings.dto';
import { SettingsResponseDto, ThemeSettingsResponseDto } from './dto/settings-response.dto';
import { PublicSettingsResponseDto } from './dto/general-settings.dto';
import { RateLimit } from '../common/guards/rate-limit.guard';
import { AuthService } from '../auth/auth.service';
import { Public } from '../common/guards/jwt-auth.guard';

/**
 * Extended Request interface with user and requestId
 */
interface AuthRequest extends Request {
  user?: { id?: number; email?: string };
  requestId?: string;
}

/**
 * Settings Controller
 * Handles all settings-related HTTP requests
 */
@ApiTags('Settings')
@Controller('api/v1/settings')
export class SettingsController {
  constructor(
    @Inject(forwardRef(() => SettingsService))
    private readonly settingsService: SettingsService,
    @Inject(forwardRef(() => GeneralSettingsService))
    private readonly generalSettingsService: GeneralSettingsService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  /**
   * Get all application settings
   */
  @Get()
  @RateLimit(100, 60) // 100 requests per minute
  @ApiOperation({
    summary: 'Get all settings',
    description: 'Retrieve all application settings including theme, features, and maintenance configuration.',
  })
  @ApiResponse({
    status: 200,
    description: 'Settings retrieved successfully',
    type: SettingsResponseDto,
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findAll(): Promise<SettingsResponseDto> {
    return this.settingsService.findAll();
  }

  /**
   * Update application settings
   */
  @Put()
  @RateLimit(30, 60) // 30 requests per minute
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Update settings',
    description: 'Update application settings. Requires authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Settings updated successfully',
    type: SettingsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async update(
    @Body() updateSettingsDto: UpdateSettingsDto,
    @Headers('authorization') authHeader: string,
    @Req() request: AuthRequest,
  ): Promise<SettingsResponseDto> {
    const userId = this.extractUserIdFromAuthHeader(authHeader);
    return this.settingsService.update(updateSettingsDto, userId, request);
  }

  /**
   * Get theme settings only
   */
  @Get('theme')
  @RateLimit(100, 60) // 100 requests per minute
  @ApiOperation({
    summary: 'Get theme settings',
    description: 'Retrieve theme color settings only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Theme settings retrieved successfully',
    type: ThemeSettingsResponseDto,
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async getThemeSettings(): Promise<ThemeSettingsResponseDto> {
    return this.settingsService.getThemeSettings();
  }

  /**
   * Update theme settings only
   */
  @Put('theme')
  @RateLimit(30, 60) // 30 requests per minute
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Update theme settings',
    description: 'Update theme color settings only. Requires authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Theme settings updated successfully',
    type: ThemeSettingsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async updateThemeSettings(
    @Body() updateThemeDto: UpdateThemeSettingsDto,
    @Headers('authorization') authHeader: string,
    @Req() request: AuthRequest,
  ): Promise<ThemeSettingsResponseDto> {
    const userId = this.extractUserIdFromAuthHeader(authHeader);
    return this.settingsService.updateThemeSettings(updateThemeDto, userId, request);
  }

  /**
   * Get public settings
   * STORY-041: Feedback Feature Flag
   *
   * Returns minimal settings for unauthenticated clients.
   * Includes feature flags needed for public UI decisions (e.g., feedback_enabled).
   */
  @Get('public')
  @Public()
  @RateLimit(200, 60) // 200 requests per minute
  @ApiOperation({
    summary: 'Get public settings',
    description: 'Retrieve public settings including feature flags. No authentication required. STORY-041.',
  })
  @ApiResponse({
    status: 200,
    description: 'Public settings retrieved successfully',
    type: PublicSettingsResponseDto,
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async getPublicSettings(): Promise<PublicSettingsResponseDto> {
    return this.generalSettingsService.getPublicSettings();
  }

  /**
   * Extract user ID from Authorization header (optional)
   * Returns undefined if no valid token is provided
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
