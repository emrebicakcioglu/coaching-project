/**
 * Audit Logging Middleware
 * STORY-028: System Logging (Audit Trail)
 *
 * Middleware that automatically logs API requests to the audit trail.
 * This is separate from the RequestLoggingMiddleware which logs to Winston.
 * The AuditLoggingMiddleware persists audit events to the database.
 *
 * Features:
 * - Logs all API requests when AUDIT_LOG_API_REQUESTS=true
 * - Captures request context (IP, User-Agent, Request ID, User ID)
 * - Logs response status and timing
 * - Asynchronous database writes (non-blocking)
 *
 * Note: This middleware should be applied AFTER authentication middleware
 * to ensure user context is available.
 */

import { Injectable, NestMiddleware, Inject, forwardRef } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit.service';

/**
 * Extended Request interface with optional user and requestId
 */
interface AuditRequest extends Request {
  user?: { id?: number; email?: string };
  requestId?: string;
}

/**
 * Paths that should be excluded from API request logging
 * These are typically health checks or high-frequency endpoints
 */
const EXCLUDED_PATHS = [
  '/health',
  '/health/live',
  '/health/ready',
  '/metrics',
  '/favicon.ico',
];

/**
 * Methods that are considered "read-only" and may be optionally excluded
 */
const READ_ONLY_METHODS = ['GET', 'HEAD', 'OPTIONS'];

@Injectable()
export class AuditLoggingMiddleware implements NestMiddleware {
  private readonly logReadOnly: boolean;

  constructor(
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
  ) {
    // Option to exclude read-only requests from audit logging
    // Set AUDIT_LOG_READ_ONLY=false to exclude GET/HEAD/OPTIONS
    this.logReadOnly = process.env.AUDIT_LOG_READ_ONLY !== 'false';
  }

  use(req: AuditRequest, res: Response, next: NextFunction): void {
    // Skip if audit logging is disabled or API request logging is disabled
    if (
      !this.auditService.isAuditLoggingEnabled() ||
      !this.auditService.isApiRequestLoggingEnabled()
    ) {
      return next();
    }

    // Skip excluded paths
    const path = req.originalUrl.split('?')[0]; // Remove query string
    if (EXCLUDED_PATHS.some((excluded) => path.startsWith(excluded))) {
      return next();
    }

    // Optionally skip read-only methods
    if (!this.logReadOnly && READ_ONLY_METHODS.includes(req.method)) {
      return next();
    }

    const startTime = Date.now();

    // Capture response on finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      // Log the API request asynchronously (fire and forget)
      this.auditService
        .logApiRequest(req, req.method, path, statusCode, duration)
        .catch(() => {
          // Errors are already logged in AuditService
          // Silently ignore to prevent unhandled promise rejections
        });
    });

    next();
  }
}
