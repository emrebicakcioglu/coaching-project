/**
 * Roles Guard Unit Tests
 * STORY-003A: User CRUD Backend API
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../src/common/guards/roles.guard';
import { DatabaseService } from '../../src/database/database.service';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockPool = {
    query: jest.fn(),
  };

  const mockDatabaseService = {
    getPool: jest.fn().mockReturnValue(mockPool),
  };

  const createMockExecutionContext = (user?: { id: number; email: string }): ExecutionContext => {
    const mockRequest = {
      user,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        Reflector,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access when no roles are required', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const context = createMockExecutionContext({ id: 1, email: 'test@example.com' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when roles array is empty', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      const context = createMockExecutionContext({ id: 1, email: 'test@example.com' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user is not authenticated', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('User not authenticated');
    });

    it('should allow access when user has required role', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

      mockPool.query.mockResolvedValueOnce({
        rows: [{ role_id: 1, role_name: 'admin' }],
      });

      const context = createMockExecutionContext({ id: 1, email: 'test@example.com' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT ur.role_id, r.name as role_name'),
        [1],
      );
    });

    it('should allow access when user has one of multiple required roles', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'superuser']);

      mockPool.query.mockResolvedValueOnce({
        rows: [{ role_id: 1, role_name: 'admin' }],
      });

      const context = createMockExecutionContext({ id: 1, email: 'test@example.com' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user does not have required role', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

      mockPool.query.mockResolvedValue({
        rows: [{ role_id: 2, role_name: 'user' }],
      });

      const context = createMockExecutionContext({ id: 1, email: 'test@example.com' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException with message when user does not have required role', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

      mockPool.query.mockResolvedValue({
        rows: [{ role_id: 2, role_name: 'user' }],
      });

      const context = createMockExecutionContext({ id: 1, email: 'test@example.com' });

      await expect(guard.canActivate(context)).rejects.toThrow('Access denied. Required roles: admin');
    });

    it('should throw ForbiddenException when user has no roles', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      const context = createMockExecutionContext({ id: 1, email: 'test@example.com' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should be case-insensitive for role matching', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

      mockPool.query.mockResolvedValueOnce({
        rows: [{ role_id: 1, role_name: 'ADMIN' }],
      });

      const context = createMockExecutionContext({ id: 1, email: 'test@example.com' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
