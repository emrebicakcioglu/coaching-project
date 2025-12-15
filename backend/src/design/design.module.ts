/**
 * Design Module
 * Design System: Color Schemes Management
 *
 * NestJS module for design system functionality including
 * color schemes management and design token APIs.
 */

import { Module, forwardRef } from '@nestjs/common';
import { DesignController } from './design.controller';
import { DesignService } from './design.service';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { WinstonLoggerService } from '../common/services/logger.service';

@Module({
  imports: [
    forwardRef(() => DatabaseModule),
    forwardRef(() => AuditModule),
    forwardRef(() => AuthModule),
    forwardRef(() => PermissionsModule),
  ],
  controllers: [DesignController],
  providers: [DesignService, WinstonLoggerService],
  exports: [DesignService],
})
export class DesignModule {}
