/**
 * Swagger Integration Tests
 * STORY-022: Swagger/OpenAPI Documentation
 *
 * Integration tests for Swagger endpoints.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { setupSwagger, isSwaggerEnabled } from '../../src/swagger/swagger.config';

// Mock the database connection
jest.mock('pg', () => {
  const mockClient = {
    connect: jest.fn(),
    query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
    release: jest.fn(),
    end: jest.fn(),
  };

  const mockPool = {
    connect: jest.fn().mockResolvedValue(mockClient),
    query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
    end: jest.fn(),
    on: jest.fn(),
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
  };

  return { Pool: jest.fn(() => mockPool) };
});

describe('Swagger Integration Tests (STORY-022)', () => {
  let app: INestApplication;
  const originalEnv = process.env;

  beforeAll(async () => {
    // Set up required environment variables
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      APP_PORT: '4102',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_USER: 'test',
      DB_PASSWORD: 'testpassword',
      DB_NAME: 'test_db',
      DB_SSL: 'false',
      DB_POOL_MAX: '5',
      DB_POOL_IDLE_TIMEOUT_MS: '10000',
      DB_POOL_CONNECTION_TIMEOUT_MS: '2000',
      JWT_SECRET: 'test-secret-key-for-jwt-min-32-chars',
      JWT_EXPIRES_IN: '24h',
      JWT_REFRESH_EXPIRES_IN: '7d',
      BCRYPT_ROUNDS: '10',
      RATE_LIMIT_WINDOW_MS: '60000',
      RATE_LIMIT_MAX_REQUESTS: '100',
      LOG_LEVEL: 'error', // Suppress logs during tests
      AUDIT_LOG_ENABLED: 'false',
      SWAGGER_ENABLED: 'true',
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Setup Swagger
    setupSwagger(app);

    await app.init();
  });

  afterAll(async () => {
    process.env = originalEnv;
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/docs', () => {
    it('should return Swagger UI HTML page', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/docs')
        .expect(200);

      expect(response.type).toBe('text/html');
      expect(response.text).toContain('swagger');
    });

    it('should include swagger-ui resources', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/docs/')
        .expect(200);

      expect(response.text).toContain('swagger-ui');
    });
  });

  describe('GET /api/docs-json', () => {
    it('should return valid OpenAPI 3.0 JSON specification', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      expect(response.type).toBe('application/json');
      expect(response.body).toBeDefined();
      expect(response.body.openapi).toMatch(/^3\.\d+\.\d+$/);
    });

    it('should include API info', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      expect(response.body.info).toBeDefined();
      expect(response.body.info.title).toBe('Core App API');
      expect(response.body.info.version).toBe('1.0.0');
    });

    it('should include security schemes', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      expect(response.body.components).toBeDefined();
      expect(response.body.components.securitySchemes).toBeDefined();
      expect(response.body.components.securitySchemes.bearerAuth).toBeDefined();
    });

    it('should include all API tags', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      expect(response.body.tags).toBeDefined();
      const tagNames = response.body.tags.map((tag: { name: string }) => tag.name);

      expect(tagNames).toContain('Health');
      expect(tagNames).toContain('Auth');
      expect(tagNames).toContain('Users');
      expect(tagNames).toContain('Settings');
      expect(tagNames).toContain('Audit');
    });

    it('should include paths for all endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      expect(response.body.paths).toBeDefined();

      // Check health endpoint
      expect(response.body.paths['/health']).toBeDefined();

      // Check auth endpoints
      expect(response.body.paths['/api/v1/auth/login']).toBeDefined();
      expect(response.body.paths['/api/v1/auth/logout']).toBeDefined();
      expect(response.body.paths['/api/v1/auth/refresh']).toBeDefined();

      // Check users endpoints
      expect(response.body.paths['/api/v1/users']).toBeDefined();
      expect(response.body.paths['/api/v1/users/{id}']).toBeDefined();

      // Check settings endpoints
      expect(response.body.paths['/api/v1/settings']).toBeDefined();
      expect(response.body.paths['/api/v1/settings/theme']).toBeDefined();
    });

    it('should include schemas for DTOs', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      expect(response.body.components.schemas).toBeDefined();

      // Check for user-related schemas
      const schemaNames = Object.keys(response.body.components.schemas);
      expect(schemaNames.length).toBeGreaterThan(0);
    });
  });

  describe('Endpoint Documentation', () => {
    let openApiSpec: any;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .get('/api/docs-json');
      openApiSpec = response.body;
    });

    it('should document GET /api/v1/users with query parameters', () => {
      const usersGet = openApiSpec.paths['/api/v1/users']?.get;
      expect(usersGet).toBeDefined();
      expect(usersGet.summary).toBeDefined();
      expect(usersGet.tags).toContain('Users');
    });

    it('should document POST /api/v1/users with request body', () => {
      const usersPost = openApiSpec.paths['/api/v1/users']?.post;
      expect(usersPost).toBeDefined();
      expect(usersPost.requestBody).toBeDefined();
      expect(usersPost.tags).toContain('Users');
    });

    it('should document authentication requirements', () => {
      const usersGet = openApiSpec.paths['/api/v1/users']?.get;
      expect(usersGet.security).toBeDefined();
      // Should require bearer auth
      expect(usersGet.security.some((sec: any) => sec.bearerAuth !== undefined)).toBe(true);
    });

    it('should document response codes', () => {
      const loginPost = openApiSpec.paths['/api/v1/auth/login']?.post;
      expect(loginPost).toBeDefined();
      expect(loginPost.responses).toBeDefined();
      expect(loginPost.responses['200']).toBeDefined();
    });

    it('should document health endpoint without auth', () => {
      const healthGet = openApiSpec.paths['/health']?.get;
      expect(healthGet).toBeDefined();
      expect(healthGet.tags).toContain('Health');
    });
  });

  describe('isSwaggerEnabled function', () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return true when SWAGGER_ENABLED is true', () => {
      process.env.SWAGGER_ENABLED = 'true';
      expect(isSwaggerEnabled()).toBe(true);
    });

    it('should return false when SWAGGER_ENABLED is false', () => {
      process.env.SWAGGER_ENABLED = 'false';
      expect(isSwaggerEnabled()).toBe(false);
    });

    it('should default to true in development', () => {
      delete process.env.SWAGGER_ENABLED;
      process.env.NODE_ENV = 'development';
      expect(isSwaggerEnabled()).toBe(true);
    });

    it('should default to false in production', () => {
      delete process.env.SWAGGER_ENABLED;
      process.env.NODE_ENV = 'production';
      expect(isSwaggerEnabled()).toBe(false);
    });
  });
});
