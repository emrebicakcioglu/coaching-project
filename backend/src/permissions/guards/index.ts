/**
 * Permissions Guards Index
 * STORY-027B: Permission Guards & Data Filtering
 *
 * Exports all permission-related guards for easy importing
 */

// Enhanced Permissions Guard (STORY-027)
export { EnhancedPermissionsGuard, RequestWithDataContext } from './enhanced-permissions.guard';

// Route Permission Guard (STORY-027B)
export {
  RoutePermissionGuard,
  RoutePermissionRequest,
  RoutePermissions,
  RoutePermissionsAll,
  SkipRoutePermission,
  ROUTE_PERMISSIONS_KEY,
  ROUTE_PERMISSION_MODE_KEY,
  SKIP_ROUTE_PERMISSION_KEY,
} from './route-permission.guard';
