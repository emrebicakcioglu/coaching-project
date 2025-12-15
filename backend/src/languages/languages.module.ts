/**
 * Languages Module
 * Multi-Language Management System
 *
 * NestJS module for language and translation management.
 * Provides CRUD operations for languages and translations.
 */

import { Module, forwardRef } from '@nestjs/common';
import { LanguagesController } from './languages.controller';
import { LanguagesService } from './languages.service';
import { DatabaseModule } from '../database/database.module';
import { WinstonLoggerService } from '../common/services/logger.service';
import { AuditService } from '../common/services/audit.service';

@Module({
  imports: [forwardRef(() => DatabaseModule)],
  controllers: [LanguagesController],
  providers: [
    LanguagesService,
    WinstonLoggerService,
    AuditService,
  ],
  exports: [LanguagesService],
})
export class LanguagesModule {}
