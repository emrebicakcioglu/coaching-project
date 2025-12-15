/**
 * Rate Limit Guard
 *
 * Custom rate limiting guard for NestJS that provides per-endpoint rate limiting.
 * Uses in-memory storage for tracking request counts.
 *
 * Story: STORY-021B (API Middleware & Error Handling)
 *
 * Features:
 * - Per-endpoint configurable rate limits
 * - In-memory request tracking (suitable for single-instance deployments)
 * - Decorator-based configuration (@RateLimit decorator)
 * - Returns 429 Too Many Requests when limit exceeded
 *
 * Environment Variables:
 * - RATE_LIMIT_TTL: Time window in seconds (default: 60)
 * - RATE_LIMIT_MAX: Max requests per window (default: 100)
 *
 * Usage:
 * @UseGuards(RateLimitGuard)
 * @RateLimit(10, 60) // 10 requests per 60 seconds
 * @Get()
 * async myEndpoint() { ... }
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

/**
 * Metadata key for rate limit configuration
 */
export const RATE_LIMIT_KEY = 'rateLimit';

/**
 * Rate limit configuration interface
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

/**
 * Decorator for setting custom rate limits on controllers/endpoints
 * @param maxRequests Maximum number of requests allowed in the window
 * @param windowSeconds Time window in seconds
 */
export const RateLimit = (maxRequests: number, windowSeconds: number) =>
  SetMetadata(RATE_LIMIT_KEY, { maxRequests, windowSeconds } as RateLimitConfig);

/**
 * Skip rate limiting for specific endpoints (e.g., health checks)
 */
export const SkipRateLimit = () => SetMetadata(RATE_LIMIT_KEY, null);

/**
 * In-memory request tracking
 */
interface RequestRecord {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly requests = new Map<string, RequestRecord>();
  private readonly defaultMaxRequests: number;
  private readonly defaultWindowSeconds: number;

  constructor(private readonly reflector: Reflector) {
    // Load defaults from environment
    this.defaultMaxRequests = parseInt(
      process.env.RATE_LIMIT_MAX_REQUESTS || '100',
      10,
    );
    this.defaultWindowSeconds = Math.floor(
      parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10) / 1000,
    );

    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();

    // Get rate limit configuration from decorator or use defaults
    const config = this.reflector.getAllAndOverride<RateLimitConfig | null>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Skip rate limiting if explicitly disabled
    if (config === null) {
      return true;
    }

    const maxRequests = config?.maxRequests ?? this.defaultMaxRequests;
    const windowSeconds = config?.windowSeconds ?? this.defaultWindowSeconds;

    // Generate unique key per client and endpoint
    const clientIp = this.getClientIp(request);
    const endpoint = `${request.method}:${request.route?.path || request.path}`;
    const key = `${clientIp}:${endpoint}`;

    const now = Date.now();
    const record = this.requests.get(key);

    // Initialize or reset expired record
    if (!record || now >= record.resetTime) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + windowSeconds * 1000,
      });

      this.setRateLimitHeaders(response, maxRequests, maxRequests - 1, windowSeconds);
      return true;
    }

    // Check if limit exceeded
    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      this.setRateLimitHeaders(response, maxRequests, 0, retryAfter);

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowSeconds} seconds. Retry after ${retryAfter} seconds.`,
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment counter
    record.count++;
    const remaining = maxRequests - record.count;
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);
    this.setRateLimitHeaders(response, maxRequests, remaining, resetSeconds);

    return true;
  }

  /**
   * Extract client IP from request
   */
  private getClientIp(request: Request): string {
    // Check common proxy headers
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return ips.trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return request.ip || request.socket?.remoteAddress || 'unknown';
  }

  /**
   * Set standard rate limit headers
   */
  private setRateLimitHeaders(
    response: { setHeader: (key: string, value: string | number) => void },
    limit: number,
    remaining: number,
    reset: number,
  ): void {
    response.setHeader('RateLimit-Limit', limit);
    response.setHeader('RateLimit-Remaining', Math.max(0, remaining));
    response.setHeader('RateLimit-Reset', reset);
  }

  /**
   * Clean up expired entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now >= record.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}
