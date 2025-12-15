/**
 * Session Timeout Middleware
 * STORY-035: Support-E-Mail & Session-Timeout
 *
 * Validates session activity on each authenticated request.
 * If session has exceeded idle timeout, returns 401 Unauthorized.
 * Adds session status headers for client-side timeout handling.
 */

import { Injectable, NestMiddleware, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { SessionTimeoutService, SessionStatus } from '../../settings/session-timeout.service';
import { WinstonLoggerService } from '../services/logger.service';

/**
 * Extended Request interface with user and requestId
 */
interface AuthenticatedRequest extends Request {
  user?: { id?: number; email?: string };
  requestId?: string;
  sessionStatus?: SessionStatus;
}

/**
 * Session Timeout Middleware
 * Validates session activity and enforces idle timeout
 */
@Injectable()
export class SessionTimeoutMiddleware implements NestMiddleware {
  // Routes that should skip session timeout check
  private readonly skipRoutes = [
    '/api/v1/auth/login',
    '/api/v1/auth/refresh',
    '/api/v1/auth/forgot-password',
    '/api/v1/auth/reset-password',
    '/api/health',
    '/health',
    '/api/docs',
    '/api/docs-json',
  ];

  constructor(
    @Inject(forwardRef(() => SessionTimeoutService))
    private readonly sessionTimeoutService: SessionTimeoutService,
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
  ) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    // Skip for non-authenticated routes
    if (this.shouldSkipRoute(req.path)) {
      return next();
    }

    // Skip if no authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    // Extract token and create hash
    const token = authHeader.slice(7);
    const tokenHash = this.getTokenHash(token);

    // Try to get user ID from decoded token
    const userId = this.extractUserIdFromToken(token);
    if (!userId) {
      return next();
    }

    try {
      // Validate session
      const status = await this.sessionTimeoutService.checkSessionStatus(userId, tokenHash);

      // Add session status to request for downstream handlers
      req.sessionStatus = status;

      // Add session headers for client-side handling
      res.setHeader('X-Session-Valid', status.isValid.toString());
      res.setHeader('X-Session-Remaining-Ms', status.remainingMs.toString());
      if (status.shouldWarn) {
        res.setHeader('X-Session-Warning', 'true');
        res.setHeader('X-Session-Warning-Message', status.warningMessage ?? '');
      }

      // If session has timed out, return 401
      if (!status.isValid) {
        this.logger.log(
          `Session timed out for user ${userId}`,
          'SessionTimeoutMiddleware',
        );

        throw new UnauthorizedException({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Session expired due to inactivity',
          code: 'SESSION_TIMEOUT',
        });
      }

      // Update activity timestamp for valid sessions
      this.sessionTimeoutService.recordActivity(userId, tokenHash);

      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Log unexpected errors but don't block the request
      this.logger.error(
        `Session timeout check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        'SessionTimeoutMiddleware',
      );

      next();
    }
  }

  /**
   * Check if route should skip session timeout validation
   */
  private shouldSkipRoute(path: string): boolean {
    // Normalize path
    const normalizedPath = path.toLowerCase();

    // Check exact matches
    if (this.skipRoutes.some((route) => normalizedPath === route || normalizedPath.startsWith(route))) {
      return true;
    }

    // Skip all public endpoints (could be expanded)
    if (normalizedPath.startsWith('/api/v1/settings/general/timeout-config')) {
      return true;
    }

    return false;
  }

  /**
   * Extract user ID from JWT token without full validation
   * (Full validation happens in JwtAuthGuard)
   */
  private extractUserIdFromToken(token: string): number | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      return typeof payload.sub === 'number' ? payload.sub : null;
    } catch {
      return null;
    }
  }

  /**
   * Create hash from token for session tracking
   */
  private getTokenHash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
