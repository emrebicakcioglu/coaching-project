/**
 * Storage (MinIO) Health Service Unit Tests
 *
 * Tests for the storage connectivity health check service.
 *
 * Story: STORY-029 (Health Status)
 */

import { StorageHealthService } from '../../src/health/services/storage-health.service';
import * as http from 'http';

// Mock the http module
jest.mock('http');

describe('StorageHealthService', () => {
  let service: StorageHealthService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Clear environment variables
    delete process.env.MINIO_ENDPOINT;
    delete process.env.MINIO_PORT;
    delete process.env.MINIO_USE_SSL;
    delete process.env.STORAGE_CHECK_TIMEOUT;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('healthCheck', () => {
    it('should return healthy with "not configured" when MINIO_ENDPOINT is not set', async () => {
      service = new StorageHealthService();

      const result = await service.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.error).toBe('Storage not configured');
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should return healthy when MinIO responds with 200', async () => {
      process.env.MINIO_ENDPOINT = 'minio.example.com';
      process.env.MINIO_PORT = '9000';
      service = new StorageHealthService();

      const mockRequest = {
        on: jest.fn().mockReturnThis(),
        end: jest.fn(),
        destroy: jest.fn(),
      };

      const mockResponse = {
        statusCode: 200,
        resume: jest.fn(),
      };

      (http.request as jest.Mock).mockImplementation((_options, callback) => {
        // Simulate async response
        setTimeout(() => callback(mockResponse), 10);
        return mockRequest;
      });

      const result = await service.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('should return unhealthy when MinIO responds with non-200', async () => {
      process.env.MINIO_ENDPOINT = 'minio.example.com';
      process.env.MINIO_PORT = '9000';
      service = new StorageHealthService();

      const mockRequest = {
        on: jest.fn().mockReturnThis(),
        end: jest.fn(),
        destroy: jest.fn(),
      };

      const mockResponse = {
        statusCode: 500,
        resume: jest.fn(),
      };

      (http.request as jest.Mock).mockImplementation((_options, callback) => {
        setTimeout(() => callback(mockResponse), 10);
        return mockRequest;
      });

      const result = await service.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.error).toBe('Unexpected status code: 500');
    });

    it('should return unhealthy on connection timeout', async () => {
      process.env.MINIO_ENDPOINT = 'minio.example.com';
      process.env.MINIO_PORT = '9000';
      process.env.STORAGE_CHECK_TIMEOUT = '100';
      service = new StorageHealthService();

      let timeoutCallback: (() => void) | undefined;

      const mockRequest = {
        on: jest.fn().mockImplementation((event: string, callback: () => void) => {
          if (event === 'timeout') {
            timeoutCallback = callback;
          }
          return mockRequest;
        }),
        end: jest.fn(),
        destroy: jest.fn(),
      };

      (http.request as jest.Mock).mockImplementation(() => mockRequest);

      const resultPromise = service.healthCheck();

      // Trigger timeout
      setTimeout(() => {
        if (timeoutCallback) {
          timeoutCallback();
        }
      }, 50);

      const result = await resultPromise;

      expect(result.healthy).toBe(false);
      expect(result.error).toContain('Connection timeout');
      expect(mockRequest.destroy).toHaveBeenCalled();
    });

    it('should return unhealthy on connection error', async () => {
      process.env.MINIO_ENDPOINT = 'minio.example.com';
      process.env.MINIO_PORT = '9000';
      service = new StorageHealthService();

      let errorCallback: ((err: Error) => void) | undefined;

      const mockRequest = {
        on: jest.fn().mockImplementation((event: string, callback: (err?: Error) => void) => {
          if (event === 'error') {
            errorCallback = callback;
          }
          return mockRequest;
        }),
        end: jest.fn(),
        destroy: jest.fn(),
      };

      (http.request as jest.Mock).mockImplementation(() => mockRequest);

      const resultPromise = service.healthCheck();

      // Trigger error
      setTimeout(() => {
        if (errorCallback) {
          errorCallback(new Error('ECONNREFUSED'));
        }
      }, 10);

      const result = await resultPromise;

      expect(result.healthy).toBe(false);
      expect(result.error).toBe('ECONNREFUSED');
    });

    it('should use default port 4104 when MINIO_PORT is not set', async () => {
      process.env.MINIO_ENDPOINT = 'minio.example.com';
      service = new StorageHealthService();

      const mockRequest = {
        on: jest.fn().mockReturnThis(),
        end: jest.fn(),
        destroy: jest.fn(),
      };

      const mockResponse = {
        statusCode: 200,
        resume: jest.fn(),
      };

      (http.request as jest.Mock).mockImplementation((_options, callback) => {
        setTimeout(() => callback(mockResponse), 10);
        return mockRequest;
      });

      await service.healthCheck();

      expect(http.request).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 4104,
          hostname: 'minio.example.com',
          path: '/minio/health/live',
        }),
        expect.any(Function),
      );
    });

    it('should use custom port when MINIO_PORT is set', async () => {
      process.env.MINIO_ENDPOINT = 'minio.example.com';
      process.env.MINIO_PORT = '9000';
      service = new StorageHealthService();

      const mockRequest = {
        on: jest.fn().mockReturnThis(),
        end: jest.fn(),
        destroy: jest.fn(),
      };

      const mockResponse = {
        statusCode: 200,
        resume: jest.fn(),
      };

      (http.request as jest.Mock).mockImplementation((_options, callback) => {
        setTimeout(() => callback(mockResponse), 10);
        return mockRequest;
      });

      await service.healthCheck();

      expect(http.request).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 9000,
          hostname: 'minio.example.com',
        }),
        expect.any(Function),
      );
    });

    it('should call /minio/health/live endpoint', async () => {
      process.env.MINIO_ENDPOINT = 'minio.example.com';
      service = new StorageHealthService();

      const mockRequest = {
        on: jest.fn().mockReturnThis(),
        end: jest.fn(),
        destroy: jest.fn(),
      };

      const mockResponse = {
        statusCode: 200,
        resume: jest.fn(),
      };

      (http.request as jest.Mock).mockImplementation((_options, callback) => {
        setTimeout(() => callback(mockResponse), 10);
        return mockRequest;
      });

      await service.healthCheck();

      expect(http.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/minio/health/live',
          method: 'GET',
        }),
        expect.any(Function),
      );
    });
  });
});
