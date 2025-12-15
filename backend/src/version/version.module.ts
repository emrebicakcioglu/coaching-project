/**
 * Version Module
 *
 * Module for application version information.
 * Provides a public API endpoint for version retrieval.
 *
 * Stories:
 * - STORY-030: Application Versioning
 *
 * Endpoints:
 * - GET /api/version - Returns application version information
 */

import { Module } from '@nestjs/common';
import { VersionController } from './version.controller';
import { VersionService } from './version.service';

@Module({
  controllers: [VersionController],
  providers: [VersionService],
  exports: [VersionService],
})
export class VersionModule {}
