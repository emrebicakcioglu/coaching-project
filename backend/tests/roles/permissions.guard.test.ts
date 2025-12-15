/**
 * Permissions Guard Unit Tests
 * STORY-007A: Rollen-Management Backend
 *
 * Tests for PermissionsGuard authorization logic.
 */

import { PermissionsGuard } from '../../src/common/guards/permissions.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

// Mock dependencies
const mockPool = {
  query: jest.fn(),
};

const mockDatabaseService = {
  getPool: jest.fn(() => mockPool),
};

const mockReflector = {
  getAllAndOverride: jest.fn(),
};

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;

  const createMockContext = (user: { id: number; email: string } | null) => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    guard = new PermissionsGuard(
      mockReflector as unknown as Reflector,
      mockDatabaseService as any,
    );
  });

  describe('canActivate', () => {
    it('should allow access when no permissions are required', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(null);
      const context = createMockContext({ id: 1, email: 'test@example.com' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when required permissions are empty', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([]);
      const context = createMockContext({ id: 1, email: 'test@example.com' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user is not authenticated', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['users.read']);
      const context = createMockContext(null);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should allow access when user has exact permission', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['users.read']);
      const context = createMockContext({ id: 1, email: 'test@example.com' });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ permission_id: 1, permission_name: 'users.read', category: 'users' }],
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has wildcard permission', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['users.create']);
      const context = createMockContext({ id: 1, email: 'test@example.com' });

      // User has users.* permission
      mockPool.query.mockResolvedValueOnce({
        rows: [{ permission_id: 1, permission_name: 'users.*', category: 'users' }],
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has system.admin permission', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['any.permission']);
      const context = createMockContext({ id: 1, email: 'admin@example.com' });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ permission_id: 1, permission_name: 'system.admin', category: 'system' }],
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has one of multiple required permissions', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['users.delete', 'users.read']);
      const context = createMockContext({ id: 1, email: 'test@example.com' });

      // User only has users.read
      mockPool.query.mockResolvedValueOnce({
        rows: [{ permission_id: 1, permission_name: 'users.read', category: 'users' }],
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user lacks required permission', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['users.delete']);
      const context = createMockContext({ id: 1, email: 'test@example.com' });

      // User only has users.read
      mockPool.query.mockResolvedValueOnce({
        rows: [{ permission_id: 1, permission_name: 'users.read', category: 'users' }],
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user has no permissions', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['users.read']);
      const context = createMockContext({ id: 1, email: 'test@example.com' });

      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw error when database pool is not available', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['users.read']);
      const context = createMockContext({ id: 1, email: 'test@example.com' });
      mockDatabaseService.getPool.mockReturnValueOnce(null as never);

      await expect(guard.canActivate(context)).rejects.toThrow('Database pool not available');
    });
  });
});
