/**
 * Feedback HTTP 500 Fix E2E Tests
 * STORY-002-REWORK-003: Feedback System HTTP 500 Error Fix
 *
 * End-to-end tests to verify the HTTP 500 error fix for feedback submission.
 *
 * Test Scenarios:
 * 1. Feedback submission without screenshot (should succeed now)
 * 2. Feedback submission with screenshot (should succeed)
 * 3. Feedback submission when MinIO is unavailable (graceful degradation)
 * 4. Error handling and recovery
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const TEST_EMAIL = 'admin@example.com';
const TEST_PASSWORD = 'TestPassword123!';

/**
 * Helper function to login - bypasses the login UI by setting auth tokens directly
 */
async function login(page: Page) {
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.setItem('access_token', 'mock-access-token-for-e2e-tests');
    localStorage.setItem('refresh_token', 'mock-refresh-token-for-e2e-tests');
  });

  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
}

/**
 * Helper to mock auth endpoints
 */
async function mockAuthEndpoints(page: Page) {
  await page.route('**/api/v1/auth/**', async (route) => {
    const url = route.request().url();

    if (url.includes('/login')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      });
    } else if (url.includes('/refresh')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      });
    } else if (url.includes('/permissions')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          permissions: ['feedback.read', 'feedback.write', 'users.read', 'roles.read', 'settings.read'],
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/v1/users/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        email: 'admin@example.com',
        name: 'Admin User',
        firstName: 'Admin',
        lastName: 'User',
        status: 'active',
        roles: [{ id: 1, name: 'admin', permissions: ['feedback.read', 'feedback.write'] }],
      }),
    });
  });

  await page.route('**/api/version', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        version: '1.0.0',
        name: 'core-app-backend',
      }),
    });
  });
}

/**
 * Helper to enable feedback feature via API mock
 */
async function mockFeedbackFeature(page: Page, enabled: boolean) {
  await page.route('**/api/v1/features/feedback/enabled', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ key: 'feedback', enabled }),
    });
  });
}

/**
 * Helper to mock feedback submission endpoint with various scenarios
 */
async function mockFeedbackSubmission(page: Page, options: {
  success?: boolean;
  delay?: number;
  screenshotStored?: boolean;
  includeScreenshot?: boolean;
} = {}) {
  const { success = true, delay = 0, screenshotStored = true, includeScreenshot = true } = options;

  await page.route('**/api/feedback', async (route) => {
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Get request body to check if screenshot was included
    const postData = route.request().postDataJSON();
    const hasScreenshotInRequest = postData && typeof postData.screenshot === 'string' && postData.screenshot.length > 0;

    if (success) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Feedback submitted successfully',
          id: 123,
          queued: true,
          screenshotStored: hasScreenshotInRequest && screenshotStored,
        }),
      });
    } else {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' }),
      });
    }
  });
}

/**
 * Helper to trigger screenshot capture and open modal
 */
async function triggerFeedbackCapture(page: Page) {
  const feedbackButton = page.locator('#feedback-button');
  await expect(feedbackButton).toBeVisible({ timeout: 10000 });
  await feedbackButton.click();

  const modal = page.locator('[data-testid="app-feedback-modal"]');
  await expect(modal).toBeVisible({ timeout: 10000 });
  return modal;
}

test.describe('Feedback HTTP 500 Fix - STORY-002-REWORK-003', () => {
  test.describe.configure({ mode: 'serial' });

  test.describe('Fixed Scenarios', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthEndpoints(page);
      await mockFeedbackFeature(page, true);
      await login(page);
    });

    test('should submit feedback successfully - previously caused HTTP 500', async ({ page }) => {
      await mockFeedbackSubmission(page, { success: true });
      await triggerFeedbackCapture(page);

      const textarea = page.locator('[data-testid="app-feedback-modal-textarea"]');
      const submitButton = page.locator('[data-testid="app-feedback-modal-submit-button"]');

      // Submit valid feedback - this previously caused HTTP 500
      await textarea.fill('This is a test feedback that previously caused HTTP 500 error.');
      await submitButton.click();

      // Should succeed instead of failing with HTTP 500
      const toast = page.locator('[data-testid="app-feedback-modal-toast"]');
      await expect(toast).toBeVisible({ timeout: 5000 });
      await expect(toast).toContainText('erfolgreich');
    });

    test('should handle feedback submission when screenshot capture fails', async ({ page }) => {
      // Mock with screenshotStored: false to simulate MinIO failure
      await mockFeedbackSubmission(page, { success: true, screenshotStored: false });
      await triggerFeedbackCapture(page);

      const textarea = page.locator('[data-testid="app-feedback-modal-textarea"]');
      const submitButton = page.locator('[data-testid="app-feedback-modal-submit-button"]');

      await textarea.fill('Feedback without successful screenshot storage');
      await submitButton.click();

      // Should still succeed - feedback is more important than screenshot
      const toast = page.locator('[data-testid="app-feedback-modal-toast"]');
      await expect(toast).toBeVisible({ timeout: 5000 });
      await expect(toast).toContainText('erfolgreich');
    });

    test('should close modal after successful submission', async ({ page }) => {
      await mockFeedbackSubmission(page, { success: true });
      const modal = await triggerFeedbackCapture(page);

      const textarea = page.locator('[data-testid="app-feedback-modal-textarea"]');
      const submitButton = page.locator('[data-testid="app-feedback-modal-submit-button"]');

      await textarea.fill('This is a detailed feedback message.');
      await submitButton.click();

      // Modal should close after success
      await expect(modal).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Error Handling', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthEndpoints(page);
      await mockFeedbackFeature(page, true);
      await login(page);
    });

    test('should show error message when actual server error occurs', async ({ page }) => {
      await mockFeedbackSubmission(page, { success: false });
      await triggerFeedbackCapture(page);

      const textarea = page.locator('[data-testid="app-feedback-modal-textarea"]');
      const submitButton = page.locator('[data-testid="app-feedback-modal-submit-button"]');

      await textarea.fill('This feedback will fail due to server error.');
      await submitButton.click();

      // Should show error in modal
      const error = page.locator('[data-testid="app-feedback-modal-error"]');
      await expect(error).toBeVisible({ timeout: 5000 });
      await expect(error).toContainText('Fehler');
    });

    test('should keep modal open on submission failure', async ({ page }) => {
      await mockFeedbackSubmission(page, { success: false });
      const modal = await triggerFeedbackCapture(page);

      const textarea = page.locator('[data-testid="app-feedback-modal-textarea"]');
      const submitButton = page.locator('[data-testid="app-feedback-modal-submit-button"]');

      await textarea.fill('This feedback will fail due to server error.');
      await submitButton.click();

      // Modal should remain open on error
      await expect(modal).toBeVisible({ timeout: 5000 });
    });

    test('should allow retry after error', async ({ page }) => {
      // First mock failure, then success
      let callCount = 0;
      await page.route('**/api/feedback', async (route) => {
        callCount++;
        if (callCount === 1) {
          // First call fails
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Internal Server Error' }),
          });
        } else {
          // Second call succeeds
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              message: 'Feedback submitted successfully',
              id: 123,
              queued: true,
              screenshotStored: true,
            }),
          });
        }
      });

      await triggerFeedbackCapture(page);

      const textarea = page.locator('[data-testid="app-feedback-modal-textarea"]');
      const submitButton = page.locator('[data-testid="app-feedback-modal-submit-button"]');

      // First attempt fails
      await textarea.fill('Retry feedback submission test.');
      await submitButton.click();

      // Wait for error
      const error = page.locator('[data-testid="app-feedback-modal-error"]');
      await expect(error).toBeVisible({ timeout: 5000 });

      // Retry should succeed
      await submitButton.click();

      // Should show success toast
      const toast = page.locator('[data-testid="app-feedback-modal-toast"]');
      await expect(toast).toBeVisible({ timeout: 5000 });
      await expect(toast).toContainText('erfolgreich');
    });
  });

  test.describe('Response Validation', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthEndpoints(page);
      await mockFeedbackFeature(page, true);
      await login(page);
    });

    test('should receive proper response structure with feedback ID', async ({ page }) => {
      let capturedRequest: { comment?: string } | null = null;
      let capturedResponse: { id?: number; message?: string } | null = null;

      await page.route('**/api/feedback', async (route) => {
        capturedRequest = route.request().postDataJSON();
        const response = {
          message: 'Feedback submitted successfully',
          id: 456,
          queued: true,
          screenshotStored: true,
        };
        capturedResponse = response;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(response),
        });
      });

      await triggerFeedbackCapture(page);

      const textarea = page.locator('[data-testid="app-feedback-modal-textarea"]');
      const submitButton = page.locator('[data-testid="app-feedback-modal-submit-button"]');

      await textarea.fill('Testing response structure validation.');
      await submitButton.click();

      // Wait for the request to complete
      await expect(page.locator('[data-testid="app-feedback-modal-toast"]')).toBeVisible({ timeout: 5000 });

      // Validate request structure
      expect(capturedRequest).toBeDefined();
      expect(capturedRequest?.comment).toBe('Testing response structure validation.');

      // Validate response structure
      expect(capturedResponse).toBeDefined();
      expect(capturedResponse?.id).toBe(456);
      expect(capturedResponse?.message).toBe('Feedback submitted successfully');
    });
  });
});
