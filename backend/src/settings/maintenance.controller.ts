/**
 * Maintenance Controller
 * STORY-034: Maintenance Mode
 *
 * REST API controller for maintenance mode management.
 * Provides endpoints for getting and updating maintenance status.
 *
 * Routes:
 * - GET  /api/v1/settings/maintenance - Get maintenance status (public)
 * - PUT  /api/v1/settings/maintenance - Enable/disable maintenance (admin only)
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
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { MaintenanceService } from './maintenance.service';
import { UpdateMaintenanceDto, MaintenanceResponseDto } from './dto/maintenance.dto';
import { RateLimit } from '../common/guards/rate-limit.guard';
import { AuthService } from '../auth/auth.service';

/**
 * Extended Request interface with user and requestId
 */
interface AuthRequest extends Request {
  user?: { id?: number; email?: string; permissions?: string[] };
  requestId?: string;
}

/**
 * Maintenance Controller
 * Handles all maintenance-related HTTP requests
 */
@ApiTags('Settings')
@Controller('api/v1/settings/maintenance')
export class MaintenanceController {
  constructor(
    @Inject(forwardRef(() => MaintenanceService))
    private readonly maintenanceService: MaintenanceService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  /**
   * Get maintenance status (public endpoint)
   * All users can check maintenance status
   */
  @Get()
  @RateLimit(200, 60) // 200 requests per minute (more lenient for status checks)
  @ApiOperation({
    summary: 'Get maintenance status',
    description: 'Retrieve current maintenance mode status. This endpoint is public.',
  })
  @ApiResponse({
    status: 200,
    description: 'Maintenance status retrieved successfully',
    type: MaintenanceResponseDto,
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async getMaintenanceStatus(): Promise<MaintenanceResponseDto> {
    return this.maintenanceService.getMaintenanceStatus();
  }

  /**
   * Update maintenance mode settings (admin only)
   */
  @Put()
  @RateLimit(30, 60) // 30 requests per minute
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Update maintenance mode',
    description: 'Enable or disable maintenance mode. Requires admin permissions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Maintenance mode updated successfully',
    type: MaintenanceResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async updateMaintenanceMode(
    @Body() updateMaintenanceDto: UpdateMaintenanceDto,
    @Headers('authorization') authHeader: string,
    @Req() request: AuthRequest,
  ): Promise<MaintenanceResponseDto> {
    // Verify admin permissions
    const userInfo = await this.extractUserAndPermissions(authHeader);

    if (!userInfo.userId) {
      throw new ForbiddenException('Authentication required');
    }

    if (!this.hasAdminPermission(userInfo.permissions)) {
      throw new ForbiddenException('Admin permission required to modify maintenance mode');
    }

    return this.maintenanceService.updateMaintenanceMode(
      updateMaintenanceDto,
      userInfo.userId,
      request
    );
  }

  /**
   * Extract user ID and permissions from Authorization header
   */
  private async extractUserAndPermissions(
    authHeader: string | undefined
  ): Promise<{ userId: number | undefined; permissions: string[] }> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { userId: undefined, permissions: [] };
    }

    try {
      const token = authHeader.slice(7);
      const payload = this.authService.decodeToken(token);
      const userId = payload?.sub;

      // Get user permissions from database
      if (userId) {
        const permissions = await this.maintenanceService.getUserPermissions(userId);
        return { userId, permissions };
      }

      return { userId: undefined, permissions: [] };
    } catch {
      return { userId: undefined, permissions: [] };
    }
  }

  /**
   * Check if user has admin permission for maintenance mode
   */
  private hasAdminPermission(permissions: string[]): boolean {
    return (
      permissions.includes('admin.*') ||
      permissions.includes('settings.update') ||
      permissions.includes('settings.*') ||
      permissions.includes('*')
    );
  }
}
