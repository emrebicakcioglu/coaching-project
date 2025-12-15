/**
 * Request ID Middleware
 *
 * Adds a unique request ID to each incoming request for distributed tracing.
 * The request ID is available via the X-Request-ID header in both request and response.
 *
 * Story: STORY-021B (API Middleware & Error Handling)
 *
 * Usage:
 * - The middleware generates a UUID v4 for each request
 * - If a client sends X-Request-ID header, that value is preserved
 * - The request ID is added to response headers for tracing
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Extend Express Request to include requestId
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export const REQUEST_ID_HEADER = 'X-Request-ID';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Use existing request ID from header or generate new one
    const requestId =
      (req.headers[REQUEST_ID_HEADER.toLowerCase()] as string) || randomUUID();

    // Attach to request object for use in controllers/services
    req.requestId = requestId;

    // Add to response headers for client tracing
    res.setHeader(REQUEST_ID_HEADER, requestId);

    next();
  }
}
