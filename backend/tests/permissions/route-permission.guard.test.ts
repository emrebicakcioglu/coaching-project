/**
 * Route Permission Guard Unit Tests
 * STORY-027B: Permission Guards & Data Filtering
 *
 * Tests for the RoutePermissionGuard including:
 * - Route-based permission checking
 * - Unauthorized (401) and Forbidden (403) responses
 * - Skip permission decorator
 * - OR-check and AND-check modes
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  RoutePermissionGuard,
  ROUTE_PERMISSIONS_KEY,
  ROUTE_PERMISSION_MODE_KEY,
  SKIP_ROUTE_PERMISSION_KEY,
} from '../../src/permissions/guards/route-permission.guard';
import { PermissionsService } from '../../src/permissions/permissions.service';
import { WinstonLoggerService } from '../../src/common/services/logger.service';

describe('RoutePermissionGuard', () => {
  let guard: RoutePermissionGuard;
  let mockReflector: Partial<Reflector>;
  let mockPermissionsService: Partial<PermissionsService>;
  let mockLogger: Partial<WinstonLoggerService>;

  const createMockExecutionContext = (user: { id?: number; email?: string } | null = null): ExecutionContext => {
    const mockRequest = {
      user,
      permissions: undefined,
      dataContext: undefined,
      permissionCheckResult: undefined,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
        getNext: () => jest.fn(),
      }),
      getHandler: () => jest.fn(),
      getClass: () => class {},
      getType: () => 'http',
      getArgs: () => [],
      getArgByIndex: () => ({}),
      switchToRpc: () => ({
        getData: () => ({}),
        getContext: () => ({}),
      }),
      switchToWs: () => ({
        getData: () => ({}),
        getClient: () => ({}),
        getPattern: () => '',
      }),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    mockPermissionsService = {
      getUserPermissions: jest.fn().mockResolvedValue(['users.read', 'users.update']),
      hasPermission: jest.fn().mockResolvedValue({
        granted: true,
        matchedPermission: 'users.read',
        matchType: 'exact',
      }),
      hasAllPermissions: jest.fn().mockResolvedValue({
        granted: true,
        missingPermissions: [],
      }),
      buildDataLevelContext: jest.fn().mockResolvedValue({
        userId: 1,
        userRole: 'user',
      }),
    };

    mockLogger = {
      debug: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutePermissionGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: PermissionsService, useValue: mockPermissionsService },
        { provide: WinstonLoggerService, useValue: mockLogger },
      ],
    }).compile();

    guard = module.get<RoutePermissionGuard>(RoutePermissionGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true when skip permission check is enabled', async () => {
      (mockReflector.getAllAndOverride as jest.Mock)
        .mockImplementation((key: string) => {
          if (key === SKIP_ROUTE_PERMISSION_KEY) return true;
          return undefined;
        });

      const context = createMockExecutionContext({ id: 1, email: 'test@test.com' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPermissionsService.getUserPermissions).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when no user in request', async () => {
      (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

      const context = createMockExecutionContext(null);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unauthorized'),
        'RoutePermissionGuard',
      );
    });

    it('should throw UnauthorizedException when user has no id', async () => {
      (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

      const context = createMockExecutionContext({ email: 'test@test.com' });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should return true when no permissions are required', async () => {
      (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

      const context = createMockExecutionContext({ id: 1, email: 'test@test.com' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPermissionsService.buildDataLevelContext).toHaveBeenCalledWith(1);
    });

    it('should return true when user has required permission (any mode)', async () => {
      (mockReflector.getAllAndOverride as jest.Mock)
        .mockImplementation((key: string) => {
          if (key === ROUTE_PERMISSIONS_KEY) return ['users.read'];
          if (key === ROUTE_PERMISSION_MODE_KEY) return 'any';
          return undefined;
        });

      const context = createMockExecutionContext({ id: 1, email: 'test@test.com' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPermissionsService.hasPermission).toHaveBeenCalledWith(1, 'users.read');
    });

    it('should throw ForbiddenException when user lacks required permission (any mode)', async () => {
      (mockReflector.getAllAndOverride as jest.Mock)
        .mockImplementation((key: string) => {
          if (key === ROUTE_PERMISSIONS_KEY) return ['users.delete'];
          if (key === ROUTE_PERMISSION_MODE_KEY) return 'any';
          return undefined;
        });

      (mockPermissionsService.hasPermission as jest.Mock).mockResolvedValue({
        granted: false,
        missingPermissions: ['users.delete'],
      });

      const context = createMockExecutionContext({ id: 1, email: 'test@test.com' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should return true when user has all required permissions (all mode)', async () => {
      (mockReflector.getAllAndOverride as jest.Mock)
        .mockImplementation((key: string) => {
          if (key === ROUTE_PERMISSIONS_KEY) return ['users.read', 'users.update'];
          if (key === ROUTE_PERMISSION_MODE_KEY) return 'all';
          return undefined;
        });

      const context = createMockExecutionContext({ id: 1, email: 'test@test.com' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPermissionsService.hasAllPermissions).toHaveBeenCalledWith(
        1,
        ['users.read', 'users.update'],
      );
    });

    it('should throw ForbiddenException when user lacks some permissions (all mode)', async () => {
      (mockReflector.getAllAndOverride as jest.Mock)
        .mockImplementation((key: string) => {
          if (key === ROUTE_PERMISSIONS_KEY) return ['users.read', 'users.delete'];
          if (key === ROUTE_PERMISSION_MODE_KEY) return 'all';
          return undefined;
        });

      (mockPermissionsService.hasAllPermissions as jest.Mock).mockResolvedValue({
        granted: false,
        missingPermissions: ['users.delete'],
      });

      const context = createMockExecutionContext({ id: 1, email: 'test@test.com' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should load user permissions into request', async () => {
      (mockReflector.getAllAndOverride as jest.Mock)
        .mockImplementation((key: string) => {
          if (key === ROUTE_PERMISSIONS_KEY) return ['users.read'];
          if (key === ROUTE_PERMISSION_MODE_KEY) return 'any';
          return undefined;
        });

      const context = createMockExecutionContext({ id: 1, email: 'test@test.com' });
      await guard.canActivate(context);

      const request = context.switchToHttp().getRequest();
      expect(request.permissions).toEqual(['users.read', 'users.update']);
    });

    it('should set data context on request', async () => {
      (mockReflector.getAllAndOverride as jest.Mock)
        .mockImplementation((key: string) => {
          if (key === ROUTE_PERMISSIONS_KEY) return ['users.read'];
          if (key === ROUTE_PERMISSION_MODE_KEY) return 'any';
          return undefined;
        });

      const context = createMockExecutionContext({ id: 1, email: 'test@test.com' });
      await guard.canActivate(context);

      const request = context.switchToHttp().getRequest();
      expect(request.dataContext).toEqual({
        userId: 1,
        userRole: 'user',
      });
    });
  });

  describe('error responses', () => {
    it('should include proper error structure for unauthorized', async () => {
      (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

      const context = createMockExecutionContext(null);

      try {
        await guard.canActivate(context);
        fail('Expected UnauthorizedException');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        const response = (error as UnauthorizedException).getResponse() as Record<string, unknown>;
        expect(response.statusCode).toBe(401);
        expect(response.error).toBe('Unauthorized');
      }
    });

    it('should include missing permissions in forbidden error', async () => {
      (mockReflector.getAllAndOverride as jest.Mock)
        .mockImplementation((key: string) => {
          if (key === ROUTE_PERMISSIONS_KEY) return ['users.delete', 'roles.delete'];
          if (key === ROUTE_PERMISSION_MODE_KEY) return 'all';
          return undefined;
        });

      (mockPermissionsService.hasAllPermissions as jest.Mock).mockResolvedValue({
        granted: false,
        missingPermissions: ['users.delete', 'roles.delete'],
      });

      const context = createMockExecutionContext({ id: 1, email: 'test@test.com' });

      try {
        await guard.canActivate(context);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        const response = (error as ForbiddenException).getResponse() as Record<string, unknown>;
        expect(response.statusCode).toBe(403);
        expect(response.error).toBe('Forbidden');
        expect(response.missingPermissions).toEqual(['users.delete', 'roles.delete']);
      }
    });
  });

  describe('permission match types', () => {
    it('should record exact match in permission check result', async () => {
      (mockReflector.getAllAndOverride as jest.Mock)
        .mockImplementation((key: string) => {
          if (key === ROUTE_PERMISSIONS_KEY) return ['users.read'];
          if (key === ROUTE_PERMISSION_MODE_KEY) return 'any';
          return undefined;
        });

      (mockPermissionsService.hasPermission as jest.Mock).mockResolvedValue({
        granted: true,
        matchedPermission: 'users.read',
        matchType: 'exact',
      });

      const context = createMockExecutionContext({ id: 1, email: 'test@test.com' });
      await guard.canActivate(context);

      const request = context.switchToHttp().getRequest();
      expect(request.permissionCheckResult).toEqual({
        granted: true,
        matchType: 'exact',
        matchedPermission: 'users.read',
      });
    });

    it('should record wildcard match in permission check result', async () => {
      (mockReflector.getAllAndOverride as jest.Mock)
        .mockImplementation((key: string) => {
          if (key === ROUTE_PERMISSIONS_KEY) return ['users.read'];
          if (key === ROUTE_PERMISSION_MODE_KEY) return 'any';
          return undefined;
        });

      (mockPermissionsService.hasPermission as jest.Mock).mockResolvedValue({
        granted: true,
        matchedPermission: 'users.*',
        matchType: 'wildcard',
      });

      const context = createMockExecutionContext({ id: 1, email: 'test@test.com' });
      await guard.canActivate(context);

      const request = context.switchToHttp().getRequest();
      expect(request.permissionCheckResult.matchType).toBe('wildcard');
    });

    it('should record admin match in permission check result', async () => {
      (mockReflector.getAllAndOverride as jest.Mock)
        .mockImplementation((key: string) => {
          if (key === ROUTE_PERMISSIONS_KEY) return ['users.read'];
          if (key === ROUTE_PERMISSION_MODE_KEY) return 'any';
          return undefined;
        });

      (mockPermissionsService.hasPermission as jest.Mock).mockResolvedValue({
        granted: true,
        matchedPermission: 'system.admin',
        matchType: 'admin',
      });

      const context = createMockExecutionContext({ id: 1, email: 'test@test.com' });
      await guard.canActivate(context);

      const request = context.switchToHttp().getRequest();
      expect(request.permissionCheckResult.matchType).toBe('admin');
    });
  });
});
