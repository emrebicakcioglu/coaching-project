/**
 * User Role Assignment Integration Tests
 * STORY-007B: User Role Assignment
 *
 * Integration tests for the user role assignment API endpoints
 * Tests role assignment, removal, and permission aggregation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { Pool } from 'pg';
import { AppModule } from '../../src/app.module';

// Skip if not running integration tests
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

/**
 * Helper to get auth headers for admin user
 */
const getAdminAuthHeaders = async (app: INestApplication): Promise<{ Authorization: string }> => {
  // Login as admin
  const loginResponse = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({
      email: 'admin@example.com',
      password: 'TestPassword123!',
    });

  return {
    Authorization: `Bearer ${loginResponse.body.access_token}`,
  };
};

(runIntegrationTests ? describe : describe.skip)('User Role Assignment API (Integration)', () => {
  let app: INestApplication;
  let pool: Pool;
  let authHeaders: { Authorization: string };
  let testUserId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
    }));

    await app.init();

    // Get database pool
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Get admin auth headers
    authHeaders = await getAdminAuthHeaders(app);

    // Create a test user
    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(authHeaders)
      .send({
        email: 'testuser@example.com',
        password: 'TestUser123!@#',
        name: 'Test User',
        roles: ['user'],
      });

    testUserId = createResponse.body.id;
  });

  afterAll(async () => {
    // Clean up test user
    if (testUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }

    await pool.end();
    await app.close();
  });

  describe('POST /api/v1/users/:id/roles', () => {
    it('should assign a role to a user', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/users/${testUserId}/roles`)
        .set(authHeaders)
        .send({ roles: ['admin'] })
        .expect(HttpStatus.OK);

      expect(response.body.message).toBe('Roles assigned successfully');

      // Verify role was assigned
      const userResponse = await request(app.getHttpServer())
        .get(`/api/v1/users/${testUserId}`)
        .set(authHeaders)
        .expect(HttpStatus.OK);

      const roleNames = userResponse.body.roles.map((r: { name: string }) => r.name);
      expect(roleNames).toContain('admin');
    });

    it('should assign multiple roles at once', async () => {
      // First remove existing roles
      await request(app.getHttpServer())
        .delete(`/api/v1/users/${testUserId}/roles`)
        .set(authHeaders)
        .send({ roles: ['admin', 'user'] });

      // Assign multiple roles
      const response = await request(app.getHttpServer())
        .post(`/api/v1/users/${testUserId}/roles`)
        .set(authHeaders)
        .send({ roles: ['editor', 'viewer'] })
        .expect(HttpStatus.OK);

      expect(response.body.message).toBe('Roles assigned successfully');

      // Verify roles were assigned
      const userResponse = await request(app.getHttpServer())
        .get(`/api/v1/users/${testUserId}`)
        .set(authHeaders)
        .expect(HttpStatus.OK);

      const roleNames = userResponse.body.roles.map((r: { name: string }) => r.name);
      expect(roleNames).toContain('editor');
      expect(roleNames).toContain('viewer');
    });

    it('should return 400 for non-existent role', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/users/${testUserId}/roles`)
        .set(authHeaders)
        .send({ roles: ['non_existent_role'] })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('not found');
    });

    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/99999/roles')
        .set(authHeaders)
        .send({ roles: ['user'] })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/users/${testUserId}/roles`)
        .send({ roles: ['user'] })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('DELETE /api/v1/users/:id/roles', () => {
    beforeEach(async () => {
      // Ensure user has some roles
      await request(app.getHttpServer())
        .post(`/api/v1/users/${testUserId}/roles`)
        .set(authHeaders)
        .send({ roles: ['admin', 'editor'] });
    });

    it('should remove a role from a user', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/users/${testUserId}/roles`)
        .set(authHeaders)
        .send({ roles: ['admin'] })
        .expect(HttpStatus.OK);

      expect(response.body.message).toBe('Roles removed successfully');

      // Verify role was removed
      const userResponse = await request(app.getHttpServer())
        .get(`/api/v1/users/${testUserId}`)
        .set(authHeaders)
        .expect(HttpStatus.OK);

      const roleNames = userResponse.body.roles.map((r: { name: string }) => r.name);
      expect(roleNames).not.toContain('admin');
    });

    it('should remove multiple roles at once', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/users/${testUserId}/roles`)
        .set(authHeaders)
        .send({ roles: ['admin', 'editor'] })
        .expect(HttpStatus.OK);

      expect(response.body.message).toBe('Roles removed successfully');

      // Verify roles were removed
      const userResponse = await request(app.getHttpServer())
        .get(`/api/v1/users/${testUserId}`)
        .set(authHeaders)
        .expect(HttpStatus.OK);

      const roleNames = userResponse.body.roles.map((r: { name: string }) => r.name);
      expect(roleNames).not.toContain('admin');
      expect(roleNames).not.toContain('editor');
    });

    it('should silently succeed for non-existent role', async () => {
      // Removing a role that doesn't exist should not fail
      await request(app.getHttpServer())
        .delete(`/api/v1/users/${testUserId}/roles`)
        .set(authHeaders)
        .send({ roles: ['non_existent_role'] })
        .expect(HttpStatus.OK);
    });
  });

  describe('GET /api/v1/users/:id/permissions', () => {
    beforeEach(async () => {
      // Set up user with known roles
      await request(app.getHttpServer())
        .delete(`/api/v1/users/${testUserId}/roles`)
        .set(authHeaders)
        .send({ roles: ['admin', 'editor', 'viewer', 'user'] });

      await request(app.getHttpServer())
        .post(`/api/v1/users/${testUserId}/roles`)
        .set(authHeaders)
        .send({ roles: ['user'] });
    });

    it('should return user with aggregated permissions', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/${testUserId}/permissions`)
        .set(authHeaders)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('id', testUserId);
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('roles');
      expect(response.body).toHaveProperty('permissions');
      expect(Array.isArray(response.body.permissions)).toBe(true);
    });

    it('should return empty permissions for user without roles', async () => {
      // Remove all roles
      await request(app.getHttpServer())
        .delete(`/api/v1/users/${testUserId}/roles`)
        .set(authHeaders)
        .send({ roles: ['user'] });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/${testUserId}/permissions`)
        .set(authHeaders)
        .expect(HttpStatus.OK);

      expect(response.body.permissions).toEqual([]);
      expect(response.body.roles).toEqual([]);
    });

    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/99999/permissions')
        .set(authHeaders)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('Token Invalidation', () => {
    it('should invalidate user tokens after role assignment', async () => {
      // Login as test user
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'TestUser123!@#',
        })
        .expect(HttpStatus.OK);

      // userToken is not used directly, but we need to verify the tokens were issued
      const _userToken = loginResponse.body.access_token;
      const refreshToken = loginResponse.body.refresh_token;

      // Assign a new role (this should invalidate tokens)
      await request(app.getHttpServer())
        .post(`/api/v1/users/${testUserId}/roles`)
        .set(authHeaders)
        .send({ roles: ['admin'] })
        .expect(HttpStatus.OK);

      // Attempt to refresh token - should fail after role change
      const refreshResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: refreshToken });

      // Token should be invalidated
      expect(refreshResponse.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('Multi-role Support', () => {
    it('should support user having multiple roles simultaneously', async () => {
      // Clear existing roles
      await request(app.getHttpServer())
        .delete(`/api/v1/users/${testUserId}/roles`)
        .set(authHeaders)
        .send({ roles: ['admin', 'editor', 'viewer', 'user'] });

      // Assign multiple roles
      await request(app.getHttpServer())
        .post(`/api/v1/users/${testUserId}/roles`)
        .set(authHeaders)
        .send({ roles: ['admin', 'editor'] });

      // Verify user has both roles
      const userResponse = await request(app.getHttpServer())
        .get(`/api/v1/users/${testUserId}`)
        .set(authHeaders)
        .expect(HttpStatus.OK);

      const roleNames = userResponse.body.roles.map((r: { name: string }) => r.name);
      expect(roleNames).toContain('admin');
      expect(roleNames).toContain('editor');
      expect(roleNames.length).toBeGreaterThanOrEqual(2);
    });
  });
});
