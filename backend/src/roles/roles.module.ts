/**
 * Roles Module
 * STORY-007A: Rollen-Management Backend
 *
 * NestJS module for role and permission management.
 * Provides CRUD operations for roles and read operations for permissions.
 */

import { Module, forwardRef } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { PermissionsController } from './permissions.controller';
import { RolesService } from './roles.service';
import { PermissionsService } from './permissions.service';
import { DatabaseModule } from '../database/database.module';
import { WinstonLoggerService } from '../common/services/logger.service';
import { AuditService } from '../common/services/audit.service';

@Module({
  imports: [forwardRef(() => DatabaseModule)],
  controllers: [RolesController, PermissionsController],
  providers: [
    RolesService,
    PermissionsService,
    WinstonLoggerService,
    AuditService,
  ],
  exports: [RolesService, PermissionsService],
})
export class RolesModule {}
