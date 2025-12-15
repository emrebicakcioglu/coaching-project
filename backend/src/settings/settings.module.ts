/**
 * Settings Module
 * STORY-021B: Resource Endpoints
 * STORY-035: Support-E-Mail & Session-Timeout
 * STORY-013A: In-App Settings Backend
 * STORY-014A: Feature Toggles Backend
 * STORY-018A: Standard-Sprache Backend (i18n Setup)
 * STORY-034: Maintenance Mode
 *
 * NestJS module for application settings management.
 * Includes:
 * - General settings (support email, session timeout)
 * - Security settings (password policy, login limits)
 * - Branding settings (theme, company name)
 * - Feature toggles
 * - Language/i18n settings
 * - Maintenance mode
 */

import { Module, forwardRef } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { GeneralSettingsController } from './general-settings.controller';
import { GeneralSettingsService } from './general-settings.service';
import { SecuritySettingsController } from './security-settings.controller';
import { SecuritySettingsService } from './security-settings.service';
import { AllSettingsController } from './all-settings.controller';
import { SessionTimeoutService } from './session-timeout.service';
import { FeatureTogglesController } from './feature-toggles.controller';
import { FeatureTogglesService } from './feature-toggles.service';
import { LanguageController } from './language.controller';
import { LanguageService } from './language.service';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { WinstonLoggerService } from '../common/services/logger.service';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [
    SettingsController,
    GeneralSettingsController,
    SecuritySettingsController,
    AllSettingsController,
    FeatureTogglesController,
    LanguageController,
    MaintenanceController,
  ],
  providers: [
    SettingsService,
    GeneralSettingsService,
    SecuritySettingsService,
    SessionTimeoutService,
    FeatureTogglesService,
    LanguageService,
    MaintenanceService,
    WinstonLoggerService,
  ],
  exports: [
    SettingsService,
    GeneralSettingsService,
    SecuritySettingsService,
    SessionTimeoutService,
    FeatureTogglesService,
    LanguageService,
    MaintenanceService,
  ],
})
export class SettingsModule {}
