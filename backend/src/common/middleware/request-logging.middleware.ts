/**
 * Request Logging Middleware
 *
 * Logs incoming requests and outgoing responses with timing information.
 * Integrates with Winston logger for structured logging.
 *
 * Story: STORY-021B (API Middleware & Error Handling)
 *
 * Features:
 * - Logs request method, URL, and request ID
 * - Logs response status code and response time
 * - Supports configurable log levels
 * - Excludes sensitive headers from logs
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WinstonLoggerService } from '../services/logger.service';

/**
 * Headers that should not be logged for security reasons
 */
const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'x-api-key',
  'x-auth-token',
];

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger: WinstonLoggerService;

  constructor() {
    this.logger = new WinstonLoggerService();
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl, requestId } = req;

    // Log incoming request
    this.logger.log(
      `--> ${method} ${originalUrl} [${requestId || 'no-id'}]`,
      'HTTP',
    );

    // Debug level: log sanitized headers
    if (process.env.LOG_LEVEL === 'debug') {
      const sanitizedHeaders = this.sanitizeHeaders(req.headers);
      this.logger.debug(
        `Request headers: ${JSON.stringify(sanitizedHeaders)}`,
        'HTTP',
      );
    }

    // Capture response details on finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      // Determine log level based on status code
      const logMethod = this.getLogMethod(statusCode);
      const statusEmoji = this.getStatusEmoji(statusCode);

      logMethod.call(
        this.logger,
        `<-- ${method} ${originalUrl} ${statusEmoji} ${statusCode} ${duration}ms [${requestId || 'no-id'}]`,
        'HTTP',
      );
    });

    next();
  }

  /**
   * Remove sensitive headers from logging
   */
  private sanitizeHeaders(
    headers: Record<string, unknown>,
  ): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (SENSITIVE_HEADERS.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Get appropriate log method based on status code
   */
  private getLogMethod(
    statusCode: number,
  ): (message: string, context?: string) => void {
    if (statusCode >= 500) {
      return this.logger.error.bind(this.logger);
    }
    if (statusCode >= 400) {
      return this.logger.warn.bind(this.logger);
    }
    return this.logger.log.bind(this.logger);
  }

  /**
   * Get status emoji for visual log differentiation
   */
  private getStatusEmoji(statusCode: number): string {
    if (statusCode >= 500) return '❌';
    if (statusCode >= 400) return '⚠️';
    if (statusCode >= 300) return '↪️';
    return '✓';
  }
}
