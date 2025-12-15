/**
 * JWT Auth Guard Unit Tests
 * STORY-003A: User CRUD Backend API
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import * as crypto from 'crypto';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  const mockJwtSecret = 'test-jwt-secret-key-for-testing-purposes';

  const createMockExecutionContext = (
    authHeader?: string,
  ): ExecutionContext => {
    const mockRequest = {
      headers: authHeader ? { authorization: authHeader } : {},
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  const generateValidToken = (payload: { sub: number; email: string }): string => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);

    const fullPayload = {
      ...payload,
      iat: now,
      exp: now + 3600, // 1 hour from now
    };

    const encodedHeader = Buffer.from(JSON.stringify(header))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const encodedPayload = Buffer.from(JSON.stringify(fullPayload))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const signature = crypto
      .createHmac('sha256', mockJwtSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  };

  const generateExpiredToken = (payload: { sub: number; email: string }): string => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);

    const fullPayload = {
      ...payload,
      iat: now - 7200, // 2 hours ago
      exp: now - 3600, // 1 hour ago (expired)
    };

    const encodedHeader = Buffer.from(JSON.stringify(header))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const encodedPayload = Buffer.from(JSON.stringify(fullPayload))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const signature = crypto
      .createHmac('sha256', mockJwtSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  };

  beforeEach(async () => {
    process.env.JWT_SECRET = mockJwtSecret;

    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtAuthGuard, Reflector],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.JWT_SECRET;
  });

  describe('canActivate', () => {
    it('should allow access for public routes', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const context = createMockExecutionContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when no token is provided', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Missing authentication token');
    });

    it('should throw UnauthorizedException for invalid Bearer format', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const context = createMockExecutionContext('Basic some-token');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const context = createMockExecutionContext('Bearer invalid-token');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired token');
    });

    it('should throw UnauthorizedException for expired token', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const expiredToken = generateExpiredToken({ sub: 1, email: 'test@example.com' });
      const context = createMockExecutionContext(`Bearer ${expiredToken}`);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should allow access and attach user for valid token', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const validToken = generateValidToken({ sub: 1, email: 'test@example.com' });
      const mockRequest: Record<string, unknown> = {
        headers: { authorization: `Bearer ${validToken}` },
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest.user).toEqual({
        id: 1,
        email: 'test@example.com',
      });
    });

    it('should throw UnauthorizedException for token with wrong signature', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      // Generate a token with a different secret
      const wrongSecretToken = (() => {
        const header = { alg: 'HS256', typ: 'JWT' };
        const now = Math.floor(Date.now() / 1000);
        const payload = { sub: 1, email: 'test@example.com', iat: now, exp: now + 3600 };

        const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
        const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

        const signature = crypto
          .createHmac('sha256', 'wrong-secret')
          .update(`${encodedHeader}.${encodedPayload}`)
          .digest('base64url');

        return `${encodedHeader}.${encodedPayload}.${signature}`;
      })();

      const context = createMockExecutionContext(`Bearer ${wrongSecretToken}`);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for malformed token', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      // Token with only two parts
      const context = createMockExecutionContext('Bearer header.payload');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });
});
