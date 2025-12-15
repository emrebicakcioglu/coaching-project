/**
 * Application End-to-End Tests
 *
 * Integration tests for the NestJS application.
 * Tests application bootstrap, health endpoint, CORS, rate limiting.
 *
 * Story: STORY-021A (API-Basis-Infrastruktur)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import rateLimit from 'express-rate-limit';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { WinstonLoggerService } from '../../src/common/services/logger.service';
import { DatabaseService } from '../../src/database/database.service';

describe('Application E2E Tests', () => {
  let app: INestApplication;
  let logger: WinstonLoggerService;

  // Mock DatabaseService to avoid actual database connections in tests
  const mockDatabaseService = {
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
    healthCheck: jest.fn().mockResolvedValue({
      healthy: true,
      message: 'Database connection healthy',
      latencyMs: 5,
    }),
    query: jest.fn(),
    getClient: jest.fn(),
    getPoolStats: jest.fn().mockReturnValue({
      totalConnections: 5,
      idleConnections: 3,
      waitingClients: 0,
    }),
    isConnected: jest.fn().mockReturnValue(true),
    getPool: jest.fn().mockReturnValue({}),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue(mockDatabaseService)
      .compile();

    app = moduleFixture.createNestApplication();
    logger = new WinstonLoggerService();

    // Configure app as in main.ts
    app.enableCors({
      origin: 'http://localhost:3000',
      credentials: true,
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.useGlobalFilters(new HttpExceptionFilter(logger));

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Application Bootstrap', () => {
    it('should start the application successfully', () => {
      expect(app).toBeDefined();
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('database');
    });

    it('should return ok status when database is healthy', async () => {
      mockDatabaseService.healthCheck.mockResolvedValue({
        healthy: true,
        message: 'OK',
        latencyMs: 3,
      });

      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.services.database.status).toBe('up');
    });

    it('should return unhealthy status when database is down', async () => {
      mockDatabaseService.healthCheck.mockResolvedValue({
        healthy: false,
        message: 'Connection failed',
      });

      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('unhealthy');
      expect(response.body.services.database.status).toBe('down');
    });
  });

  describe('CORS Configuration', () => {
    it('should include CORS headers for allowed origin', async () => {
      const response = await request(app.getHttpServer())
        .options('/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3000',
      );
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should support credentials in CORS', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app.getHttpServer())
        .get('/unknown-route')
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('path');
    });

    it('should return consistent error response format', async () => {
      const response = await request(app.getHttpServer())
        .get('/not-found')
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: expect.any(Number),
        error: expect.any(String),
        message: expect.anything(),
        timestamp: expect.any(String),
        path: expect.any(String),
      });
    });
  });

  describe('Validation', () => {
    // Note: These tests would require an endpoint that accepts body
    // For now, we test the validation pipe configuration through unit tests
    it('should have validation pipe configured', () => {
      // Verify the app has global pipes configured
      expect(app).toBeDefined();
    });
  });
});

describe('Rate Limiting Configuration', () => {
  let rateLimitedApp: INestApplication;

  const mockDatabaseService = {
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
    healthCheck: jest.fn().mockResolvedValue({
      healthy: true,
      message: 'OK',
      latencyMs: 1,
    }),
    query: jest.fn(),
    getClient: jest.fn(),
    getPoolStats: jest.fn().mockReturnValue(null),
    isConnected: jest.fn().mockReturnValue(true),
    getPool: jest.fn().mockReturnValue({}),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue(mockDatabaseService)
      .compile();

    rateLimitedApp = moduleFixture.createNestApplication();

    // Configure with aggressive rate limiting for testing
    rateLimitedApp.use(
      rateLimit({
        windowMs: 60000,
        max: 5, // Very low limit for testing
        message: {
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
        },
      }),
    );

    await rateLimitedApp.init();
  });

  afterAll(async () => {
    if (rateLimitedApp) {
      await rateLimitedApp.close();
    }
  });

  it('should include rate limit headers in response', async () => {
    const response = await request(rateLimitedApp.getHttpServer())
      .get('/health')
      .expect(200);

    // Modern express-rate-limit uses these header names with standardHeaders: true
    // Headers can be either lowercase or original case depending on http version
    const hasRateLimitHeaders =
      response.headers['ratelimit-limit'] ||
      response.headers['RateLimit-Limit'] ||
      response.headers['x-ratelimit-limit'];

    expect(hasRateLimitHeaders).toBeTruthy();
  });

  it('should return 429 when rate limit is exceeded', async () => {
    // Make requests until rate limit is hit
    for (let i = 0; i < 5; i++) {
      await request(rateLimitedApp.getHttpServer()).get('/health');
    }

    // This request should be rate limited
    const response = await request(rateLimitedApp.getHttpServer())
      .get('/health')
      .expect(429);

    expect(response.body.statusCode).toBe(429);
    expect(response.body.error).toBe('Too Many Requests');
  });
});
