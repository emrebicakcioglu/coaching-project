/**
 * Permissions Service Unit Tests
 * STORY-027: Permission-System Core
 *
 * Tests for the PermissionsService including:
 * - Permission check logic with various permission strings
 * - Wildcard pattern matching
 * - OR-Check with multiple permissions
 * - AND-Check with multiple permissions
 * - Permission hierarchy resolution
 * - Data-level filtering
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsService } from '../../src/permissions/permissions.service';
import { DatabaseService } from '../../src/database/database.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let mockPool: {
    query: jest.Mock;
    connect: jest.Mock;
  };
  let mockDatabaseService: Partial<DatabaseService>;
  let mockLogger: Partial<WinstonLoggerService>;

  beforeEach(async () => {
    // Create mock pool
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
    };

    // Create mock database service
    mockDatabaseService = {
      getPool: jest.fn().mockReturnValue(mockPool),
    };

    // Create mock logger
    mockLogger = {
      debug: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: WinstonLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear the cache after each test
    service.invalidateAllCaches();
  });

  describe('getUserPermissions', () => {
    it('should return permissions for a user', async () => {
      const userId = 1;
      const mockPermissions = [
        { name: 'users.read' },
        { name: 'users.update' },
        { name: 'roles.read' },
      ];

      mockPool.query.mockResolvedValue({ rows: mockPermissions });

      const result = await service.getUserPermissions(userId);

      expect(result.sort()).toEqual(['roles.read', 'users.read', 'users.update'].sort());
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT DISTINCT p.name'),
        [userId],
      );
    });

    it('should return empty array if user has no permissions', async () => {
      const userId = 2;
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.getUserPermissions(userId);

      expect(result).toEqual([]);
    });

    it('should use cache on subsequent calls', async () => {
      const userId = 1;
      const mockPermissions = [{ name: 'users.read' }];

      mockPool.query.mockResolvedValue({ rows: mockPermissions });

      // First call - hits database
      await service.getUserPermissions(userId);
      expect(mockPool.query).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await service.getUserPermissions(userId);
      expect(mockPool.query).toHaveBeenCalledTimes(1);

      // Third call with useCache=false - should hit database
      await service.getUserPermissions(userId, false);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should throw error if database pool is not available', async () => {
      (mockDatabaseService.getPool as jest.Mock).mockReturnValue(null);

      await expect(service.getUserPermissions(1)).rejects.toThrow(
        'Database pool not available',
      );
    });
  });

  describe('hasPermission', () => {
    it('should return granted=true with exact match', async () => {
      const userId = 1;
      mockPool.query.mockResolvedValue({
        rows: [{ name: 'users.read' }, { name: 'users.update' }],
      });

      const result = await service.hasPermission(userId, 'users.read');

      expect(result.granted).toBe(true);
      expect(result.matchedPermission).toBe('users.read');
      expect(result.matchType).toBe('exact');
    });

    it('should return granted=false if user lacks permission', async () => {
      const userId = 1;
      mockPool.query.mockResolvedValue({
        rows: [{ name: 'users.read' }],
      });

      const result = await service.hasPermission(userId, 'users.delete');

      expect(result.granted).toBe(false);
      expect(result.missingPermissions).toEqual(['users.delete']);
    });

    describe('wildcard support', () => {
      it('should match category.* wildcard', async () => {
        const userId = 1;
        mockPool.query.mockResolvedValue({
          rows: [{ name: 'users.*' }],
        });

        const result = await service.hasPermission(userId, 'users.delete');

        expect(result.granted).toBe(true);
        expect(result.matchedPermission).toBe('users.*');
        expect(result.matchType).toBe('wildcard');
      });

      it('should match complex wildcard patterns', async () => {
        const userId = 1;
        mockPool.query.mockResolvedValue({
          rows: [{ name: 'users.*.read' }],
        });

        const result = await service.hasPermission(userId, 'users.profile.read');

        expect(result.granted).toBe(true);
        expect(result.matchType).toBe('wildcard');
      });

      it('should not match wildcard when category differs', async () => {
        const userId = 1;
        mockPool.query.mockResolvedValue({
          rows: [{ name: 'users.*' }],
        });

        const result = await service.hasPermission(userId, 'roles.read');

        expect(result.granted).toBe(false);
      });
    });

    describe('system.admin permission', () => {
      it('should grant access to any permission', async () => {
        const userId = 1;
        mockPool.query.mockResolvedValue({
          rows: [{ name: 'system.admin' }],
        });

        const result = await service.hasPermission(userId, 'anything.delete');

        expect(result.granted).toBe(true);
        expect(result.matchedPermission).toBe('system.admin');
        expect(result.matchType).toBe('admin');
      });

      it('should grant access with global wildcard', async () => {
        const userId = 1;
        mockPool.query.mockResolvedValue({
          rows: [{ name: '*' }],
        });

        const result = await service.hasPermission(userId, 'anything.delete');

        expect(result.granted).toBe(true);
        expect(result.matchedPermission).toBe('*');
        expect(result.matchType).toBe('admin');
      });
    });
  });

  describe('hasAnyPermission (OR-check)', () => {
    it('should return true if user has any of the permissions', async () => {
      const userId = 1;
      mockPool.query.mockResolvedValue({
        rows: [{ name: 'users.read' }],
      });

      const result = await service.hasAnyPermission(userId, [
        'users.delete',
        'users.read',
        'roles.read',
      ]);

      expect(result).toBe(true);
    });

    it('should return false if user has none of the permissions', async () => {
      const userId = 1;
      mockPool.query.mockResolvedValue({
        rows: [{ name: 'users.read' }],
      });

      const result = await service.hasAnyPermission(userId, [
        'users.delete',
        'roles.delete',
      ]);

      expect(result).toBe(false);
    });

    it('should return true for empty permission list', async () => {
      const userId = 1;
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.hasAnyPermission(userId, []);

      expect(result).toBe(true);
    });

    it('should use short-circuit evaluation (stop on first match)', async () => {
      const userId = 1;
      mockPool.query.mockResolvedValue({
        rows: [{ name: 'users.read' }],
      });

      // First permission matches, second should not be checked
      const result = await service.hasAnyPermission(userId, [
        'users.read',
        'nonexistent.permission',
      ]);

      expect(result).toBe(true);
    });
  });

  describe('hasAllPermissions (AND-check)', () => {
    it('should return granted=true if user has all permissions', async () => {
      const userId = 1;
      mockPool.query.mockResolvedValue({
        rows: [
          { name: 'users.read' },
          { name: 'users.update' },
          { name: 'roles.read' },
        ],
      });

      const result = await service.hasAllPermissions(userId, [
        'users.read',
        'users.update',
      ]);

      expect(result.granted).toBe(true);
      expect(result.missingPermissions).toEqual([]);
    });

    it('should return granted=false with missing permissions list', async () => {
      const userId = 1;
      mockPool.query.mockResolvedValue({
        rows: [{ name: 'users.read' }],
      });

      const result = await service.hasAllPermissions(userId, [
        'users.read',
        'users.delete',
        'roles.delete',
      ]);

      expect(result.granted).toBe(false);
      expect(result.missingPermissions).toContain('users.delete');
      expect(result.missingPermissions).toContain('roles.delete');
    });

    it('should return granted=true for empty permission list', async () => {
      const userId = 1;
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.hasAllPermissions(userId, []);

      expect(result.granted).toBe(true);
    });

    it('should work with wildcards', async () => {
      const userId = 1;
      mockPool.query.mockResolvedValue({
        rows: [{ name: 'users.*' }],
      });

      const result = await service.hasAllPermissions(userId, [
        'users.read',
        'users.update',
        'users.delete',
      ]);

      expect(result.granted).toBe(true);
    });
  });

  describe('data-level filtering', () => {
    describe('getDataScope', () => {
      it('should return full access for admin', () => {
        const context = {
          userId: 1,
          userRole: 'admin' as const,
        };

        const scope = service.getDataScope(context);

        expect(scope.condition).toBe('1=1');
        expect(scope.params).toEqual([]);
        expect(scope.description).toContain('Admin');
      });

      it('should return team-scoped access for manager with teams', () => {
        const context = {
          userId: 2,
          userRole: 'manager' as const,
          teamIds: [1, 2, 3],
        };

        const scope = service.getDataScope(context, 'u', 'id');

        expect(scope.condition).toContain('team_id IN');
        expect(scope.params).toContain(1);
        expect(scope.params).toContain(2);
        expect(scope.params).toContain(3);
        expect(scope.params).toContain(2); // userId included
        expect(scope.description).toContain('Manager');
      });

      it('should return own-data access for manager without teams', () => {
        const context = {
          userId: 2,
          userRole: 'manager' as const,
        };

        const scope = service.getDataScope(context);

        expect(scope.condition).toContain('user_id = $1');
        expect(scope.params).toEqual([2]);
        expect(scope.description).toContain('no team');
      });

      it('should return own-data access for user', () => {
        const context = {
          userId: 5,
          userRole: 'user' as const,
        };

        const scope = service.getDataScope(context, '', 'owner_id');

        expect(scope.condition).toBe('owner_id = $1');
        expect(scope.params).toEqual([5]);
        expect(scope.description).toContain('User');
      });
    });

    describe('getUserRoleLevel', () => {
      it('should return admin for admin role', async () => {
        mockPool.query.mockResolvedValue({
          rows: [{ name: 'admin' }],
        });

        const result = await service.getUserRoleLevel(1);

        expect(result).toBe('admin');
      });

      it('should return manager for manager role', async () => {
        mockPool.query.mockResolvedValue({
          rows: [{ name: 'manager' }],
        });

        const result = await service.getUserRoleLevel(2);

        expect(result).toBe('manager');
      });

      it('should return user for regular role', async () => {
        mockPool.query.mockResolvedValue({
          rows: [{ name: 'viewer' }],
        });

        const result = await service.getUserRoleLevel(3);

        expect(result).toBe('user');
      });

      it('should return user when no roles found', async () => {
        mockPool.query.mockResolvedValue({ rows: [] });

        const result = await service.getUserRoleLevel(4);

        expect(result).toBe('user');
      });
    });

    describe('buildDataLevelContext', () => {
      it('should build context for admin user', async () => {
        mockPool.query
          .mockResolvedValueOnce({ rows: [{ name: 'admin' }] }) // getUserRoleLevel
          .mockResolvedValue({ rows: [] }); // getManagerTeamIds (not called for admin)

        const context = await service.buildDataLevelContext(1);

        expect(context.userId).toBe(1);
        expect(context.userRole).toBe('admin');
        expect(context.teamIds).toBeUndefined();
      });

      it('should build context for manager with teams', async () => {
        mockPool.query
          .mockResolvedValueOnce({ rows: [{ name: 'manager' }] }) // getUserRoleLevel
          .mockResolvedValueOnce({ rows: [{ team_id: 1 }, { team_id: 2 }] }); // getManagerTeamIds

        const context = await service.buildDataLevelContext(2);

        expect(context.userId).toBe(2);
        expect(context.userRole).toBe('manager');
        expect(context.teamIds).toEqual([1, 2]);
      });
    });
  });

  describe('cache management', () => {
    it('should invalidate user cache', async () => {
      const userId = 1;
      mockPool.query.mockResolvedValue({ rows: [{ name: 'users.read' }] });

      // Populate cache
      await service.getUserPermissions(userId);
      expect(mockPool.query).toHaveBeenCalledTimes(1);

      // Invalidate cache
      service.invalidateUserCache(userId);

      // Next call should hit database
      await service.getUserPermissions(userId);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should invalidate all caches', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ name: 'users.read' }] });

      // Populate cache for multiple users
      await service.getUserPermissions(1);
      await service.getUserPermissions(2);
      expect(mockPool.query).toHaveBeenCalledTimes(2);

      // Invalidate all caches
      service.invalidateAllCaches();

      // Next calls should hit database
      await service.getUserPermissions(1);
      await service.getUserPermissions(2);
      expect(mockPool.query).toHaveBeenCalledTimes(4);
    });

    it('should return cache statistics', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ name: 'users.read' }] });

      // Populate cache
      await service.getUserPermissions(1);
      await service.getUserPermissions(2);

      const stats = service.getCacheStats();

      expect(stats.userCacheSize).toBe(2);
    });
  });
});
