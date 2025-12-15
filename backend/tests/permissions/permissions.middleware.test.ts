/**
 * Permissions Middleware Unit Tests
 * STORY-027: Permission-System Core
 *
 * Tests for Express-style permission middleware functions:
 * - hasPermission
 * - hasAnyPermission
 * - hasAllPermissions
 * - hasResourcePermission
 */

import { Request, Response, NextFunction } from 'express';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasResourcePermission,
  createPermissionCheck,
  RequestWithPermissions,
} from '../../src/permissions/permissions.middleware';

describe('Permission Middleware', () => {
  let mockRequest: Partial<RequestWithPermissions>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      user: { id: 1, email: 'test@example.com' },
      permissions: [],
      params: {},
    };

    mockResponse = {
      status: statusMock,
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hasPermission', () => {
    it('should call next() when user has exact permission', () => {
      mockRequest.permissions = ['users.create', 'users.read'];

      const middleware = hasPermission('users.create');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should return 403 when user lacks permission', () => {
      mockRequest.permissions = ['users.read'];

      const middleware = hasPermission('users.delete');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
          statusCode: 403,
        }),
      );
    });

    it('should allow access with wildcard permission (category.*)', () => {
      mockRequest.permissions = ['users.*'];

      const middleware = hasPermission('users.delete');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow access with system.admin permission', () => {
      mockRequest.permissions = ['system.admin'];

      const middleware = hasPermission('anything.permission');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow access with global wildcard (*)', () => {
      mockRequest.permissions = ['*'];

      const middleware = hasPermission('any.permission');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle empty permissions array', () => {
      mockRequest.permissions = [];

      const middleware = hasPermission('users.read');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should handle undefined permissions', () => {
      mockRequest.permissions = undefined;

      const middleware = hasPermission('users.read');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should handle complex wildcard patterns', () => {
      mockRequest.permissions = ['users.*.read'];

      const middleware = hasPermission('users.profile.read');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should not match wildcard across different categories', () => {
      mockRequest.permissions = ['users.*'];

      const middleware = hasPermission('roles.read');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('hasAnyPermission (OR-check)', () => {
    it('should call next() when user has any of the permissions', () => {
      mockRequest.permissions = ['users.read'];

      const middleware = hasAnyPermission(['users.delete', 'users.read']);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 when user has none of the permissions', () => {
      mockRequest.permissions = ['users.read'];

      const middleware = hasAnyPermission(['users.delete', 'roles.delete']);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('or'),
        }),
      );
    });

    it('should allow access with wildcard matching any permission', () => {
      mockRequest.permissions = ['users.*'];

      const middleware = hasAnyPermission(['users.create', 'roles.create']);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should short-circuit on first match', () => {
      mockRequest.permissions = ['users.read', 'users.update'];

      const middleware = hasAnyPermission(['users.read', 'users.update']);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Should call next only once
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('hasAllPermissions (AND-check)', () => {
    it('should call next() when user has all permissions', () => {
      mockRequest.permissions = ['users.read', 'users.update', 'users.delete'];

      const middleware = hasAllPermissions(['users.read', 'users.update']);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 with missing permissions list', () => {
      mockRequest.permissions = ['users.read'];

      const middleware = hasAllPermissions(['users.read', 'users.delete', 'roles.read']);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          missingPermissions: expect.arrayContaining(['users.delete', 'roles.read']),
        }),
      );
    });

    it('should work with wildcards covering multiple permissions', () => {
      mockRequest.permissions = ['users.*'];

      const middleware = hasAllPermissions(['users.read', 'users.update', 'users.delete']);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail if wildcard does not cover all permissions', () => {
      mockRequest.permissions = ['users.*'];

      const middleware = hasAllPermissions(['users.read', 'roles.read']);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          missingPermissions: ['roles.read'],
        }),
      );
    });
  });

  describe('hasResourcePermission', () => {
    it('should allow access with general permission', () => {
      mockRequest.permissions = ['users.update'];

      const middleware = hasResourcePermission('users', 'update', () => 2);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow access to own resource with .own permission', () => {
      mockRequest.permissions = ['users.update.own'];
      mockRequest.user = { id: 5, email: 'test@example.com' };

      // Owner ID matches user ID
      const middleware = hasResourcePermission('users', 'update', () => 5);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access to other resource with only .own permission', () => {
      mockRequest.permissions = ['users.update.own'];
      mockRequest.user = { id: 5, email: 'test@example.com' };

      // Owner ID does not match user ID
      const middleware = hasResourcePermission('users', 'update', () => 10);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should handle undefined resource owner ID', () => {
      mockRequest.permissions = ['users.update.own'];
      mockRequest.user = { id: 5, email: 'test@example.com' };

      const middleware = hasResourcePermission('users', 'update', () => undefined);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('createPermissionCheck', () => {
    it('should create custom permission check middleware', () => {
      mockRequest.permissions = ['users.read', 'users.update'];

      const customCheck = (perms: string[], _req: Request) => {
        return perms.includes('users.read') && perms.includes('users.update');
      };

      const middleware = createPermissionCheck(customCheck, 'Both read and update required');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return custom error message on failure', () => {
      mockRequest.permissions = ['users.read'];

      const customCheck = (perms: string[]) => {
        return perms.includes('admin.super');
      };

      const middleware = createPermissionCheck(customCheck, 'Super admin required');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Super admin required',
        }),
      );
    });
  });

  describe('wildcard pattern matching', () => {
    const testCases = [
      { permission: 'users.*', target: 'users.create', expected: true },
      { permission: 'users.*', target: 'users.read', expected: true },
      { permission: 'users.*', target: 'roles.read', expected: false },
      { permission: 'users.*.read', target: 'users.profile.read', expected: true },
      { permission: 'users.*.read', target: 'users.settings.read', expected: true },
      { permission: 'users.*.read', target: 'users.profile.write', expected: false },
      { permission: '*.read', target: 'users.read', expected: true },
      { permission: '*.read', target: 'roles.read', expected: true },
      { permission: '*.read', target: 'users.write', expected: false },
    ];

    testCases.forEach(({ permission, target, expected }) => {
      it(`should ${expected ? 'match' : 'not match'} '${permission}' against '${target}'`, () => {
        mockRequest.permissions = [permission];

        const middleware = hasPermission(target);
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        if (expected) {
          expect(mockNext).toHaveBeenCalled();
        } else {
          expect(statusMock).toHaveBeenCalledWith(403);
        }
      });
    });
  });
});
