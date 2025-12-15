/**
 * Users Module
 * STORY-021B: Resource Endpoints
 * STORY-003A: User CRUD Backend API
 * STORY-025: Benutzerdaten (User Data Storage)
 * STORY-007B: User Role Assignment
 *
 * NestJS module for user management functionality.
 * Provides user CRUD operations with pagination, filtering, sorting,
 * soft delete, role management, and audit logging.
 *
 * STORY-025 additions:
 * - UserRepository: Repository pattern for data access
 * - PasswordService: Centralized bcrypt password hashing
 *
 * STORY-007B additions:
 * - PermissionAggregationService: Collect permissions from all user roles
 */

import { Module, forwardRef } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserRepository } from './user.repository';
import { PasswordService } from './password.service';
import { PermissionAggregationService } from './permission-aggregation.service';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { WinstonLoggerService } from '../common/services/logger.service';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => AuditModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    UserRepository,
    PasswordService,
    PermissionAggregationService,
    WinstonLoggerService,
  ],
  exports: [UsersService, UserRepository, PasswordService, PermissionAggregationService],
})
export class UsersModule {}
