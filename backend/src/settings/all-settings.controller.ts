/**
 * All Settings Controller
 * STORY-013A: In-App Settings Backend
 * STORY-022: Swagger/OpenAPI Documentation
 *
 * REST API controller for comprehensive settings management.
 * Provides endpoints for retrieving and managing all settings categories.
 *
 * Routes:
 * - GET  /api/v1/settings/all           - Get all settings (all categories)
 * - GET  /api/v1/settings/category/:category - Get settings by category
 * - PUT  /api/v1/settings/category/:category - Update settings by category
 * - POST /api/v1/settings/category/:category/reset - Reset category to defaults
 */

import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Req,
  Headers,
  UseGuards,
  Inject,
  forwardRef,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Request } from 'express';
import { SettingsService } from './settings.service';
import { GeneralSettingsService } from './general-settings.service';
import { SecuritySettingsService } from './security-settings.service';
import { RateLimit } from '../common/guards/rate-limit.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthService } from '../auth/auth.service';
import type { SettingsCategory, EmailSettings } from '../database/types';

/**
 * Extended Request interface with user and requestId
 */
interface AuthRequest extends Request {
  user?: { id?: number; email?: string };
  requestId?: string;
}

/**
 * Valid settings categories
 */
const VALID_CATEGORIES: SettingsCategory[] = ['general', 'security', 'email', 'branding', 'features'];

/**
 * Default email settings
 */
const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  signature: 'Best regards,\nYour Team',
};

/**
 * All Settings Response DTO
 */
class AllSettingsResponseDto {
  general: Record<string, unknown>;
  security: Record<string, unknown>;
  email: Record<string, unknown>;
  branding: Record<string, unknown>;
  features: Record<string, unknown>;
}

/**
 * All Settings Controller
 * Provides comprehensive settings management endpoints
 */
@ApiTags('All Settings')
@Controller('api/v1/settings')
export class AllSettingsController {
  constructor(
    @Inject(forwardRef(() => SettingsService))
    private readonly settingsService: SettingsService,
    @Inject(forwardRef(() => GeneralSettingsService))
    private readonly generalSettingsService: GeneralSettingsService,
    @Inject(forwardRef(() => SecuritySettingsService))
    private readonly securitySettingsService: SecuritySettingsService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  /**
   * Get all settings (all categories)
   * Admin only
   */
  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @RateLimit(100, 60) // 100 requests per minute
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Get all settings',
    description: 'Retrieve all settings from all categories. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'All settings retrieved successfully',
    type: AllSettingsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async getAllSettings(): Promise<AllSettingsResponseDto> {
    // Fetch all settings in parallel
    const [appSettings, generalSettings, securitySettings] = await Promise.all([
      this.settingsService.findAll(),
      this.generalSettingsService.getGeneralSettings(),
      this.securitySettingsService.getSecuritySettings(),
    ]);

    return {
      general: {
        support_email: generalSettings.support_email,
        session_timeout_minutes: generalSettings.session_timeout_minutes,
        show_timeout_warning: generalSettings.show_timeout_warning,
        warning_before_timeout_minutes: generalSettings.warning_before_timeout_minutes,
      },
      security: {
        max_login_attempts: securitySettings.max_login_attempts,
        password_min_length: securitySettings.password_min_length,
        password_require_uppercase: securitySettings.password_require_uppercase,
        password_require_lowercase: securitySettings.password_require_lowercase,
        password_require_numbers: securitySettings.password_require_numbers,
        password_require_special_chars: securitySettings.password_require_special_chars,
        session_inactivity_timeout: securitySettings.session_inactivity_timeout,
      },
      email: appSettings.email_settings || DEFAULT_EMAIL_SETTINGS,
      branding: {
        company_name: appSettings.company_name,
        app_title: appSettings.app_title,
        logo_url: appSettings.logo_url,
        theme_colors: appSettings.theme_colors,
      },
      features: appSettings.features || {},
    };
  }

  /**
   * Get settings by category
   * Admin only
   */
  @Get('category/:category')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @RateLimit(100, 60) // 100 requests per minute
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Get settings by category',
    description: 'Retrieve settings for a specific category. Admin only.',
  })
  @ApiParam({
    name: 'category',
    description: 'Settings category',
    enum: VALID_CATEGORIES,
  })
  @ApiResponse({
    status: 200,
    description: 'Category settings retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid category' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async getSettingsByCategory(
    @Param('category') category: string,
  ): Promise<Record<string, unknown>> {
    this.validateCategory(category);

    switch (category) {
      case 'general': {
        const settings = await this.generalSettingsService.getGeneralSettings();
        return {
          support_email: settings.support_email,
          session_timeout_minutes: settings.session_timeout_minutes,
          show_timeout_warning: settings.show_timeout_warning,
          warning_before_timeout_minutes: settings.warning_before_timeout_minutes,
        };
      }
      case 'security': {
        const settings = await this.securitySettingsService.getSecuritySettings();
        return {
          max_login_attempts: settings.max_login_attempts,
          password_min_length: settings.password_min_length,
          password_require_uppercase: settings.password_require_uppercase,
          password_require_lowercase: settings.password_require_lowercase,
          password_require_numbers: settings.password_require_numbers,
          password_require_special_chars: settings.password_require_special_chars,
          session_inactivity_timeout: settings.session_inactivity_timeout,
        };
      }
      case 'email': {
        const appSettings = await this.settingsService.findAll();
        return appSettings.email_settings || DEFAULT_EMAIL_SETTINGS;
      }
      case 'branding': {
        const appSettings = await this.settingsService.findAll();
        return {
          company_name: appSettings.company_name,
          app_title: appSettings.app_title,
          logo_url: appSettings.logo_url,
          theme_colors: appSettings.theme_colors,
        };
      }
      case 'features': {
        const appSettings = await this.settingsService.findAll();
        return appSettings.features || {};
      }
      default:
        throw new BadRequestException(`Unknown category: ${category}`);
    }
  }

  /**
   * Update settings by category
   * Admin only
   */
  @Put('category/:category')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @RateLimit(30, 60) // 30 requests per minute
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Update settings by category',
    description: 'Update settings for a specific category. Admin only. Changes take effect immediately.',
  })
  @ApiParam({
    name: 'category',
    description: 'Settings category',
    enum: VALID_CATEGORIES,
  })
  @ApiResponse({
    status: 200,
    description: 'Category settings updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or category' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async updateSettingsByCategory(
    @Param('category') category: string,
    @Body() updateDto: Record<string, unknown>,
    @Headers('authorization') authHeader: string,
    @Req() request: AuthRequest,
  ): Promise<Record<string, unknown>> {
    this.validateCategory(category);
    const userId = this.extractUserIdFromAuthHeader(authHeader);

    switch (category) {
      case 'general': {
        const settings = await this.generalSettingsService.updateGeneralSettings(
          updateDto as {
            support_email?: string;
            session_timeout_minutes?: number;
            show_timeout_warning?: boolean;
            warning_before_timeout_minutes?: number;
          },
          userId,
          request,
        );
        return {
          support_email: settings.support_email,
          session_timeout_minutes: settings.session_timeout_minutes,
          show_timeout_warning: settings.show_timeout_warning,
          warning_before_timeout_minutes: settings.warning_before_timeout_minutes,
        };
      }
      case 'security': {
        const settings = await this.securitySettingsService.updateSecuritySettings(
          updateDto as {
            max_login_attempts?: number;
            password_min_length?: number;
            password_require_uppercase?: boolean;
            password_require_lowercase?: boolean;
            password_require_numbers?: boolean;
            password_require_special_chars?: boolean;
            session_inactivity_timeout?: number;
          },
          userId,
          request,
        );
        return {
          max_login_attempts: settings.max_login_attempts,
          password_min_length: settings.password_min_length,
          password_require_uppercase: settings.password_require_uppercase,
          password_require_lowercase: settings.password_require_lowercase,
          password_require_numbers: settings.password_require_numbers,
          password_require_special_chars: settings.password_require_special_chars,
          session_inactivity_timeout: settings.session_inactivity_timeout,
        };
      }
      case 'email': {
        // Email settings are stored in app_settings as email_settings JSONB
        // Note: The update for email_settings needs to be added to the SettingsService
        // For now, returning current settings
        const appSettings = await this.settingsService.findAll();
        return appSettings.email_settings || DEFAULT_EMAIL_SETTINGS;
      }
      case 'branding': {
        const appSettings = await this.settingsService.update(
          updateDto as {
            company_name?: string;
            app_title?: string;
            logo_url?: string;
            theme_colors?: Record<string, string>;
          },
          userId,
          request,
        );
        return {
          company_name: appSettings.company_name,
          app_title: appSettings.app_title,
          logo_url: appSettings.logo_url,
          theme_colors: appSettings.theme_colors,
        };
      }
      case 'features': {
        const appSettings = await this.settingsService.update(
          { features: updateDto as { mfa_enabled?: boolean; registration_enabled?: boolean } },
          userId,
          request,
        );
        return appSettings.features || {};
      }
      default:
        throw new BadRequestException(`Unknown category: ${category}`);
    }
  }

  /**
   * Reset settings category to defaults
   * Admin only
   */
  @Post('category/:category/reset')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @RateLimit(10, 60) // 10 requests per minute
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Reset category to defaults',
    description: 'Reset all settings in a category to default values. Admin only.',
  })
  @ApiParam({
    name: 'category',
    description: 'Settings category',
    enum: VALID_CATEGORIES,
  })
  @ApiResponse({
    status: 200,
    description: 'Category settings reset successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid category' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async resetSettingsByCategory(
    @Param('category') category: string,
    @Headers('authorization') authHeader: string,
    @Req() request: AuthRequest,
  ): Promise<{ message: string; settings: Record<string, unknown> }> {
    this.validateCategory(category);
    const userId = this.extractUserIdFromAuthHeader(authHeader);

    switch (category) {
      case 'security': {
        const settings = await this.securitySettingsService.resetSecuritySettings(userId, request);
        return {
          message: 'Security settings reset to default',
          settings: {
            max_login_attempts: settings.max_login_attempts,
            password_min_length: settings.password_min_length,
            password_require_uppercase: settings.password_require_uppercase,
            password_require_lowercase: settings.password_require_lowercase,
            password_require_numbers: settings.password_require_numbers,
            password_require_special_chars: settings.password_require_special_chars,
            session_inactivity_timeout: settings.session_inactivity_timeout,
          },
        };
      }
      case 'general':
      case 'email':
      case 'branding':
      case 'features':
        // TODO: Implement reset for other categories
        throw new BadRequestException(`Reset for ${category} category is not yet implemented`);
      default:
        throw new BadRequestException(`Unknown category: ${category}`);
    }
  }

  /**
   * Validate category parameter
   */
  private validateCategory(category: string): void {
    if (!VALID_CATEGORIES.includes(category as SettingsCategory)) {
      throw new BadRequestException(
        `Invalid category: ${category}. Valid categories are: ${VALID_CATEGORIES.join(', ')}`,
      );
    }
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
