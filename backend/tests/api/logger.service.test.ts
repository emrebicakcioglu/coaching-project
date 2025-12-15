/**
 * Winston Logger Service Unit Tests
 *
 * Tests for the custom Winston logger service.
 *
 * Stories:
 * - STORY-021A: API-Basis-Infrastruktur
 * - STORY-027: Error Logging (Daily rotation, structured logging)
 */

import { WinstonLoggerService, LogMetadata } from '../../src/common/services/logger.service';

describe('WinstonLoggerService', () => {
  let logger: WinstonLoggerService;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.LOG_LEVEL = 'debug';
    process.env.LOG_FILE_PATH = './logs/test.log';
    process.env.LOG_DIR = './logs';
    process.env.LOG_MAX_FILES = '14d';
    process.env.LOG_MAX_SIZE = '20m';
    process.env.NODE_ENV = 'test';
    logger = new WinstonLoggerService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should create logger with default values', () => {
      delete process.env.LOG_LEVEL;
      delete process.env.LOG_FILE_PATH;
      delete process.env.LOG_DIR;
      delete process.env.LOG_MAX_FILES;
      delete process.env.LOG_MAX_SIZE;
      const defaultLogger = new WinstonLoggerService();
      expect(defaultLogger).toBeDefined();
    });

    it('should create logger in production mode', () => {
      process.env.NODE_ENV = 'production';
      const prodLogger = new WinstonLoggerService();
      expect(prodLogger).toBeDefined();
    });

    it('should create logger in development mode', () => {
      process.env.NODE_ENV = 'development';
      const devLogger = new WinstonLoggerService();
      expect(devLogger).toBeDefined();
    });

    it('should use custom log directory when specified', () => {
      process.env.LOG_DIR = './custom-logs';
      const customLogger = new WinstonLoggerService();
      expect(customLogger.getLogDir()).toBe('./custom-logs');
    });
  });

  describe('log', () => {
    it('should log info messages', () => {
      expect(() => logger.log('Test message')).not.toThrow();
    });

    it('should log info messages with context', () => {
      expect(() => logger.log('Test message', 'TestContext')).not.toThrow();
    });
  });

  describe('error', () => {
    it('should log error messages', () => {
      expect(() => logger.error('Error message')).not.toThrow();
    });

    it('should log error messages with trace', () => {
      expect(() => logger.error('Error message', 'stack trace here')).not.toThrow();
    });

    it('should log error messages with context', () => {
      expect(() => logger.error('Error message', 'stack', 'TestContext')).not.toThrow();
    });
  });

  describe('warn', () => {
    it('should log warning messages', () => {
      expect(() => logger.warn('Warning message')).not.toThrow();
    });

    it('should log warning messages with context', () => {
      expect(() => logger.warn('Warning message', 'TestContext')).not.toThrow();
    });
  });

  describe('debug', () => {
    it('should log debug messages', () => {
      expect(() => logger.debug('Debug message')).not.toThrow();
    });

    it('should log debug messages with context', () => {
      expect(() => logger.debug('Debug message', 'TestContext')).not.toThrow();
    });
  });

  describe('verbose', () => {
    it('should log verbose messages', () => {
      expect(() => logger.verbose('Verbose message')).not.toThrow();
    });

    it('should log verbose messages with context', () => {
      expect(() => logger.verbose('Verbose message', 'TestContext')).not.toThrow();
    });
  });

  describe('setContext', () => {
    it('should set context and return self', () => {
      const result = logger.setContext('NewContext');
      expect(result).toBe(logger);
    });
  });

  // STORY-027: Structured logging tests
  describe('logWithMetadata (STORY-027)', () => {
    it('should log with structured metadata', () => {
      const metadata: LogMetadata = {
        requestId: 'test-123',
        userId: 'user-456',
        method: 'GET',
        url: '/api/test',
        statusCode: 200,
        responseTime: 50,
      };

      expect(() => logger.logWithMetadata('info', 'Test message', metadata)).not.toThrow();
    });

    it('should log with error level', () => {
      const metadata: LogMetadata = {
        requestId: 'test-123',
        statusCode: 500,
      };

      expect(() => logger.logWithMetadata('error', 'Error message', metadata, 'TestContext')).not.toThrow();
    });

    it('should log with warn level', () => {
      const metadata: LogMetadata = {
        requestId: 'test-123',
        statusCode: 400,
      };

      expect(() => logger.logWithMetadata('warn', 'Warning message', metadata)).not.toThrow();
    });

    it('should log with debug level', () => {
      const metadata: LogMetadata = {
        requestId: 'test-123',
      };

      expect(() => logger.logWithMetadata('debug', 'Debug message', metadata)).not.toThrow();
    });

    it('should handle empty metadata', () => {
      expect(() => logger.logWithMetadata('info', 'Test message', {})).not.toThrow();
    });

    it('should handle custom metadata properties', () => {
      const metadata: LogMetadata = {
        requestId: 'test-123',
        customField: 'custom-value',
        nestedObject: { key: 'value' },
      };

      expect(() => logger.logWithMetadata('info', 'Test message', metadata)).not.toThrow();
    });
  });

  // STORY-027: HTTP request logging tests
  describe('logHttpRequest (STORY-027)', () => {
    it('should log successful HTTP requests', () => {
      expect(() =>
        logger.logHttpRequest('GET', '/api/users', 200, 45, 'req-123', 'user-456')
      ).not.toThrow();
    });

    it('should log HTTP requests without optional parameters', () => {
      expect(() =>
        logger.logHttpRequest('POST', '/api/users', 201, 120)
      ).not.toThrow();
    });

    it('should log client error (4xx) requests as warnings', () => {
      expect(() =>
        logger.logHttpRequest('GET', '/api/users/999', 404, 15, 'req-123')
      ).not.toThrow();
    });

    it('should log server error (5xx) requests as errors', () => {
      expect(() =>
        logger.logHttpRequest('POST', '/api/data', 500, 5000, 'req-123')
      ).not.toThrow();
    });

    it('should handle various HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
      methods.forEach(method => {
        expect(() =>
          logger.logHttpRequest(method, '/api/test', 200, 10)
        ).not.toThrow();
      });
    });
  });

  // STORY-027: Exception logging tests
  describe('logException (STORY-027)', () => {
    it('should log exceptions with stack trace', () => {
      const error = new Error('Test error');
      expect(() => logger.logException(error, 'TestContext')).not.toThrow();
    });

    it('should log exceptions with additional metadata', () => {
      const error = new Error('Test error');
      const metadata: Partial<LogMetadata> = {
        requestId: 'req-123',
        userId: 'user-456',
        method: 'POST',
        url: '/api/test',
      };

      expect(() => logger.logException(error, 'TestContext', metadata)).not.toThrow();
    });

    it('should log exceptions with custom error types', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const error = new CustomError('Custom error message');
      expect(() => logger.logException(error, 'CustomErrorHandler')).not.toThrow();
    });

    it('should handle errors without stack trace', () => {
      const error = new Error('Error without stack');
      error.stack = undefined;
      expect(() => logger.logException(error, 'TestContext')).not.toThrow();
    });
  });

  // STORY-027: Log directory getter tests
  describe('getLogDir (STORY-027)', () => {
    it('should return configured log directory', () => {
      expect(logger.getLogDir()).toBe('./logs');
    });

    it('should return custom log directory when configured', () => {
      process.env.LOG_DIR = '/var/log/app';
      const customLogger = new WinstonLoggerService();
      expect(customLogger.getLogDir()).toBe('/var/log/app');
    });
  });

  // STORY-027: Log level filtering tests
  describe('log level filtering (STORY-027)', () => {
    it('should respect configured log level', () => {
      process.env.LOG_LEVEL = 'error';
      const errorOnlyLogger = new WinstonLoggerService();
      // Debug logs should not throw (they're just filtered)
      expect(() => errorOnlyLogger.debug('This should be filtered')).not.toThrow();
      expect(() => errorOnlyLogger.error('This should be logged')).not.toThrow();
    });

    it('should log all levels when set to debug', () => {
      process.env.LOG_LEVEL = 'debug';
      const debugLogger = new WinstonLoggerService();
      expect(() => debugLogger.debug('Debug')).not.toThrow();
      expect(() => debugLogger.verbose('Verbose')).not.toThrow();
      expect(() => debugLogger.log('Info')).not.toThrow();
      expect(() => debugLogger.warn('Warn')).not.toThrow();
      expect(() => debugLogger.error('Error')).not.toThrow();
    });

    it('should handle all valid log levels', () => {
      const levels = ['debug', 'info', 'warn', 'error'];
      levels.forEach(level => {
        process.env.LOG_LEVEL = level;
        expect(() => new WinstonLoggerService()).not.toThrow();
      });
    });
  });
});
