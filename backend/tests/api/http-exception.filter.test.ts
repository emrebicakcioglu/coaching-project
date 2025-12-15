/**
 * HttpExceptionFilter Unit Tests
 *
 * Tests for the global exception filter.
 *
 * Stories:
 * - STORY-021A: API-Basis-Infrastruktur
 * - STORY-021B: API Middleware & Error Handling (Request ID tracking)
 * - STORY-027: Error Logging (Structured error logging with full context)
 */

import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';
import { HttpExceptionFilter, ErrorResponse } from '../../src/common/filters/http-exception.filter';
import { WinstonLoggerService } from '../../src/common/services/logger.service';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockLogger: jest.Mocked<WinstonLoggerService>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      setContext: jest.fn(),
      logWithMetadata: jest.fn(),
      logHttpRequest: jest.fn(),
      logException: jest.fn(),
      getLogDir: jest.fn().mockReturnValue('./logs'),
    } as unknown as jest.Mocked<WinstonLoggerService>;

    filter = new HttpExceptionFilter(mockLogger);

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => ({
          status: mockStatus,
        }),
        getRequest: () => ({
          url: '/test-endpoint',
          method: 'GET',
        }),
      }),
    } as unknown as ArgumentsHost;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('catch', () => {
    it('should handle HttpException with string response', () => {
      const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Not Found',
          path: '/test-endpoint',
        })
      );
    });

    it('should handle HttpException with object response', () => {
      const exception = new HttpException(
        {
          statusCode: 400,
          message: ['field must be a string', 'field is required'],
          error: 'Bad Request',
        },
        HttpStatus.BAD_REQUEST
      );

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(400);
      const response = mockJson.mock.calls[0][0] as ErrorResponse;
      expect(response.statusCode).toBe(400);
      expect(response.message).toEqual(['field must be a string', 'field is required']);
      expect(response.error).toBe('Bad Request');
    });

    it('should handle non-HttpException errors', () => {
      const exception = new Error('Unexpected error');

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Internal server error',
          error: 'Internal Server Error',
        })
      );
      // STORY-027: Now uses logException for unhandled errors
      expect(mockLogger.logException).toHaveBeenCalled();
    });

    it('should handle unknown exception types', () => {
      const exception = 'string error';

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Internal server error',
        })
      );
      // STORY-027: Now uses logWithMetadata for unknown exceptions
      expect(mockLogger.logWithMetadata).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('Unknown exception type'),
        expect.any(Object),
        'HttpExceptionFilter'
      );
    });

    it('should include timestamp in response', () => {
      const exception = new HttpException('Test', 400);

      filter.catch(exception, mockHost);

      const response = mockJson.mock.calls[0][0] as ErrorResponse;
      expect(response.timestamp).toBeDefined();
      expect(new Date(response.timestamp).toISOString()).toBe(response.timestamp);
    });

    it('should log with structured metadata for server errors (STORY-027)', () => {
      process.env.NODE_ENV = 'development';
      const exception = new HttpException('Server Error', 500);

      filter.catch(exception, mockHost);

      // STORY-027: Now uses logWithMetadata with structured data
      expect(mockLogger.logWithMetadata).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('HTTP 500'),
        expect.objectContaining({
          statusCode: 500,
          method: 'GET',
          url: '/test-endpoint',
        }),
        'HttpExceptionFilter'
      );
    });
  });

  // STORY-021B: Request ID tracking tests
  describe('request ID tracking', () => {
    it('should include requestId in response when present', () => {
      const mockHostWithRequestId = {
        switchToHttp: () => ({
          getResponse: () => ({
            status: mockStatus,
          }),
          getRequest: () => ({
            url: '/test-endpoint',
            method: 'GET',
            requestId: 'test-request-id-123',
          }),
        }),
      } as unknown as ArgumentsHost;

      const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockHostWithRequestId);

      const response = mockJson.mock.calls[0][0] as ErrorResponse;
      expect(response.requestId).toBe('test-request-id-123');
    });

    it('should not include requestId in response when not present', () => {
      const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockHost);

      const response = mockJson.mock.calls[0][0] as ErrorResponse;
      expect(response.requestId).toBeUndefined();
    });

    it('should include requestId in error logs via logException (STORY-027)', () => {
      const mockHostWithRequestId = {
        switchToHttp: () => ({
          getResponse: () => ({
            status: mockStatus,
          }),
          getRequest: () => ({
            url: '/test-endpoint',
            method: 'GET',
            requestId: 'test-request-id-456',
          }),
        }),
      } as unknown as ArgumentsHost;

      const exception = new Error('Unhandled error');

      filter.catch(exception, mockHostWithRequestId);

      // STORY-027: Now uses logException with structured metadata
      expect(mockLogger.logException).toHaveBeenCalledWith(
        exception,
        'HttpExceptionFilter',
        expect.objectContaining({
          requestId: 'test-request-id-456',
          method: 'GET',
          url: '/test-endpoint',
        })
      );
    });

    it('should include undefined requestId in structured metadata when missing', () => {
      const exception = new Error('Unhandled error');

      filter.catch(exception, mockHost);

      // STORY-027: requestId is now undefined in metadata instead of string placeholder
      expect(mockLogger.logException).toHaveBeenCalledWith(
        exception,
        'HttpExceptionFilter',
        expect.objectContaining({
          requestId: undefined,
          method: 'GET',
          url: '/test-endpoint',
        })
      );
    });

    it('should include requestId in structured logs for server errors (STORY-027)', () => {
      process.env.NODE_ENV = 'development';
      const mockHostWithRequestId = {
        switchToHttp: () => ({
          getResponse: () => ({
            status: mockStatus,
          }),
          getRequest: () => ({
            url: '/test-endpoint',
            method: 'GET',
            requestId: 'test-request-id-789',
          }),
        }),
      } as unknown as ArgumentsHost;

      const exception = new HttpException('Server Error', 500);

      filter.catch(exception, mockHostWithRequestId);

      // STORY-027: Now uses logWithMetadata with requestId in metadata
      expect(mockLogger.logWithMetadata).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('HTTP 500'),
        expect.objectContaining({
          requestId: 'test-request-id-789',
          method: 'GET',
          url: '/test-endpoint',
          statusCode: 500,
        }),
        'HttpExceptionFilter'
      );
    });
  });

  // STORY-027: Structured error logging tests
  describe('structured error logging (STORY-027)', () => {
    it('should include userId in structured logs when user is authenticated', () => {
      const mockHostWithUser = {
        switchToHttp: () => ({
          getResponse: () => ({
            status: mockStatus,
          }),
          getRequest: () => ({
            url: '/test-endpoint',
            method: 'POST',
            requestId: 'req-123',
            user: { id: 'user-456' },
          }),
        }),
      } as unknown as ArgumentsHost;

      const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

      filter.catch(exception, mockHostWithUser);

      expect(mockLogger.logWithMetadata).toHaveBeenCalledWith(
        'warn',
        expect.stringContaining('HTTP 403'),
        expect.objectContaining({
          requestId: 'req-123',
          userId: 'user-456',
          statusCode: 403,
        }),
        'HttpExceptionFilter'
      );
    });

    it('should log client errors (4xx) as warnings in non-production', () => {
      process.env.NODE_ENV = 'development';
      const exception = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockLogger.logWithMetadata).toHaveBeenCalledWith(
        'warn',
        expect.stringContaining('HTTP 400'),
        expect.objectContaining({
          statusCode: 400,
        }),
        'HttpExceptionFilter'
      );
    });

    it('should log server errors (5xx) as errors', () => {
      process.env.NODE_ENV = 'production';
      const exception = new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);

      filter.catch(exception, mockHost);

      expect(mockLogger.logWithMetadata).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('HTTP 500'),
        expect.any(Object),
        'HttpExceptionFilter'
      );
    });

    it('should include stack trace for server errors', () => {
      process.env.NODE_ENV = 'development';
      const exception = new HttpException('Server Error', 500);

      filter.catch(exception, mockHost);

      expect(mockLogger.logWithMetadata).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        expect.objectContaining({
          stack: expect.any(String),
        }),
        'HttpExceptionFilter'
      );
    });

    it('should not log client errors in production', () => {
      process.env.NODE_ENV = 'production';
      mockLogger.logWithMetadata.mockClear();
      const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockHost);

      // Should not be called for 4xx errors in production
      expect(mockLogger.logWithMetadata).not.toHaveBeenCalled();
    });

    it('should format array messages as comma-separated string in logs', () => {
      process.env.NODE_ENV = 'development';
      const exception = new HttpException(
        {
          statusCode: 400,
          message: ['field1 is required', 'field2 must be a string'],
          error: 'Bad Request',
        },
        HttpStatus.BAD_REQUEST
      );

      filter.catch(exception, mockHost);

      expect(mockLogger.logWithMetadata).toHaveBeenCalledWith(
        'warn',
        expect.any(String),
        expect.objectContaining({
          message: 'field1 is required, field2 must be a string',
        }),
        'HttpExceptionFilter'
      );
    });
  });
});
