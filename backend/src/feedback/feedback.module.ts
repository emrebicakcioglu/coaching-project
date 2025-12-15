/**
 * Feedback Module
 * STORY-038A: Feedback-Backend API
 * STORY-038B: Feedback Rate Limiting & Email Queue
 *
 * Module for feedback submission with screenshot support.
 * Provides REST API endpoint for users to submit feedback with screenshots.
 *
 * Features (STORY-038B):
 * - Rate limiting: 5 requests per hour per user (via RateLimitGuard)
 * - Async email queue processing (via EmailQueueService from global EmailModule)
 * - Enhanced browser info and route capture
 * - Feedback metadata storage
 *
 * Dependencies:
 * - DatabaseModule: For logging feedback emails and storing feedback records
 * - WinstonLoggerService: For application logging
 * - EmailQueueService: For async email processing (from global EmailModule)
 * - Resend.com SDK: For sending emails with attachments
 */

import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { DatabaseModule } from '../database/database.module';
import { WinstonLoggerService } from '../common/services/logger.service';

@Module({
  imports: [DatabaseModule],
  controllers: [FeedbackController],
  providers: [FeedbackService, WinstonLoggerService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
