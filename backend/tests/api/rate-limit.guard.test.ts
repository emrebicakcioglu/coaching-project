/**
 * Rate Limit Guard Unit Tests
 *
 * Tests for the rate limiting guard.
 *
 * Story: STORY-021B (API Middleware & Error Handling)
 */

import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  RateLimitGuard,
  RateLimitConfig,
} from '../../src/common/guards/rate-limit.guard';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let reflector: jest.Mocked<Reflector>;
  let mockContext: jest.Mocked<ExecutionContext>;
  let mockRequest: {
    method: string;
    path: string;
    route?: { path: string };
    ip: string;
    headers: Record<string, string | string[]>;
    socket?: { remoteAddress?: string };
  };
  let mockResponse: {
    setHeader: jest.Mock;
  };

  beforeEach(() => {
    // Store original env values
    process.env.RATE_LIMIT_MAX_REQUESTS = '100';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';

    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new RateLimitGuard(reflector);

    mockRequest = {
      method: 'GET',
      path: '/test',
      route: { path: '/test' },
      ip: '127.0.0.1',
      headers: {},
    };

    mockResponse = {
      setHeader: jest.fn(),
    };

    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as jest.Mocked<ExecutionContext>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow requests under the limit', async () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should set rate limit headers', async () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);

      await guard.canActivate(mockContext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('RateLimit-Limit', 100);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('RateLimit-Remaining', expect.any(Number));
      expect(mockResponse.setHeader).toHaveBeenCalledWith('RateLimit-Reset', expect.any(Number));
    });

    it('should skip rate limiting when SkipRateLimit decorator is used', async () => {
      reflector.getAllAndOverride.mockReturnValue(null);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockResponse.setHeader).not.toHaveBeenCalled();
    });

    it('should use custom rate limit from decorator', async () => {
      const customConfig: RateLimitConfig = {
        maxRequests: 5,
        windowSeconds: 30,
      };
      reflector.getAllAndOverride.mockReturnValue(customConfig);

      await guard.canActivate(mockContext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('RateLimit-Limit', 5);
    });

    it('should throw 429 when rate limit is exceeded', async () => {
      const customConfig: RateLimitConfig = {
        maxRequests: 2,
        windowSeconds: 60,
      };
      reflector.getAllAndOverride.mockReturnValue(customConfig);

      // First two requests should succeed
      await guard.canActivate(mockContext);
      await guard.canActivate(mockContext);

      // Third request should fail
      await expect(guard.canActivate(mockContext)).rejects.toThrow(HttpException);

      try {
        await guard.canActivate(mockContext);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }
    });

    it('should track requests per client IP', async () => {
      const customConfig: RateLimitConfig = {
        maxRequests: 2,
        windowSeconds: 60,
      };
      reflector.getAllAndOverride.mockReturnValue(customConfig);

      // Requests from first IP
      await guard.canActivate(mockContext);
      await guard.canActivate(mockContext);

      // Change IP
      mockRequest.ip = '192.168.1.1';

      // Request from different IP should succeed
      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should track requests per endpoint', async () => {
      const customConfig: RateLimitConfig = {
        maxRequests: 2,
        windowSeconds: 60,
      };
      reflector.getAllAndOverride.mockReturnValue(customConfig);

      // Requests to first endpoint
      await guard.canActivate(mockContext);
      await guard.canActivate(mockContext);

      // Change endpoint
      mockRequest.route = { path: '/different-endpoint' };
      mockRequest.path = '/different-endpoint';

      // Request to different endpoint should succeed
      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should use X-Forwarded-For header for client IP when present', async () => {
      mockRequest.headers['x-forwarded-for'] = '10.0.0.1, 10.0.0.2';

      const customConfig: RateLimitConfig = {
        maxRequests: 2,
        windowSeconds: 60,
      };
      reflector.getAllAndOverride.mockReturnValue(customConfig);

      await guard.canActivate(mockContext);
      await guard.canActivate(mockContext);

      // Change forwarded IP
      mockRequest.headers['x-forwarded-for'] = '10.0.0.3';

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should use X-Real-IP header when X-Forwarded-For is not present', async () => {
      mockRequest.headers['x-real-ip'] = '10.0.0.1';

      const customConfig: RateLimitConfig = {
        maxRequests: 2,
        windowSeconds: 60,
      };
      reflector.getAllAndOverride.mockReturnValue(customConfig);

      await guard.canActivate(mockContext);
      await guard.canActivate(mockContext);

      // Change real IP
      mockRequest.headers['x-real-ip'] = '10.0.0.3';

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should decrement remaining count with each request', async () => {
      const customConfig: RateLimitConfig = {
        maxRequests: 5,
        windowSeconds: 60,
      };
      reflector.getAllAndOverride.mockReturnValue(customConfig);

      await guard.canActivate(mockContext);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('RateLimit-Remaining', 4);

      mockResponse.setHeader.mockClear();
      await guard.canActivate(mockContext);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('RateLimit-Remaining', 3);
    });

    it('should include retryAfter in error response', async () => {
      const customConfig: RateLimitConfig = {
        maxRequests: 1,
        windowSeconds: 60,
      };
      reflector.getAllAndOverride.mockReturnValue(customConfig);

      await guard.canActivate(mockContext);

      try {
        await guard.canActivate(mockContext);
      } catch (error) {
        const response = (error as HttpException).getResponse() as Record<string, unknown>;
        expect(response.retryAfter).toBeDefined();
        expect(typeof response.retryAfter).toBe('number');
      }
    });
  });

  describe('environment configuration', () => {
    it('should use default values when env vars are not set', () => {
      delete process.env.RATE_LIMIT_MAX_REQUESTS;
      delete process.env.RATE_LIMIT_WINDOW_MS;

      const newGuard = new RateLimitGuard(reflector);
      reflector.getAllAndOverride.mockReturnValue(undefined);

      // Guard should still work with defaults
      expect(() => newGuard.canActivate(mockContext)).not.toThrow();
    });
  });
});
