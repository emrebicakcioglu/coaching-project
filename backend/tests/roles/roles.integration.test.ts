/**
 * Roles API Integration Tests
 * STORY-007A: Rollen-Management Backend
 *
 * Integration tests for the Roles and Permissions API endpoints.
 * These tests require a running database connection.
 */

// Skip if not running integration tests
const RUN_INTEGRATION_TESTS = process.env.RUN_INTEGRATION_TESTS === 'true';

describe('Roles API Integration Tests', () => {
  if (!RUN_INTEGRATION_TESTS) {
    it.skip('Integration tests are disabled. Set RUN_INTEGRATION_TESTS=true to run.', () => {});
    return;
  }

  // Test configuration
  const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
  let adminToken: string;

  // Helper function to make authenticated requests
  const authRequest = async <T = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<{ status: number; data: T }> => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => null) as T;
    return { status: response.status, data };
  };

  beforeAll(async () => {
    // Login as admin to get token
    const loginResponse = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'TestPassword123!',
      }),
    });

    const loginData = await loginResponse.json();
    adminToken = loginData.access_token;
  });

  describe('GET /api/v1/roles', () => {
    it('should return all roles with user counts', async () => {
      const { status, data } = await authRequest('GET', '/api/v1/roles');

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);

      // Check role structure
      const role = data[0];
      expect(role).toHaveProperty('id');
      expect(role).toHaveProperty('name');
      expect(role).toHaveProperty('is_system');
      expect(role).toHaveProperty('userCount');
    });

    it('should require authentication', async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/roles`);
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/roles/:id', () => {
    it('should return a single role with permissions', async () => {
      // First get all roles to get a valid ID
      const listResponse = await authRequest('GET', '/api/v1/roles');
      const roleId = listResponse.data[0].id;

      const { status, data } = await authRequest('GET', `/api/v1/roles/${roleId}`);

      expect(status).toBe(200);
      expect(data).toHaveProperty('id', roleId);
      expect(data).toHaveProperty('permissions');
    });

    it('should return 404 for non-existent role', async () => {
      const { status } = await authRequest('GET', '/api/v1/roles/99999');
      expect(status).toBe(404);
    });
  });

  describe('POST /api/v1/roles', () => {
    let createdRoleId: number;

    it('should create a new role', async () => {
      const newRole = {
        name: `test-role-${Date.now()}`,
        description: 'Test role created by integration tests',
      };

      const { status, data } = await authRequest('POST', '/api/v1/roles', newRole);

      expect(status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data.name).toBe(newRole.name);
      expect(data.is_system).toBe(false);

      createdRoleId = data.id;
    });

    it('should return 409 for duplicate role name', async () => {
      const duplicateRole = { name: 'admin' };

      const { status } = await authRequest('POST', '/api/v1/roles', duplicateRole);
      expect(status).toBe(409);
    });

    afterAll(async () => {
      // Cleanup created role
      if (createdRoleId) {
        await authRequest('DELETE', `/api/v1/roles/${createdRoleId}`);
      }
    });
  });

  describe('PUT /api/v1/roles/:id', () => {
    let testRoleId: number;

    beforeAll(async () => {
      // Create a test role
      const { data } = await authRequest('POST', '/api/v1/roles', {
        name: `update-test-${Date.now()}`,
        description: 'Role for update tests',
      });
      testRoleId = data.id;
    });

    it('should update a role', async () => {
      const updates = {
        description: 'Updated description',
      };

      const { status, data } = await authRequest('PUT', `/api/v1/roles/${testRoleId}`, updates);

      expect(status).toBe(200);
      expect(data.description).toBe(updates.description);
    });

    it('should return 404 for non-existent role', async () => {
      const { status } = await authRequest('PUT', '/api/v1/roles/99999', { name: 'test' });
      expect(status).toBe(404);
    });

    afterAll(async () => {
      // Cleanup
      if (testRoleId) {
        await authRequest('DELETE', `/api/v1/roles/${testRoleId}`);
      }
    });
  });

  describe('DELETE /api/v1/roles/:id', () => {
    it('should delete a non-system role', async () => {
      // Create a role to delete
      const { data: created } = await authRequest('POST', '/api/v1/roles', {
        name: `delete-test-${Date.now()}`,
      });

      const { status, data } = await authRequest('DELETE', `/api/v1/roles/${created.id}`);

      expect(status).toBe(200);
      expect(data.message).toContain('deleted successfully');
    });

    it('should return 403 when trying to delete system role', async () => {
      // Try to delete admin role (ID 1, system role)
      const { data: roles } = await authRequest('GET', '/api/v1/roles');
      const adminRole = roles.find((r: any) => r.name === 'admin' && r.is_system);

      if (adminRole) {
        const { status } = await authRequest('DELETE', `/api/v1/roles/${adminRole.id}`);
        expect(status).toBe(403);
      }
    });
  });

  describe('GET /api/v1/permissions', () => {
    it('should return all permissions', async () => {
      const { status, data } = await authRequest('GET', '/api/v1/permissions');

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);

      const permission = data[0];
      expect(permission).toHaveProperty('id');
      expect(permission).toHaveProperty('name');
      expect(permission).toHaveProperty('category');
    });
  });

  describe('GET /api/v1/permissions/grouped', () => {
    it('should return permissions grouped by category', async () => {
      const { status, data } = await authRequest('GET', '/api/v1/permissions/grouped');

      expect(status).toBe(200);
      expect(data).toHaveProperty('categories');
      expect(data).toHaveProperty('total');
      expect(typeof data.total).toBe('number');
    });
  });

  describe('GET /api/v1/permissions/categories', () => {
    it('should return all permission categories', async () => {
      const { status, data } = await authRequest('GET', '/api/v1/permissions/categories');

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toContain('users');
      expect(data).toContain('roles');
    });
  });

  describe('Role Permission Management', () => {
    let testRoleId: number;

    interface RoleResponse {
      id: number;
      name: string;
      permissions?: { id: number }[];
    }

    interface PermissionResponse {
      id: number;
      name: string;
    }

    beforeAll(async () => {
      // Create a test role
      const { data } = await authRequest<RoleResponse>('POST', '/api/v1/roles', {
        name: `perm-test-${Date.now()}`,
        description: 'Role for permission tests',
      });
      testRoleId = data.id;
    });

    it('should assign permissions to a role', async () => {
      // Get some permission IDs
      const { data: permissions } = await authRequest<PermissionResponse[]>('GET', '/api/v1/permissions');
      const permissionIds = permissions.slice(0, 2).map((p) => p.id);

      const { status, data } = await authRequest<RoleResponse>('POST', `/api/v1/roles/${testRoleId}/permissions`, {
        permissionIds,
      });

      expect(status).toBe(200);
      expect(data.permissions).toBeDefined();
      expect(data.permissions!.length).toBeGreaterThanOrEqual(permissionIds.length);
    });

    it('should remove permissions from a role', async () => {
      // Get current permissions
      const { data: role } = await authRequest<RoleResponse>('GET', `/api/v1/roles/${testRoleId}`);

      if (role.permissions && role.permissions.length > 0) {
        const permissionIds = [role.permissions[0].id];

        const { status } = await authRequest('DELETE', `/api/v1/roles/${testRoleId}/permissions`, {
          permissionIds,
        });

        expect(status).toBe(200);
      }
    });

    afterAll(async () => {
      // Cleanup
      if (testRoleId) {
        await authRequest('DELETE', `/api/v1/roles/${testRoleId}`);
      }
    });
  });
});
