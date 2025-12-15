/**
 * Health Module
 *
 * Provides health check functionality for the application.
 * Used by container orchestration for liveness/readiness probes.
 *
 * Stories:
 * - STORY-021A: API-Basis-Infrastruktur
 * - STORY-029: Health Status (SMTP, MinIO checks)
 *
 * Endpoints:
 * - GET /health - Legacy health endpoint
 * - GET /api/health - Full health check with all components
 */

import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { SmtpHealthService } from './services/smtp-health.service';
import { StorageHealthService } from './services/storage-health.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
  providers: [HealthService, SmtpHealthService, StorageHealthService],
  exports: [HealthService],
})
export class HealthModule {}
