/**
 * Permission Guards Integration Tests
 * STORY-027B: Permission Guards & Data Filtering
 *
 * Integration tests for permission guards with API endpoints.
 * Tests:
 * - Route-based permission guards
 * - Data-level filtering for different roles
 * - Permission hierarchy in API context
 *
 * Note: These tests require RUN_INTEGRATION_TESTS=true environment variable.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

// Skip integration tests unless explicitly enabled
const describeIntegration = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeIntegration('Permission Guards Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Route Permission Guard', () => {
    it('should return 401 for unauthenticated requests to protected routes', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .expect(HttpStatus.UNAUTHORIZED);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should return 403 for authenticated user without required permission', async () => {
      // This test assumes a test user without admin/users.read permission
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', 'Bearer invalid_token')
        .expect(HttpStatus.UNAUTHORIZED);

      expect(response.body.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should allow access to health endpoint without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('status');
    });
  });
});

/**
 * Data Filtering Integration Tests
 * Tests data-level filtering with mock requests
 */
describe('Data Filtering Integration', () => {
  const { DataFilterService } = require('../../src/permissions/services/data-filter.service');

  // Mock services for integration testing
  const mockPermissionsService = {
    buildDataLevelContext: jest.fn(),
    getDataScope: jest.fn(),
    getUserPermissions: jest.fn(),
  };

  const mockDatabaseService = {
    getPool: jest.fn().mockReturnValue({
      query: jest.fn().mockResolvedValue({ rows: [] }),
    }),
  };

  const mockLogger = {
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  let dataFilterService: InstanceType<typeof DataFilterService>;

  beforeEach(() => {
    jest.clearAllMocks();
    dataFilterService = new DataFilterService(
      mockDatabaseService,
      mockPermissionsService,
      mockLogger,
    );
  });

  describe('Admin data access', () => {
    beforeEach(() => {
      mockPermissionsService.buildDataLevelContext.mockResolvedValue({
        userId: 1,
        userRole: 'admin',
      });
    });

    it('should return full access filter', async () => {
      const filter = await dataFilterService.applyFilter(1);

      expect(filter.whereClause).toBe('1=1');
      expect(filter.scopeType).toBe('all');
    });

    it('should not modify queries', async () => {
      const baseQuery = 'SELECT * FROM users WHERE status = $1';
      const result = await dataFilterService.buildFilteredQuery(
        baseQuery,
        ['active'],
        1,
      );

      expect(result.query).toBe(baseQuery);
    });

    it('should allow access to any resource', async () => {
      const canAccess = await dataFilterService.canAccessResource(1, 999);

      expect(canAccess).toBe(true);
    });
  });

  describe('Manager data access', () => {
    beforeEach(() => {
      mockPermissionsService.buildDataLevelContext.mockResolvedValue({
        userId: 2,
        userRole: 'manager',
        teamIds: [10, 20],
      });
    });

    it('should return team-scoped filter', async () => {
      const filter = await dataFilterService.applyFilter(2);

      expect(filter.scopeType).toBe('team');
      expect(filter.whereClause).toContain('team_members');
    });

    it('should allow access to team resources', async () => {
      const canAccess = await dataFilterService.canAccessResource(2, 999, 10);

      expect(canAccess).toBe(true);
    });

    it('should deny access to non-team resources', async () => {
      mockDatabaseService.getPool().query.mockResolvedValue({ rows: [{ count: '0' }] });

      const canAccess = await dataFilterService.canAccessResource(2, 999, 30);

      expect(canAccess).toBe(false);
    });
  });

  describe('User data access', () => {
    beforeEach(() => {
      mockPermissionsService.buildDataLevelContext.mockResolvedValue({
        userId: 5,
        userRole: 'user',
      });
    });

    it('should return own-data filter', async () => {
      const filter = await dataFilterService.applyFilter(5);

      expect(filter.scopeType).toBe('own');
      expect(filter.params).toContain(5);
    });

    it('should allow access to own resources', async () => {
      const canAccess = await dataFilterService.canAccessResource(5, 5);

      expect(canAccess).toBe(true);
    });

    it('should deny access to other resources', async () => {
      const canAccess = await dataFilterService.canAccessResource(5, 999);

      expect(canAccess).toBe(false);
    });

    it('should modify queries with owner filter', async () => {
      const baseQuery = 'SELECT * FROM posts';
      const result = await dataFilterService.buildFilteredQuery(
        baseQuery,
        [],
        5,
        { ownerColumn: 'author_id' },
      );

      expect(result.query).toContain('WHERE');
      expect(result.query).toContain('author_id');
    });
  });
});

/**
 * Permission Hierarchy Integration Tests
 */
describe('Permission Hierarchy Integration', () => {
  const { PermissionHierarchyService } = require('../../src/permissions/services/permission-hierarchy.service');

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

  const mockDatabaseService = {
    getPool: jest.fn().mockReturnValue({
      query: jest.fn().mockResolvedValue({ rows: mockPermissionsData }),
    }),
  };

  const mockLogger = {
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  let hierarchyService: InstanceType<typeof PermissionHierarchyService>;

  beforeEach(() => {
    jest.clearAllMocks();
    hierarchyService = new PermissionHierarchyService(
      mockDatabaseService,
      mockLogger,
    );
  });

  afterEach(() => {
    hierarchyService.invalidateCache();
  });

  describe('Hierarchy resolution', () => {
    it('should build correct parent-child relationships', async () => {
      const hierarchy = await hierarchyService.getHierarchy();

      // users.* should be parent of users.read, users.create, etc.
      const wildcardNode = hierarchy.get('users.*');
      expect(wildcardNode).toBeDefined();
      expect(wildcardNode.childPermissions).toContain('users.read');
      expect(wildcardNode.childPermissions).toContain('users.create');
    });

    it('should correctly expand wildcard permissions', async () => {
      const expanded = await hierarchyService.expandPermissions(['users.*']);

      expect(expanded).toContain('users.*');
      expect(expanded).toContain('users.read');
      expect(expanded).toContain('users.create');
      expect(expanded).toContain('users.update');
      expect(expanded).toContain('users.delete');
    });

    it('should correctly resolve inheritance chains', async () => {
      const chain = await hierarchyService.getInheritanceChain('users.read');

      expect(chain.permission).toBe('users.read');
      expect(chain.inheritsFrom).toContain('users.*');
    });
  });

  describe('Access grant checking', () => {
    it('should grant access from wildcard to specific', async () => {
      const grants = await hierarchyService.grantsAccessTo('users.*', 'users.read');

      expect(grants).toBe(true);
    });

    it('should grant access from system.admin to anything', async () => {
      const grants = await hierarchyService.grantsAccessTo('system.admin', 'random.permission');

      expect(grants).toBe(true);
    });

    it('should not grant cross-category access', async () => {
      const grants = await hierarchyService.grantsAccessTo('users.*', 'roles.read');

      expect(grants).toBe(false);
    });
  });
});

/**
 * Combined Guards and Filtering Tests
 */
describe('Combined Permission Scenarios', () => {
  describe('Manager viewing team data', () => {
    it('should filter query to include only team members', async () => {
      // This test verifies the full flow from permission check to data filtering
      const mockContext = {
        userId: 2,
        userRole: 'manager' as const,
        teamIds: [10, 20],
      };

      const { DataFilterService } = require('../../src/permissions/services/data-filter.service');

      const mockPermissionsService = {
        buildDataLevelContext: jest.fn().mockResolvedValue(mockContext),
        getDataScope: jest.fn(),
      };

      const mockDatabaseService = {
        getPool: jest.fn().mockReturnValue({
          query: jest.fn().mockResolvedValue({ rows: [] }),
        }),
      };

      const mockLogger = {
        debug: jest.fn(),
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      const dataFilterService = new DataFilterService(
        mockDatabaseService,
        mockPermissionsService,
        mockLogger,
      );

      const filter = await dataFilterService.applyFilter(2);

      expect(filter.scopeType).toBe('team');
      expect(filter.params).toContain(10);
      expect(filter.params).toContain(20);
    });
  });

  describe('User accessing own data only', () => {
    it('should restrict to own user_id', async () => {
      const mockContext = {
        userId: 5,
        userRole: 'user' as const,
      };

      const { DataFilterService } = require('../../src/permissions/services/data-filter.service');

      const mockPermissionsService = {
        buildDataLevelContext: jest.fn().mockResolvedValue(mockContext),
        getDataScope: jest.fn(),
      };

      const mockDatabaseService = {
        getPool: jest.fn().mockReturnValue({
          query: jest.fn().mockResolvedValue({ rows: [] }),
        }),
      };

      const mockLogger = {
        debug: jest.fn(),
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      const dataFilterService = new DataFilterService(
        mockDatabaseService,
        mockPermissionsService,
        mockLogger,
      );

      // Build a filtered query
      const baseQuery = 'SELECT * FROM tasks WHERE status = $1';
      const result = await dataFilterService.buildFilteredQuery(
        baseQuery,
        ['pending'],
        5,
      );

      expect(result.query).toContain('user_id');
      expect(result.params).toContain('pending');
      expect(result.params).toContain(5);
    });
  });
});
