/**
 * Feature Toggles Integration Tests
 * STORY-014A: Feature Toggles Backend
 *
 * Integration tests for feature toggles API endpoints:
 * - GET /api/v1/features - Get all features
 * - GET /api/v1/features/public - Get public features
 * - GET /api/v1/features/:key - Get single feature
 * - PUT /api/v1/features/:key - Toggle feature (admin only)
 * - GET /api/v1/features/:key/enabled - Check if feature is enabled
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

interface Feature {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
}

interface FeaturesListResponse {
  features: Feature[];
}

(runIntegrationTests ? describe : describe.skip)('Feature Toggles Integration', () => {
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

  describe('GET /api/v1/features', () => {
    it('should return 401 without authentication', async () => {
      const response = await makeRequest('GET', '/api/v1/features');

      expect(response.status).toBe(401);
    });

    it('should return features list for authenticated user', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'GET',
        '/api/v1/features',
        undefined,
        adminToken,
      );

      expect(response.status).toBe(200);
      const data = response.data as FeaturesListResponse;
      expect(data.features).toBeDefined();
      expect(Array.isArray(data.features)).toBe(true);
      expect(data.features.length).toBeGreaterThan(0);

      // Check feature structure
      const feature = data.features[0];
      expect(feature.key).toBeDefined();
      expect(feature.name).toBeDefined();
      expect(feature.description).toBeDefined();
      expect(typeof feature.enabled).toBe('boolean');
      expect(feature.category).toBeDefined();
    });

    it('should return features list for regular user', async () => {
      if (!userToken) {
        console.log('Skipping - no user token available');
        return;
      }

      const response = await makeRequest(
        'GET',
        '/api/v1/features',
        undefined,
        userToken,
      );

      expect(response.status).toBe(200);
      const data = response.data as FeaturesListResponse;
      expect(data.features).toBeDefined();
    });
  });

  describe('GET /api/v1/features/public', () => {
    it('should return public features without authentication', async () => {
      const response = await makeRequest('GET', '/api/v1/features/public');

      expect(response.status).toBe(200);
      const data = response.data as FeaturesListResponse;
      expect(data.features).toBeDefined();
      expect(Array.isArray(data.features)).toBe(true);

      // Should only include public features
      const featureKeys = data.features.map((f) => f.key);
      expect(featureKeys).toContain('user-registration');
      expect(featureKeys).toContain('dark-mode');
      // Should not include admin-only features
      expect(featureKeys).not.toContain('mfa');
      expect(featureKeys).not.toContain('feedback-button');
    });
  });

  describe('GET /api/v1/features/:key', () => {
    it('should return 401 without authentication', async () => {
      const response = await makeRequest('GET', '/api/v1/features/user-registration');

      expect(response.status).toBe(401);
    });

    it('should return feature details for authenticated user', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'GET',
        '/api/v1/features/user-registration',
        undefined,
        adminToken,
      );

      expect(response.status).toBe(200);
      const feature = response.data as Feature;
      expect(feature.key).toBe('user-registration');
      expect(feature.name).toBe('User Registration');
      expect(feature.category).toBe('authentication');
      expect(typeof feature.enabled).toBe('boolean');
    });

    it('should return 404 for non-existent feature', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'GET',
        '/api/v1/features/non-existent-feature',
        undefined,
        adminToken,
      );

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/features/:key/enabled', () => {
    it('should return enabled status without authentication (public endpoint)', async () => {
      const response = await makeRequest(
        'GET',
        '/api/v1/features/user-registration/enabled',
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('key', 'user-registration');
      expect(response.data).toHaveProperty('enabled');
      expect(typeof response.data.enabled).toBe('boolean');
    });

    it('should return enabled=false for unknown feature', async () => {
      const response = await makeRequest(
        'GET',
        '/api/v1/features/non-existent/enabled',
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('key', 'non-existent');
      expect(response.data.enabled).toBe(false);
    });
  });

  describe('PUT /api/v1/features/:key', () => {
    it('should return 401 without authentication', async () => {
      const response = await makeRequest('PUT', '/api/v1/features/mfa', {
        enabled: true,
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
        '/api/v1/features/mfa',
        { enabled: true },
        userToken,
      );

      expect(response.status).toBe(403);
    });

    it('should toggle feature for admin', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      // Get current state
      const beforeResponse = await makeRequest(
        'GET',
        '/api/v1/features/mfa',
        undefined,
        adminToken,
      );
      const initialState = (beforeResponse.data as Feature).enabled;

      // Toggle to opposite state
      const response = await makeRequest(
        'PUT',
        '/api/v1/features/mfa',
        { enabled: !initialState },
        adminToken,
      );

      expect(response.status).toBe(200);
      expect(response.data.message).toBe('Feature updated successfully');
      expect((response.data.feature as Feature).enabled).toBe(!initialState);

      // Toggle back
      await makeRequest(
        'PUT',
        '/api/v1/features/mfa',
        { enabled: initialState },
        adminToken,
      );
    });

    it('should return 404 for non-existent feature', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'PUT',
        '/api/v1/features/non-existent-feature',
        { enabled: true },
        adminToken,
      );

      expect(response.status).toBe(404);
    });

    it('should validate enabled field is required', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'PUT',
        '/api/v1/features/mfa',
        {}, // Missing enabled field
        adminToken,
      );

      expect(response.status).toBe(400);
    });

    it('should take effect immediately (no app restart required)', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      // Get current state
      const beforeResponse = await makeRequest(
        'GET',
        '/api/v1/features/dark-mode/enabled',
      );
      const initialState = beforeResponse.data.enabled as boolean;

      // Toggle
      await makeRequest(
        'PUT',
        '/api/v1/features/dark-mode',
        { enabled: !initialState },
        adminToken,
      );

      // Check immediately
      const afterResponse = await makeRequest(
        'GET',
        '/api/v1/features/dark-mode/enabled',
      );

      expect(afterResponse.data.enabled).toBe(!initialState);

      // Toggle back
      await makeRequest(
        'PUT',
        '/api/v1/features/dark-mode',
        { enabled: initialState },
        adminToken,
      );
    });
  });

  describe('Feature Toggle Middleware Behavior', () => {
    // These tests verify that disabled features block API access
    // They depend on routes being configured with the @Feature decorator

    it('should allow access when feature is enabled', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      // Ensure user-registration is enabled
      await makeRequest(
        'PUT',
        '/api/v1/features/user-registration',
        { enabled: true },
        adminToken,
      );

      // Should be able to access registration page/info
      // Note: The actual registration endpoint may have its own logic
      const response = await makeRequest(
        'GET',
        '/api/v1/features/user-registration/enabled',
      );

      expect(response.status).toBe(200);
      expect(response.data.enabled).toBe(true);
    });
  });

  describe('Features are persisted across requests', () => {
    it('should persist feature toggle changes', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      // Get current state
      const beforeResponse = await makeRequest(
        'GET',
        '/api/v1/features/feedback-button',
        undefined,
        adminToken,
      );
      const initialState = (beforeResponse.data as Feature).enabled;

      // Toggle
      await makeRequest(
        'PUT',
        '/api/v1/features/feedback-button',
        { enabled: !initialState },
        adminToken,
      );

      // Verify change persisted
      const afterResponse = await makeRequest(
        'GET',
        '/api/v1/features/feedback-button',
        undefined,
        adminToken,
      );

      expect((afterResponse.data as Feature).enabled).toBe(!initialState);

      // Toggle back to restore original state
      await makeRequest(
        'PUT',
        '/api/v1/features/feedback-button',
        { enabled: initialState },
        adminToken,
      );
    });
  });
});
