/**
 * Enhanced Permissions Guard Unit Tests
 * STORY-027: Permission-System Core
 *
 * Tests for the EnhancedPermissionsGuard including:
 * - OR-Check (hasAnyPermission)
 * - AND-Check (hasAllPermissions)
 * - Resource-level permissions
 * - Data-level filtering context
 */

import { EnhancedPermissionsGuard } from '../../src/permissions/guards/enhanced-permissions.guard';
import { PermissionsService } from '../../src/permissions/permissions.service';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { WinstonLoggerService } from '../../src/common/services/logger.service';

describe('EnhancedPermissionsGuard', () => {
  let guard: EnhancedPermissionsGuard;
  let mockReflector: jest.Mocked<Reflector>;
  let mockPermissionsService: Partial<jest.Mocked<PermissionsService>>;
  let mockLogger: Partial<WinstonLoggerService>;

  const createMockContext = (
    user: { id: number; email: string } | null,
    params?: Record<string, string>,
  ) => {
    const request = {
      user,
      params: params || {},
      permissions: undefined as string[] | undefined,
      dataContext: undefined,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    mockPermissionsService = {
      getUserPermissions: jest.fn().mockResolvedValue(['users.read']),
      hasPermission: jest.fn(),
      hasAnyPermission: jest.fn(),
      hasAllPermissions: jest.fn(),
      buildDataLevelContext: jest.fn(),
    };

    mockLogger = {
      debug: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    guard = new EnhancedPermissionsGuard(
      mockReflector,
      mockPermissionsService as unknown as PermissionsService,
      mockLogger as unknown as WinstonLoggerService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access when skip check is enabled', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(true) // skip_permission_check
        .mockReturnValue(null);

      const context = createMockContext({ id: 1, email: 'test@example.com' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPermissionsService.getUserPermissions).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not authenticated', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false) // skip_permission_check
        .mockReturnValueOnce(['users.read']); // anyPermissions

      const context = createMockContext(null);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should allow access when no permissions are required', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(null);

      const context = createMockContext({ id: 1, email: 'test@example.com' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('OR-check (hasAnyPermission)', () => {
    it('should allow access when user has any required permission', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false) // skip_permission_check
        .mockReturnValueOnce(['users.read', 'users.update']) // anyPermissions
        .mockReturnValueOnce(null) // allPermissions
        .mockReturnValueOnce('any') // permissionMode
        .mockReturnValueOnce(null) // resourcePermission
        .mockReturnValueOnce(null); // dataFilter

      mockPermissionsService.hasAnyPermission!.mockResolvedValue(true);

      const context = createMockContext({ id: 1, email: 'test@example.com' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPermissionsService.hasAnyPermission).toHaveBeenCalledWith(
        1,
        ['users.read', 'users.update'],
      );
    });

    it('should throw ForbiddenException when user lacks all permissions', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false) // skip_permission_check
        .mockReturnValueOnce(['users.delete']) // anyPermissions
        .mockReturnValueOnce(null) // allPermissions
        .mockReturnValueOnce('any') // permissionMode
        .mockReturnValueOnce(null) // resourcePermission
        .mockReturnValueOnce(null); // dataFilter

      mockPermissionsService.hasAnyPermission!.mockResolvedValue(false);

      const context = createMockContext({ id: 1, email: 'test@example.com' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('AND-check (hasAllPermissions)', () => {
    it('should allow access when user has all required permissions', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false) // skip_permission_check
        .mockReturnValueOnce(null) // anyPermissions
        .mockReturnValueOnce(['users.read', 'users.update']) // allPermissions
        .mockReturnValueOnce('all') // permissionMode
        .mockReturnValueOnce(null) // resourcePermission
        .mockReturnValueOnce(null); // dataFilter

      mockPermissionsService.hasAllPermissions!.mockResolvedValue({
        granted: true,
        missingPermissions: [],
      });

      const context = createMockContext({ id: 1, email: 'test@example.com' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPermissionsService.hasAllPermissions).toHaveBeenCalledWith(
        1,
        ['users.read', 'users.update'],
      );
    });

    it('should throw ForbiddenException with missing permissions', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false) // skip_permission_check
        .mockReturnValueOnce(null) // anyPermissions
        .mockReturnValueOnce(['users.read', 'users.delete']) // allPermissions
        .mockReturnValueOnce('all') // permissionMode
        .mockReturnValueOnce(null) // resourcePermission
        .mockReturnValueOnce(null); // dataFilter

      mockPermissionsService.hasAllPermissions!.mockResolvedValue({
        granted: false,
        missingPermissions: ['users.delete'],
      });

      const context = createMockContext({ id: 1, email: 'test@example.com' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('users.delete'),
        }),
      );
    });
  });

  describe('resource-level permissions', () => {
    it('should allow access with general resource permission', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false) // skip_permission_check
        .mockReturnValueOnce(null) // anyPermissions
        .mockReturnValueOnce(null) // allPermissions
        .mockReturnValueOnce(null) // permissionMode
        .mockReturnValueOnce({ resourceType: 'users', action: 'update' }) // resourcePermission
        .mockReturnValueOnce(null); // dataFilter

      mockPermissionsService.hasPermission!.mockResolvedValue({
        granted: true,
        matchedPermission: 'users.update',
        matchType: 'exact',
      });

      const context = createMockContext({ id: 1, email: 'test@example.com' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access to own resource with .own permission', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false) // skip_permission_check
        .mockReturnValueOnce(null) // anyPermissions
        .mockReturnValueOnce(null) // allPermissions
        .mockReturnValueOnce(null) // permissionMode
        .mockReturnValueOnce({ resourceType: 'users', action: 'update' }) // resourcePermission
        .mockReturnValueOnce(null); // dataFilter

      // First call: general permission - denied
      // Second call: .own permission - granted
      mockPermissionsService.hasPermission!
        .mockResolvedValueOnce({ granted: false, missingPermissions: ['users.update'] })
        .mockResolvedValueOnce({ granted: true, matchedPermission: 'users.update.own', matchType: 'exact' });

      // User ID matches resource ID
      const context = createMockContext({ id: 5, email: 'test@example.com' }, { id: '5' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPermissionsService.hasPermission).toHaveBeenCalledWith(5, 'users.update');
      expect(mockPermissionsService.hasPermission).toHaveBeenCalledWith(5, 'users.update.own');
    });

    it('should deny access to others resource with only .own permission', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false) // skip_permission_check
        .mockReturnValueOnce(null) // anyPermissions
        .mockReturnValueOnce(null) // allPermissions
        .mockReturnValueOnce(null) // permissionMode
        .mockReturnValueOnce({ resourceType: 'users', action: 'update' }) // resourcePermission
        .mockReturnValueOnce(null); // dataFilter

      // Both general and .own permissions checked but .own requires matching IDs
      mockPermissionsService.hasPermission!
        .mockResolvedValueOnce({ granted: false, missingPermissions: ['users.update'] })
        .mockResolvedValueOnce({ granted: true, matchedPermission: 'users.update.own', matchType: 'exact' });

      // User ID does NOT match resource ID
      const context = createMockContext({ id: 5, email: 'test@example.com' }, { id: '10' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('data-level filtering', () => {
    it('should set up data context when data filter is specified', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false) // skip_permission_check
        .mockReturnValueOnce(null) // anyPermissions
        .mockReturnValueOnce(null) // allPermissions
        .mockReturnValueOnce(null) // permissionMode
        .mockReturnValueOnce(null) // resourcePermission
        .mockReturnValueOnce({ resourceType: 'users', ownerColumn: 'user_id' }); // dataFilter

      mockPermissionsService.buildDataLevelContext!.mockResolvedValue({
        userId: 1,
        userRole: 'manager',
        teamIds: [1, 2],
      });

      const context = createMockContext({ id: 1, email: 'test@example.com' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPermissionsService.buildDataLevelContext).toHaveBeenCalledWith(1);

      // Verify data context was set on request
      const request = context.switchToHttp().getRequest();
      expect(request.dataContext).toEqual({
        userRole: 'manager',
        userId: 1,
        teamIds: [1, 2],
      });
    });
  });

  describe('permission loading', () => {
    it('should load user permissions into request', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false) // skip_permission_check
        .mockReturnValueOnce(['users.read']) // anyPermissions
        .mockReturnValueOnce(null) // allPermissions
        .mockReturnValueOnce('any') // permissionMode
        .mockReturnValueOnce(null) // resourcePermission
        .mockReturnValueOnce(null); // dataFilter

      mockPermissionsService.getUserPermissions!.mockResolvedValue(['users.read', 'users.update']);
      mockPermissionsService.hasAnyPermission!.mockResolvedValue(true);

      const context = createMockContext({ id: 1, email: 'test@example.com' });
      await guard.canActivate(context);

      const request = context.switchToHttp().getRequest();
      expect(request.permissions).toEqual(['users.read', 'users.update']);
    });
  });
});
