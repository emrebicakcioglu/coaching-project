/**
 * Jira Settings Integration Tests
 * STORY-041D: Jira Settings API
 *
 * Integration tests for Jira Settings API endpoints:
 * - GET /api/v1/settings/jira - Get Jira settings
 * - PUT /api/v1/settings/jira - Update Jira settings
 * - POST /api/v1/settings/jira/test - Test connection
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JiraModule } from '../../src/jira/jira.module';
import { DatabaseService } from '../../src/database/database.service';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/common/guards/roles.guard';
import { RateLimitGuard } from '../../src/common/guards/rate-limit.guard';
import * as crypto from 'crypto';

// Set test encryption key
const TEST_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

describe('Jira Settings API (Integration)', () => {
  let app: INestApplication;
  let mockPool: {
    query: jest.Mock;
  };

  beforeAll(async () => {
    mockPool = {
      query: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [JiraModule],
    })
      .overrideProvider(DatabaseService)
      .useValue({
        ensurePool: () => mockPool,
        getPool: () => mockPool,
      })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: 1, email: 'admin@test.com' };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/settings/jira', () => {
    it('should return Jira settings with masked token', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          integrations: {
            jira: {
              enabled: true,
              url: 'company.atlassian.net',
              email: 'jira@company.com',
              apiToken: 'encrypted:iv:tag:token',
              projectKey: 'FEEDBACK',
              issueType: 'Bug',
            },
          },
          updated_at: new Date(),
        }],
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/settings/jira')
        .expect(200);

      expect(response.body.enabled).toBe(true);
      expect(response.body.url).toBe('company.atlassian.net');
      expect(response.body.apiToken).toBe('********');
      expect(response.body.isConfigured).toBe(true);
    });

    it('should return defaults when no settings exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app.getHttpServer())
        .get('/api/v1/settings/jira')
        .expect(200);

      expect(response.body.enabled).toBe(false);
      expect(response.body.url).toBe('');
      expect(response.body.isConfigured).toBe(false);
    });
  });

  describe('PUT /api/v1/settings/jira', () => {
    beforeEach(() => {
      // Mock for getJiraSettings (audit)
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          integrations: {
            jira: {
              enabled: false,
              url: '',
              email: '',
              apiToken: '',
              projectKey: '',
              issueType: 'Bug',
            },
          },
          updated_at: new Date(),
        }],
      });
      // Mock for existing integrations
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          integrations: {},
        }],
      });
    });

    it('should update Jira settings successfully', async () => {
      // Mock update query
      mockPool.query.mockResolvedValueOnce({ rows: [{ updated_at: new Date() }] });
      // Mock get updated settings
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          integrations: {
            jira: {
              enabled: true,
              url: 'company.atlassian.net',
              email: 'jira@company.com',
              apiToken: 'encrypted:data',
              projectKey: 'FEEDBACK',
              issueType: 'Bug',
            },
          },
          updated_at: new Date(),
        }],
      });

      const response = await request(app.getHttpServer())
        .put('/api/v1/settings/jira')
        .send({
          enabled: true,
          url: 'company.atlassian.net',
          email: 'jira@company.com',
          apiToken: 'test-token',
          projectKey: 'FEEDBACK',
          issueType: 'Bug',
        })
        .expect(200);

      expect(response.body.enabled).toBe(true);
      expect(response.body.apiToken).toBe('********');
    });

    it('should validate URL format', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/settings/jira')
        .send({
          url: 'invalid-url',
        })
        .expect(400);

      // Validation returns array of error messages
      expect(response.body.message).toEqual(expect.arrayContaining([expect.stringContaining('Atlassian')]));
    });

    it('should validate email format', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/settings/jira')
        .send({
          email: 'not-an-email',
        })
        .expect(400);

      // Validation returns array of error messages
      expect(response.body.message).toEqual(expect.arrayContaining([expect.stringContaining('email')]));
    });

    it('should validate project key format', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/settings/jira')
        .send({
          projectKey: 'invalid-key', // Must be uppercase
        })
        .expect(400);

      // Validation returns array of error messages
      expect(response.body.message).toEqual(expect.arrayContaining([expect.stringContaining('Project key must be uppercase')]));
    });

    it('should allow partial updates', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ updated_at: new Date() }] });
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          integrations: {
            jira: {
              enabled: false,
              url: '',
              email: '',
              apiToken: '',
              projectKey: '',
              issueType: 'Bug',
            },
          },
          updated_at: new Date(),
        }],
      });

      const response = await request(app.getHttpServer())
        .put('/api/v1/settings/jira')
        .send({
          enabled: false,
        })
        .expect(200);

      expect(response.body.enabled).toBe(false);
    });
  });

  describe('POST /api/v1/settings/jira/test', () => {
    it('should return error when not configured (no rows)', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app.getHttpServer())
        .post('/api/v1/settings/jira/test')
        .expect(201);

      expect(response.body.success).toBe(false);
      // Service returns "Jira is not configured" when no settings found
      expect(['Jira is not configured', 'Jira configuration is incomplete']).toContain(response.body.message);
    });

    it('should return error for incomplete configuration', async () => {
      // Return empty integrations
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          integrations: {},
        }],
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/settings/jira/test')
        .expect(201);

      expect(response.body.success).toBe(false);
    });
  });
});
