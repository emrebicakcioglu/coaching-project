/**
 * Jira Ticket Controller
 * STORY-041E: Jira Ticket Creation
 *
 * REST API endpoint for creating Jira tickets from feedback submissions.
 * Admin-only endpoint that requires authentication.
 *
 * Endpoints:
 * - POST /api/v1/admin/feedbacks/:id/jira - Create Jira ticket from feedback
 *
 * Security:
 * - JWT Authentication required
 * - Admin role required
 * - Rate limited to 20 requests per minute
 *
 * Dependencies:
 * - JiraTicketService: Business logic for ticket creation
 */

import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
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
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RateLimit } from '../common/guards/rate-limit.guard';
import { JiraTicketService } from './jira-ticket.service';
import {
  CreateJiraTicketDto,
  JiraTicketResponseDto,
  JiraTicketErrorDto,
} from './dto/jira-ticket.dto';
import { Request as ExpressRequest } from 'express';

/**
 * Extended request interface with user
 */
interface AuthRequest extends ExpressRequest {
  user?: {
    id?: number;
    sub?: number;
    email?: string;
    role?: string;
  };
  requestId?: string;
}

@ApiTags('Feedback Admin - Jira')
@Controller('api/v1/admin/feedbacks')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class JiraTicketController {
  constructor(private readonly jiraTicketService: JiraTicketService) {}

  /**
   * Create a Jira ticket from a feedback submission
   */
  @Post(':id/jira')
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @RateLimit(20, 60) // 20 requests per minute
  @ApiOperation({
    summary: 'Create Jira ticket from feedback',
    description:
      'Creates a Jira issue from the specified feedback submission. ' +
      'The feedback comment becomes the issue description, and screenshots ' +
      'are attached to the issue. Requires Jira integration to be configured ' +
      'and enabled in the system settings.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Feedback ID',
    example: 123,
  })
  @ApiBody({
    type: CreateJiraTicketDto,
    required: false,
    description: 'Optional configuration for ticket creation',
    examples: {
      default: {
        summary: 'Keep feedback after creation',
        value: {},
      },
      deleteAfter: {
        summary: 'Delete feedback after creation',
        value: { deleteAfterCreation: true },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Jira ticket created successfully',
    type: JiraTicketResponseDto,
    schema: {
      example: {
        success: true,
        issueKey: 'PROJ-123',
        issueUrl: 'https://company.atlassian.net/browse/PROJ-123',
        feedbackDeleted: false,
        feedbackId: 123,
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Jira not configured, feedback not found, or ticket already exists',
    type: JiraTicketErrorDto,
    schema: {
      examples: {
        notConfigured: {
          summary: 'Jira not configured',
          value: {
            success: false,
            message: 'Jira integration is not configured',
          },
        },
        alreadyExists: {
          summary: 'Ticket already exists',
          value: {
            success: false,
            message: 'Feedback already has a Jira ticket: PROJ-123',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Feedback not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin role required',
  })
  @ApiResponse({
    status: HttpStatus.BAD_GATEWAY,
    description: 'Jira API error',
    type: JiraTicketErrorDto,
    schema: {
      example: {
        success: false,
        message: 'Failed to create Jira ticket: API error',
        error: 'Jira API returned status 500',
        statusCode: 502,
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded (20 requests per minute)',
  })
  async createJiraTicket(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateJiraTicketDto,
    @Request() req: AuthRequest,
  ): Promise<JiraTicketResponseDto> {
    // Extract user info from JWT token
    const adminUser = {
      id: req.user?.id ?? req.user?.sub ?? 0,
      email: req.user?.email ?? 'unknown',
    };

    return this.jiraTicketService.createTicketFromFeedback(
      id,
      dto.deleteAfterCreation ?? false,
      adminUser,
      req,
    );
  }
}
