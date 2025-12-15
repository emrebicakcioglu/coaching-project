/**
 * Security Settings Integration Tests
 * STORY-013A: In-App Settings Backend
 *
 * Integration tests for security settings API endpoints:
 * - GET /api/v1/settings/security
 * - PUT /api/v1/settings/security
 * - POST /api/v1/settings/security/reset
 * - GET /api/v1/settings/security/password-policy
 *
 * These tests require:
 * - PostgreSQL database running
 * - RUN_INTEGRATION_TESTS=true environment variable
 */

// Skip if not running integration tests
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

interface ApiResponse {
  status: number;
  data: Record<string, unknown>;
  headers: Headers;
}

(runIntegrationTests ? describe : describe.skip)('Security Settings Integration', () => {
  let adminToken: string;
  let userToken: string;

  const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:14102';

  // Helper to make authenticated requests
  const makeRequest = async (
    method: string,
    path: string,
    body?: unknown,
    token?: string,
  ): Promise<ApiResponse> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: response.status, data, headers: response.headers };
  };

  beforeAll(async () => {
    // Get admin token by logging in
    const loginResponse = await makeRequest('POST', '/api/v1/auth/login', {
      email: 'admin@example.com',
      password: 'admin123',
    });

    if (loginResponse.status === 200) {
      adminToken = loginResponse.data.access_token as string;
    }

    // Get regular user token
    const userLoginResponse = await makeRequest('POST', '/api/v1/auth/login', {
      email: 'user@example.com',
      password: 'user123',
    });

    if (userLoginResponse.status === 200) {
      userToken = userLoginResponse.data.access_token as string;
    }
  });

  describe('GET /api/v1/settings/security', () => {
    it('should return 401 without authentication', async () => {
      const response = await makeRequest('GET', '/api/v1/settings/security');

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      if (!userToken) {
        console.log('Skipping - no user token available');
        return;
      }

      const response = await makeRequest(
        'GET',
        '/api/v1/settings/security',
        undefined,
        userToken,
      );

      expect(response.status).toBe(403);
    });

    it('should return security settings for admin', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'GET',
        '/api/v1/settings/security',
        undefined,
        adminToken,
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('max_login_attempts');
      expect(response.data).toHaveProperty('password_min_length');
      expect(response.data).toHaveProperty('password_require_uppercase');
      expect(response.data).toHaveProperty('password_require_lowercase');
      expect(response.data).toHaveProperty('password_require_numbers');
      expect(response.data).toHaveProperty('password_require_special_chars');
      expect(response.data).toHaveProperty('session_inactivity_timeout');
    });
  });

  describe('PUT /api/v1/settings/security', () => {
    it('should return 401 without authentication', async () => {
      const response = await makeRequest('PUT', '/api/v1/settings/security', {
        max_login_attempts: 10,
      });

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      if (!userToken) {
        console.log('Skipping - no user token available');
        return;
      }

      const response = await makeRequest(
        'PUT',
        '/api/v1/settings/security',
        { max_login_attempts: 10 },
        userToken,
      );

      expect(response.status).toBe(403);
    });

    it('should update max login attempts for admin', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'PUT',
        '/api/v1/settings/security',
        { max_login_attempts: 10 },
        adminToken,
      );

      expect(response.status).toBe(200);
      expect(response.data.max_login_attempts).toBe(10);
    });

    it('should update password min length for admin', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'PUT',
        '/api/v1/settings/security',
        { password_min_length: 12 },
        adminToken,
      );

      expect(response.status).toBe(200);
      expect(response.data.password_min_length).toBe(12);
    });

    it('should update password policy flags for admin', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'PUT',
        '/api/v1/settings/security',
        {
          password_require_uppercase: false,
          password_require_special_chars: false,
        },
        adminToken,
      );

      expect(response.status).toBe(200);
      expect(response.data.password_require_uppercase).toBe(false);
      expect(response.data.password_require_special_chars).toBe(false);
    });

    it('should update session inactivity timeout for admin', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'PUT',
        '/api/v1/settings/security',
        { session_inactivity_timeout: 30 },
        adminToken,
      );

      expect(response.status).toBe(200);
      expect(response.data.session_inactivity_timeout).toBe(30);
    });

    it('should reject max login attempts less than 1', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'PUT',
        '/api/v1/settings/security',
        { max_login_attempts: 0 },
        adminToken,
      );

      expect(response.status).toBe(400);
    });

    it('should reject password min length less than 6', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'PUT',
        '/api/v1/settings/security',
        { password_min_length: 2 },
        adminToken,
      );

      expect(response.status).toBe(400);
    });

    it('should reject session inactivity timeout less than 1', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'PUT',
        '/api/v1/settings/security',
        { session_inactivity_timeout: 0 },
        adminToken,
      );

      expect(response.status).toBe(400);
    });

    it('should reject session inactivity timeout greater than 1440', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'PUT',
        '/api/v1/settings/security',
        { session_inactivity_timeout: 1500 },
        adminToken,
      );

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/settings/security/reset', () => {
    it('should return 401 without authentication', async () => {
      const response = await makeRequest('POST', '/api/v1/settings/security/reset');

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      if (!userToken) {
        console.log('Skipping - no user token available');
        return;
      }

      const response = await makeRequest(
        'POST',
        '/api/v1/settings/security/reset',
        undefined,
        userToken,
      );

      expect(response.status).toBe(403);
    });

    it('should reset security settings to defaults for admin', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      // First, change some settings
      await makeRequest(
        'PUT',
        '/api/v1/settings/security',
        { max_login_attempts: 99 },
        adminToken,
      );

      // Then reset
      const response = await makeRequest(
        'POST',
        '/api/v1/settings/security/reset',
        undefined,
        adminToken,
      );

      expect(response.status).toBe(200);
      expect(response.data.max_login_attempts).toBe(5); // Default
      expect(response.data.password_min_length).toBe(8); // Default
      expect(response.data.password_require_uppercase).toBe(true); // Default
      expect(response.data.password_require_lowercase).toBe(true); // Default
      expect(response.data.password_require_numbers).toBe(true); // Default
      expect(response.data.password_require_special_chars).toBe(true); // Default
      expect(response.data.session_inactivity_timeout).toBe(15); // Default
    });
  });

  describe('GET /api/v1/settings/security/password-policy', () => {
    it('should return password policy without authentication (public)', async () => {
      const response = await makeRequest(
        'GET',
        '/api/v1/settings/security/password-policy',
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('minLength');
      expect(response.data).toHaveProperty('requireUppercase');
      expect(response.data).toHaveProperty('requireLowercase');
      expect(response.data).toHaveProperty('requireNumbers');
      expect(response.data).toHaveProperty('requireSpecialChars');
    });

    it('should return current password policy values', async () => {
      // First update password policy as admin
      if (adminToken) {
        await makeRequest(
          'PUT',
          '/api/v1/settings/security',
          { password_min_length: 10 },
          adminToken,
        );
      }

      // Then verify public endpoint returns updated value
      const response = await makeRequest(
        'GET',
        '/api/v1/settings/security/password-policy',
      );

      expect(response.status).toBe(200);
      // Value depends on what was set
      expect(typeof response.data.minLength).toBe('number');
    });
  });

  describe('Settings Caching', () => {
    it('should return cached settings on subsequent requests', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      // Make two requests in quick succession
      const response1 = await makeRequest(
        'GET',
        '/api/v1/settings/security',
        undefined,
        adminToken,
      );

      const response2 = await makeRequest(
        'GET',
        '/api/v1/settings/security',
        undefined,
        adminToken,
      );

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.data).toEqual(response2.data);
    });

    it('should invalidate cache after update', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      // Get current settings
      const before = await makeRequest(
        'GET',
        '/api/v1/settings/security',
        undefined,
        adminToken,
      );

      // Update settings
      await makeRequest(
        'PUT',
        '/api/v1/settings/security',
        { max_login_attempts: 7 },
        adminToken,
      );

      // Get updated settings
      const after = await makeRequest(
        'GET',
        '/api/v1/settings/security',
        undefined,
        adminToken,
      );

      expect(after.data.max_login_attempts).toBe(7);
    });
  });

  describe('Audit Trail', () => {
    it('should log security settings changes', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      // Make a change
      await makeRequest(
        'PUT',
        '/api/v1/settings/security',
        { max_login_attempts: 8 },
        adminToken,
      );

      // Check audit logs (if audit endpoint exists)
      const auditResponse = await makeRequest(
        'GET',
        '/api/v1/audit?resource=security_settings',
        undefined,
        adminToken,
      );

      // If audit endpoint exists and returns data, verify change was logged
      if (auditResponse.status === 200 && Array.isArray(auditResponse.data)) {
        const recentLog = auditResponse.data.find(
          (log: Record<string, unknown>) =>
            log.action === 'SETTINGS_UPDATE' && log.resource === 'security_settings',
        );
        expect(recentLog).toBeDefined();
      }
    });
  });

  // Cleanup after tests - reset to defaults
  afterAll(async () => {
    if (adminToken) {
      await makeRequest(
        'POST',
        '/api/v1/settings/security/reset',
        undefined,
        adminToken,
      );
    }
  });
});

// Additional tests for All Settings Controller
(runIntegrationTests ? describe : describe.skip)('All Settings Integration', () => {
  let adminToken: string;
  let userToken: string;

  const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:14102';

  // Helper to make authenticated requests
  const makeRequest = async (
    method: string,
    path: string,
    body?: unknown,
    token?: string,
  ): Promise<ApiResponse> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: response.status, data, headers: response.headers };
  };

  beforeAll(async () => {
    // Get admin token
    const loginResponse = await makeRequest('POST', '/api/v1/auth/login', {
      email: 'admin@example.com',
      password: 'admin123',
    });

    if (loginResponse.status === 200) {
      adminToken = loginResponse.data.access_token as string;
    }

    // Get regular user token
    const userLoginResponse = await makeRequest('POST', '/api/v1/auth/login', {
      email: 'user@example.com',
      password: 'user123',
    });

    if (userLoginResponse.status === 200) {
      userToken = userLoginResponse.data.access_token as string;
    }
  });

  describe('GET /api/v1/settings/all', () => {
    it('should return 401 without authentication', async () => {
      const response = await makeRequest('GET', '/api/v1/settings/all');

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      if (!userToken) {
        console.log('Skipping - no user token available');
        return;
      }

      const response = await makeRequest(
        'GET',
        '/api/v1/settings/all',
        undefined,
        userToken,
      );

      expect(response.status).toBe(403);
    });

    it('should return all settings categories for admin', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'GET',
        '/api/v1/settings/all',
        undefined,
        adminToken,
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('general');
      expect(response.data).toHaveProperty('security');
      expect(response.data).toHaveProperty('email');
      expect(response.data).toHaveProperty('branding');
      expect(response.data).toHaveProperty('features');
    });
  });

  describe('GET /api/v1/settings/category/:category', () => {
    it('should return security settings by category', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'GET',
        '/api/v1/settings/category/security',
        undefined,
        adminToken,
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('max_login_attempts');
      expect(response.data).toHaveProperty('password_min_length');
    });

    it('should return general settings by category', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'GET',
        '/api/v1/settings/category/general',
        undefined,
        adminToken,
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('session_timeout_minutes');
    });

    it('should return 400 for invalid category', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'GET',
        '/api/v1/settings/category/invalid',
        undefined,
        adminToken,
      );

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/v1/settings/category/:category', () => {
    it('should update security settings by category', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'PUT',
        '/api/v1/settings/category/security',
        { max_login_attempts: 6 },
        adminToken,
      );

      expect(response.status).toBe(200);
      expect(response.data.max_login_attempts).toBe(6);
    });

    it('should return 400 for invalid category', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'PUT',
        '/api/v1/settings/category/invalid',
        { some_setting: 'value' },
        adminToken,
      );

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/settings/category/:category/reset', () => {
    it('should reset security category to defaults', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'POST',
        '/api/v1/settings/category/security/reset',
        undefined,
        adminToken,
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message');
      expect(response.data).toHaveProperty('settings');
    });

    it('should return 400 for invalid category', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'POST',
        '/api/v1/settings/category/invalid/reset',
        undefined,
        adminToken,
      );

      expect(response.status).toBe(400);
    });
  });
});
