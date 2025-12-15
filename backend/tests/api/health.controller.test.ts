/**
 * Health Controller Unit Tests
 *
 * Tests for the health check endpoints.
 *
 * Stories:
 * - STORY-021A: API-Basis-Infrastruktur
 * - STORY-029: Health Status (SMTP, MinIO checks, /api/health endpoint)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { HealthController } from '../../src/health/health.controller';
import { HealthService, HealthCheckResponse } from '../../src/health/health.service';
import { DatabaseService } from '../../src/database/database.service';
import { SmtpHealthService } from '../../src/health/services/smtp-health.service';
import { StorageHealthService } from '../../src/health/services/storage-health.service';

describe('HealthController', () => {
  let controller: HealthController;

  const mockDatabaseService = {
    healthCheck: jest.fn(),
  };

  const mockSmtpHealthService = {
    healthCheck: jest.fn(),
  };

  const mockStorageHealthService = {
    healthCheck: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: SmtpHealthService,
          useValue: mockSmtpHealthService,
        },
        {
          provide: StorageHealthService,
          useValue: mockStorageHealthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('check (legacy /health endpoint)', () => {
    it('should return healthy status when database is up', async () => {
      mockDatabaseService.healthCheck.mockResolvedValue({
        healthy: true,
        message: 'Database connection healthy',
        latencyMs: 5,
      });

      const result: HealthCheckResponse = await controller.check();

      expect(result.status).toBe('ok');
      expect(result.services.database.status).toBe('up');
      expect(result.services.database.latency).toBe(5);
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return unhealthy status when database is down', async () => {
      mockDatabaseService.healthCheck.mockResolvedValue({
        healthy: false,
        message: 'Connection failed',
      });

      const result: HealthCheckResponse = await controller.check();

      expect(result.status).toBe('unhealthy');
      expect(result.services.database.status).toBe('down');
    });

    it('should handle database health check errors', async () => {
      mockDatabaseService.healthCheck.mockRejectedValue(
        new Error('Connection timeout'),
      );

      const result: HealthCheckResponse = await controller.check();

      expect(result.status).toBe('unhealthy');
      expect(result.services.database.status).toBe('down');
      expect(result.services.database.error).toBe('Connection timeout');
    });

    it('should include environment information', async () => {
      mockDatabaseService.healthCheck.mockResolvedValue({
        healthy: true,
        message: 'OK',
        latencyMs: 1,
      });

      const result: HealthCheckResponse = await controller.check();

      expect(result.environment).toBeDefined();
      expect(result.version).toBeDefined();
    });
  });

  describe('checkAllComponents (new /api/health endpoint - STORY-029)', () => {
    let mockResponse: Partial<Response>;

    beforeEach(() => {
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
    });

    it('should return 200 with healthy status when all checks pass', async () => {
      mockDatabaseService.healthCheck.mockResolvedValue({
        healthy: true,
        latencyMs: 5,
      });
      mockSmtpHealthService.healthCheck.mockResolvedValue({
        healthy: true,
        responseTimeMs: 120,
      });
      mockStorageHealthService.healthCheck.mockResolvedValue({
        healthy: true,
        responseTimeMs: 15,
      });

      await controller.checkAllComponents(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          checks: expect.objectContaining({
            database: expect.objectContaining({ status: 'healthy' }),
            smtp: expect.objectContaining({ status: 'healthy' }),
            storage: expect.objectContaining({ status: 'healthy' }),
          }),
        }),
      );
    });

    it('should return 200 with degraded status when non-critical service is down', async () => {
      mockDatabaseService.healthCheck.mockResolvedValue({
        healthy: true,
        latencyMs: 5,
      });
      mockSmtpHealthService.healthCheck.mockResolvedValue({
        healthy: false,
        responseTimeMs: 5000,
        error: 'Connection refused',
      });
      mockStorageHealthService.healthCheck.mockResolvedValue({
        healthy: true,
        responseTimeMs: 15,
      });

      await controller.checkAllComponents(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'degraded',
          checks: expect.objectContaining({
            database: expect.objectContaining({ status: 'healthy' }),
            smtp: expect.objectContaining({ status: 'unhealthy' }),
            storage: expect.objectContaining({ status: 'healthy' }),
          }),
        }),
      );
    });

    it('should return 503 with unhealthy status when database is down', async () => {
      mockDatabaseService.healthCheck.mockResolvedValue({
        healthy: false,
        latencyMs: 5000,
      });
      mockSmtpHealthService.healthCheck.mockResolvedValue({
        healthy: true,
        responseTimeMs: 120,
      });
      mockStorageHealthService.healthCheck.mockResolvedValue({
        healthy: true,
        responseTimeMs: 15,
      });

      await controller.checkAllComponents(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.SERVICE_UNAVAILABLE,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'unhealthy',
          checks: expect.objectContaining({
            database: expect.objectContaining({ status: 'unhealthy' }),
          }),
        }),
      );
    });

    it('should return 200 with healthy status when SMTP is not configured', async () => {
      mockDatabaseService.healthCheck.mockResolvedValue({
        healthy: true,
        latencyMs: 5,
      });
      mockSmtpHealthService.healthCheck.mockResolvedValue({
        healthy: true,
        responseTimeMs: 0,
        error: 'SMTP not configured',
      });
      mockStorageHealthService.healthCheck.mockResolvedValue({
        healthy: true,
        responseTimeMs: 0,
        error: 'Storage not configured',
      });

      await controller.checkAllComponents(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
        }),
      );
    });

    it('should include response times for all components', async () => {
      mockDatabaseService.healthCheck.mockResolvedValue({
        healthy: true,
        latencyMs: 5,
      });
      mockSmtpHealthService.healthCheck.mockResolvedValue({
        healthy: true,
        responseTimeMs: 120,
      });
      mockStorageHealthService.healthCheck.mockResolvedValue({
        healthy: true,
        responseTimeMs: 15,
      });

      await controller.checkAllComponents(mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          checks: expect.objectContaining({
            database: expect.objectContaining({ responseTime: 5 }),
            smtp: expect.objectContaining({ responseTime: 120 }),
            storage: expect.objectContaining({ responseTime: 15 }),
          }),
        }),
      );
    });

    it('should include timestamp and uptime', async () => {
      mockDatabaseService.healthCheck.mockResolvedValue({
        healthy: true,
        latencyMs: 5,
      });
      mockSmtpHealthService.healthCheck.mockResolvedValue({
        healthy: true,
        responseTimeMs: 120,
      });
      mockStorageHealthService.healthCheck.mockResolvedValue({
        healthy: true,
        responseTimeMs: 15,
      });

      await controller.checkAllComponents(mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
          uptime: expect.any(Number),
        }),
      );
    });

    it('should execute health checks in parallel', async () => {
      const startTime = Date.now();

      // Each service takes 100ms
      mockDatabaseService.healthCheck.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ healthy: true, latencyMs: 5 }), 100)),
      );
      mockSmtpHealthService.healthCheck.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ healthy: true, responseTimeMs: 100 }), 100)),
      );
      mockStorageHealthService.healthCheck.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ healthy: true, responseTimeMs: 100 }), 100)),
      );

      await controller.checkAllComponents(mockResponse as Response);

      const duration = Date.now() - startTime;

      // If sequential, would take ~300ms. If parallel, should take ~100-150ms
      expect(duration).toBeLessThan(200);
    });

    it('should return 200 with degraded when storage is down but configured', async () => {
      mockDatabaseService.healthCheck.mockResolvedValue({
        healthy: true,
        latencyMs: 5,
      });
      mockSmtpHealthService.healthCheck.mockResolvedValue({
        healthy: true,
        responseTimeMs: 120,
      });
      mockStorageHealthService.healthCheck.mockResolvedValue({
        healthy: false,
        responseTimeMs: 5000,
        error: 'Connection refused',
      });

      await controller.checkAllComponents(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'degraded',
        }),
      );
    });
  });
});
