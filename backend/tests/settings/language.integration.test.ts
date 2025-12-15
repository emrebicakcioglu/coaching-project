/**
 * Language Settings Integration Tests
 * STORY-018A: Standard-Sprache Backend (i18n Setup)
 *
 * Integration tests for language/i18n API endpoints:
 * - GET /api/v1/language/supported - Get supported languages (public)
 * - GET /api/v1/language/translations/:language - Get translations for language (public)
 * - GET /api/v1/language/translations/:language/:namespace - Get namespace translations (public)
 * - GET /api/v1/language/translate - Translate a key (public)
 * - GET /api/v1/language/user/preference - Get user preference (authenticated)
 * - PUT /api/v1/language/user/preference - Update user preference (authenticated)
 * - GET /api/v1/language/admin/settings - Get admin settings (admin only)
 * - PUT /api/v1/language/admin/settings - Update admin settings (admin only)
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

interface SupportedLanguagesResponse {
  languages: Array<{
    code: string;
    name: string;
    nativeName: string;
  }>;
  default_language: string;
  fallback_language: string;
}

interface UserLanguagePreference {
  language: string;
  date_format: string;
  number_format: string;
  updated_at: string;
}

interface AdminLanguageSettings {
  default_language: string;
  supported_languages: string[];
  fallback_language: string;
  updated_at: string;
  updated_by?: number | null;
}

(runIntegrationTests ? describe : describe.skip)('Language Settings Integration', () => {
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

  // =====================================
  // Public Endpoints
  // =====================================

  describe('GET /api/v1/language/supported', () => {
    it('should return supported languages without authentication', async () => {
      const response = await makeRequest('GET', '/api/v1/language/supported');

      expect(response.status).toBe(200);
      const data = response.data as unknown as SupportedLanguagesResponse;
      expect(data.languages).toBeDefined();
      expect(Array.isArray(data.languages)).toBe(true);
      expect(data.languages.length).toBeGreaterThanOrEqual(2);
      expect(data.default_language).toBeDefined();
      expect(data.fallback_language).toBeDefined();
    });

    it('should include English and German languages', async () => {
      const response = await makeRequest('GET', '/api/v1/language/supported');

      expect(response.status).toBe(200);
      const data = response.data as unknown as SupportedLanguagesResponse;

      const englishLang = data.languages.find((l) => l.code === 'en');
      const germanLang = data.languages.find((l) => l.code === 'de');

      expect(englishLang).toBeDefined();
      expect(englishLang?.name).toBe('English');
      expect(englishLang?.nativeName).toBe('English');

      expect(germanLang).toBeDefined();
      expect(germanLang?.name).toBe('German');
      expect(germanLang?.nativeName).toBe('Deutsch');
    });
  });

  describe('GET /api/v1/language/translations/:language', () => {
    it('should return English translations without authentication', async () => {
      const response = await makeRequest('GET', '/api/v1/language/translations/en');

      expect(response.status).toBe(200);
      expect(response.data.language).toBe('en');
      expect(response.data.namespaces).toBeDefined();
      expect(typeof response.data.namespaces).toBe('object');
    });

    it('should return German translations without authentication', async () => {
      const response = await makeRequest('GET', '/api/v1/language/translations/de');

      expect(response.status).toBe(200);
      expect(response.data.language).toBe('de');
      expect(response.data.namespaces).toBeDefined();
    });

    it('should return fallback translations for invalid language', async () => {
      const response = await makeRequest('GET', '/api/v1/language/translations/invalid');

      // Should return 200 with fallback language translations
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/language/translations/:language/:namespace', () => {
    it('should return common namespace translations', async () => {
      const response = await makeRequest('GET', '/api/v1/language/translations/en/common');

      expect(response.status).toBe(200);
      expect(response.data.language).toBe('en');
      expect(response.data.namespace).toBe('common');
      expect(response.data.translations).toBeDefined();
    });

    it('should return validation namespace translations', async () => {
      const response = await makeRequest('GET', '/api/v1/language/translations/en/validation');

      expect(response.status).toBe(200);
      expect(response.data.namespace).toBe('validation');
    });

    it('should return emails namespace translations', async () => {
      const response = await makeRequest('GET', '/api/v1/language/translations/en/emails');

      expect(response.status).toBe(200);
      expect(response.data.namespace).toBe('emails');
    });

    it('should return errors namespace translations', async () => {
      const response = await makeRequest('GET', '/api/v1/language/translations/en/errors');

      expect(response.status).toBe(200);
      expect(response.data.namespace).toBe('errors');
    });
  });

  describe('GET /api/v1/language/translate', () => {
    it('should translate a simple key', async () => {
      const response = await makeRequest(
        'GET',
        '/api/v1/language/translate?language=en&key=common.save&namespace=common',
      );

      expect(response.status).toBe(200);
      expect(response.data.text).toBeDefined();
    });

    it('should return key when translation not found', async () => {
      const response = await makeRequest(
        'GET',
        '/api/v1/language/translate?language=en&key=nonexistent.key&namespace=common',
      );

      expect(response.status).toBe(200);
      expect(response.data.text).toBe('nonexistent.key');
    });
  });

  // =====================================
  // User Preference Endpoints
  // =====================================

  describe('GET /api/v1/language/user/preference', () => {
    it('should return 401 without authentication', async () => {
      const response = await makeRequest('GET', '/api/v1/language/user/preference');

      expect(response.status).toBe(401);
    });

    it('should return user preference for authenticated user', async () => {
      if (!userToken) {
        console.log('Skipping - no user token available');
        return;
      }

      const response = await makeRequest(
        'GET',
        '/api/v1/language/user/preference',
        undefined,
        userToken,
      );

      expect(response.status).toBe(200);
      const data = response.data as unknown as UserLanguagePreference;
      expect(data.language).toBeDefined();
      expect(data.date_format).toBeDefined();
      expect(data.number_format).toBeDefined();
    });
  });

  describe('PUT /api/v1/language/user/preference', () => {
    it('should return 401 without authentication', async () => {
      const response = await makeRequest('PUT', '/api/v1/language/user/preference', {
        language: 'de',
      });

      expect(response.status).toBe(401);
    });

    it('should update user preference for authenticated user', async () => {
      if (!userToken) {
        console.log('Skipping - no user token available');
        return;
      }

      const response = await makeRequest(
        'PUT',
        '/api/v1/language/user/preference',
        {
          language: 'de',
          date_format: 'DD.MM.YYYY',
          number_format: 'de-DE',
        },
        userToken,
      );

      expect(response.status).toBe(200);
      const data = response.data as unknown as UserLanguagePreference;
      expect(data.language).toBe('de');

      // Reset to English
      await makeRequest(
        'PUT',
        '/api/v1/language/user/preference',
        { language: 'en' },
        userToken,
      );
    });

    it('should reject invalid language code', async () => {
      if (!userToken) {
        console.log('Skipping - no user token available');
        return;
      }

      const response = await makeRequest(
        'PUT',
        '/api/v1/language/user/preference',
        { language: 'invalid' },
        userToken,
      );

      expect(response.status).toBe(400);
    });
  });

  // =====================================
  // Admin Settings Endpoints
  // =====================================

  describe('GET /api/v1/language/admin/settings', () => {
    it('should return 401 without authentication', async () => {
      const response = await makeRequest('GET', '/api/v1/language/admin/settings');

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin user', async () => {
      if (!userToken) {
        console.log('Skipping - no user token available');
        return;
      }

      const response = await makeRequest(
        'GET',
        '/api/v1/language/admin/settings',
        undefined,
        userToken,
      );

      expect(response.status).toBe(403);
    });

    it('should return admin settings for admin user', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'GET',
        '/api/v1/language/admin/settings',
        undefined,
        adminToken,
      );

      expect(response.status).toBe(200);
      const data = response.data as unknown as AdminLanguageSettings;
      expect(data.default_language).toBeDefined();
      expect(data.supported_languages).toBeDefined();
      expect(data.fallback_language).toBeDefined();
    });
  });

  describe('PUT /api/v1/language/admin/settings', () => {
    it('should return 401 without authentication', async () => {
      const response = await makeRequest('PUT', '/api/v1/language/admin/settings', {
        default_language: 'de',
      });

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin user', async () => {
      if (!userToken) {
        console.log('Skipping - no user token available');
        return;
      }

      const response = await makeRequest(
        'PUT',
        '/api/v1/language/admin/settings',
        { default_language: 'de' },
        userToken,
      );

      expect(response.status).toBe(403);
    });

    it('should update admin settings for admin user', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'PUT',
        '/api/v1/language/admin/settings',
        { default_language: 'de' },
        adminToken,
      );

      expect(response.status).toBe(200);
      const data = response.data as unknown as AdminLanguageSettings;
      expect(data.default_language).toBe('de');

      // Reset to English
      await makeRequest(
        'PUT',
        '/api/v1/language/admin/settings',
        { default_language: 'en' },
        adminToken,
      );
    });

    it('should reject invalid default language', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'PUT',
        '/api/v1/language/admin/settings',
        { default_language: 'invalid' },
        adminToken,
      );

      expect(response.status).toBe(400);
    });
  });

  // =====================================
  // Cache Management Endpoints (Admin Only)
  // =====================================

  describe('PUT /api/v1/language/admin/cache/clear', () => {
    it('should return 403 for non-admin user', async () => {
      if (!userToken) {
        console.log('Skipping - no user token available');
        return;
      }

      const response = await makeRequest(
        'PUT',
        '/api/v1/language/admin/cache/clear',
        undefined,
        userToken,
      );

      expect(response.status).toBe(403);
    });

    it('should clear cache for admin user', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'PUT',
        '/api/v1/language/admin/cache/clear',
        undefined,
        adminToken,
      );

      expect(response.status).toBe(200);
      expect(response.data.message).toContain('cache cleared');
    });
  });

  describe('GET /api/v1/language/admin/cache/stats', () => {
    it('should return cache stats for admin user', async () => {
      if (!adminToken) {
        console.log('Skipping - no admin token available');
        return;
      }

      const response = await makeRequest(
        'GET',
        '/api/v1/language/admin/cache/stats',
        undefined,
        adminToken,
      );

      expect(response.status).toBe(200);
      expect(typeof response.data.languages).toBe('number');
      expect(typeof response.data.namespaces).toBe('number');
    });
  });
});
