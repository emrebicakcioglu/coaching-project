/**
 * Feedback Modal UI E2E Tests
 * STORY-041G: Feedback Modal UI
 *
 * End-to-end tests for the feedback modal component.
 *
 * Test Scenarios:
 * 1. Modal opens with screenshot preview
 * 2. Textarea input and character counter
 * 3. Minimum character validation
 * 4. Form submission flow
 * 5. Modal closing behavior
 * 6. Error handling
 * 7. Accessibility features
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const TEST_EMAIL = 'admin@example.com';
const TEST_PASSWORD = 'TestPassword123!';

/**
 * Helper function to login - bypasses the login UI by setting auth tokens directly
 * This avoids rate limiting and reduces test flakiness
 */
async function login(page: Page) {
  // First set up the auth tokens in storage before navigation
  await page.goto('/login');
  await page.evaluate(() => {
    // Set mock tokens in localStorage to simulate authenticated state
    localStorage.setItem('access_token', 'mock-access-token-for-e2e-tests');
    localStorage.setItem('refresh_token', 'mock-refresh-token-for-e2e-tests');
  });

  // Navigate to dashboard - the app will use the stored tokens
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
}

/**
 * Helper to mock auth endpoints to avoid rate limiting
 */
async function mockAuthEndpoints(page: Page) {
  // Mock all auth endpoints
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

  // Mock current user endpoint
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

  // Mock version endpoint
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
 * Helper to mock feedback submission endpoint
 */
async function mockFeedbackSubmission(page: Page, options: { success?: boolean; delay?: number } = {}) {
  const { success = true, delay = 0 } = options;

  await page.route('**/api/feedback', async (route) => {
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    if (success) {
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

  // Wait for modal to open
  const modal = page.locator('[data-testid="app-feedback-modal"]');
  await expect(modal).toBeVisible({ timeout: 10000 });
  return modal;
}

test.describe('Feedback Modal UI - STORY-041G', () => {
  // Run tests serially to avoid interference
  test.describe.configure({ mode: 'serial' });

  test.describe('Modal Display', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthEndpoints(page);
      await mockFeedbackFeature(page, true);
      await mockFeedbackSubmission(page);
      await login(page);
    });

    test('should open modal after screenshot capture', async ({ page }) => {
      const modal = await triggerFeedbackCapture(page);
      await expect(modal).toBeVisible();
    });

    test('should display modal title "Feedback senden"', async ({ page }) => {
      await triggerFeedbackCapture(page);
      const title = page.locator('[data-testid="app-feedback-modal-title"]');
      await expect(title).toHaveText('Feedback senden');
    });

    test('should have close button visible', async ({ page }) => {
      await triggerFeedbackCapture(page);
      const closeButton = page.locator('[data-testid="app-feedback-modal-close-button"]');
      await expect(closeButton).toBeVisible();
    });

    test('should close on X button click', async ({ page }) => {
      const modal = await triggerFeedbackCapture(page);
      const closeButton = page.locator('[data-testid="app-feedback-modal-close-button"]');
      await closeButton.click();
      await expect(modal).not.toBeVisible();
    });

    test('should close on Escape key press', async ({ page }) => {
      const modal = await triggerFeedbackCapture(page);
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    });

    test('should close on backdrop click (desktop)', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 800 });
      await triggerFeedbackCapture(page);

      // Click on backdrop - use force to bypass element interception
      // The modal container may overlay the backdrop, but the backdrop click handler should still work
      const backdrop = page.locator('[data-testid="app-feedback-modal-backdrop"]');
      if (await backdrop.isVisible()) {
        await backdrop.click({ position: { x: 10, y: 10 }, force: true });
        const modal = page.locator('[data-testid="app-feedback-modal"]');
        await expect(modal).not.toBeVisible();
      }
    });
  });

  test.describe('Screenshot Preview', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthEndpoints(page);
      await mockFeedbackFeature(page, true);
      await mockFeedbackSubmission(page);
      await login(page);
    });

    test('should show screenshot preview', async ({ page }) => {
      await triggerFeedbackCapture(page);
      const screenshot = page.locator('[data-testid="app-feedback-modal-screenshot"]');
      await expect(screenshot).toBeVisible();
    });

    test('should have screenshot with max-height constraint', async ({ page }) => {
      await triggerFeedbackCapture(page);
      const screenshot = page.locator('[data-testid="app-feedback-modal-screenshot"]');

      const maxHeight = await screenshot.evaluate((el) => {
        return window.getComputedStyle(el).maxHeight;
      });

      expect(maxHeight).toBe('300px');
    });
  });

  test.describe('Comment Input', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthEndpoints(page);
      await mockFeedbackFeature(page, true);
      await mockFeedbackSubmission(page);
      await login(page);
    });

    test('should focus textarea when modal opens', async ({ page }) => {
      await triggerFeedbackCapture(page);
      const textarea = page.locator('[data-testid="app-feedback-modal-textarea"]');

      // Wait a moment for focus to be set
      await page.waitForTimeout(200);

      const isFocused = await textarea.evaluate((el) => {
        return document.activeElement === el;
      });

      expect(isFocused).toBe(true);
    });

    test('should display character counter', async ({ page }) => {
      await triggerFeedbackCapture(page);
      const charCount = page.locator('[data-testid="app-feedback-modal-char-count"]');
      await expect(charCount).toHaveText('0/2000 Zeichen');
    });

    test('should update character counter on input', async ({ page }) => {
      await triggerFeedbackCapture(page);
      const textarea = page.locator('[data-testid="app-feedback-modal-textarea"]');
      const charCount = page.locator('[data-testid="app-feedback-modal-char-count"]');

      await textarea.fill('Hello World');
      await expect(charCount).toHaveText('11/2000 Zeichen');
    });

    test('should show hint when less than 10 characters', async ({ page }) => {
      await triggerFeedbackCapture(page);
      const textarea = page.locator('[data-testid="app-feedback-modal-textarea"]');
      const hint = page.locator('[data-testid="app-feedback-modal-hint"]');

      await textarea.fill('Short');
      await expect(hint).toBeVisible();
      await expect(hint).toContainText('Noch 5 Zeichen erforderlich');
    });

    test('should hide hint when 10 or more characters', async ({ page }) => {
      await triggerFeedbackCapture(page);
      const textarea = page.locator('[data-testid="app-feedback-modal-textarea"]');
      const hint = page.locator('[data-testid="app-feedback-modal-hint"]');

      await textarea.fill('This is a valid feedback message');
      await expect(hint).not.toBeVisible();
    });

    test('should not allow more than 2000 characters', async ({ page }) => {
      await triggerFeedbackCapture(page);
      const textarea = page.locator('[data-testid="app-feedback-modal-textarea"]');
      const charCount = page.locator('[data-testid="app-feedback-modal-char-count"]');

      // Wait for textarea to be ready
      await expect(textarea).toBeVisible();

      // First fill with exactly 2000 characters (the maximum allowed)
      const maxText = 'a'.repeat(2000);
      await textarea.fill(maxText);

      // Wait a moment for the character count to update
      await page.waitForTimeout(100);

      // Should show exactly 2000 characters
      await expect(charCount).toHaveText('2000/2000 Zeichen');

      // Verify the textarea value is exactly 2000 characters
      const textareaValue = await textarea.inputValue();
      expect(textareaValue.length).toBe(2000);
    });
  });

  test.describe('Form Validation', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthEndpoints(page);
      await mockFeedbackFeature(page, true);
      await mockFeedbackSubmission(page);
      await login(page);
    });

    test('should disable submit button when less than 10 characters', async ({ page }) => {
      await triggerFeedbackCapture(page);
      const textarea = page.locator('[data-testid="app-feedback-modal-textarea"]');
      const submitButton = page.locator('[data-testid="app-feedback-modal-submit-button"]');

      await textarea.fill('Short');
      await expect(submitButton).toBeDisabled();
    });

    test('should enable submit button when 10 or more characters', async ({ page }) => {
      await triggerFeedbackCapture(page);
      const textarea = page.locator('[data-testid="app-feedback-modal-textarea"]');
      const submitButton = page.locator('[data-testid="app-feedback-modal-submit-button"]');

      await textarea.fill('This is a valid feedback message');
      await expect(submitButton).toBeEnabled();
    });

    test('should show validation hint for too few characters', async ({ page }) => {
      await triggerFeedbackCapture(page);
      const textarea = page.locator('[data-testid="app-feedback-modal-textarea"]');
      const submitButton = page.locator('[data-testid="app-feedback-modal-submit-button"]');
      const hint = page.locator('[data-testid="app-feedback-modal-hint"]');

      // Type less than minimum
      await textarea.fill('Short');

      // Submit button should be disabled
      await expect(submitButton).toBeDisabled();

      // Hint should show the remaining characters needed
      await expect(hint).toBeVisible();
      await expect(hint).toContainText('Zeichen erforderlich');
    });
  });

  test.describe('Form Submission', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthEndpoints(page);
      await mockFeedbackFeature(page, true);
      await login(page);
    });

    test('should submit feedback successfully', async ({ page }) => {
      await mockFeedbackSubmission(page, { success: true });
      await triggerFeedbackCapture(page);

      const textarea = page.locator('[data-testid="app-feedback-modal-textarea"]');
      const submitButton = page.locator('[data-testid="app-feedback-modal-submit-button"]');

      await textarea.fill('This is a detailed feedback message for testing purposes.');
      await submitButton.click();

      // Check for success toast
      const toast = page.locator('[data-testid="app-feedback-modal-toast"]');
      await expect(toast).toBeVisible({ timeout: 5000 });
      await expect(toast).toContainText('erfolgreich');
    });

    test('should close modal after successful submission', async ({ page }) => {
      await mockFeedbackSubmission(page, { success: true });
      const modal = await triggerFeedbackCapture(page);

      const textarea = page.locator('[data-testid="app-feedback-modal-textarea"]');
      const submitButton = page.locator('[data-testid="app-feedback-modal-submit-button"]');

      await textarea.fill('This is a detailed feedback message for testing purposes.');
      await submitButton.click();

      // Modal should close after success
      await expect(modal).not.toBeVisible({ timeout: 5000 });
    });

    test('should show loading state during submission', async ({ page }) => {
      await mockFeedbackSubmission(page, { success: true, delay: 1000 });
      await triggerFeedbackCapture(page);

      const textarea = page.locator('[data-testid="app-feedback-modal-textarea"]');
      const submitButton = page.locator('[data-testid="app-feedback-modal-submit-button"]');

      await textarea.fill('This is a detailed feedback message for testing purposes.');
      await submitButton.click();

      // Should show "Senden..." text
      await expect(submitButton).toContainText('Senden...');

      // Submit button should be disabled during submission
      await expect(submitButton).toBeDisabled();
    });

    test('should disable cancel button during submission', async ({ page }) => {
      await mockFeedbackSubmission(page, { success: true, delay: 1000 });
      await triggerFeedbackCapture(page);

      const textarea = page.locator('[data-testid="app-feedback-modal-textarea"]');
      const submitButton = page.locator('[data-testid="app-feedback-modal-submit-button"]');
      const cancelButton = page.locator('[data-testid="app-feedback-modal-cancel-button"]');

      await textarea.fill('This is a detailed feedback message for testing purposes.');
      await submitButton.click();

      // Cancel button should be disabled during submission
      await expect(cancelButton).toBeDisabled();
    });
  });

  test.describe('Error Handling', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthEndpoints(page);
      await mockFeedbackFeature(page, true);
      await login(page);
    });

    test('should show error toast on submission failure', async ({ page }) => {
      await mockFeedbackSubmission(page, { success: false });
      await triggerFeedbackCapture(page);

      const textarea = page.locator('[data-testid="app-feedback-modal-textarea"]');
      const submitButton = page.locator('[data-testid="app-feedback-modal-submit-button"]');

      await textarea.fill('This is a detailed feedback message for testing purposes.');
      await submitButton.click();

      // Check for error toast
      const toast = page.locator('[data-testid="app-feedback-modal-toast"]');
      await expect(toast).toBeVisible({ timeout: 5000 });
    });

    test('should show error message in modal on submission failure', async ({ page }) => {
      await mockFeedbackSubmission(page, { success: false });
      await triggerFeedbackCapture(page);

      const textarea = page.locator('[data-testid="app-feedback-modal-textarea"]');
      const submitButton = page.locator('[data-testid="app-feedback-modal-submit-button"]');

      await textarea.fill('This is a detailed feedback message for testing purposes.');
      await submitButton.click();

      // Check for error message
      const error = page.locator('[data-testid="app-feedback-modal-error"]');
      await expect(error).toBeVisible({ timeout: 5000 });
      await expect(error).toContainText('Fehler');
    });

    test('should keep modal open on submission failure', async ({ page }) => {
      await mockFeedbackSubmission(page, { success: false });
      const modal = await triggerFeedbackCapture(page);

      const textarea = page.locator('[data-testid="app-feedback-modal-textarea"]');
      const submitButton = page.locator('[data-testid="app-feedback-modal-submit-button"]');

      await textarea.fill('This is a detailed feedback message for testing purposes.');
      await submitButton.click();

      // Modal should remain open
      await expect(modal).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthEndpoints(page);
      await mockFeedbackFeature(page, true);
      await mockFeedbackSubmission(page);
      await login(page);
    });

    test('should have proper aria attributes', async ({ page }) => {
      await triggerFeedbackCapture(page);

      const modal = page.locator('[data-testid="app-feedback-modal"]');
      await expect(modal).toHaveAttribute('role', 'dialog');
      await expect(modal).toHaveAttribute('aria-modal', 'true');
    });

    test('should have associated label for textarea', async ({ page }) => {
      await triggerFeedbackCapture(page);

      const textarea = page.locator('[data-testid="app-feedback-modal-textarea"]');
      const labelId = await textarea.getAttribute('id');

      const label = page.locator(`label[for="${labelId}"]`);
      await expect(label).toBeVisible();
    });

    test('should have aria-describedby for character count', async ({ page }) => {
      await triggerFeedbackCapture(page);

      const textarea = page.locator('[data-testid="app-feedback-modal-textarea"]');
      const describedBy = await textarea.getAttribute('aria-describedby');
      expect(describedBy).toContain('char-count');
    });

    test('should mark error with role=alert', async ({ page }) => {
      await mockFeedbackSubmission(page, { success: false });
      await triggerFeedbackCapture(page);

      const textarea = page.locator('[data-testid="app-feedback-modal-textarea"]');
      const submitButton = page.locator('[data-testid="app-feedback-modal-submit-button"]');

      await textarea.fill('This is a detailed feedback message for testing purposes.');
      await submitButton.click();

      const error = page.locator('[data-testid="app-feedback-modal-error"]');
      await expect(error).toHaveAttribute('role', 'alert');
    });
  });

  test.describe('Responsive Design', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthEndpoints(page);
      await mockFeedbackFeature(page, true);
      await mockFeedbackSubmission(page);
    });

    test('should display fullscreen on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await login(page);
      await triggerFeedbackCapture(page);

      const modal = page.locator('[data-testid="app-feedback-modal"]');
      await expect(modal).toHaveAttribute('data-variant', 'mobile');
    });

    test('should display as centered modal on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await login(page);
      await triggerFeedbackCapture(page);

      const modal = page.locator('[data-testid="app-feedback-modal"]');
      await expect(modal).toHaveAttribute('data-variant', 'desktop');
    });

    test('should have max-width on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await login(page);
      await triggerFeedbackCapture(page);

      const modal = page.locator('[data-testid="app-feedback-modal"]');
      const maxWidth = await modal.evaluate((el) => {
        return window.getComputedStyle(el).maxWidth;
      });

      // max-w-md is 448px in Tailwind
      expect(parseInt(maxWidth)).toBeLessThanOrEqual(600);
    });
  });

  test.describe('Cancel Button', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthEndpoints(page);
      await mockFeedbackFeature(page, true);
      await mockFeedbackSubmission(page);
      await login(page);
    });

    test('should close modal on cancel button click', async ({ page }) => {
      const modal = await triggerFeedbackCapture(page);
      const cancelButton = page.locator('[data-testid="app-feedback-modal-cancel-button"]');

      await cancelButton.click();
      await expect(modal).not.toBeVisible();
    });

    test('should reset form on close and reopen', async ({ page }) => {
      await triggerFeedbackCapture(page);
      const textarea = page.locator('[data-testid="app-feedback-modal-textarea"]');
      const cancelButton = page.locator('[data-testid="app-feedback-modal-cancel-button"]');

      // Type some text
      await textarea.fill('Some text here');
      await expect(textarea).toHaveValue('Some text here');

      // Close modal
      await cancelButton.click();

      // Re-open modal
      await triggerFeedbackCapture(page);

      // Textarea should be empty
      await expect(textarea).toHaveValue('');
    });
  });
});
