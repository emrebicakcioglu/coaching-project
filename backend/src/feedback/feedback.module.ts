/**
 * Feedback Module
 * STORY-038A: Feedback-Backend API
 * STORY-038B: Feedback Rate Limiting & Email Queue
 * STORY-041C: Feedback Admin API
 * STORY-002-REWORK-003: Fixed HTTP 500 error - improved error handling
 *
 * Module for feedback submission with optional screenshot support.
 * Provides REST API endpoint for users to submit feedback with optional screenshots.
 *
 * Features (STORY-038B):
 * - Rate limiting: 5 requests per hour per user (via RateLimitGuard)
 * - Async email queue processing (via EmailQueueService from global EmailModule)
 * - Enhanced browser info and route capture
 * - Feedback metadata storage
 *
 * Features (STORY-041C - Admin API):
 * - List feedbacks with pagination and filtering
 * - Get feedback details with user information
 * - Generate presigned URLs for screenshot download
 * - Delete feedback (DB + MinIO cleanup)
 * - Audit logging for delete operations
 *
 * Features (STORY-002-REWORK-003):
 * - Screenshot is now optional
 * - Improved error handling for storage/email failures
 * - Graceful degradation when MinIO is unavailable
 *
 * Dependencies:
 * - DatabaseModule: For logging feedback emails and storing feedback records
 * - WinstonLoggerService: For application logging
 * - EmailQueueService: For async email processing (from global EmailModule)
 * - StorageService: For MinIO operations (global module)
 * - AuditService: For audit logging (STORY-041C)
 * - Resend.com SDK: For sending emails with attachments
 */

import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { FeedbackAdminController } from './feedback-admin.controller';
import { FeedbackAdminService } from './feedback-admin.service';
import { DatabaseModule } from '../database/database.module';
import { WinstonLoggerService } from '../common/services/logger.service';
import { AuditService } from '../common/services/audit.service';

@Module({
  imports: [DatabaseModule],
  controllers: [FeedbackController, FeedbackAdminController],
  providers: [FeedbackService, FeedbackAdminService, WinstonLoggerService, AuditService],
  exports: [FeedbackService, FeedbackAdminService],
})
export class FeedbackModule {}
