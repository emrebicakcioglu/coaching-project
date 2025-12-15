/**
 * Feedback Controller
 * STORY-038A: Feedback-Backend API
 * STORY-038B: Feedback Rate Limiting & Email Queue
 *
 * REST API endpoint for submitting user feedback with screenshots.
 * Protected by JWT authentication and rate limiting.
 *
 * Features (STORY-038B):
 * - Rate limiting: 5 requests per hour per user
 * - Async email queue processing
 * - Enhanced browser info and route capture
 *
 * API Endpoints:
 *   POST /api/feedback - Submit user feedback with screenshot
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Inject,
  forwardRef,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { SubmitFeedbackDto, FeedbackResponseDto } from './dto/feedback.dto';
import { JwtAuthGuard, AuthenticatedRequest } from '../common/guards/jwt-auth.guard';
import { RateLimit, RateLimitGuard } from '../common/guards/rate-limit.guard';

@ApiTags('Feedback')
@ApiBearerAuth()
@Controller('api/feedback')
export class FeedbackController {
  constructor(
    @Inject(forwardRef(() => FeedbackService))
    private readonly feedbackService: FeedbackService,
  ) {}

  /**
   * Submit user feedback with screenshot
   *
   * Accepts feedback data with a Base64 encoded screenshot,
   * converts the screenshot to a file, and sends it via email
   * to the configured support address.
   *
   * Rate limited to 5 requests per hour (3600 seconds) per user
   * to prevent spam.
   */
  @Post()
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit(5, 3600) // 5 requests per hour (STORY-038A requirement)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit user feedback',
    description: 'Submit feedback with an optional screenshot. The screenshot is sent as an email attachment to the support team.',
  })
  @ApiBody({
    type: SubmitFeedbackDto,
    description: 'Feedback submission data with screenshot',
  })
  @ApiResponse({
    status: 200,
    description: 'Feedback submitted successfully',
    type: FeedbackResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data (e.g., invalid Base64 screenshot)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded - maximum 5 feedback submissions per hour',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - email sending failed',
  })
  async submitFeedback(
    @Body() feedbackDto: SubmitFeedbackDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<FeedbackResponseDto> {
    // STORY-038B: Pass request for metadata extraction (browser info, route)
    return this.feedbackService.submitFeedback(
      feedbackDto,
      {
        id: req.user.id,
        email: req.user.email,
      },
      req, // Pass request for metadata extraction
    );
  }
}
