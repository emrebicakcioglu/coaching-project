/**
 * Design Controller
 * Design System: Color Schemes Management
 *
 * REST API endpoints for managing color schemes and design tokens.
 *
 * Endpoints:
 * - GET    /api/v1/design/schemes         - List all color schemes (design.read)
 * - GET    /api/v1/design/schemes/active  - Get active scheme (public)
 * - GET    /api/v1/design/schemes/:id     - Get single scheme (design.read)
 * - POST   /api/v1/design/schemes         - Create scheme (design.manage)
 * - PUT    /api/v1/design/schemes/:id     - Update scheme (design.manage)
 * - DELETE /api/v1/design/schemes/:id     - Delete scheme (design.manage)
 * - POST   /api/v1/design/schemes/:id/apply     - Apply scheme (design.manage)
 * - POST   /api/v1/design/schemes/:id/duplicate - Duplicate scheme (design.manage)
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
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../common/guards/permissions.guard';
import { DesignService } from './design.service';
import {
  CreateColorSchemeDto,
  UpdateColorSchemeDto,
  ColorSchemeResponseDto,
  ActiveColorSchemeResponseDto,
} from './dto/color-scheme.dto';
import { Request } from 'express';

/**
 * Extended Request interface with user
 */
interface AuthRequest extends Request {
  user?: { id?: number; email?: string };
  requestId?: string;
}

@ApiTags('Design System')
@Controller('api/v1/design')
export class DesignController {
  constructor(private readonly designService: DesignService) {}

  /**
   * Get active color scheme (public endpoint)
   * Used by frontend to load current theme
   */
  @Get('schemes/active')
  @ApiOperation({ summary: 'Get active color scheme' })
  @ApiResponse({
    status: 200,
    description: 'Returns the currently active color scheme',
    type: ActiveColorSchemeResponseDto,
  })
  async getActiveScheme(): Promise<ActiveColorSchemeResponseDto> {
    return this.designService.getActiveScheme();
  }

  /**
   * Get scheme mode assignments (public endpoint)
   * Returns IDs of schemes assigned to light and dark modes
   * Used by frontend dark mode toggle
   */
  @Get('schemes/modes')
  @ApiOperation({ summary: 'Get light and dark mode scheme assignments' })
  @ApiResponse({
    status: 200,
    description: 'Returns IDs of light and dark mode schemes',
    schema: {
      type: 'object',
      properties: {
        lightSchemeId: { type: 'number', nullable: true },
        darkSchemeId: { type: 'number', nullable: true },
      },
    },
  })
  async getSchemeModes(): Promise<{ lightSchemeId: number | null; darkSchemeId: number | null }> {
    return this.designService.getSchemeModes();
  }

  /**
   * Get all color schemes
   */
  @Get('schemes')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('design.read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all color schemes' })
  @ApiResponse({
    status: 200,
    description: 'Returns all color schemes',
    type: [ColorSchemeResponseDto],
  })
  async findAll(): Promise<ColorSchemeResponseDto[]> {
    return this.designService.findAll();
  }

  /**
   * Get a single color scheme by ID
   */
  @Get('schemes/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('design.read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get color scheme by ID' })
  @ApiParam({ name: 'id', description: 'Color scheme ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the color scheme',
    type: ColorSchemeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Color scheme not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ColorSchemeResponseDto> {
    return this.designService.findOne(id);
  }

  /**
   * Create a new color scheme
   */
  @Post('schemes')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('design.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new color scheme' })
  @ApiBody({ type: CreateColorSchemeDto })
  @ApiResponse({
    status: 201,
    description: 'Color scheme created successfully',
    type: ColorSchemeResponseDto,
  })
  async create(
    @Body() createDto: CreateColorSchemeDto,
    @Req() request: AuthRequest,
  ): Promise<ColorSchemeResponseDto> {
    const userId = request.user?.id;
    return this.designService.create(createDto, userId, request);
  }

  /**
   * Update an existing color scheme
   */
  @Put('schemes/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('design.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a color scheme' })
  @ApiParam({ name: 'id', description: 'Color scheme ID' })
  @ApiBody({ type: UpdateColorSchemeDto })
  @ApiResponse({
    status: 200,
    description: 'Color scheme updated successfully',
    type: ColorSchemeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Color scheme not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateColorSchemeDto,
    @Req() request: AuthRequest,
  ): Promise<ColorSchemeResponseDto> {
    const userId = request.user?.id;
    return this.designService.update(id, updateDto, userId, request);
  }

  /**
   * Delete a color scheme
   */
  @Delete('schemes/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('design.manage')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a color scheme' })
  @ApiParam({ name: 'id', description: 'Color scheme ID' })
  @ApiResponse({ status: 204, description: 'Color scheme deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete default scheme' })
  @ApiResponse({ status: 404, description: 'Color scheme not found' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthRequest,
  ): Promise<void> {
    const userId = request.user?.id;
    return this.designService.delete(id, userId, request);
  }

  /**
   * Apply a color scheme (make it active)
   */
  @Post('schemes/:id/apply')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('design.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply a color scheme globally' })
  @ApiParam({ name: 'id', description: 'Color scheme ID to apply' })
  @ApiResponse({
    status: 200,
    description: 'Color scheme applied successfully',
    type: ColorSchemeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Color scheme not found' })
  async applyScheme(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthRequest,
  ): Promise<ColorSchemeResponseDto> {
    const userId = request.user?.id;
    return this.designService.applyScheme(id, userId, request);
  }

  /**
   * Duplicate a color scheme
   */
  @Post('schemes/:id/duplicate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('design.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Duplicate a color scheme' })
  @ApiParam({ name: 'id', description: 'Color scheme ID to duplicate' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name for the duplicated scheme' },
      },
      required: ['name'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Color scheme duplicated successfully',
    type: ColorSchemeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Color scheme not found' })
  async duplicateScheme(
    @Param('id', ParseIntPipe) id: number,
    @Body('name') newName: string,
    @Req() request: AuthRequest,
  ): Promise<ColorSchemeResponseDto> {
    const userId = request.user?.id;
    return this.designService.duplicate(id, newName, userId, request);
  }

  /**
   * Set a scheme as light mode
   */
  @Post('schemes/:id/set-light-mode')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('design.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set scheme as light mode' })
  @ApiParam({ name: 'id', description: 'Color scheme ID' })
  @ApiResponse({
    status: 200,
    description: 'Scheme set as light mode successfully',
    type: ColorSchemeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Color scheme not found' })
  async setAsLightScheme(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthRequest,
  ): Promise<ColorSchemeResponseDto> {
    const userId = request.user?.id;
    return this.designService.setAsLightScheme(id, userId, request);
  }

  /**
   * Set a scheme as dark mode
   */
  @Post('schemes/:id/set-dark-mode')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('design.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set scheme as dark mode' })
  @ApiParam({ name: 'id', description: 'Color scheme ID' })
  @ApiResponse({
    status: 200,
    description: 'Scheme set as dark mode successfully',
    type: ColorSchemeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Color scheme not found' })
  async setAsDarkScheme(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthRequest,
  ): Promise<ColorSchemeResponseDto> {
    const userId = request.user?.id;
    return this.designService.setAsDarkScheme(id, userId, request);
  }

  /**
   * Clear light mode flag from a scheme
   */
  @Post('schemes/:id/clear-light-mode')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('design.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clear light mode flag from scheme' })
  @ApiParam({ name: 'id', description: 'Color scheme ID' })
  @ApiResponse({
    status: 200,
    description: 'Light mode flag cleared successfully',
    type: ColorSchemeResponseDto,
  })
  async clearLightScheme(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthRequest,
  ): Promise<ColorSchemeResponseDto> {
    const userId = request.user?.id;
    return this.designService.clearLightScheme(id, userId, request);
  }

  /**
   * Clear dark mode flag from a scheme
   */
  @Post('schemes/:id/clear-dark-mode')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('design.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clear dark mode flag from scheme' })
  @ApiParam({ name: 'id', description: 'Color scheme ID' })
  @ApiResponse({
    status: 200,
    description: 'Dark mode flag cleared successfully',
    type: ColorSchemeResponseDto,
  })
  async clearDarkScheme(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthRequest,
  ): Promise<ColorSchemeResponseDto> {
    const userId = request.user?.id;
    return this.designService.clearDarkScheme(id, userId, request);
  }
}
