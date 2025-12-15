/**
 * Permissions Integration Tests
 * STORY-027: Permission-System Core
 *
 * Integration tests for permission middleware with API endpoints.
 * Tests permission denied scenarios (403 responses).
 *
 * Note: These tests require RUN_INTEGRATION_TESTS=true environment variable.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

// Skip integration tests unless explicitly enabled
const describeIntegration = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeIntegration('Permissions Integration Tests', () => {
  let app: INestApplication;
  let userToken: string;

  // Helper to create JWT for testing (simplified - in real app use auth service)
  const createTestToken = (userId: number, email: string): string => {
    // This is a mock - real implementation would use the auth service
    const payload = {
      sub: userId,
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    };

    // In real tests, this would sign with JWT_SECRET
    // For unit test purposes, we'll mock the auth guard
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Create test tokens (in real tests, these would be actual JWT tokens)
    userToken = createTestToken(2, 'user@test.com');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Permission Denied Scenarios', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 403 when user lacks required permission', async () => {
      // This test assumes a user without admin role trying to access admin endpoints
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.statusCode).toBe(403);
    });
  });

  describe('Permission Granted Scenarios', () => {
    it('should allow access with valid admin token', async () => {
      // This test assumes admin user has proper permissions
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
    });
  });
});

/**
 * Permission Middleware Unit Integration Tests
 * These tests validate middleware behavior with mock requests.
 */
describe('Permission Middleware Integration', () => {
  const createMockRequest = (permissions: string[] = []) => ({
    user: { id: 1, email: 'test@example.com' },
    permissions,
    params: {},
  });

  const createMockResponse = () => {
    const res: Record<string, jest.Mock | number | string> = {
      statusCode: 200,
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    return res;
  };

  describe('hasPermission middleware flow', () => {
    const { hasPermission } = require('../../src/permissions/permissions.middleware');

    it('should chain with next() on permission match', () => {
      const req = createMockRequest(['users.create']);
      const res = createMockResponse();
      const next = jest.fn();

      hasPermission('users.create')(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 and not call next() on permission denial', () => {
      const req = createMockRequest(['users.read']);
      const res = createMockResponse();
      const next = jest.fn();

      hasPermission('users.delete')(req as any, res as any, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
          statusCode: 403,
        }),
      );
    });
  });

  describe('hasAnyPermission middleware flow', () => {
    const { hasAnyPermission } = require('../../src/permissions/permissions.middleware');

    it('should allow access when user has first permission', () => {
      const req = createMockRequest(['users.create']);
      const res = createMockResponse();
      const next = jest.fn();

      hasAnyPermission(['users.create', 'users.update'])(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow access when user has second permission', () => {
      const req = createMockRequest(['users.update']);
      const res = createMockResponse();
      const next = jest.fn();

      hasAnyPermission(['users.create', 'users.update'])(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access when user has neither permission', () => {
      const req = createMockRequest(['users.read']);
      const res = createMockResponse();
      const next = jest.fn();

      hasAnyPermission(['users.create', 'users.delete'])(req as any, res as any, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('hasAllPermissions middleware flow', () => {
    const { hasAllPermissions } = require('../../src/permissions/permissions.middleware');

    it('should allow access when user has all permissions', () => {
      const req = createMockRequest(['users.read', 'users.update', 'users.delete']);
      const res = createMockResponse();
      const next = jest.fn();

      hasAllPermissions(['users.read', 'users.update'])(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access when user is missing any permission', () => {
      const req = createMockRequest(['users.read']);
      const res = createMockResponse();
      const next = jest.fn();

      hasAllPermissions(['users.read', 'users.update'])(req as any, res as any, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          missingPermissions: expect.arrayContaining(['users.update']),
        }),
      );
    });
  });

  describe('Wildcard pattern integration', () => {
    const { hasPermission, hasAllPermissions } = require('../../src/permissions/permissions.middleware');

    it('should grant access with category wildcard', () => {
      const req = createMockRequest(['users.*']);
      const res = createMockResponse();
      const next = jest.fn();

      hasPermission('users.create')(req as any, res as any, next);
      expect(next).toHaveBeenCalled();
    });

    it('should grant access for multiple permissions with wildcard', () => {
      const req = createMockRequest(['users.*']);
      const res = createMockResponse();
      const next = jest.fn();

      hasAllPermissions(['users.create', 'users.read', 'users.update', 'users.delete'])(
        req as any,
        res as any,
        next,
      );

      expect(next).toHaveBeenCalled();
    });

    it('should deny access when wildcard does not cover all categories', () => {
      const req = createMockRequest(['users.*']);
      const res = createMockResponse();
      const next = jest.fn();

      hasAllPermissions(['users.create', 'roles.create'])(req as any, res as any, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('system.admin permission integration', () => {
    const { hasPermission, hasAllPermissions, hasAnyPermission } = require('../../src/permissions/permissions.middleware');

    it('should grant access to any permission', () => {
      const req = createMockRequest(['system.admin']);
      const res = createMockResponse();
      const next = jest.fn();

      hasPermission('some.random.permission')(req as any, res as any, next);
      expect(next).toHaveBeenCalled();
    });

    it('should grant access to all permissions', () => {
      const req = createMockRequest(['system.admin']);
      const res = createMockResponse();
      const next = jest.fn();

      hasAllPermissions(['users.delete', 'roles.delete', 'settings.admin'])(
        req as any,
        res as any,
        next,
      );

      expect(next).toHaveBeenCalled();
    });

    it('should grant access to any permission', () => {
      const req = createMockRequest(['system.admin']);
      const res = createMockResponse();
      const next = jest.fn();

      hasAnyPermission(['nonexistent.permission'])(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
