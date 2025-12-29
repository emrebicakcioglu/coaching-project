/**
 * Feedback Admin Controller
 * STORY-041C: Feedback Admin API
 *
 * Admin endpoints for managing feedback submissions.
 * All endpoints require Admin role authentication.
 *
 * Endpoints:
 * - GET    /api/v1/admin/feedbacks              - List all feedbacks with pagination
 * - GET    /api/v1/admin/feedbacks/:id          - Get single feedback details
 * - GET    /api/v1/admin/feedbacks/:id/screenshot - Get screenshot presigned URL
 * - DELETE /api/v1/admin/feedbacks/:id          - Delete feedback and screenshot
 *
 * Security:
 * - JwtAuthGuard: Validates JWT token
 * - RolesGuard: Ensures Admin role
 * - Audit logging for delete operations
 */

import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard, AuthenticatedRequest } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { FeedbackAdminService } from './feedback-admin.service';
import {
  FeedbackListQueryDto,
  FeedbackListResponseDto,
  FeedbackStatus,
} from './dto/feedback-list.dto';
import {
  FeedbackDetailDto,
  ScreenshotUrlResponseDto,
  DeleteFeedbackResponseDto,
} from './dto/feedback-detail.dto';

@Controller('api/v1/admin/feedbacks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
@ApiTags('Admin - Feedback')
export class FeedbackAdminController {
  constructor(private readonly feedbackAdminService: FeedbackAdminService) {}

  /**
   * List all feedbacks with pagination and filtering
   */
  @Get()
  @ApiOperation({
    summary: 'List all feedbacks',
    description: 'Retrieves a paginated list of feedback submissions. Supports filtering by status, user ID, and search terms.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-indexed)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (max 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: FeedbackStatus,
    description: 'Filter by feedback status',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: Number,
    description: 'Filter by user ID',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search in comment or email',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of feedbacks',
    type: FeedbackListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async list(@Query() query: FeedbackListQueryDto): Promise<FeedbackListResponseDto> {
    return this.feedbackAdminService.findAll(query);
  }

  /**
   * Get single feedback with full details
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get feedback details',
    description: 'Retrieves complete details of a single feedback including user info, browser details, and screenshot URL if available.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Feedback ID',
    example: 123,
  })
  @ApiResponse({
    status: 200,
    description: 'Feedback details with screenshot URL',
    type: FeedbackDetailDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<FeedbackDetailDto> {
    return this.feedbackAdminService.findOne(id);
  }

  /**
   * Get screenshot download URL
   */
  @Get(':id/screenshot')
  @ApiOperation({
    summary: 'Get screenshot download URL',
    description: 'Generates a presigned URL for downloading the feedback screenshot. URL is valid for 5 minutes.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Feedback ID',
    example: 123,
  })
  @ApiResponse({
    status: 200,
    description: 'Presigned URL for screenshot download',
    type: ScreenshotUrlResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Feedback not found or has no screenshot' })
  async getScreenshotUrl(@Param('id', ParseIntPipe) id: number): Promise<ScreenshotUrlResponseDto> {
    return this.feedbackAdminService.getScreenshotUrl(id);
  }

  /**
   * Delete feedback and associated screenshot
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete feedback',
    description: 'Permanently deletes a feedback submission and its associated screenshot from storage. An audit log entry is created.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Feedback ID to delete',
    example: 123,
  })
  @ApiResponse({
    status: 200,
    description: 'Feedback deleted successfully',
    type: DeleteFeedbackResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<DeleteFeedbackResponseDto> {
    const user = (req as AuthenticatedRequest).user;
    return this.feedbackAdminService.delete(id, user, req);
  }
}
