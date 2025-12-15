/**
 * Email Module
 * STORY-023A: E-Mail Service Setup (Resend.com)
 * STORY-023B: E-Mail Templates & Queue
 *
 * NestJS module for email functionality.
 * Provides email sending via Resend.com with template rendering and queue system.
 *
 * Features:
 * - Resend.com API integration
 * - Handlebars template engine
 * - Database-stored templates (STORY-023B)
 * - Email queue with async processing (STORY-023B)
 * - Exponential backoff retry mechanism (STORY-023B)
 * - Email logging to database
 *
 * Exports:
 * - EmailService: For sending emails from other modules (legacy API)
 * - EmailTemplateService: For template management
 * - EmailQueueService: For queue-based email sending
 */

import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailTemplateService } from './email-template.service';
import { EmailQueueService } from './email-queue.service';
import { EmailController } from './email.controller';
import { DatabaseModule } from '../database/database.module';
import { WinstonLoggerService } from '../common/services/logger.service';

/**
 * Global Email Module
 * Making it global allows other modules to use email services without importing EmailModule
 */
@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [EmailController],
  providers: [
    EmailService,
    EmailTemplateService,
    EmailQueueService,
    WinstonLoggerService,
  ],
  exports: [
    EmailService,
    EmailTemplateService,
    EmailQueueService,
  ],
})
export class EmailModule {}
