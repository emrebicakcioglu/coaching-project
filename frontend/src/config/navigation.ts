/**
 * Navigation Configuration
 * STORY-016A: Context Menu Core Navigation
 * STORY-041H: Feedback Admin Page
 *
 * Centralized configuration for sidebar navigation items.
 * Items are filtered based on user permissions.
 *
 * @example
 * ```tsx
 * import { NAVIGATION_ITEMS } from '../config/navigation';
 *
 * const filteredItems = NAVIGATION_ITEMS.filter(item =>
 *   !item.permission || hasPermission(item.permission)
 * );
 * ```
 */

import React from 'react';

/**
 * Icon type for navigation items
 * Uses string identifiers that map to actual icon components
 */
export type IconName =
  | 'home'
  | 'users'
  | 'shield'
  | 'settings'
  | 'help'
  | 'user-plus'
  | 'list'
  | 'key'
  | 'layout'
  | 'grid'
  | 'monitor'
  | 'sessions'
  | 'palette'
  | 'globe'
  | 'message-square';

/**
 * Navigation item interface
 */
export interface NavigationItem {
  /** Unique identifier */
  id: string;
  /** Translation key for the label (in navigation namespace) */
  labelKey: string;
  /** Icon identifier */
  icon: IconName;
  /** Route path (optional for parent items with children) */
  path?: string;
  /** Required permission (null for public access) */
  permission: string | null;
  /** Child navigation items */
  children?: NavigationItem[];
  /** Optional badge content */
  badge?: string | number;
  /** Whether item is disabled */
  disabled?: boolean;
}

/**
 * Navigation group for organizing items
 */
export interface NavigationGroup {
  /** Group identifier */
  id: string;
  /** Group label (optional, for display) */
  label?: string;
  /** Items in this group */
  items: NavigationItem[];
}

/**
 * Main navigation items configuration
 *
 * Defined according to acceptance criteria:
 * - Dashboard
 * - Benutzerverwaltung (User Management) - only with permission
 * - Rollen & Berechtigungen (Roles & Permissions) - only with permission
 * - Einstellungen (Settings) - only with permission
 * - Hilfe (Help)
 */
export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'dashboard',
    labelKey: 'dashboard',
    icon: 'home',
    path: '/dashboard',
    permission: null, // Public for authenticated users
  },
  {
    id: 'users',
    labelKey: 'users',
    icon: 'users',
    path: '/users',
    permission: 'users.read',
  },
  {
    id: 'roles',
    labelKey: 'roles',
    icon: 'shield',
    path: '/roles',
    permission: 'roles.read',
  },
  {
    id: 'sessions',
    labelKey: 'sessions',
    icon: 'sessions',
    path: '/sessions',
    permission: null, // Users can manage their own sessions
  },
  {
    id: 'design',
    labelKey: 'design',
    icon: 'palette',
    path: '/design',
    permission: 'design.read',
  },
  {
    id: 'languages',
    labelKey: 'languages',
    icon: 'globe',
    path: '/languages',
    permission: 'languages.manage',
  },
  {
    id: 'feedback-admin',
    labelKey: 'feedbackAdmin',
    icon: 'message-square',
    path: '/admin/feedback',
    permission: 'feedback.manage',
  },
  {
    id: 'settings',
    labelKey: 'settings',
    icon: 'settings',
    path: '/settings',
    permission: 'settings.read',
  },
  {
    id: 'help',
    labelKey: 'help',
    icon: 'help',
    path: '/help',
    permission: null, // Public
  },
];

/**
 * Demo/Development navigation items
 * Only shown in development mode
 */
export const DEV_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'dev-demos',
    labelKey: 'demos',
    icon: 'layout',
    permission: null,
    children: [
      {
        id: 'grid-demo',
        labelKey: 'gridDemo',
        icon: 'grid',
        path: '/grid-demo',
        permission: null,
      },
      {
        id: 'responsive-demo',
        labelKey: 'responsiveDemo',
        icon: 'monitor',
        path: '/responsive-demo',
        permission: null,
      },
    ],
  },
];

/**
 * Get all navigation items including dev items in development mode
 */
export function getNavigationItems(): NavigationItem[] {
  const isDevelopment = import.meta.env.DEV;
  return isDevelopment
    ? [...NAVIGATION_ITEMS, ...DEV_NAVIGATION_ITEMS]
    : NAVIGATION_ITEMS;
}

/**
 * Filter navigation items based on user permissions
 *
 * @param items - Navigation items to filter
 * @param hasPermission - Function to check if user has a permission
 * @returns Filtered navigation items
 */
export function filterNavigationByPermission(
  items: NavigationItem[],
  hasPermission: (permission: string) => boolean
): NavigationItem[] {
  return items
    .filter((item) => {
      // Item is visible if permission is null or user has permission
      return item.permission === null || hasPermission(item.permission);
    })
    .map((item) => {
      // Filter children recursively
      if (item.children) {
        const filteredChildren = filterNavigationByPermission(
          item.children,
          hasPermission
        );
        // Only include parent if it has visible children or its own path
        if (filteredChildren.length === 0 && !item.path) {
          return null;
        }
        return {
          ...item,
          children: filteredChildren.length > 0 ? filteredChildren : undefined,
        };
      }
      return item;
    })
    .filter((item): item is NavigationItem => item !== null);
}

/**
 * Find active navigation item based on current path
 *
 * @param items - Navigation items to search
 * @param currentPath - Current route path
 * @returns Active item and its parent (if nested)
 */
export function findActiveNavigationItem(
  items: NavigationItem[],
  currentPath: string
): { item: NavigationItem | null; parent: NavigationItem | null } {
  for (const item of items) {
    // Check direct match
    if (item.path === currentPath) {
      return { item, parent: null };
    }
    // Check children
    if (item.children) {
      for (const child of item.children) {
        if (child.path === currentPath) {
          return { item: child, parent: item };
        }
      }
    }
  }
  return { item: null, parent: null };
}

/**
 * Check if a navigation item or any of its children is active
 *
 * @param item - Navigation item to check
 * @param currentPath - Current route path
 * @returns True if item or any child is active
 */
export function isNavigationItemActive(
  item: NavigationItem,
  currentPath: string
): boolean {
  if (item.path === currentPath) {
    return true;
  }
  if (item.children) {
    return item.children.some((child) => child.path === currentPath);
  }
  return false;
}

export default NAVIGATION_ITEMS;
