/**
 * Roles Controller
 * STORY-007A: Rollen-Management Backend
 *
 * REST API controller for role CRUD operations.
 * Provides endpoints for listing, creating, reading, updating, and deleting roles.
 * All endpoints require authentication and appropriate permissions.
 *
 * Routes:
 * - GET    /api/v1/roles         - List all roles
 * - GET    /api/v1/roles/:id     - Get a single role by ID
 * - POST   /api/v1/roles         - Create a new role
 * - PUT    /api/v1/roles/:id     - Update an existing role
 * - DELETE /api/v1/roles/:id     - Delete a role
 * - POST   /api/v1/roles/:id/permissions - Assign permissions to role
 * - DELETE /api/v1/roles/:id/permissions - Remove permissions from role
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Inject,
  forwardRef,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import { RateLimit } from '../common/guards/rate-limit.guard';
import { JwtAuthGuard, AuthenticatedRequest } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../common/guards/permissions.guard';

/**
 * Roles Controller
 * Handles all role-related HTTP requests
 * Requires authentication and permission-based authorization
 */
@ApiTags('Roles')
@ApiBearerAuth('bearerAuth')
@Controller('api/v1/roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(
    @Inject(forwardRef(() => RolesService))
    private readonly rolesService: RolesService,
  ) {}

  /**
   * List all roles
   */
  @Get()
  @RequirePermission('roles.read', 'roles.list')
  @RateLimit(100, 60) // 100 requests per minute
  @ApiOperation({
    summary: 'List all roles',
    description: 'Retrieve a list of all roles with user counts and permissions. Requires roles.read or roles.list permission.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of roles retrieved successfully',
    type: [RoleResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findAll(): Promise<RoleResponseDto[]> {
    return this.rolesService.findAll();
  }

  /**
   * Get a single role by ID
   */
  @Get(':id')
  @RequirePermission('roles.read')
  @RateLimit(100, 60)
  @ApiOperation({
    summary: 'Get role by ID',
    description: 'Retrieve a single role by its unique identifier. Requires roles.read permission.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Role ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Role retrieved successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<RoleResponseDto> {
    return this.rolesService.findOne(id);
  }

  /**
   * Create a new role
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('roles.create')
  @RateLimit(20, 60) // 20 requests per minute (stricter for creates)
  @ApiOperation({
    summary: 'Create a new role',
    description: 'Create a new role with the provided information. Requires roles.create permission.',
  })
  @ApiResponse({
    status: 201,
    description: 'Role created successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or invalid permission IDs' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Role name already exists' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async create(
    @Body() createRoleDto: CreateRoleDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<RoleResponseDto> {
    return this.rolesService.create(createRoleDto, request);
  }

  /**
   * Update an existing role
   */
  @Put(':id')
  @RequirePermission('roles.update')
  @RateLimit(50, 60)
  @ApiOperation({
    summary: 'Update role',
    description: 'Update an existing role by its ID. Requires roles.update permission.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Role ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Role updated successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or invalid permission IDs' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 409, description: 'Role name already exists' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleDto: UpdateRoleDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<RoleResponseDto> {
    return this.rolesService.update(id, updateRoleDto, request);
  }

  /**
   * Delete a role
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('roles.delete')
  @RateLimit(20, 60)
  @ApiOperation({
    summary: 'Delete role',
    description: 'Delete a role by its ID. System roles cannot be deleted. Requires roles.delete permission.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Role ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Role deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Role "moderator" deleted successfully' },
        role: { $ref: '#/components/schemas/RoleResponseDto' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot delete system roles or insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ message: string; role: RoleResponseDto }> {
    return this.rolesService.delete(id, request);
  }

  /**
   * Assign permissions to a role
   */
  @Post(':id/permissions')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('permissions.assign')
  @RateLimit(30, 60)
  @ApiOperation({
    summary: 'Assign permissions to role',
    description: 'Assign one or more permissions to a role. Requires permissions.assign permission.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Role ID',
    example: 1,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        permissionIds: {
          type: 'array',
          items: { type: 'number' },
          example: [1, 2, 3],
          description: 'Permission IDs to assign',
        },
      },
      required: ['permissionIds'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Permissions assigned successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid permission IDs' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async assignPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body('permissionIds') permissionIds: number[],
    @Req() request: AuthenticatedRequest,
  ): Promise<RoleResponseDto> {
    return this.rolesService.assignPermissions(id, permissionIds, request);
  }

  /**
   * Remove permissions from a role
   */
  @Delete(':id/permissions')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('permissions.assign')
  @RateLimit(30, 60)
  @ApiOperation({
    summary: 'Remove permissions from role',
    description: 'Remove one or more permissions from a role. Requires permissions.assign permission.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Role ID',
    example: 1,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        permissionIds: {
          type: 'array',
          items: { type: 'number' },
          example: [1, 2],
          description: 'Permission IDs to remove',
        },
      },
      required: ['permissionIds'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Permissions removed successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async removePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body('permissionIds') permissionIds: number[],
    @Req() request: AuthenticatedRequest,
  ): Promise<RoleResponseDto> {
    return this.rolesService.removePermissions(id, permissionIds, request);
  }
}
