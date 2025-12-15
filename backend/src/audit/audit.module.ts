/**
 * Audit Module
 * STORY-028: System Logging (Audit Trail)
 *
 * NestJS module for audit logging functionality.
 * Provides the AuditService and AuditController as global providers.
 *
 * Features:
 * - AuditService for centralized audit logging
 * - Optional AuditController for admin access to logs
 * - Integrates with DatabaseModule for persistence
 * - Integrates with WinstonLoggerService for structured logging
 */

import { Module, Global, forwardRef } from '@nestjs/common';
import { AuditService } from '../common/services/audit.service';
import { AuditController } from './audit.controller';
import { WinstonLoggerService } from '../common/services/logger.service';
import { DatabaseModule } from '../database/database.module';

@Global()
@Module({
  imports: [
    forwardRef(() => DatabaseModule),
  ],
  controllers: [AuditController],
  providers: [
    AuditService,
    WinstonLoggerService,
  ],
  exports: [AuditService],
})
export class AuditModule {}
