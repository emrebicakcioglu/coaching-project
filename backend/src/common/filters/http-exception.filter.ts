/**
 * Global HTTP Exception Filter
 *
 * Catches all HTTP exceptions and returns a consistent error response format.
 * Also logs errors for debugging purposes with structured metadata.
 *
 * Stories:
 * - STORY-021A: API-Basis-Infrastruktur (Original implementation)
 * - STORY-021B: API Middleware & Error Handling (Request ID tracking)
 * - STORY-027: Error Logging (Structured error logging with full context)
 * - STORY-CAPTCHA: Login Security with CAPTCHA (Additional response fields)
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WinstonLoggerService } from '../services/logger.service';

/**
 * Standard error response interface
 */
export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
  requestId?: string;
  requiresCaptcha?: boolean;
  captcha?: {
    captchaId: string;
    question: string;
    expiresAt: Date;
  };
  delaySeconds?: number;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly context = 'HttpExceptionFilter';

  constructor(private readonly logger: WinstonLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = request.requestId;
    const userId = (request as Request & { user?: { id?: string } }).user?.id;

    let statusCode: number;
    let message: string | string[];
    let error: string;
    let stack: string | undefined;
    let requiresCaptcha: boolean | undefined;
    let captcha: ErrorResponse['captcha'] | undefined;
    let delaySeconds: number | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string | string[]) || exception.message;
        error = (responseObj.error as string) || exception.name;
        if (responseObj.requiresCaptcha !== undefined) {
          requiresCaptcha = responseObj.requiresCaptcha as boolean;
        }
        if (responseObj.captcha !== undefined) {
          captcha = responseObj.captcha as ErrorResponse['captcha'];
        }
        if (responseObj.delaySeconds !== undefined) {
          delaySeconds = responseObj.delaySeconds as number;
        }
      } else {
        message = exception.message;
        error = exception.name;
      }
      stack = exception.stack;
    } else if (exception instanceof Error) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';
      stack = exception.stack;

      this.logger.logException(exception, this.context, {
        requestId,
        userId,
        method: request.method,
        url: request.url,
        statusCode,
        errorType: 'UnhandledException',
      });
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';

      this.logger.logWithMetadata(
        'error',
        'Unknown exception type: ' + typeof exception,
        {
          requestId,
          userId,
          method: request.method,
          url: request.url,
          statusCode,
          errorType: 'UnknownException',
          exceptionValue: String(exception),
        },
        this.context,
      );
    }

    const errorResponse: ErrorResponse = {
      statusCode,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(requestId && { requestId }),
      ...(requiresCaptcha !== undefined && { requiresCaptcha }),
      ...(captcha !== undefined && { captcha }),
      ...(delaySeconds !== undefined && { delaySeconds }),
    };

    const isServerError = statusCode >= 500;
    const isProduction = process.env.NODE_ENV === 'production';
    const shouldLogClientErrors = !isProduction && statusCode >= 400 && statusCode < 500;

    if (isServerError || shouldLogClientErrors) {
      const logLevel = isServerError ? 'error' : 'warn';
      this.logger.logWithMetadata(
        logLevel,
        'HTTP ' + statusCode + ' ' + request.method + ' ' + request.url,
        {
          requestId,
          userId,
          method: request.method,
          url: request.url,
          statusCode,
          error,
          message: typeof message === 'string' ? message : message.join(', '),
          ...(isServerError && stack ? { stack } : {}),
        },
        this.context,
      );
    }

    response.status(statusCode).json(errorResponse);
  }
}
