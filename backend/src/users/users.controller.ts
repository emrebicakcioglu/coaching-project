/**
 * Users Controller
 * STORY-021B: Resource Endpoints
 * STORY-022: Swagger/OpenAPI Documentation
 * STORY-003A: User CRUD Backend API
 * STORY-007B: User Role Assignment
 *
 * REST API controller for user CRUD operations.
 * Provides endpoints for listing, creating, reading, updating, and deleting users.
 * All endpoints require admin authorization.
 *
 * Routes:
 * - GET    /api/v1/users                  - List all users with pagination/filtering/sorting
 * - GET    /api/v1/users/:id              - Get a single user by ID
 * - GET    /api/v1/users/:id/permissions  - Get user with aggregated permissions (STORY-007B)
 * - POST   /api/v1/users                  - Create a new user
 * - PUT    /api/v1/users/:id              - Update an existing user
 * - DELETE /api/v1/users/:id              - Soft delete a user
 * - POST   /api/v1/users/:id/restore      - Restore a soft-deleted user
 * - POST   /api/v1/users/:id/reset-password - Admin reset user password
 * - POST   /api/v1/users/:id/roles        - Assign roles to user
 * - DELETE /api/v1/users/:id/roles        - Remove roles from user
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UserResponseDto, UserWithPermissionsDto } from './dto/user-response.dto';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';
import { PaginatedResponse } from '../common/dto/pagination.dto';
import { RateLimit } from '../common/guards/rate-limit.guard';
import { JwtAuthGuard, AuthenticatedRequest } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';

/**
 * Users Controller
 * Handles all user-related HTTP requests
 * Requires admin role for all operations
 */
@ApiTags('Users')
@ApiBearerAuth('bearerAuth')
@Controller('api/v1/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class UsersController {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  /**
   * List all users with pagination, filtering, and sorting
   */
  @Get()
  @RateLimit(100, 60) // 100 requests per minute
  @ApiOperation({
    summary: 'List all users',
    description: 'Retrieve a paginated list of users with optional filtering and sorting. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of users retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/UserResponseDto' },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 20 },
            total: { type: 'number', example: 100 },
            pages: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findAll(
    @Query() query: ListUsersQueryDto,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    return this.usersService.findAll(query);
  }

  /**
   * Get a single user by ID
   */
  @Get(':id')
  @RateLimit(100, 60) // 100 requests per minute
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieve a single user by their unique identifier. Admin only.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'User ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  /**
   * Get a user with aggregated permissions
   * STORY-007B: User Role Assignment
   */
  @Get(':id/permissions')
  @RateLimit(100, 60) // 100 requests per minute
  @ApiOperation({
    summary: 'Get user with permissions',
    description: 'Retrieve a user by ID along with their roles and aggregated permissions from all roles. Admin only.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'User ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'User with permissions retrieved successfully',
    type: UserWithPermissionsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findOneWithPermissions(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UserWithPermissionsDto> {
    return this.usersService.findOneWithPermissions(id);
  }

  /**
   * Create a new user
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RateLimit(20, 60) // 20 requests per minute (stricter for creates)
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Create a new user account with the provided information. Admin only.',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async create(
    @Body() createUserDto: CreateUserDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto, request);
  }

  /**
   * Update an existing user
   */
  @Put(':id')
  @RateLimit(50, 60) // 50 requests per minute
  @ApiOperation({
    summary: 'Update user',
    description: 'Update an existing user by their ID. Admin only.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'User ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or user is deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, updateUserDto, request);
  }

  /**
   * Soft delete a user
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RateLimit(20, 60) // 20 requests per minute (stricter for deletes)
  @ApiOperation({
    summary: 'Delete user (soft delete)',
    description: 'Soft delete a user by their ID. The user is marked as deleted but data is retained. Admin only.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'User ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'User is already deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    return this.usersService.delete(id, request);
  }

  /**
   * Restore a soft-deleted user
   */
  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RateLimit(20, 60)
  @ApiOperation({
    summary: 'Restore deleted user',
    description: 'Restore a soft-deleted user. The user will be set to inactive status. Admin only.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'User ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'User restored successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'User is not deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async restore(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    return this.usersService.restore(id, request);
  }

  /**
   * Admin reset user password
   */
  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @RateLimit(10, 60) // Stricter limit for password operations
  @ApiOperation({
    summary: 'Reset user password (admin)',
    description: 'Admin can reset a user\'s password to a new temporary password. Admin only.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'User ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid password or user is deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() resetPasswordDto: AdminResetPasswordDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    return this.usersService.adminResetPassword(id, resetPasswordDto.new_password, request);
  }

  /**
   * Assign roles to a user
   */
  @Post(':id/roles')
  @HttpCode(HttpStatus.OK)
  @RateLimit(30, 60)
  @ApiOperation({
    summary: 'Assign roles to user',
    description: 'Assign one or more roles to a user. Admin only.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'User ID',
    example: 1,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        roles: {
          type: 'array',
          items: { type: 'string' },
          example: ['admin', 'user'],
          description: 'Role names to assign',
        },
      },
      required: ['roles'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Roles assigned successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Roles assigned successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid role name' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async assignRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body('roles') roles: string[],
    @Req() request: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    await this.usersService.assignRoles(id, roles, request);
    return { message: 'Roles assigned successfully' };
  }

  /**
   * Remove roles from a user
   */
  @Delete(':id/roles')
  @HttpCode(HttpStatus.OK)
  @RateLimit(30, 60)
  @ApiOperation({
    summary: 'Remove roles from user',
    description: 'Remove one or more roles from a user. Admin only.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'User ID',
    example: 1,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        roles: {
          type: 'array',
          items: { type: 'string' },
          example: ['admin'],
          description: 'Role names to remove',
        },
      },
      required: ['roles'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Roles removed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Roles removed successfully' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async removeRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body('roles') roles: string[],
    @Req() request: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    await this.usersService.removeRoles(id, roles, request);
    return { message: 'Roles removed successfully' };
  }
}
