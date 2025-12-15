/**
 * Navigation Configuration Tests
 * STORY-016A: Context Menu Core Navigation
 *
 * Unit tests for navigation configuration and utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  NAVIGATION_ITEMS,
  DEV_NAVIGATION_ITEMS,
  getNavigationItems,
  filterNavigationByPermission,
  findActiveNavigationItem,
  isNavigationItemActive,
  NavigationItem,
} from './navigation';

describe('Navigation Configuration', () => {
  describe('NAVIGATION_ITEMS', () => {
    it('contains required menu items', () => {
      const itemIds = NAVIGATION_ITEMS.map((item) => item.id);

      expect(itemIds).toContain('dashboard');
      expect(itemIds).toContain('users');
      expect(itemIds).toContain('roles');
      expect(itemIds).toContain('settings');
      expect(itemIds).toContain('help');
    });

    it('dashboard has no permission requirement', () => {
      const dashboard = NAVIGATION_ITEMS.find((item) => item.id === 'dashboard');
      expect(dashboard?.permission).toBeNull();
    });

    it('help has no permission requirement (public)', () => {
      const help = NAVIGATION_ITEMS.find((item) => item.id === 'help');
      expect(help?.permission).toBeNull();
    });

    it('users requires users.read permission', () => {
      const users = NAVIGATION_ITEMS.find((item) => item.id === 'users');
      expect(users?.permission).toBe('users.read');
    });

    it('roles requires roles.read permission', () => {
      const roles = NAVIGATION_ITEMS.find((item) => item.id === 'roles');
      expect(roles?.permission).toBe('roles.read');
    });

    it('settings requires settings.read permission', () => {
      const settings = NAVIGATION_ITEMS.find((item) => item.id === 'settings');
      expect(settings?.permission).toBe('settings.read');
    });

    it('users has children for sub-navigation', () => {
      const users = NAVIGATION_ITEMS.find((item) => item.id === 'users');
      expect(users?.children).toBeDefined();
      expect(users?.children?.length).toBeGreaterThan(0);
    });

    it('all items have required properties', () => {
      const validateItem = (item: NavigationItem) => {
        expect(item.id).toBeDefined();
        expect(item.label).toBeDefined();
        expect(item.icon).toBeDefined();
        // path or children should be defined
        expect(item.path || item.children).toBeDefined();

        if (item.children) {
          item.children.forEach(validateItem);
        }
      };

      NAVIGATION_ITEMS.forEach(validateItem);
    });
  });

  describe('DEV_NAVIGATION_ITEMS', () => {
    it('contains demo items', () => {
      const itemIds = DEV_NAVIGATION_ITEMS.map((item) => item.id);
      expect(itemIds).toContain('dev-demos');
    });

    it('demo items are public (null permission)', () => {
      DEV_NAVIGATION_ITEMS.forEach((item) => {
        expect(item.permission).toBeNull();
        if (item.children) {
          item.children.forEach((child) => {
            expect(child.permission).toBeNull();
          });
        }
      });
    });
  });

  describe('getNavigationItems', () => {
    const originalEnv = import.meta.env.DEV;

    afterEach(() => {
      // Restore original env
      vi.unstubAllEnvs();
    });

    it('includes dev items in development mode', () => {
      vi.stubEnv('DEV', true);
      const items = getNavigationItems();
      const itemIds = items.map((item) => item.id);
      expect(itemIds).toContain('dev-demos');
    });
  });

  describe('filterNavigationByPermission', () => {
    const hasAllPermissions = () => true;
    const hasNoPermissions = (p: string) => p === null || p === '';
    const hasUsersPermission = (p: string) =>
      p === null || p === '' || p.startsWith('users.');

    it('returns all items when user has all permissions', () => {
      const filtered = filterNavigationByPermission(
        NAVIGATION_ITEMS,
        hasAllPermissions
      );
      expect(filtered.length).toBe(NAVIGATION_ITEMS.length);
    });

    it('filters out items user does not have permission for', () => {
      const filtered = filterNavigationByPermission(
        NAVIGATION_ITEMS,
        hasNoPermissions
      );

      const filteredIds = filtered.map((item) => item.id);
      expect(filteredIds).toContain('dashboard'); // null permission
      expect(filteredIds).toContain('help'); // null permission
      expect(filteredIds).not.toContain('users');
      expect(filteredIds).not.toContain('roles');
      expect(filteredIds).not.toContain('settings');
    });

    it('filters children based on permissions', () => {
      const filtered = filterNavigationByPermission(
        NAVIGATION_ITEMS,
        hasUsersPermission
      );

      const users = filtered.find((item) => item.id === 'users');
      expect(users).toBeDefined();
      expect(users?.children).toBeDefined();
      expect(users?.children?.length).toBeGreaterThan(0);
    });

    it('removes parent if all children are filtered out and no path', () => {
      const items: NavigationItem[] = [
        {
          id: 'parent',
          label: 'Parent',
          icon: 'home',
          permission: null,
          children: [
            {
              id: 'child',
              label: 'Child',
              icon: 'list',
              path: '/child',
              permission: 'admin.only',
            },
          ],
        },
      ];

      const filtered = filterNavigationByPermission(items, hasNoPermissions);
      expect(filtered.length).toBe(0);
    });

    it('keeps parent with path even if children are filtered', () => {
      const items: NavigationItem[] = [
        {
          id: 'parent',
          label: 'Parent',
          icon: 'home',
          path: '/parent',
          permission: null,
          children: [
            {
              id: 'child',
              label: 'Child',
              icon: 'list',
              path: '/child',
              permission: 'admin.only',
            },
          ],
        },
      ];

      const filtered = filterNavigationByPermission(items, hasNoPermissions);
      expect(filtered.length).toBe(1);
      expect(filtered[0].children).toBeUndefined();
    });
  });

  describe('findActiveNavigationItem', () => {
    it('finds top-level active item', () => {
      const result = findActiveNavigationItem(NAVIGATION_ITEMS, '/dashboard');
      expect(result.item?.id).toBe('dashboard');
      expect(result.parent).toBeNull();
    });

    it('finds nested active item with parent', () => {
      const result = findActiveNavigationItem(NAVIGATION_ITEMS, '/users');
      expect(result.item?.id).toBe('users-list');
      expect(result.parent?.id).toBe('users');
    });

    it('returns null for non-existent path', () => {
      const result = findActiveNavigationItem(NAVIGATION_ITEMS, '/non-existent');
      expect(result.item).toBeNull();
      expect(result.parent).toBeNull();
    });
  });

  describe('isNavigationItemActive', () => {
    it('returns true for direct path match', () => {
      const dashboard = NAVIGATION_ITEMS.find((item) => item.id === 'dashboard')!;
      expect(isNavigationItemActive(dashboard, '/dashboard')).toBe(true);
    });

    it('returns false for non-matching path', () => {
      const dashboard = NAVIGATION_ITEMS.find((item) => item.id === 'dashboard')!;
      expect(isNavigationItemActive(dashboard, '/users')).toBe(false);
    });

    it('returns true if any child matches', () => {
      const users = NAVIGATION_ITEMS.find((item) => item.id === 'users')!;
      expect(isNavigationItemActive(users, '/users')).toBe(true);
    });

    it('returns true for nested child path', () => {
      const users = NAVIGATION_ITEMS.find((item) => item.id === 'users')!;
      // Both "All Users" and "Create User" children point to /users (creation via modal)
      expect(isNavigationItemActive(users, '/users')).toBe(true);
    });

    it('returns false if no match in parent or children', () => {
      const users = NAVIGATION_ITEMS.find((item) => item.id === 'users')!;
      expect(isNavigationItemActive(users, '/roles')).toBe(false);
    });
  });
});
