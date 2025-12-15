/**
 * Permissions Module Index
 * STORY-027: Permission-System Core
 * STORY-027B: Permission Guards & Data Filtering
 *
 * Exports all permission-related components for easy importing
 */

// Module
export { PermissionsModule } from './permissions.module';

// Service
export {
  PermissionsService,
  PermissionHierarchy,
  DataLevelContext,
  DataScope,
  PermissionCheckResult,
} from './permissions.service';

// Guards - STORY-027
export { EnhancedPermissionsGuard, RequestWithDataContext } from './guards/enhanced-permissions.guard';

// Guards - STORY-027B
export {
  RoutePermissionGuard,
  RoutePermissionRequest,
  RoutePermissions,
  RoutePermissionsAll,
  SkipRoutePermission,
  ROUTE_PERMISSIONS_KEY,
  ROUTE_PERMISSION_MODE_KEY,
  SKIP_ROUTE_PERMISSION_KEY,
} from './guards/route-permission.guard';

// Services - STORY-027B
export {
  DataFilterService,
  FilterableQuery,
  DataScopeType,
  ExtendedDataScope,
  FilterConfig,
  FilterResult,
} from './services/data-filter.service';

export {
  PermissionHierarchyService,
  PermissionHierarchyNode,
  PermissionRelationship,
  InheritanceChain,
} from './services/permission-hierarchy.service';

// Decorators
export {
  PERMISSIONS_KEY,
  PERMISSIONS_ALL_KEY,
  PERMISSION_MODE_KEY,
  SKIP_PERMISSION_KEY,
  RESOURCE_PERMISSION_KEY,
  DATA_FILTER_KEY,
  PermissionMode,
  ResourcePermissionMetadata,
  DataFilterMetadata,
  RequirePermission,
  RequireAnyPermission,
  RequireAllPermissions,
  SkipPermissionCheck,
  RequireResourcePermission,
  ApplyDataFilter,
} from './decorators/permissions.decorator';

// Middleware
export {
  RequestWithPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  createPermissionCheck,
  hasResourcePermission,
  PermissionLoaderMiddleware,
} from './permissions.middleware';
