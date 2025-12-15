/**
 * Data Filter Service Unit Tests
 * STORY-027B: Permission Guards & Data Filtering
 *
 * Tests for the DataFilterService including:
 * - Admin filter (full access)
 * - Manager filter (team-based access)
 * - User filter (own data only)
 * - Query building with filters
 * - Resource access checking
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DataFilterService } from '../../src/permissions/services/data-filter.service';
import { DatabaseService } from '../../src/database/database.service';
import { PermissionsService } from '../../src/permissions/permissions.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';

describe('DataFilterService', () => {
  let service: DataFilterService;
  let mockPool: {
    query: jest.Mock;
    connect: jest.Mock;
  };
  let mockDatabaseService: Partial<DatabaseService>;
  let mockPermissionsService: Partial<PermissionsService>;
  let mockLogger: Partial<WinstonLoggerService>;

  beforeEach(async () => {
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
    };

    mockDatabaseService = {
      getPool: jest.fn().mockReturnValue(mockPool),
    };

    mockPermissionsService = {
      buildDataLevelContext: jest.fn(),
      getDataScope: jest.fn(),
    };

    mockLogger = {
      debug: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataFilterService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: PermissionsService, useValue: mockPermissionsService },
        { provide: WinstonLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<DataFilterService>(DataFilterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('applyFilter', () => {
    it('should build filter from user context', async () => {
      (mockPermissionsService.buildDataLevelContext as jest.Mock).mockResolvedValue({
        userId: 5,
        userRole: 'user',
      });

      const result = await service.applyFilter(5);

      expect(result.scopeType).toBe('own');
      expect(result.params).toContain(5);
      expect(mockPermissionsService.buildDataLevelContext).toHaveBeenCalledWith(5);
    });

    it('should use custom owner column', async () => {
      (mockPermissionsService.buildDataLevelContext as jest.Mock).mockResolvedValue({
        userId: 5,
        userRole: 'user',
      });

      const result = await service.applyFilter(5, { ownerColumn: 'created_by' });

      expect(result.whereClause).toContain('created_by');
    });

    it('should use table prefix when provided', async () => {
      (mockPermissionsService.buildDataLevelContext as jest.Mock).mockResolvedValue({
        userId: 5,
        userRole: 'user',
      });

      const result = await service.applyFilter(5, { table: 'u' });

      expect(result.whereClause).toContain('u.');
    });
  });

  describe('buildFilterFromContext - Admin', () => {
    it('should return full access filter for admin', () => {
      const context = {
        userId: 1,
        userRole: 'admin' as const,
      };

      const result = service.buildFilterFromContext(context);

      expect(result.whereClause).toBe('1=1');
      expect(result.params).toEqual([]);
      expect(result.scopeType).toBe('all');
      expect(result.description).toContain('Admin');
    });
  });

  describe('buildFilterFromContext - Manager', () => {
    it('should return team-scoped filter for manager with teams', () => {
      const context = {
        userId: 2,
        userRole: 'manager' as const,
        teamIds: [10, 20, 30],
      };

      const result = service.buildFilterFromContext(context);

      expect(result.whereClause).toContain('team_members');
      expect(result.whereClause).toContain('team_id IN');
      expect(result.params).toContain(10);
      expect(result.params).toContain(20);
      expect(result.params).toContain(30);
      expect(result.scopeType).toBe('team');
    });

    it('should include own data in manager filter by default', () => {
      const context = {
        userId: 2,
        userRole: 'manager' as const,
        teamIds: [10],
      };

      const result = service.buildFilterFromContext(context, { includeOwnInTeamScope: true });

      expect(result.params).toContain(2); // userId
      expect(result.description).toContain('own data');
    });

    it('should exclude own data when configured', () => {
      const context = {
        userId: 2,
        userRole: 'manager' as const,
        teamIds: [10],
      };

      const result = service.buildFilterFromContext(context, { includeOwnInTeamScope: false });

      expect(result.params).not.toContain(2);
    });

    it('should return own-data filter for manager without teams', () => {
      const context = {
        userId: 2,
        userRole: 'manager' as const,
      };

      const result = service.buildFilterFromContext(context);

      expect(result.whereClause).toContain('user_id = $1');
      expect(result.params).toEqual([2]);
      expect(result.scopeType).toBe('own');
      expect(result.description).toContain('no team');
    });
  });

  describe('buildFilterFromContext - User', () => {
    it('should return own-data filter for regular user', () => {
      const context = {
        userId: 5,
        userRole: 'user' as const,
      };

      const result = service.buildFilterFromContext(context);

      expect(result.whereClause).toContain('user_id = $1');
      expect(result.params).toEqual([5]);
      expect(result.scopeType).toBe('own');
      expect(result.description).toContain('User');
    });

    it('should use custom owner column', () => {
      const context = {
        userId: 5,
        userRole: 'user' as const,
      };

      const result = service.buildFilterFromContext(context, { ownerColumn: 'author_id' });

      expect(result.whereClause).toContain('author_id = $1');
    });
  });

  describe('getScope', () => {
    it('should return extended scope for admin', async () => {
      (mockPermissionsService.buildDataLevelContext as jest.Mock).mockResolvedValue({
        userId: 1,
        userRole: 'admin',
      });

      (mockPermissionsService.getDataScope as jest.Mock).mockReturnValue({
        condition: '1=1',
        params: [],
        description: 'Admin: full access',
      });

      const scope = await service.getScope(1);

      expect(scope.type).toBe('all');
      expect(scope.userId).toBe(1);
    });

    it('should return extended scope for manager with teams', async () => {
      (mockPermissionsService.buildDataLevelContext as jest.Mock).mockResolvedValue({
        userId: 2,
        userRole: 'manager',
        teamIds: [10, 20],
      });

      (mockPermissionsService.getDataScope as jest.Mock).mockReturnValue({
        condition: 'user_id IN (...)',
        params: [10, 20, 2],
        description: 'Manager: team access',
      });

      const scope = await service.getScope(2);

      expect(scope.type).toBe('team');
      expect(scope.teamIds).toEqual([10, 20]);
    });

    it('should return extended scope for user', async () => {
      (mockPermissionsService.buildDataLevelContext as jest.Mock).mockResolvedValue({
        userId: 5,
        userRole: 'user',
      });

      (mockPermissionsService.getDataScope as jest.Mock).mockReturnValue({
        condition: 'user_id = $1',
        params: [5],
        description: 'User: own data',
      });

      const scope = await service.getScope(5);

      expect(scope.type).toBe('own');
      expect(scope.userId).toBe(5);
    });
  });

  describe('canAccessResource', () => {
    it('should return true for admin', async () => {
      (mockPermissionsService.buildDataLevelContext as jest.Mock).mockResolvedValue({
        userId: 1,
        userRole: 'admin',
      });

      const result = await service.canAccessResource(1, 99); // Admin accessing resource owned by user 99

      expect(result).toBe(true);
    });

    it('should return true for own resource', async () => {
      (mockPermissionsService.buildDataLevelContext as jest.Mock).mockResolvedValue({
        userId: 5,
        userRole: 'user',
      });

      const result = await service.canAccessResource(5, 5); // User accessing own resource

      expect(result).toBe(true);
    });

    it('should return false for other user resource', async () => {
      (mockPermissionsService.buildDataLevelContext as jest.Mock).mockResolvedValue({
        userId: 5,
        userRole: 'user',
      });

      const result = await service.canAccessResource(5, 99); // User accessing another user's resource

      expect(result).toBe(false);
    });

    it('should return true for manager accessing team resource', async () => {
      (mockPermissionsService.buildDataLevelContext as jest.Mock).mockResolvedValue({
        userId: 2,
        userRole: 'manager',
        teamIds: [10],
      });

      const result = await service.canAccessResource(2, 99, 10); // Manager accessing team 10 resource

      expect(result).toBe(true);
    });

    it('should check team membership for manager without explicit team ID', async () => {
      (mockPermissionsService.buildDataLevelContext as jest.Mock).mockResolvedValue({
        userId: 2,
        userRole: 'manager',
        teamIds: [10],
      });

      mockPool.query.mockResolvedValue({ rows: [{ count: '1' }] });

      const result = await service.canAccessResource(2, 99); // Manager accessing resource, need to check if 99 is in team

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalled();
    });
  });

  describe('buildFilteredQuery', () => {
    it('should return unmodified query for admin', async () => {
      (mockPermissionsService.buildDataLevelContext as jest.Mock).mockResolvedValue({
        userId: 1,
        userRole: 'admin',
      });

      const baseQuery = 'SELECT * FROM users WHERE status = $1';
      const baseParams = ['active'];

      const result = await service.buildFilteredQuery(baseQuery, baseParams, 1);

      expect(result.query).toBe(baseQuery);
      expect(result.params).toEqual(baseParams);
    });

    it('should add filter to query without WHERE for user', async () => {
      (mockPermissionsService.buildDataLevelContext as jest.Mock).mockResolvedValue({
        userId: 5,
        userRole: 'user',
      });

      const baseQuery = 'SELECT * FROM users';
      const baseParams: unknown[] = [];

      const result = await service.buildFilteredQuery(baseQuery, baseParams, 5);

      expect(result.query).toContain('WHERE');
      expect(result.query).toContain('user_id = $1');
      expect(result.params).toContain(5);
    });

    it('should add filter to query with existing WHERE', async () => {
      (mockPermissionsService.buildDataLevelContext as jest.Mock).mockResolvedValue({
        userId: 5,
        userRole: 'user',
      });

      const baseQuery = 'SELECT * FROM users WHERE status = $1';
      const baseParams = ['active'];

      const result = await service.buildFilteredQuery(baseQuery, baseParams, 5);

      expect(result.query).toContain('AND');
      expect(result.query).toContain('user_id = $2');
      expect(result.params).toEqual(['active', 5]);
    });
  });

  describe('getTeamMemberIds', () => {
    it('should return only self for non-manager', async () => {
      (mockPermissionsService.buildDataLevelContext as jest.Mock).mockResolvedValue({
        userId: 5,
        userRole: 'user',
      });

      const result = await service.getTeamMemberIds(5);

      expect(result).toEqual([5]);
    });

    it('should return team members for manager', async () => {
      (mockPermissionsService.buildDataLevelContext as jest.Mock).mockResolvedValue({
        userId: 2,
        userRole: 'manager',
        teamIds: [10],
      });

      mockPool.query.mockResolvedValue({
        rows: [{ user_id: 3 }, { user_id: 4 }, { user_id: 5 }],
      });

      const result = await service.getTeamMemberIds(2);

      expect(result).toContain(2); // Manager included
      expect(result).toContain(3);
      expect(result).toContain(4);
      expect(result).toContain(5);
    });

    it('should handle database errors gracefully', async () => {
      (mockPermissionsService.buildDataLevelContext as jest.Mock).mockResolvedValue({
        userId: 2,
        userRole: 'manager',
        teamIds: [10],
      });

      mockPool.query.mockRejectedValue(new Error('Table not found'));

      const result = await service.getTeamMemberIds(2);

      expect(result).toEqual([2]); // Falls back to self
    });
  });
});
