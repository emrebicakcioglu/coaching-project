/**
 * Permission Hierarchy Service Unit Tests
 * STORY-027B: Permission Guards & Data Filtering
 *
 * Tests for the PermissionHierarchyService including:
 * - Permission hierarchy loading
 * - Parent-child inheritance
 * - Wildcard pattern matching
 * - Inheritance chain resolution
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PermissionHierarchyService } from '../../src/permissions/services/permission-hierarchy.service';
import { DatabaseService } from '../../src/database/database.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';

describe('PermissionHierarchyService', () => {
  let service: PermissionHierarchyService;
  let mockPool: {
    query: jest.Mock;
    connect: jest.Mock;
  };
  let mockDatabaseService: Partial<DatabaseService>;
  let mockLogger: Partial<WinstonLoggerService>;

  const mockPermissionsData = [
    { id: 1, name: 'users', category: null, parent_id: null, parent_name: null },
    { id: 2, name: 'users.read', category: 'users', parent_id: null, parent_name: null },
    { id: 3, name: 'users.create', category: 'users', parent_id: null, parent_name: null },
    { id: 4, name: 'users.update', category: 'users', parent_id: null, parent_name: null },
    { id: 5, name: 'users.delete', category: 'users', parent_id: null, parent_name: null },
    { id: 6, name: 'roles', category: null, parent_id: null, parent_name: null },
    { id: 7, name: 'roles.read', category: 'roles', parent_id: null, parent_name: null },
    { id: 8, name: 'system.admin', category: 'system', parent_id: null, parent_name: null },
  ];

  beforeEach(async () => {
    mockPool = {
      query: jest.fn().mockResolvedValue({ rows: mockPermissionsData }),
      connect: jest.fn(),
    };

    mockDatabaseService = {
      getPool: jest.fn().mockReturnValue(mockPool),
    };

    mockLogger = {
      debug: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionHierarchyService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: WinstonLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<PermissionHierarchyService>(PermissionHierarchyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.invalidateCache();
  });

  describe('getHierarchy', () => {
    it('should load permission hierarchy from database', async () => {
      const hierarchy = await service.getHierarchy();

      expect(hierarchy).toBeInstanceOf(Map);
      expect(hierarchy.size).toBeGreaterThan(0);
      expect(mockPool.query).toHaveBeenCalled();
    });

    it('should cache hierarchy on subsequent calls', async () => {
      await service.getHierarchy();
      await service.getHierarchy();

      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should build implicit hierarchy from permission names', async () => {
      const hierarchy = await service.getHierarchy();

      // Should have created users.* wildcard node
      expect(hierarchy.has('users.*')).toBe(true);

      const wildcardNode = hierarchy.get('users.*');
      expect(wildcardNode?.childPermissions).toContain('users.read');
      expect(wildcardNode?.childPermissions).toContain('users.create');
    });

    it('should throw error if database pool not available', async () => {
      (mockDatabaseService.getPool as jest.Mock).mockReturnValue(null);

      await expect(service.getHierarchy()).rejects.toThrow('Database pool not available');
    });
  });

  describe('getInheritanceChain', () => {
    it('should return empty chain for unknown permission', async () => {
      const chain = await service.getInheritanceChain('unknown.permission');

      expect(chain.permission).toBe('unknown.permission');
      expect(chain.inheritsFrom).toEqual([]);
      expect(chain.grantsTo).toEqual([]);
    });

    it('should return chain for permission with implicit hierarchy', async () => {
      const chain = await service.getInheritanceChain('users.read');

      expect(chain.permission).toBe('users.read');
      // users.read inherits from users.* (implicitly)
      expect(chain.inheritsFrom).toContain('users.*');
    });

    it('should return grants for wildcard permission', async () => {
      const hierarchy = await service.getHierarchy();

      // First verify the structure
      const wildcardNode = hierarchy.get('users.*');
      expect(wildcardNode?.childPermissions.length).toBeGreaterThan(0);

      const chain = await service.getInheritanceChain('users.*');

      expect(chain.permission).toBe('users.*');
      expect(chain.grantsTo).toContain('users.read');
      expect(chain.grantsTo).toContain('users.create');
    });
  });

  describe('inheritsFrom', () => {
    it('should return true if permission inherits from parent', async () => {
      const result = await service.inheritsFrom('users.read', 'users.*');

      expect(result).toBe(true);
    });

    it('should return false if permission does not inherit', async () => {
      const result = await service.inheritsFrom('users.read', 'roles.*');

      expect(result).toBe(false);
    });
  });

  describe('grantsAccessTo', () => {
    it('should return true for same permission', async () => {
      const result = await service.grantsAccessTo('users.read', 'users.read');

      expect(result).toBe(true);
    });

    it('should return true for system.admin', async () => {
      const result = await service.grantsAccessTo('system.admin', 'anything.random');

      expect(result).toBe(true);
    });

    it('should return true for global wildcard', async () => {
      const result = await service.grantsAccessTo('*', 'anything.random');

      expect(result).toBe(true);
    });

    it('should return true for category wildcard', async () => {
      const result = await service.grantsAccessTo('users.*', 'users.read');

      expect(result).toBe(true);
    });

    it('should return false for non-matching wildcard', async () => {
      const result = await service.grantsAccessTo('users.*', 'roles.read');

      expect(result).toBe(false);
    });

    it('should return true based on hierarchy', async () => {
      // users.* should grant access to users.read via hierarchy
      const result = await service.grantsAccessTo('users.*', 'users.read');

      expect(result).toBe(true);
    });
  });

  describe('expandPermissions', () => {
    it('should expand permissions to include children', async () => {
      const expanded = await service.expandPermissions(['users.*']);

      expect(expanded).toContain('users.*');
      expect(expanded).toContain('users.read');
      expect(expanded).toContain('users.create');
      expect(expanded).toContain('users.update');
      expect(expanded).toContain('users.delete');
    });

    it('should return same list for leaf permissions', async () => {
      const expanded = await service.expandPermissions(['users.read']);

      expect(expanded).toContain('users.read');
      expect(expanded.length).toBe(1);
    });

    it('should handle multiple permissions', async () => {
      const expanded = await service.expandPermissions(['users.read', 'roles.read']);

      expect(expanded).toContain('users.read');
      expect(expanded).toContain('roles.read');
    });
  });

  describe('getAllRelationships', () => {
    it('should return flattened list of relationships', async () => {
      const relationships = await service.getAllRelationships();

      expect(Array.isArray(relationships)).toBe(true);
      // Should have relationships from users.* to users.read, etc.
      const usersWildcardRelationships = relationships.filter(
        r => r.parent === 'users.*',
      );
      expect(usersWildcardRelationships.length).toBeGreaterThan(0);
    });

    it('should cache relationships', async () => {
      await service.getAllRelationships();
      await service.getAllRelationships();

      // getHierarchy is called once, then cached
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('getByCategory', () => {
    it('should return permissions by category', async () => {
      const permissions = await service.getByCategory('users');

      expect(permissions.length).toBeGreaterThan(0);
      permissions.forEach(p => {
        expect(p.category === 'users' || p.name.startsWith('users.')).toBe(true);
      });
    });

    it('should return empty array for unknown category', async () => {
      const permissions = await service.getByCategory('nonexistent');

      expect(permissions).toEqual([]);
    });
  });

  describe('cache management', () => {
    it('should invalidate cache', async () => {
      await service.getHierarchy();
      expect(mockPool.query).toHaveBeenCalledTimes(1);

      service.invalidateCache();

      await service.getHierarchy();
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should return cache statistics', async () => {
      // Before loading
      let stats = service.getCacheStats();
      expect(stats.isCached).toBe(false);
      expect(stats.size).toBe(0);

      // After loading
      await service.getHierarchy();
      stats = service.getCacheStats();
      expect(stats.isCached).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('wildcard matching', () => {
    it('should match trailing wildcard pattern', async () => {
      const result = await service.grantsAccessTo('users.*', 'users.read');
      expect(result).toBe(true);
    });

    it('should match multi-segment trailing wildcard', async () => {
      const result = await service.grantsAccessTo('users.*', 'users.profile.read');
      expect(result).toBe(true);
    });

    it('should match middle wildcard pattern', async () => {
      const result = await service.grantsAccessTo('users.*.read', 'users.profile.read');
      expect(result).toBe(true);
    });

    it('should not match different prefix', async () => {
      const result = await service.grantsAccessTo('users.*', 'roles.read');
      expect(result).toBe(false);
    });
  });
});
