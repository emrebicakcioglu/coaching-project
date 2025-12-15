/**
 * Permissions Services Index
 * STORY-027B: Permission Guards & Data Filtering
 *
 * Exports all permission-related services for easy importing
 */

// Data Filter Service
export {
  DataFilterService,
  FilterableQuery,
  DataScopeType,
  ExtendedDataScope,
  FilterConfig,
  FilterResult,
} from './data-filter.service';

// Permission Hierarchy Service
export {
  PermissionHierarchyService,
  PermissionHierarchyNode,
  PermissionRelationship,
  InheritanceChain,
} from './permission-hierarchy.service';
