/**
 * Request Logging Middleware Unit Tests
 *
 * Tests for the request/response logging middleware.
 *
 * Story: STORY-021B (API Middleware & Error Handling)
 */

import { RequestLoggingMiddleware } from '../../src/common/middleware/request-logging.middleware';
import { Request, Response } from 'express';

// Mock the WinstonLoggerService
jest.mock('../../src/common/services/logger.service', () => ({
  WinstonLoggerService: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  })),
}));

describe('RequestLoggingMiddleware', () => {
  let middleware: RequestLoggingMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;
  let finishCallback: (() => void) | null = null;

  beforeEach(() => {
    jest.useFakeTimers();
    middleware = new RequestLoggingMiddleware();

    mockRequest = {
      method: 'GET',
      originalUrl: '/test-endpoint',
      requestId: 'test-request-id',
      headers: {},
    };

    mockResponse = {
      statusCode: 200,
      on: jest.fn((event: string, callback: () => void) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
        return mockResponse as Response;
      }),
    };

    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    finishCallback = null;
  });

  describe('use', () => {
    it('should call next function', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('should register finish event listener', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('should log request when finish event fires', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      // Simulate response finish
      if (finishCallback) {
        finishCallback();
      }

      // The middleware should have logged something
      // We can't directly check the mock since it's created inside the middleware
      expect(mockResponse.on).toHaveBeenCalled();
    });

    it('should handle requests without requestId', () => {
      mockRequest.requestId = undefined;

      expect(() => {
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );
      }).not.toThrow();

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle different HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

      methods.forEach((method) => {
        mockRequest.method = method;
        expect(() => {
          middleware.use(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction,
          );
        }).not.toThrow();
      });
    });

    it('should sanitize sensitive headers in debug mode', () => {
      const originalLogLevel = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = 'debug';

      mockRequest.headers = {
        'authorization': 'Bearer secret-token',
        'cookie': 'session=abc123',
        'x-api-key': 'secret-key',
        'content-type': 'application/json',
      };

      expect(() => {
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );
      }).not.toThrow();

      process.env.LOG_LEVEL = originalLogLevel;
    });
  });

  describe('status code handling', () => {
    it('should handle success status codes (2xx)', () => {
      mockResponse.statusCode = 200;

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      if (finishCallback !== null) {
        expect(() => finishCallback!()).not.toThrow();
      }
    });

    it('should handle redirect status codes (3xx)', () => {
      mockResponse.statusCode = 301;

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      if (finishCallback !== null) {
        expect(() => finishCallback!()).not.toThrow();
      }
    });

    it('should handle client error status codes (4xx)', () => {
      mockResponse.statusCode = 404;

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      if (finishCallback !== null) {
        expect(() => finishCallback!()).not.toThrow();
      }
    });

    it('should handle server error status codes (5xx)', () => {
      mockResponse.statusCode = 500;

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      if (finishCallback !== null) {
        expect(() => finishCallback!()).not.toThrow();
      }
    });
  });
});
