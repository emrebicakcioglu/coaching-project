/**
 * Root Application Module
 *
 * Main NestJS module that imports all feature modules
 * and configures global providers and middleware.
 *
 * Stories:
 * - STORY-021A: API-Basis-Infrastruktur
 * - STORY-021B: API Middleware & Error Handling, Resource Endpoints
 * - STORY-023A: E-Mail Service Setup (Resend.com)
 * - STORY-028: System Logging (Audit Trail)
 * - STORY-035: Support-E-Mail & Session-Timeout
 * - STORY-007A: Rollen-Management Backend
 * - STORY-027: Permission-System Core
 * - STORY-027B: Permission Guards & Data Filtering
 * - STORY-005A: MFA Setup (Backend)
 * - STORY-038A: Feedback-Backend API
 * - STORY-026A: MinIO Setup (File Storage)
 * - STORY-030: Application Versioning
 * - STORY-034: Maintenance Mode
 * - STORY-041D: Jira Settings API
 * - STORY-041E: Jira Ticket Creation
 */

import { Module, OnModuleInit, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { AuditModule } from './audit/audit.module';
import { EmailModule } from './email/email.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SettingsModule } from './settings/settings.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { MFAModule } from './mfa/mfa.module';
import { FeedbackModule } from './feedback/feedback.module';
import { StorageModule } from './storage/storage.module';
import { VersionModule } from './version/version.module';
import { JiraModule } from './jira/jira.module';
import { DesignModule } from './design/design.module';
import { LanguagesModule } from './languages/languages.module';
import { WinstonLoggerService } from './common/services/logger.service';
import { AuditService } from './common/services/audit.service';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';
import { AuditLoggingMiddleware } from './common/middleware/audit-logging.middleware';
import { SessionTimeoutMiddleware } from './common/middleware/session-timeout.middleware';
import { MaintenanceMiddleware } from './common/middleware/maintenance.middleware';
import { RateLimitGuard } from './common/guards/rate-limit.guard';

@Module({
  imports: [
    // Database module for connection management
    DatabaseModule,

    // Audit logging module (STORY-028)
    AuditModule,

    // Email service module (STORY-023A)
    EmailModule,

    // Health check endpoint
    HealthModule,

    // STORY-021B: Resource Endpoints
    UsersModule,
    AuthModule,
    SettingsModule,

    // STORY-007A: Rollen-Management Backend
    RolesModule,

    // STORY-027: Permission-System Core
    // STORY-027B: Permission Guards & Data Filtering
    PermissionsModule,

    // STORY-005A: MFA Setup (Backend)
    MFAModule,

    // STORY-038A: Feedback-Backend API
    FeedbackModule,

    // STORY-026A: MinIO Setup (File Storage)
    StorageModule,

    // STORY-030: Application Versioning
    VersionModule,

    // STORY-041D: Jira Settings API
    // STORY-041E: Jira Ticket Creation
    JiraModule,

    // Design System: Color Schemes Management
    DesignModule,

    // Multi-Language Management
    LanguagesModule,
  ],
  providers: [
    {
      provide: WinstonLoggerService,
      useClass: WinstonLoggerService,
    },
    // Global rate limit guard (STORY-021B)
    // Can be overridden per-controller/endpoint with @RateLimit decorator
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
  exports: [WinstonLoggerService],
})
export class AppModule implements OnModuleInit, NestModule {
  constructor(
    private readonly logger: WinstonLoggerService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Configure middleware (STORY-021B, STORY-028, STORY-035)
   * Middleware is applied to all routes in order:
   * 1. RequestIdMiddleware - Adds unique request ID for tracing
   * 2. RequestLoggingMiddleware - Logs request/response with timing
   * 3. AuditLoggingMiddleware - Logs API requests to audit trail (if enabled)
   * 4. MaintenanceMiddleware - Blocks non-admin requests during maintenance (STORY-034)
   * 5. SessionTimeoutMiddleware - Validates session idle timeout (STORY-035)
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestIdMiddleware, RequestLoggingMiddleware, AuditLoggingMiddleware, MaintenanceMiddleware, SessionTimeoutMiddleware)
      .forRoutes('*');
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Application modules initialized', 'AppModule');
    this.logger.log(
      `Middleware configured: RequestIdMiddleware, RequestLoggingMiddleware, AuditLoggingMiddleware, MaintenanceMiddleware, SessionTimeoutMiddleware`,
      'AppModule',
    );
    this.logger.log('Rate limiting guard enabled globally', 'AppModule');

    // Log audit configuration status (STORY-028)
    const auditEnabled = this.auditService.isAuditLoggingEnabled();
    const apiLoggingEnabled = this.auditService.isApiRequestLoggingEnabled();
    this.logger.log(
      `Audit logging: ${auditEnabled ? 'enabled' : 'disabled'}, API request logging: ${apiLoggingEnabled ? 'enabled' : 'disabled'}`,
      'AppModule',
    );

    // Log session timeout configuration (STORY-035)
    this.logger.log('Session timeout middleware enabled', 'AppModule');
  }
}
