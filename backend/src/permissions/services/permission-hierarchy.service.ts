/**
 * Permission Hierarchy Service
 * STORY-027B: Permission Guards & Data Filtering
 *
 * Provides permission hierarchy management with parent-child inheritance.
 * Implements the PermissionHierarchy interface from the story requirements.
 *
 * Features:
 * - Parent → Child permission cascading
 * - Hierarchical permission resolution
 * - Wildcard pattern support in hierarchy
 * - Category-based grouping
 */

import {
  Injectable,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { WinstonLoggerService } from '../../common/services/logger.service';

/**
 * Permission hierarchy node structure
 * Matches the interface from story requirements
 */
export interface PermissionHierarchyNode {
  id: number;
  name: string;
  category: string | null;
  parentPermission: string | null;
  childPermissions: string[];
  inheritsFrom?: string;
}

/**
 * Permission hierarchy relationship
 */
export interface PermissionRelationship {
  parent: string;
  child: string;
  depth: number;
}

/**
 * Permission inheritance chain
 */
export interface InheritanceChain {
  permission: string;
  inheritsFrom: string[];
  grantsTo: string[];
}

@Injectable()
export class PermissionHierarchyService {
  // Cache for permission hierarchy
  private hierarchyCache: Map<string, PermissionHierarchyNode> | null = null;
  private hierarchyCacheExpiry: number = 0;
  private readonly hierarchyCacheTtlMs: number;

  // Cache for flattened relationships
  private flattenedRelationshipsCache: PermissionRelationship[] | null = null;

  constructor(
    @Inject(forwardRef(() => DatabaseService))
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
  ) {
    this.hierarchyCacheTtlMs = parseInt(
      process.env.PERMISSION_HIERARCHY_CACHE_TTL_MS || '600000',
      10,
    );
  }

  /**
   * Get the full permission hierarchy
   *
   * @returns Map of permission names to hierarchy nodes
   */
  async getHierarchy(): Promise<Map<string, PermissionHierarchyNode>> {
    // Check cache
    if (this.hierarchyCache && this.hierarchyCacheExpiry > Date.now()) {
      return this.hierarchyCache;
    }

    const pool = this.databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool not available');
    }

    // Query permissions with optional parent relationship
    // Supports both explicit parent_permission_id and category-based hierarchy
    const result = await pool.query<{
      id: number;
      name: string;
      category: string | null;
      parent_id: number | null;
      parent_name: string | null;
    }>(
      `SELECT
        p.id,
        p.name,
        p.category,
        pp.id as parent_id,
        pp.name as parent_name
       FROM permissions p
       LEFT JOIN permissions pp ON (
         -- Try explicit parent relationship first
         (p.category IS NOT NULL AND pp.name = p.category AND pp.category IS NULL)
         -- Or match by wildcard pattern (e.g., users.create inherits from users.*)
         OR (pp.name = CONCAT(SPLIT_PART(p.name, '.', 1), '.*') AND pp.name != p.name)
       )
       ORDER BY p.name`,
    );

    const hierarchy = new Map<string, PermissionHierarchyNode>();

    // Build nodes
    for (const row of result.rows) {
      hierarchy.set(row.name, {
        id: row.id,
        name: row.name,
        category: row.category,
        parentPermission: row.parent_name,
        childPermissions: [],
        inheritsFrom: row.parent_name || undefined,
      });
    }

    // Build children lists
    for (const [name, node] of hierarchy.entries()) {
      if (node.parentPermission && hierarchy.has(node.parentPermission)) {
        const parent = hierarchy.get(node.parentPermission)!;
        if (!parent.childPermissions.includes(name)) {
          parent.childPermissions.push(name);
        }
      }
    }

    // Add implicit hierarchy based on naming convention
    this.buildImplicitHierarchy(hierarchy);

    // Cache the result
    this.hierarchyCache = hierarchy;
    this.hierarchyCacheExpiry = Date.now() + this.hierarchyCacheTtlMs;
    this.flattenedRelationshipsCache = null; // Invalidate flattened cache

    this.logger.debug(
      `Loaded permission hierarchy with ${hierarchy.size} permissions`,
      'PermissionHierarchyService',
    );

    return hierarchy;
  }

  /**
   * Build implicit hierarchy based on permission naming convention
   * e.g., users.* is parent of users.create, users.update, etc.
   */
  private buildImplicitHierarchy(hierarchy: Map<string, PermissionHierarchyNode>): void {
    const categories = new Set<string>();

    // Collect unique categories (first part of permission name)
    for (const name of hierarchy.keys()) {
      const parts = name.split('.');
      if (parts.length >= 2) {
        categories.add(parts[0]);
      }
    }

    // For each category, establish implicit parent-child relationships
    for (const category of categories) {
      const wildcardName = `${category}.*`;

      // Create virtual wildcard node if not exists
      if (!hierarchy.has(wildcardName)) {
        hierarchy.set(wildcardName, {
          id: -1, // Virtual node
          name: wildcardName,
          category: category,
          parentPermission: null,
          childPermissions: [],
        });
      }

      const wildcardNode = hierarchy.get(wildcardName)!;

      // Find all permissions in this category
      for (const [name, node] of hierarchy.entries()) {
        if (name.startsWith(`${category}.`) && name !== wildcardName && !name.includes('*')) {
          // This permission is implicitly a child of the wildcard
          if (!node.parentPermission && !node.inheritsFrom) {
            node.inheritsFrom = wildcardName;
          }
          if (!wildcardNode.childPermissions.includes(name)) {
            wildcardNode.childPermissions.push(name);
          }
        }
      }
    }
  }

  /**
   * Get inheritance chain for a permission
   * Shows what the permission inherits from and what it grants
   *
   * @param permissionName - Permission to get chain for
   * @returns Inheritance chain
   */
  async getInheritanceChain(permissionName: string): Promise<InheritanceChain> {
    const hierarchy = await this.getHierarchy();
    const node = hierarchy.get(permissionName);

    const chain: InheritanceChain = {
      permission: permissionName,
      inheritsFrom: [],
      grantsTo: [],
    };

    if (!node) {
      return chain;
    }

    // Walk up the hierarchy to find what this permission inherits from
    let current: PermissionHierarchyNode | undefined = node;
    while (current?.inheritsFrom || current?.parentPermission) {
      const parentName = current.inheritsFrom || current.parentPermission;
      if (parentName && !chain.inheritsFrom.includes(parentName)) {
        chain.inheritsFrom.push(parentName);
        current = hierarchy.get(parentName);
      } else {
        break;
      }
    }

    // Get all children (recursive)
    chain.grantsTo = this.getAllChildren(hierarchy, permissionName);

    return chain;
  }

  /**
   * Get all child permissions recursively
   */
  private getAllChildren(
    hierarchy: Map<string, PermissionHierarchyNode>,
    permissionName: string,
    visited: Set<string> = new Set(),
  ): string[] {
    if (visited.has(permissionName)) {
      return [];
    }
    visited.add(permissionName);

    const node = hierarchy.get(permissionName);
    if (!node) {
      return [];
    }

    const children: string[] = [...node.childPermissions];

    // Recursively get children of children
    for (const childName of node.childPermissions) {
      const grandchildren = this.getAllChildren(hierarchy, childName, visited);
      for (const gc of grandchildren) {
        if (!children.includes(gc)) {
          children.push(gc);
        }
      }
    }

    return children;
  }

  /**
   * Check if a permission inherits from another permission
   *
   * @param childPermission - The permission to check
   * @param parentPermission - The potential parent permission
   * @returns True if child inherits from parent
   */
  async inheritsFrom(childPermission: string, parentPermission: string): Promise<boolean> {
    const chain = await this.getInheritanceChain(childPermission);
    return chain.inheritsFrom.includes(parentPermission);
  }

  /**
   * Check if a permission grants access to another permission
   *
   * @param parentPermission - The permission that might grant access
   * @param targetPermission - The permission to check access for
   * @returns True if parent grants access to target
   */
  async grantsAccessTo(parentPermission: string, targetPermission: string): Promise<boolean> {
    // Same permission always grants access
    if (parentPermission === targetPermission) {
      return true;
    }

    // system.admin and * grant access to everything
    if (parentPermission === 'system.admin' || parentPermission === '*') {
      return true;
    }

    // Check wildcard patterns
    if (parentPermission.includes('*')) {
      if (this.matchesWildcard(parentPermission, targetPermission)) {
        return true;
      }
    }

    // Check hierarchy
    const chain = await this.getInheritanceChain(parentPermission);
    return chain.grantsTo.includes(targetPermission);
  }

  /**
   * Check if a wildcard pattern matches a target permission
   */
  private matchesWildcard(pattern: string, target: string): boolean {
    const patternParts = pattern.split('.');
    const targetParts = target.split('.');

    // Trailing wildcard
    if (patternParts[patternParts.length - 1] === '*') {
      // Check all parts before the wildcard
      for (let i = 0; i < patternParts.length - 1; i++) {
        if (i >= targetParts.length) {
          return false;
        }
        if (patternParts[i] !== '*' && patternParts[i] !== targetParts[i]) {
          return false;
        }
      }
      return targetParts.length >= patternParts.length - 1;
    }

    // Exact length match with wildcards
    if (patternParts.length !== targetParts.length) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] !== '*' && patternParts[i] !== targetParts[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all permissions that a user would have based on hierarchy
   * Given a list of direct permissions, expand to include all inherited permissions
   *
   * @param directPermissions - Directly assigned permissions
   * @returns Expanded permissions including inherited ones
   */
  async expandPermissions(directPermissions: string[]): Promise<string[]> {
    const expanded = new Set<string>(directPermissions);

    for (const permission of directPermissions) {
      const chain = await this.getInheritanceChain(permission);
      // Add all permissions this one grants access to
      for (const granted of chain.grantsTo) {
        expanded.add(granted);
      }
    }

    return Array.from(expanded);
  }

  /**
   * Get flattened list of all parent-child relationships
   *
   * @returns Array of permission relationships
   */
  async getAllRelationships(): Promise<PermissionRelationship[]> {
    // Check cache
    if (this.flattenedRelationshipsCache) {
      return this.flattenedRelationshipsCache;
    }

    const hierarchy = await this.getHierarchy();
    const relationships: PermissionRelationship[] = [];

    const buildRelationships = (
      parentName: string,
      children: string[],
      depth: number,
    ): void => {
      for (const childName of children) {
        relationships.push({
          parent: parentName,
          child: childName,
          depth,
        });

        const childNode = hierarchy.get(childName);
        if (childNode && childNode.childPermissions.length > 0) {
          buildRelationships(childName, childNode.childPermissions, depth + 1);
        }
      }
    };

    // Find root nodes (no parent)
    for (const [name, node] of hierarchy.entries()) {
      if (!node.parentPermission && !node.inheritsFrom) {
        buildRelationships(name, node.childPermissions, 1);
      }
    }

    this.flattenedRelationshipsCache = relationships;
    return relationships;
  }

  /**
   * Get permissions by category
   *
   * @param category - Category name
   * @returns Array of permissions in the category
   */
  async getByCategory(category: string): Promise<PermissionHierarchyNode[]> {
    const hierarchy = await this.getHierarchy();
    const permissions: PermissionHierarchyNode[] = [];

    for (const node of hierarchy.values()) {
      if (node.category === category || node.name.startsWith(`${category}.`)) {
        permissions.push(node);
      }
    }

    return permissions;
  }

  /**
   * Invalidate the hierarchy cache
   */
  invalidateCache(): void {
    this.hierarchyCache = null;
    this.hierarchyCacheExpiry = 0;
    this.flattenedRelationshipsCache = null;
    this.logger.debug('Permission hierarchy cache invalidated', 'PermissionHierarchyService');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    isCached: boolean;
    size: number;
    expiresAt: Date | null;
  } {
    return {
      isCached: this.hierarchyCache !== null && this.hierarchyCacheExpiry > Date.now(),
      size: this.hierarchyCache?.size ?? 0,
      expiresAt: this.hierarchyCacheExpiry > 0 ? new Date(this.hierarchyCacheExpiry) : null,
    };
  }
}
