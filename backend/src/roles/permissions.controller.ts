/**
 * Permissions Controller
 * STORY-007A: Rollen-Management Backend
 *
 * REST API controller for permission read operations.
 * Provides endpoints for listing and viewing permissions.
 * All endpoints require authentication and appropriate permissions.
 *
 * Routes:
 * - GET    /api/v1/permissions           - List all permissions
 * - GET    /api/v1/permissions/grouped   - Get permissions grouped by category
 * - GET    /api/v1/permissions/categories - Get all permission categories
 * - GET    /api/v1/permissions/:id       - Get a single permission by ID
 * - GET    /api/v1/permissions/category/:category - Get permissions by category
 */

import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Inject,
  forwardRef,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import {
  PermissionResponseDto,
  GroupedPermissionsResponseDto,
} from './dto/permission-response.dto';
import { RateLimit } from '../common/guards/rate-limit.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../common/guards/permissions.guard';

/**
 * Permissions Controller
 * Handles all permission-related HTTP requests
 * Requires authentication and permission-based authorization
 */
@ApiTags('Permissions')
@ApiBearerAuth('bearerAuth')
@Controller('api/v1/permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(
    @Inject(forwardRef(() => PermissionsService))
    private readonly permissionsService: PermissionsService,
  ) {}

  /**
   * List all permissions
   */
  @Get()
  @RequirePermission('permissions.read', 'permissions.list')
  @RateLimit(100, 60)
  @ApiOperation({
    summary: 'List all permissions',
    description: 'Retrieve a list of all permissions. Requires permissions.read or permissions.list permission.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of permissions retrieved successfully',
    type: [PermissionResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findAll(): Promise<PermissionResponseDto[]> {
    return this.permissionsService.findAll();
  }

  /**
   * Get permissions grouped by category
   */
  @Get('grouped')
  @RequirePermission('permissions.read', 'permissions.list')
  @RateLimit(100, 60)
  @ApiOperation({
    summary: 'Get permissions grouped by category',
    description: 'Retrieve all permissions grouped by their category. Requires permissions.read or permissions.list permission.',
  })
  @ApiResponse({
    status: 200,
    description: 'Grouped permissions retrieved successfully',
    type: GroupedPermissionsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findAllGrouped(): Promise<GroupedPermissionsResponseDto> {
    return this.permissionsService.findAllGroupedByCategory();
  }

  /**
   * Get all permission categories
   */
  @Get('categories')
  @RequirePermission('permissions.read', 'permissions.list')
  @RateLimit(100, 60)
  @ApiOperation({
    summary: 'Get all permission categories',
    description: 'Retrieve a list of all unique permission categories. Requires permissions.read or permissions.list permission.',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
    schema: {
      type: 'array',
      items: { type: 'string' },
      example: ['users', 'roles', 'permissions', 'settings', 'system'],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async getCategories(): Promise<string[]> {
    return this.permissionsService.getCategories();
  }

  /**
   * Get a single permission by ID
   */
  @Get(':id')
  @RequirePermission('permissions.read')
  @RateLimit(100, 60)
  @ApiOperation({
    summary: 'Get permission by ID',
    description: 'Retrieve a single permission by its unique identifier. Requires permissions.read permission.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Permission ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Permission retrieved successfully',
    type: PermissionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<PermissionResponseDto> {
    return this.permissionsService.findOne(id);
  }

  /**
   * Get permissions by category
   */
  @Get('category/:category')
  @RequirePermission('permissions.read', 'permissions.list')
  @RateLimit(100, 60)
  @ApiOperation({
    summary: 'Get permissions by category',
    description: 'Retrieve all permissions in a specific category. Requires permissions.read or permissions.list permission.',
  })
  @ApiParam({
    name: 'category',
    type: 'string',
    description: 'Permission category',
    example: 'users',
  })
  @ApiResponse({
    status: 200,
    description: 'Permissions retrieved successfully',
    type: [PermissionResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findByCategory(@Param('category') category: string): Promise<PermissionResponseDto[]> {
    return this.permissionsService.findByCategory(category);
  }
}
