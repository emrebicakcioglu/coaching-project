/**
 * Permission Aggregation Service Tests
 * STORY-007B: User Role Assignment
 *
 * Unit tests for the PermissionAggregationService
 * Tests permission collection, caching, and permission checking
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PermissionAggregationService } from '../../src/users/permission-aggregation.service';
import { DatabaseService } from '../../src/database/database.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';

describe('PermissionAggregationService', () => {
  let service: PermissionAggregationService;
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
        PermissionAggregationService,
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

    service = module.get<PermissionAggregationService>(PermissionAggregationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear the cache after each test
    service.invalidateAllCache();
  });

  describe('getUserPermissions', () => {
    it('should return aggregated permissions for a user', async () => {
      const userId = 1;
      const mockPermissions = [
        { name: 'users.read' },
        { name: 'users.update' },
        { name: 'roles.read' },
      ];

      mockPool.query.mockResolvedValue({ rows: mockPermissions });

      const result = await service.getUserPermissions(userId);

      // Sort both arrays for comparison (order may vary)
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
      expect(mockPool.query).toHaveBeenCalledTimes(1); // Still 1, cache hit

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

  describe('getUserPermissionsDetailed', () => {
    it('should return detailed permission information', async () => {
      const userId = 1;
      const mockPermissions = [
        { id: 1, name: 'users.read', category: 'users' },
        { id: 2, name: 'users.update', category: 'users' },
        { id: 3, name: 'roles.read', category: 'roles' },
      ];

      mockPool.query.mockResolvedValue({ rows: mockPermissions });

      const result = await service.getUserPermissionsDetailed(userId);

      expect(result).toEqual(mockPermissions);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('category');
    });
  });

  describe('getUserPermissionsGrouped', () => {
    it('should return permissions grouped by category', async () => {
      const userId = 1;
      const mockPermissions = [
        { id: 1, name: 'users.read', category: 'users' },
        { id: 2, name: 'users.update', category: 'users' },
        { id: 3, name: 'roles.read', category: 'roles' },
        { id: 4, name: 'settings.update', category: null },
      ];

      mockPool.query.mockResolvedValue({ rows: mockPermissions });

      const result = await service.getUserPermissionsGrouped(userId);

      expect(result).toEqual({
        users: ['users.read', 'users.update'],
        roles: ['roles.read'],
        other: ['settings.update'], // null category becomes 'other'
      });
    });
  });

  describe('hasPermission', () => {
    it('should return true if user has exact permission', async () => {
      const userId = 1;
      mockPool.query.mockResolvedValue({
        rows: [{ name: 'users.read' }, { name: 'users.update' }],
      });

      const result = await service.hasPermission(userId, 'users.read');

      expect(result).toBe(true);
    });

    it('should return false if user does not have permission', async () => {
      const userId = 1;
      mockPool.query.mockResolvedValue({
        rows: [{ name: 'users.read' }],
      });

      const result = await service.hasPermission(userId, 'users.delete');

      expect(result).toBe(false);
    });

    it('should return true if user has wildcard permission', async () => {
      const userId = 1;
      mockPool.query.mockResolvedValue({
        rows: [{ name: 'users.*' }],
      });

      const result = await service.hasPermission(userId, 'users.delete');

      expect(result).toBe(true);
    });

    it('should return true if user has system.admin permission', async () => {
      const userId = 1;
      mockPool.query.mockResolvedValue({
        rows: [{ name: 'system.admin' }],
      });

      const result = await service.hasPermission(userId, 'anything.delete');

      expect(result).toBe(true);
    });

    it('should return true if user has global wildcard permission', async () => {
      const userId = 1;
      mockPool.query.mockResolvedValue({
        rows: [{ name: '*' }],
      });

      const result = await service.hasPermission(userId, 'anything.delete');

      expect(result).toBe(true);
    });
  });

  describe('hasAnyPermission', () => {
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
  });

  describe('hasAllPermissions', () => {
    it('should return true if user has all of the permissions', async () => {
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

      expect(result).toBe(true);
    });

    it('should return false if user is missing any permission', async () => {
      const userId = 1;
      mockPool.query.mockResolvedValue({
        rows: [{ name: 'users.read' }],
      });

      const result = await service.hasAllPermissions(userId, [
        'users.read',
        'users.delete',
      ]);

      expect(result).toBe(false);
    });
  });

  describe('invalidateCache', () => {
    it('should clear cache for specific user', async () => {
      const userId = 1;
      mockPool.query.mockResolvedValue({ rows: [{ name: 'users.read' }] });

      // Populate cache
      await service.getUserPermissions(userId);
      expect(mockPool.query).toHaveBeenCalledTimes(1);

      // Invalidate cache
      service.invalidateCache(userId);

      // Next call should hit database
      await service.getUserPermissions(userId);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('invalidateAllCache', () => {
    it('should clear all cached permissions', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ name: 'users.read' }] });

      // Populate cache for multiple users
      await service.getUserPermissions(1);
      await service.getUserPermissions(2);
      expect(mockPool.query).toHaveBeenCalledTimes(2);

      // Invalidate all cache
      service.invalidateAllCache();

      // Next calls should hit database
      await service.getUserPermissions(1);
      await service.getUserPermissions(2);
      expect(mockPool.query).toHaveBeenCalledTimes(4);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ name: 'users.read' }] });

      // Populate cache
      await service.getUserPermissions(1);
      await service.getUserPermissions(2);

      const stats = service.getCacheStats();

      expect(stats.size).toBe(2);
      expect(stats.entries).toHaveLength(2);
      expect(stats.entries[0]).toHaveProperty('userId');
      expect(stats.entries[0]).toHaveProperty('expiresAt');
    });
  });
});
