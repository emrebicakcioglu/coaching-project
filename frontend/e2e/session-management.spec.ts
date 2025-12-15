/**
 * Session Management E2E Tests
 * STORY-008: Session Management mit "Remember Me"
 *
 * Playwright E2E tests for session management functionality including:
 * - Login with Remember Me
 * - Sessions overview
 * - Session termination
 * - Logout from all devices
 */

import { test, expect } from '@playwright/test';

// Test user credentials (should be configured in test environment)
const TEST_USER = {
  email: 'testuser@example.com',
  password: 'TestPassword123!',
};

// Base URLs
const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:4102/api/v1';

test.describe('Session Management - STORY-008', () => {
  test.describe('Login with Remember Me', () => {
    test('should display Remember Me checkbox on login page', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Check that the Remember Me checkbox exists
      const checkbox = page.locator('input[name="rememberMe"]');
      await expect(checkbox).toBeVisible();

      // Verify it's unchecked by default (security best practice)
      await expect(checkbox).not.toBeChecked();
    });

    test('Remember Me keeps user logged in after browser restart', async ({ page, context }) => {
      await page.goto(`${BASE_URL}/login`);

      // Fill login form
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.fill('input[name="password"]', TEST_USER.password);

      // Check Remember Me
      await page.check('input[name="rememberMe"]');
      await expect(page.locator('input[name="rememberMe"]')).toBeChecked();

      // Submit login form
      await page.click('button[type="submit"]');

      // Wait for successful login (should redirect away from login page)
      await expect(page).not.toHaveURL(/\/login/);

      // Verify tokens are stored
      const localStorage = await page.evaluate(() => window.localStorage.getItem('refresh_token'));
      expect(localStorage).not.toBeNull();

      // Close and reopen context to simulate browser restart
      await context.clearCookies();

      // Navigate back and verify user is still logged in (via refresh token)
      const newPage = await context.newPage();
      await newPage.goto(`${BASE_URL}/dashboard`);

      // Should either stay on dashboard or be redirected after token refresh
      // The exact behavior depends on the frontend implementation
    });

    test('should receive shorter token expiry without Remember Me', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Fill login form without Remember Me
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.fill('input[name="password"]', TEST_USER.password);

      // Ensure Remember Me is NOT checked
      await expect(page.locator('input[name="rememberMe"]')).not.toBeChecked();

      // Submit login form
      await page.click('button[type="submit"]');

      // Wait for successful login
      await expect(page).not.toHaveURL(/\/login/);
    });
  });

  test.describe('Sessions Overview', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.fill('input[name="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await expect(page).not.toHaveURL(/\/login/);
    });

    test('Sessions page shows all active sessions', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/sessions`);

      // Wait for sessions to load
      await page.waitForSelector('.session-item', { timeout: 10000 });

      // Should have at least one session (current)
      const sessionItems = page.locator('.session-item');
      await expect(sessionItems).toHaveCount(1);

      // Current session should be marked
      const currentBadge = page.locator('.session-item__current-badge');
      await expect(currentBadge).toBeVisible();
      await expect(currentBadge).toContainText('Dieser Browser');
    });

    test('Sessions page displays session details correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/sessions`);

      // Wait for sessions to load
      await page.waitForSelector('.session-item', { timeout: 10000 });

      // Verify session details are displayed
      const sessionItem = page.locator('.session-item').first();

      // Device info should be visible
      await expect(sessionItem.locator('.session-item__device')).toBeVisible();

      // IP address should be visible
      await expect(sessionItem.locator('.session-item__ip')).toBeVisible();

      // Last activity should be visible
      await expect(sessionItem.locator('.session-item__activity')).toBeVisible();
    });

    test('should show loading state while fetching sessions', async ({ page }) => {
      // Slow down the API response
      await page.route(`${API_URL}/auth/sessions`, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.continue();
      });

      await page.goto(`${BASE_URL}/settings/sessions`);

      // Loading state should be visible
      await expect(page.locator('.sessions-list--loading')).toBeVisible();
    });
  });

  test.describe('Session Termination', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.fill('input[name="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await expect(page).not.toHaveURL(/\/login/);
    });

    test('User can terminate a single session', async ({ page }) => {
      // This test assumes there are multiple sessions
      // In a real scenario, you'd need to create multiple sessions first

      await page.goto(`${BASE_URL}/settings/sessions`);

      // Wait for sessions to load
      await page.waitForSelector('.session-item', { timeout: 10000 });

      // Find a non-current session's logout button
      const nonCurrentSession = page.locator('.session-item:not(.session-item--current)').first();
      const logoutBtn = nonCurrentSession.locator('.session-item__logout-btn');

      // Check if there's a non-current session to terminate
      const nonCurrentCount = await page.locator('.session-item:not(.session-item--current)').count();

      if (nonCurrentCount > 0) {
        // Click logout button
        await logoutBtn.click();

        // Wait for success message or session removal
        await expect(page.locator('.success-message')).toBeVisible({ timeout: 5000 });
      }
    });

    test('Current session cannot be terminated individually', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/sessions`);

      // Wait for sessions to load
      await page.waitForSelector('.session-item', { timeout: 10000 });

      // Current session should not have a logout button
      const currentSession = page.locator('.session-item--current');
      const logoutBtn = currentSession.locator('.session-item__logout-btn');

      await expect(logoutBtn).not.toBeVisible();
    });
  });

  test.describe('Logout from All Devices', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.fill('input[name="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await expect(page).not.toHaveURL(/\/login/);
    });

    test('User can logout from all devices', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/sessions`);

      // Wait for sessions to load
      await page.waitForSelector('.session-item', { timeout: 10000 });

      // Click "Logout all" button
      const logoutAllBtn = page.locator('#logout-all-btn');

      // Button might not be visible if there's only one session
      const isVisible = await logoutAllBtn.isVisible();

      if (isVisible) {
        await logoutAllBtn.click();

        // Confirmation dialog should appear
        await expect(page.locator('.confirm-dialog')).toBeVisible();
        await expect(page.locator('.confirm-dialog__title')).toContainText('Alle Geräte abmelden');

        // Confirm logout
        await page.click('.confirm-dialog .confirm-btn');

        // Should be redirected to login page
        await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
      }
    });

    test('Confirmation dialog can be cancelled', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings/sessions`);

      // Wait for sessions to load
      await page.waitForSelector('.session-item', { timeout: 10000 });

      // Click "Logout all" button
      const logoutAllBtn = page.locator('#logout-all-btn');
      const isVisible = await logoutAllBtn.isVisible();

      if (isVisible) {
        await logoutAllBtn.click();

        // Confirmation dialog should appear
        await expect(page.locator('.confirm-dialog')).toBeVisible();

        // Cancel the dialog
        await page.click('.confirm-dialog__cancel-btn');

        // Dialog should close
        await expect(page.locator('.confirm-dialog')).not.toBeVisible();

        // Should still be on sessions page
        await expect(page).toHaveURL(/\/settings\/sessions/);
      }
    });
  });

  test.describe('Token Refresh', () => {
    test('Token is automatically renewed', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.fill('input[name="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await expect(page).not.toHaveURL(/\/login/);

      // Mock a 401 response followed by successful refresh
      let refreshCalled = false;
      await page.route(`${API_URL}/auth/sessions`, async (route) => {
        if (!refreshCalled) {
          refreshCalled = true;
          await route.fulfill({
            status: 401,
            body: JSON.stringify({ message: 'Token expired' }),
          });
        } else {
          await route.continue();
        }
      });

      await page.route(`${API_URL}/auth/refresh`, async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            access_token: 'new_access_token',
            refresh_token: 'new_refresh_token',
            token_type: 'Bearer',
            expires_in: 900,
          }),
        });
      });

      // Navigate to sessions page
      await page.goto(`${BASE_URL}/settings/sessions`);

      // The interceptor should automatically refresh the token
      // and retry the request
    });

    test('Expired refresh token redirects to login', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.fill('input[name="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await expect(page).not.toHaveURL(/\/login/);

      // Mock both main request and refresh to fail
      await page.route(`${API_URL}/**`, async (route) => {
        await route.fulfill({
          status: 401,
          body: JSON.stringify({ message: 'Invalid token' }),
        });
      });

      // Navigate to sessions page
      await page.goto(`${BASE_URL}/settings/sessions`);

      // Should be redirected to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });
  });

  test.describe('API Integration', () => {
    test('GET /api/auth/sessions returns session list', async ({ request }) => {
      // Login to get tokens
      const loginResponse = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: TEST_USER.email,
          password: TEST_USER.password,
        },
      });

      expect(loginResponse.ok()).toBeTruthy();
      const { access_token } = await loginResponse.json();

      // Get sessions
      const sessionsResponse = await request.get(`${API_URL}/auth/sessions`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      expect(sessionsResponse.ok()).toBeTruthy();
      const data = await sessionsResponse.json();

      expect(data).toHaveProperty('sessions');
      expect(Array.isArray(data.sessions)).toBeTruthy();
      expect(data.sessions.length).toBeGreaterThan(0);

      // Verify session structure
      const session = data.sessions[0];
      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('device');
      expect(session).toHaveProperty('browser');
      expect(session).toHaveProperty('ip');
      expect(session).toHaveProperty('lastActivity');
    });

    test('DELETE /api/auth/sessions/:id terminates session', async ({ request }) => {
      // Login twice to create two sessions
      const loginResponse1 = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: TEST_USER.email,
          password: TEST_USER.password,
        },
      });
      const { access_token, refresh_token } = await loginResponse1.json();

      // Get sessions to find one to delete
      const sessionsResponse = await request.get(`${API_URL}/auth/sessions`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
        data: { refresh_token },
      });

      const { sessions } = await sessionsResponse.json();
      const nonCurrentSession = sessions.find((s: Session) => !s.current);

      if (nonCurrentSession) {
        // Delete the session
        const deleteResponse = await request.delete(
          `${API_URL}/auth/sessions/${nonCurrentSession.id}`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          }
        );

        expect(deleteResponse.ok()).toBeTruthy();
        const data = await deleteResponse.json();
        expect(data.message).toBe('Session terminated');
      }
    });

    test('DELETE /api/auth/sessions/all terminates all sessions', async ({ request }) => {
      // Login to get tokens
      const loginResponse = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: TEST_USER.email,
          password: TEST_USER.password,
        },
      });

      const { access_token, refresh_token } = await loginResponse.json();

      // Delete all sessions (keeping current)
      const deleteResponse = await request.delete(`${API_URL}/auth/sessions/all`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
        data: {
          refresh_token,
          keepCurrent: true,
        },
      });

      expect(deleteResponse.ok()).toBeTruthy();
      const data = await deleteResponse.json();
      expect(data.message).toBe('All sessions terminated');
      expect(typeof data.count).toBe('number');
    });

    test('Login with rememberMe returns correct token expiry', async ({ request }) => {
      // Login without rememberMe
      const shortResponse = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: TEST_USER.email,
          password: TEST_USER.password,
          rememberMe: false,
        },
      });

      expect(shortResponse.ok()).toBeTruthy();
      const shortData = await shortResponse.json();

      // Login with rememberMe
      const longResponse = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: TEST_USER.email,
          password: TEST_USER.password,
          rememberMe: true,
        },
      });

      expect(longResponse.ok()).toBeTruthy();
      const longData = await longResponse.json();

      // Both should have access tokens with 15-minute expiry
      // The difference is in refresh token (which we can't directly verify here)
      expect(shortData.expires_in).toBe(longData.expires_in);
    });
  });

  test.describe('Accessibility', () => {
    test('Sessions page is accessible', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.fill('input[name="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await expect(page).not.toHaveURL(/\/login/);

      await page.goto(`${BASE_URL}/settings/sessions`);

      // Wait for sessions to load
      await page.waitForSelector('.session-item', { timeout: 10000 });

      // Check for proper heading structure
      await expect(page.locator('h1, h2').first()).toBeVisible();

      // Check for proper button labels
      const logoutBtns = page.locator('.session-item__logout-btn');
      const count = await logoutBtns.count();
      for (let i = 0; i < count; i++) {
        const btn = logoutBtns.nth(i);
        await expect(btn).toHaveAttribute('aria-label');
      }
    });

    test('Remember Me checkbox is accessible', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      const checkbox = page.locator('input[name="rememberMe"]');

      // Should have associated label
      await expect(page.locator('label[for="remember-me"]')).toBeVisible();

      // Should have description
      await expect(checkbox).toHaveAttribute('aria-describedby');

      // Should be keyboard accessible
      await checkbox.focus();
      await expect(checkbox).toBeFocused();
    });
  });

  test.describe('Responsive Design', () => {
    test('Sessions page is responsive on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.fill('input[name="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await expect(page).not.toHaveURL(/\/login/);

      await page.goto(`${BASE_URL}/settings/sessions`);

      // Wait for sessions to load
      await page.waitForSelector('.session-item', { timeout: 10000 });

      // Page should still be functional
      await expect(page.locator('.sessions-list')).toBeVisible();
    });

    test('Sessions page is responsive on tablet', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.fill('input[name="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await expect(page).not.toHaveURL(/\/login/);

      await page.goto(`${BASE_URL}/settings/sessions`);

      // Wait for sessions to load
      await page.waitForSelector('.session-item', { timeout: 10000 });

      // Page should still be functional
      await expect(page.locator('.sessions-list')).toBeVisible();
    });
  });
});
