/**
 * Jira Module
 * STORY-041D: Jira Settings API
 * STORY-041E: Jira Ticket Creation
 *
 * NestJS module for Jira Cloud integration.
 * Provides settings management and ticket creation from feedback.
 *
 * Features:
 * - Jira settings CRUD operations (STORY-041D)
 * - API token encryption (AES-256-GCM)
 * - Connection testing endpoint
 * - Jira ticket creation from feedback (STORY-041E)
 * - Screenshot attachment upload
 * - Audit logging for settings changes and ticket creation
 *
 * Dependencies:
 * - DatabaseModule: For settings storage in app_settings table
 * - AuthModule: For JWT authentication and user ID extraction
 * - AuditService: For audit trail logging
 * - WinstonLoggerService: For application logging
 * - FeedbackModule: For feedback retrieval (STORY-041E)
 * - StorageModule: For screenshot retrieval (STORY-041E)
 */

import { Module, forwardRef } from '@nestjs/common';
import { JiraSettingsController } from './jira-settings.controller';
import { JiraSettingsService } from './jira-settings.service';
import { JiraTicketController } from './jira-ticket.controller';
import { JiraTicketService } from './jira-ticket.service';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { FeedbackModule } from '../feedback/feedback.module';
import { WinstonLoggerService } from '../common/services/logger.service';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    forwardRef(() => AuthModule),
    forwardRef(() => FeedbackModule),
  ],
  controllers: [JiraSettingsController, JiraTicketController],
  providers: [JiraSettingsService, JiraTicketService, WinstonLoggerService],
  exports: [JiraSettingsService, JiraTicketService],
})
export class JiraModule {}
