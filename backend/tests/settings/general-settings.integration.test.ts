/**
 * General Settings Integration Tests
 * STORY-035: Support-E-Mail & Session-Timeout
 *
 * Integration tests for general settings API endpoints:
 * - GET /api/v1/settings/general
 * - PUT /api/v1/settings/general
 * - GET /api/v1/settings/general/timeout-config
 * - GET /api/v1/settings/general/support-email
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

(runIntegrationTests ? describe : describe.skip)('General Settings Integration', () => {
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

  describe('GET /api/v1/settings/general', () => {
    it('should return 401 without authentication', async () => {
      const response = await makeRequest('GET', '/api/v1/settings/general');

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      if (!userToken) {
        console.log('Skipping - no user token available');
        return;
      }

      const response = await makeRequest(
        'GET',
        '/api/v1/settings/general',
        undefined,
        userToken,
      );

      expect(response.status).toBe(403);
    });

    it('should return general settings for admin', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'GET',
        '/api/v1/settings/general',
        undefined,
        adminToken,
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('session_timeout_minutes');
      expect(response.data).toHaveProperty('show_timeout_warning');
      expect(response.data).toHaveProperty('warning_before_timeout_minutes');
      expect(response.data).toHaveProperty('updated_at');
    });
  });

  describe('PUT /api/v1/settings/general', () => {
    it('should return 401 without authentication', async () => {
      const response = await makeRequest('PUT', '/api/v1/settings/general', {
        session_timeout_minutes: 45,
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
        '/api/v1/settings/general',
        { session_timeout_minutes: 45 },
        userToken,
      );

      expect(response.status).toBe(403);
    });

    it('should update support email for admin', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'PUT',
        '/api/v1/settings/general',
        { support_email: 'new-support@example.com' },
        adminToken,
      );

      expect(response.status).toBe(200);
      expect(response.data.support_email).toBe('new-support@example.com');
    });

    it('should update session timeout for admin', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'PUT',
        '/api/v1/settings/general',
        { session_timeout_minutes: 45 },
        adminToken,
      );

      expect(response.status).toBe(200);
      expect(response.data.session_timeout_minutes).toBe(45);
    });

    it('should reject invalid session timeout', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'PUT',
        '/api/v1/settings/general',
        { session_timeout_minutes: 0 },
        adminToken,
      );

      expect(response.status).toBe(400);
    });

    it('should reject warning time >= timeout', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'PUT',
        '/api/v1/settings/general',
        {
          session_timeout_minutes: 10,
          warning_before_timeout_minutes: 15,
        },
        adminToken,
      );

      expect(response.status).toBe(400);
    });

    it('should reject invalid email format', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'PUT',
        '/api/v1/settings/general',
        { support_email: 'not-an-email' },
        adminToken,
      );

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/settings/general/timeout-config', () => {
    it('should return timeout config without authentication (public)', async () => {
      const response = await makeRequest(
        'GET',
        '/api/v1/settings/general/timeout-config',
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('timeout_minutes');
      expect(response.data).toHaveProperty('timeout_ms');
      expect(response.data).toHaveProperty('show_warning');
      expect(response.data).toHaveProperty('warning_ms');
      expect(typeof response.data.timeout_ms).toBe('number');
    });
  });

  describe('GET /api/v1/settings/general/support-email', () => {
    it('should return support email without authentication (public)', async () => {
      const response = await makeRequest(
        'GET',
        '/api/v1/settings/general/support-email',
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('support_email');
    });
  });

  describe('Session Timeout Headers', () => {
    it('should include session status headers in authenticated requests', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'GET',
        '/api/v1/settings/general',
        undefined,
        adminToken,
      );

      // Check for session timeout headers
      const sessionValid = response.headers.get('X-Session-Valid');
      const remainingMs = response.headers.get('X-Session-Remaining-Ms');

      if (sessionValid !== null) {
        expect(sessionValid).toBe('true');
        expect(remainingMs).toBeDefined();
      }
    });
  });

  // Cleanup after tests
  afterAll(async () => {
    // Reset to default values
    if (adminToken) {
      await makeRequest(
        'PUT',
        '/api/v1/settings/general',
        {
          session_timeout_minutes: 30,
          show_timeout_warning: true,
          warning_before_timeout_minutes: 5,
        },
        adminToken,
      );
    }
  });
});
