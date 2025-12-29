/**
 * Feature Toggles Controller
 * STORY-014A: Feature Toggles Backend
 * STORY-022: Swagger/OpenAPI Documentation
 *
 * REST API controller for feature toggle management.
 * Provides endpoints for feature listing and toggling.
 *
 * Routes:
 * - GET  /api/v1/features          - Get all features (authenticated)
 * - GET  /api/v1/features/:key     - Get single feature (authenticated)
 * - PUT  /api/v1/features/:key     - Toggle feature (admin only)
 */

import {
  Controller,
  Get,
  Put,
  Body,
  Param,
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
  ApiParam,
} from '@nestjs/swagger';
import { Request } from 'express';
import { FeatureTogglesService } from './feature-toggles.service';
import {
  ToggleFeatureDto,
  FeatureResponseDto,
  FeaturesListResponseDto,
  FeatureToggleResponseDto,
} from './dto/feature-toggles.dto';
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
 * Feature Toggles Controller
 * Handles feature toggle management
 */
@ApiTags('Feature Toggles')
@Controller('api/v1/features')
export class FeatureTogglesController {
  constructor(
    @Inject(forwardRef(() => FeatureTogglesService))
    private readonly featureTogglesService: FeatureTogglesService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  /**
   * Get all features
   * Authenticated users can view feature list
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @RateLimit(100, 60) // 100 requests per minute
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Get all features',
    description: 'Retrieve list of all feature toggles with their current status. Requires authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Features list retrieved successfully',
    type: FeaturesListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async getFeatures(): Promise<FeaturesListResponseDto> {
    const features = await this.featureTogglesService.getFeatures();
    return FeaturesListResponseDto.fromMap(features);
  }

  /**
   * Get public features list
   * Returns features for non-authenticated contexts (e.g., login page)
   */
  @Get('public')
  @Public()
  @RateLimit(200, 60) // 200 requests per minute
  @ApiOperation({
    summary: 'Get public features',
    description: 'Retrieve feature toggles that affect public UI (e.g., registration enabled). No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Public features retrieved successfully',
    type: FeaturesListResponseDto,
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async getPublicFeatures(): Promise<FeaturesListResponseDto> {
    const features = await this.featureTogglesService.getFeatures();
    // Return only public-facing features
    // STORY-041: Added 'feedback' to public features
    const publicFeatureKeys = ['user-registration', 'dark-mode', 'feedback'];
    const publicFeatures = Object.fromEntries(
      Object.entries(features).filter(([key]) => publicFeatureKeys.includes(key)),
    );
    return FeaturesListResponseDto.fromMap(publicFeatures);
  }

  /**
   * Get single feature by key
   * Authenticated users can view feature details
   */
  @Get(':key')
  @UseGuards(JwtAuthGuard)
  @RateLimit(100, 60) // 100 requests per minute
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Get feature by key',
    description: 'Retrieve a single feature by its key. Requires authentication.',
  })
  @ApiParam({
    name: 'key',
    description: 'Feature key (e.g., user-registration, mfa)',
    example: 'user-registration',
  })
  @ApiResponse({
    status: 200,
    description: 'Feature retrieved successfully',
    type: FeatureResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Feature not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async getFeature(@Param('key') featureKey: string): Promise<FeatureResponseDto> {
    return this.featureTogglesService.getFeature(featureKey);
  }

  /**
   * Toggle feature
   * Admin only
   */
  @Put(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @RateLimit(30, 60) // 30 requests per minute
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Toggle feature',
    description: 'Enable or disable a feature. Admin only. Changes take effect immediately.',
  })
  @ApiParam({
    name: 'key',
    description: 'Feature key to toggle',
    example: 'user-registration',
  })
  @ApiResponse({
    status: 200,
    description: 'Feature toggled successfully',
    type: FeatureToggleResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Feature not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async toggleFeature(
    @Param('key') featureKey: string,
    @Body() toggleDto: ToggleFeatureDto,
    @Headers('authorization') authHeader: string,
    @Req() request: AuthRequest,
  ): Promise<FeatureToggleResponseDto> {
    const userId = this.extractUserIdFromAuthHeader(authHeader);
    const feature = await this.featureTogglesService.toggleFeature(
      featureKey,
      toggleDto.enabled,
      userId,
      request,
    );

    return {
      message: 'Feature updated successfully',
      feature,
    };
  }

  /**
   * Check if feature is enabled (public endpoint for quick checks)
   */
  @Get(':key/enabled')
  @Public()
  @RateLimit(200, 60) // 200 requests per minute
  @ApiOperation({
    summary: 'Check if feature is enabled',
    description: 'Quick check if a specific feature is enabled. Public endpoint for client-side feature checks.',
  })
  @ApiParam({
    name: 'key',
    description: 'Feature key to check',
    example: 'user-registration',
  })
  @ApiResponse({
    status: 200,
    description: 'Feature status returned',
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string', example: 'user-registration' },
        enabled: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async isFeatureEnabled(
    @Param('key') featureKey: string,
  ): Promise<{ key: string; enabled: boolean }> {
    const enabled = await this.featureTogglesService.isEnabled(featureKey);
    return { key: featureKey, enabled };
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
