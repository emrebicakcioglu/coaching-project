/**
 * Permissions Module
 * STORY-027: Permission-System Core
 * STORY-027B: Permission Guards & Data Filtering
 *
 * NestJS module for permission management functionality.
 * Provides:
 * - PermissionsService: Core permission check logic
 * - EnhancedPermissionsGuard: Guard with OR/AND check support
 * - RoutePermissionGuard: Route-based permission guard (STORY-027B)
 * - DataFilterService: Data-level filtering service (STORY-027B)
 * - PermissionHierarchyService: Permission inheritance (STORY-027B)
 * - Express-style middleware functions
 */

import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { EnhancedPermissionsGuard } from './guards/enhanced-permissions.guard';
import { RoutePermissionGuard } from './guards/route-permission.guard';
import { PermissionLoaderMiddleware } from './permissions.middleware';
import { DataFilterService } from './services/data-filter.service';
import { PermissionHierarchyService } from './services/permission-hierarchy.service';
import { DatabaseModule } from '../database/database.module';
import { WinstonLoggerService } from '../common/services/logger.service';

@Module({
  imports: [
    DatabaseModule,
  ],
  providers: [
    PermissionsService,
    EnhancedPermissionsGuard,
    RoutePermissionGuard,
    DataFilterService,
    PermissionHierarchyService,
    WinstonLoggerService,
  ],
  exports: [
    PermissionsService,
    EnhancedPermissionsGuard,
    RoutePermissionGuard,
    DataFilterService,
    PermissionHierarchyService,
  ],
})
export class PermissionsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply permission loader middleware to all routes
    consumer
      .apply(PermissionLoaderMiddleware)
      .forRoutes('*');
  }
}

// Re-export decorators for convenience
export * from './decorators/permissions.decorator';
export * from './permissions.middleware';
export * from './permissions.service';
export * from './guards/enhanced-permissions.guard';
