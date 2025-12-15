/**
 * MFA Module
 * STORY-005A: MFA Setup (Backend)
 *
 * NestJS module for Multi-Factor Authentication functionality.
 * Provides MFA setup, verification, and backup code management.
 */

import { Module, forwardRef } from '@nestjs/common';
import { MFAController } from './mfa.controller';
import { MFAService } from './mfa.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { WinstonLoggerService } from '../common/services/logger.service';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => AuthModule),
    AuditModule,
  ],
  controllers: [MFAController],
  providers: [MFAService, WinstonLoggerService],
  exports: [MFAService],
})
export class MFAModule {}
