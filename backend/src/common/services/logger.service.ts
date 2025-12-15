/**
 * Winston Logger Service
 *
 * Custom NestJS logger implementation using Winston.
 * Provides structured logging with configurable log levels and file output.
 *
 * Stories:
 * - STORY-021A: API-Basis-Infrastruktur (Original implementation)
 * - STORY-027: Error Logging (Daily rotation, structured logging)
 *
 * Features:
 * - Console and file transports
 * - Structured JSON logging in production
 * - Colored output in development
 * - Configurable log level via LOG_LEVEL env variable
 * - Daily log rotation with 14-day retention (STORY-027)
 * - Separate error.log and combined.log files (STORY-027)
 * - Structured metadata support for request context (STORY-027)
 *
 * Environment Variables:
 * - LOG_LEVEL: debug | info | warn | error (default: info)
 * - LOG_DIR: Directory for log files (default: ./logs)
 * - LOG_MAX_FILES: Maximum days to keep logs (default: 14d)
 * - LOG_MAX_SIZE: Maximum size per log file (default: 20m)
 */

import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import * as path from 'path';
import DailyRotateFile from 'winston-daily-rotate-file';

/**
 * Log metadata interface for structured logging
 * Provides context for error tracking and debugging
 */
export interface LogMetadata {
  /** Request ID for distributed tracing */
  requestId?: string;
  /** User ID if authenticated */
  userId?: string;
  /** HTTP method (GET, POST, etc.) */
  method?: string;
  /** Request URL/path */
  url?: string;
  /** HTTP status code */
  statusCode?: number;
  /** Error stack trace */
  stack?: string;
  /** Response time in milliseconds */
  responseTime?: number;
  /** Additional context-specific data */
  [key: string]: unknown;
}

/**
 * Custom logger service using Winston
 * Implements NestJS LoggerService interface for compatibility
 *
 * @example
 * // Basic logging
 * logger.log('User logged in', 'AuthService');
 *
 * // Structured logging with metadata (STORY-027)
 * logger.logWithMetadata('info', 'Request completed', {
 *   requestId: '123',
 *   method: 'GET',
 *   url: '/api/users',
 *   statusCode: 200,
 *   responseTime: 45
 * }, 'HttpMiddleware');
 */
@Injectable()
export class WinstonLoggerService implements LoggerService {
  private readonly logger: winston.Logger;
  private readonly logDir: string;

  constructor() {
    const logLevel = process.env.LOG_LEVEL || 'info';
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';

    // STORY-027: Configurable log directory
    this.logDir = process.env.LOG_DIR || './logs';
    const logMaxFiles = process.env.LOG_MAX_FILES || '14d';
    const logMaxSize = process.env.LOG_MAX_SIZE || '20m';

    // Define log format for console
    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.colorize({ all: true }),
      winston.format.printf(({ timestamp, level, message, context, trace, ...metadata }) => {
        let output = `${timestamp} [${level}]`;
        if (context) {
          output += ` [${context}]`;
        }
        output += `: ${message}`;
        if (trace) {
          output += `\n${trace}`;
        }
        // Include metadata in development console output if present
        const metaKeys = Object.keys(metadata);
        if (metaKeys.length > 0 && !isProduction) {
          const metaStr = JSON.stringify(metadata);
          if (metaStr !== '{}') {
            output += ` ${metaStr}`;
          }
        }
        return output;
      }),
    );

    // STORY-027: JSON format with errors stack trace support for file output
    const fileFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    );

    // STORY-027: Daily rotating file transport for combined logs
    const dailyRotateTransport = new DailyRotateFile({
      filename: path.join(this.logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: logMaxSize,
      maxFiles: logMaxFiles,
      format: fileFormat,
    });

    // STORY-027: Daily rotating file transport for error logs only
    const errorRotateTransport = new DailyRotateFile({
      filename: path.join(this.logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: logMaxSize,
      maxFiles: logMaxFiles,
      level: 'error',
      format: fileFormat,
    });

    // Handle rotation events
    dailyRotateTransport.on('rotate', (oldFilename, newFilename) => {
      // Log rotation event (only in non-test environment)
      if (process.env.NODE_ENV !== 'test') {
        console.log(`Log rotated: ${oldFilename} -> ${newFilename}`);
      }
    });

    errorRotateTransport.on('rotate', (oldFilename, newFilename) => {
      // Log rotation event (only in non-test environment)
      if (process.env.NODE_ENV !== 'test') {
        console.log(`Error log rotated: ${oldFilename} -> ${newFilename}`);
      }
    });

    // Create transports array
    const transports: winston.transport[] = [
      // Console transport
      new winston.transports.Console({
        format: consoleFormat,
      }),
    ];

    // Add file transports only in non-test environment
    // This prevents file I/O issues during unit tests
    if (process.env.NODE_ENV !== 'test') {
      transports.push(dailyRotateTransport);
      transports.push(errorRotateTransport);
    }

    // Create Winston logger
    this.logger = winston.createLogger({
      level: logLevel,
      defaultMeta: { service: 'core-app' },
      transports,
    });
  }

  /**
   * Log a message at 'info' level
   */
  log(message: string, context?: string): void {
    this.logger.info(message, { context });
  }

  /**
   * Log a message at 'error' level with optional stack trace
   */
  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, { context, trace });
  }

  /**
   * Log a message at 'warn' level
   */
  warn(message: string, context?: string): void {
    this.logger.warn(message, { context });
  }

  /**
   * Log a message at 'debug' level
   */
  debug(message: string, context?: string): void {
    this.logger.debug(message, { context });
  }

  /**
   * Log a message at 'verbose' level (maps to 'verbose' in Winston)
   */
  verbose(message: string, context?: string): void {
    this.logger.verbose(message, { context });
  }

  /**
   * STORY-027: Log with structured metadata
   *
   * Logs a message with additional structured metadata for better
   * error tracking and debugging. Metadata is included in JSON format
   * in log files and optionally in console output.
   *
   * @param level - Log level (error, warn, info, debug)
   * @param message - Log message
   * @param metadata - Structured metadata object
   * @param context - Optional logging context (e.g., class name)
   *
   * @example
   * logger.logWithMetadata('error', 'Request failed', {
   *   requestId: 'abc-123',
   *   method: 'POST',
   *   url: '/api/users',
   *   statusCode: 500,
   *   stack: error.stack
   * }, 'UserController');
   */
  logWithMetadata(
    level: 'error' | 'warn' | 'info' | 'debug',
    message: string,
    metadata: LogMetadata,
    context?: string,
  ): void {
    this.logger.log(level, message, {
      context,
      ...metadata,
    });
  }

  /**
   * STORY-027: Log an HTTP request/response
   *
   * Convenience method for logging HTTP requests with all relevant context.
   *
   * @param method - HTTP method
   * @param url - Request URL
   * @param statusCode - Response status code
   * @param responseTime - Response time in milliseconds
   * @param requestId - Request ID for tracing
   * @param userId - Optional user ID
   */
  logHttpRequest(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    requestId?: string,
    userId?: string,
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this.logWithMetadata(
      level,
      `${method} ${url} ${statusCode} ${responseTime}ms`,
      {
        method,
        url,
        statusCode,
        responseTime,
        requestId,
        userId,
      },
      'HttpRequest',
    );
  }

  /**
   * STORY-027: Log an exception with full context
   *
   * Logs an exception with structured metadata including stack trace,
   * request context, and user information if available.
   *
   * @param error - Error object
   * @param context - Logging context
   * @param metadata - Additional metadata
   */
  logException(
    error: Error,
    context: string,
    metadata?: Partial<LogMetadata>,
  ): void {
    this.logWithMetadata(
      'error',
      error.message,
      {
        stack: error.stack,
        errorName: error.name,
        ...metadata,
      },
      context,
    );
  }

  /**
   * Set the log context (for NestJS compatibility)
   * Returns a new instance with the context set
   */
  setContext(context: string): this {
    // For NestJS compatibility - we log context per message instead
    this.log(`Logger context set: ${context}`, 'Logger');
    return this;
  }

  /**
   * Get the log directory path
   * Useful for health checks and monitoring
   */
  getLogDir(): string {
    return this.logDir;
  }
}
