/**
 * Auth Module
 * STORY-021B: Resource Endpoints
 * STORY-008: Session Management mit "Remember Me"
 * STORY-023A: E-Mail Service Setup (Resend.com)
 * STORY-007B: User Role Assignment
 * STORY-005B: MFA Login-Flow (Backend)
 * STORY-023: User Registration
 * STORY-CAPTCHA: Login Security with CAPTCHA
 *
 * NestJS module for authentication functionality.
 * Provides login, logout, token refresh, password reset, session management,
 * MFA verification during login, user registration, and login security features.
 *
 * Refactored to use specialized sub-services:
 * - AuthTokenService: Token operations
 * - AuthSessionService: Session management
 * - AuthPasswordService: Password reset
 * - AuthRegistrationService: User registration
 */

import { Module, forwardRef } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthTokenService } from './auth-token.service';
import { AuthSessionService } from './auth-session.service';
import { AuthPasswordService } from './auth-password.service';
import { AuthRegistrationService } from './auth-registration.service';
import { TokenCleanupService } from './token-cleanup.service';
import { LoginSecurityService } from './login-security.service';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { MFAModule } from '../mfa/mfa.module';
import { WinstonLoggerService } from '../common/services/logger.service';
// STORY-023: User Registration
import { UserRepository } from '../users/user.repository';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => UsersModule),
    AuditModule,
    EmailModule,
    forwardRef(() => MFAModule),
  ],
  controllers: [AuthController],
  providers: [
    // Main service
    AuthService,
    // Sub-services
    AuthTokenService,
    AuthSessionService,
    AuthPasswordService,
    AuthRegistrationService,
    // Utility services
    TokenCleanupService,
    LoginSecurityService,
    WinstonLoggerService,
    UserRepository,
  ],
  exports: [
    AuthService,
    AuthTokenService,
    AuthSessionService,
    AuthPasswordService,
    AuthRegistrationService,
    LoginSecurityService,
  ],
})
export class AuthModule {}
