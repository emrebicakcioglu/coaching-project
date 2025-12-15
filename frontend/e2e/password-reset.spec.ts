/**
 * Password Reset E2E Tests
 * STORY-009: Password Reset
 *
 * Playwright E2E tests for password reset functionality including:
 * - Forgot password flow
 * - Reset password flow
 * - Password validation
 * - Error handling
 * - Responsive design
 */

import { test, expect } from '@playwright/test';

// Test user credentials (should be configured in test environment)
const TEST_USER = {
  email: 'testuser@example.com',
  password: 'TestPassword123!',
  newPassword: 'NewSecurePass456!',
};

// Base URLs
const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:4102/api/v1';

test.describe('Password Reset - STORY-009', () => {
  test.describe('Forgot Password Flow', () => {
    test('should display forgot password link on login page', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Check that the forgot password link exists
      const forgotLink = page.locator('a[href="/forgot-password"]');
      await expect(forgotLink).toBeVisible();
      await expect(forgotLink).toContainText('Passwort vergessen?');
    });

    test('should navigate to forgot password page from login', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Click forgot password link
      await page.click('text=Passwort vergessen?');

      // Should be on forgot password page
      await expect(page).toHaveURL(/\/forgot-password/);
      await expect(page.locator('h1')).toContainText('Passwort vergessen');
    });

    test('should display forgot password form correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);

      // Check form elements
      await expect(page.locator('h1')).toContainText('Passwort vergessen');
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      await expect(page.locator('a[href="/login"]')).toBeVisible();
    });

    test('should show validation error for empty email', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);

      // Submit empty form
      await page.click('button[type="submit"]');

      // Should show validation error
      await expect(page.locator('.auth-error')).toBeVisible();
      await expect(page.locator('.auth-error')).toContainText('E-Mail-Adresse');
    });

    test('should show validation error for invalid email format', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);

      // Enter invalid email
      await page.fill('input[name="email"]', 'invalid-email');
      await page.click('button[type="submit"]');

      // Should show validation error
      await expect(page.locator('.auth-error')).toBeVisible();
      await expect(page.locator('.auth-error')).toContainText('gültige E-Mail-Adresse');
    });

    test('should show success message after submitting valid email', async ({ page }) => {
      // Mock the API response
      await page.route(`${API_URL}/auth/forgot-password`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'If the email exists, a password reset link has been sent',
          }),
        });
      });

      await page.goto(`${BASE_URL}/forgot-password`);

      // Enter valid email
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.click('button[type="submit"]');

      // Should show success state
      await expect(page.locator('.auth-success')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.auth-success__message')).toContainText('Link');
    });

    test('should show link expiry information on success', async ({ page }) => {
      // Mock the API response
      await page.route(`${API_URL}/auth/forgot-password`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Success' }),
        });
      });

      await page.goto(`${BASE_URL}/forgot-password`);
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.click('button[type="submit"]');

      // Should show expiry message
      await expect(page.locator('.auth-success__expiry')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.auth-success__expiry')).toContainText('1 Stunde');
    });

    test('should show resend email button on success', async ({ page }) => {
      // Mock the API response
      await page.route(`${API_URL}/auth/forgot-password`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Success' }),
        });
      });

      await page.goto(`${BASE_URL}/forgot-password`);
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.click('button[type="submit"]');

      // Should show resend button
      await expect(page.locator('.auth-success')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.auth-button--secondary')).toBeVisible();
      await expect(page.locator('.auth-button--secondary')).toContainText('erneut senden');
    });

    test('should resend email when clicking resend button', async ({ page }) => {
      let requestCount = 0;
      // Mock the API response and count requests
      await page.route(`${API_URL}/auth/forgot-password`, async (route) => {
        requestCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Success' }),
        });
      });

      await page.goto(`${BASE_URL}/forgot-password`);
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.click('button[type="submit"]');

      // Wait for success state
      await expect(page.locator('.auth-success')).toBeVisible({ timeout: 5000 });

      // Click resend button
      await page.click('.auth-button--secondary');

      // Should show resend success message
      await expect(page.locator('.auth-resend-success')).toBeVisible({ timeout: 5000 });

      // Should have made 2 API calls
      expect(requestCount).toBe(2);
    });

    test('should display logo on forgot password page', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);

      // Should show logo placeholder
      await expect(page.locator('.auth-logo')).toBeVisible();
      await expect(page.locator('.auth-logo__placeholder')).toBeVisible();
    });

    test('should show loading state during submission', async ({ page }) => {
      // Slow down the API response
      await page.route(`${API_URL}/auth/forgot-password`, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Success' }),
        });
      });

      await page.goto(`${BASE_URL}/forgot-password`);

      // Enter email and submit
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.click('button[type="submit"]');

      // Should show loading state
      await expect(page.locator('button[type="submit"]')).toBeDisabled();
      await expect(page.locator('.auth-button__spinner')).toBeVisible();
    });

    test('should allow navigating back to login', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);

      // Click back to login link
      await page.click('text=Zurück zur Anmeldung');

      // Should be on login page
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Reset Password Flow', () => {
    const VALID_TOKEN = '0'.repeat(64); // 64 character hex string
    const INVALID_TOKEN = 'invalid-token';

    test('should show error for missing token', async ({ page }) => {
      await page.goto(`${BASE_URL}/reset-password`);

      // Should show error state
      await expect(page.locator('.auth-error-state')).toBeVisible();
      await expect(page.locator('.auth-error-state__message')).toContainText('ungültig');
    });

    test('should show error for invalid token format', async ({ page }) => {
      await page.goto(`${BASE_URL}/reset-password?token=${INVALID_TOKEN}`);

      // Should show error state
      await expect(page.locator('.auth-error-state')).toBeVisible();
    });

    test('should display reset password form for valid token', async ({ page }) => {
      await page.goto(`${BASE_URL}/reset-password?token=${VALID_TOKEN}`);

      // Should show reset form
      await expect(page.locator('h1')).toContainText('Neues Passwort');
      await expect(page.locator('input[name="newPassword"]')).toBeVisible();
      await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should display logo on reset password page', async ({ page }) => {
      await page.goto(`${BASE_URL}/reset-password?token=${VALID_TOKEN}`);

      // Should show logo placeholder
      await expect(page.locator('.auth-logo')).toBeVisible();
      await expect(page.locator('.auth-logo__placeholder')).toBeVisible();
    });

    test('should show password strength indicator', async ({ page }) => {
      await page.goto(`${BASE_URL}/reset-password?token=${VALID_TOKEN}`);

      // Enter a password
      await page.fill('input[name="newPassword"]', 'Test1');

      // Should show password strength indicator
      await expect(page.locator('.password-strength')).toBeVisible();
      await expect(page.locator('.password-strength__bar')).toBeVisible();
      await expect(page.locator('.password-strength__requirements')).toBeVisible();
    });

    test('should show password requirements checklist', async ({ page }) => {
      await page.goto(`${BASE_URL}/reset-password?token=${VALID_TOKEN}`);

      // Enter weak password
      await page.fill('input[name="newPassword"]', 'abc');

      // Should show requirements (4 required + 2 optional)
      const requirements = page.locator('.password-strength__requirement');
      await expect(requirements).toHaveCount(6); // length, lowercase, uppercase, number + special char, 12+ chars
    });

    test('should validate password meets requirements', async ({ page }) => {
      await page.goto(`${BASE_URL}/reset-password?token=${VALID_TOKEN}`);

      // Enter valid password
      await page.fill('input[name="newPassword"]', 'SecurePass123');

      // All requirements should be met (green checkmarks)
      const metRequirements = page.locator('.password-strength__requirement--met');
      await expect(metRequirements).toHaveCount(4);

      // Should show valid indicator
      await expect(page.locator('.password-strength__valid')).toBeVisible();
    });

    test('should show password mismatch error', async ({ page }) => {
      await page.goto(`${BASE_URL}/reset-password?token=${VALID_TOKEN}`);

      // Enter different passwords
      await page.fill('input[name="newPassword"]', 'SecurePass123');
      await page.fill('input[name="confirmPassword"]', 'DifferentPass456');

      // Should show mismatch error
      await expect(page.locator('.auth-field-error')).toBeVisible();
      await expect(page.locator('.auth-field-error')).toContainText('stimmen nicht überein');
    });

    test('should show match confirmation when passwords match', async ({ page }) => {
      await page.goto(`${BASE_URL}/reset-password?token=${VALID_TOKEN}`);

      // Enter matching passwords
      await page.fill('input[name="newPassword"]', 'SecurePass123');
      await page.fill('input[name="confirmPassword"]', 'SecurePass123');

      // Should show match confirmation
      await expect(page.locator('.auth-field-success')).toBeVisible();
      await expect(page.locator('.auth-field-success')).toContainText('stimmen überein');
    });

    test('should disable submit button for invalid form', async ({ page }) => {
      await page.goto(`${BASE_URL}/reset-password?token=${VALID_TOKEN}`);

      // Enter weak password
      await page.fill('input[name="newPassword"]', 'weak');
      await page.fill('input[name="confirmPassword"]', 'weak');

      // Submit button should be disabled
      await expect(page.locator('button[type="submit"]')).toBeDisabled();
    });

    test('should enable submit button for valid form', async ({ page }) => {
      await page.goto(`${BASE_URL}/reset-password?token=${VALID_TOKEN}`);

      // Enter valid matching passwords
      await page.fill('input[name="newPassword"]', 'SecurePass123');
      await page.fill('input[name="confirmPassword"]', 'SecurePass123');

      // Submit button should be enabled
      await expect(page.locator('button[type="submit"]')).not.toBeDisabled();
    });

    test('should toggle password visibility', async ({ page }) => {
      await page.goto(`${BASE_URL}/reset-password?token=${VALID_TOKEN}`);

      // Password should be hidden by default
      await expect(page.locator('input[name="newPassword"]')).toHaveAttribute('type', 'password');

      // Click toggle button
      await page.click('.auth-input-toggle');

      // Password should be visible
      await expect(page.locator('input[name="newPassword"]')).toHaveAttribute('type', 'text');
    });

    test('should show success after password reset', async ({ page }) => {
      // Mock successful API response
      await page.route(`${API_URL}/auth/reset-password`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Password has been reset successfully' }),
        });
      });

      await page.goto(`${BASE_URL}/reset-password?token=${VALID_TOKEN}`);

      // Enter valid passwords
      await page.fill('input[name="newPassword"]', TEST_USER.newPassword);
      await page.fill('input[name="confirmPassword"]', TEST_USER.newPassword);

      // Submit form
      await page.click('button[type="submit"]');

      // Should show success state
      await expect(page.locator('.auth-success')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.auth-success__message')).toContainText('erfolgreich');
    });

    test('should show error for expired token', async ({ page }) => {
      // Mock expired token error
      await page.route(`${API_URL}/auth/reset-password`, async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Invalid or expired reset token' }),
        });
      });

      await page.goto(`${BASE_URL}/reset-password?token=${VALID_TOKEN}`);

      // Enter valid passwords
      await page.fill('input[name="newPassword"]', TEST_USER.newPassword);
      await page.fill('input[name="confirmPassword"]', TEST_USER.newPassword);

      // Submit form
      await page.click('button[type="submit"]');

      // Should show error state
      await expect(page.locator('.auth-error-state')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Complete Password Reset Journey', () => {
    test('complete password reset flow (mocked)', async ({ page }) => {
      // Mock forgot password API
      await page.route(`${API_URL}/auth/forgot-password`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Success' }),
        });
      });

      // Start from login page
      await page.goto(`${BASE_URL}/login`);

      // Click forgot password
      await page.click('text=Passwort vergessen?');
      await expect(page).toHaveURL(/\/forgot-password/);

      // Enter email
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.click('button[type="submit"]');

      // Should show confirmation
      await expect(page.locator('.auth-success')).toBeVisible({ timeout: 5000 });

      // Mock reset password API
      await page.route(`${API_URL}/auth/reset-password`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Password has been reset successfully' }),
        });
      });

      // Simulate clicking email link (navigate to reset page with token)
      const mockToken = '0'.repeat(64);
      await page.goto(`${BASE_URL}/reset-password?token=${mockToken}`);

      // Enter new password
      await page.fill('input[name="newPassword"]', TEST_USER.newPassword);
      await page.fill('input[name="confirmPassword"]', TEST_USER.newPassword);
      await page.click('button[type="submit"]');

      // Should show success
      await expect(page.locator('.auth-success')).toBeVisible({ timeout: 5000 });

      // Navigate to login
      await page.click('text=Jetzt anmelden');
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('API Integration', () => {
    test('POST /api/auth/forgot-password sends request correctly', async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/forgot-password`, {
        data: {
          email: TEST_USER.email,
        },
      });

      // Should always return 200 (regardless of whether email exists)
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data).toHaveProperty('message');
    });

    test('POST /api/auth/reset-password validates token', async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/reset-password`, {
        data: {
          token: 'invalid-token',
          new_password: 'NewPassword123',
        },
      });

      // Should return 400 for invalid token
      expect(response.status()).toBe(400);
    });

    test('POST /api/auth/reset-password validates password requirements', async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/reset-password`, {
        data: {
          token: '0'.repeat(64),
          new_password: 'weak',
        },
      });

      // Should return 400 for weak password
      expect(response.status()).toBe(400);
    });
  });

  test.describe('Rate Limiting', () => {
    test('forgot-password endpoint has rate limiting', async ({ request }) => {
      // Make multiple requests quickly
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          request.post(`${API_URL}/auth/forgot-password`, {
            data: { email: `test${i}@example.com` },
          })
        );
      }

      const responses = await Promise.all(requests);

      // Some requests should be rate limited
      const rateLimited = responses.filter((r) => r.status() === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  test.describe('Accessibility', () => {
    test('forgot password page is accessible', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);

      // Check for proper heading structure
      await expect(page.locator('h1')).toBeVisible();

      // Check for proper form labels
      const emailInput = page.locator('input[name="email"]');
      await expect(emailInput).toHaveAttribute('id', 'email');
      await expect(page.locator('label[for="email"]')).toBeVisible();

      // Check for proper button text
      const submitBtn = page.locator('button[type="submit"]');
      await expect(submitBtn).toBeVisible();
    });

    test('reset password page is accessible', async ({ page }) => {
      const token = '0'.repeat(64);
      await page.goto(`${BASE_URL}/reset-password?token=${token}`);

      // Check for proper heading structure
      await expect(page.locator('h1')).toBeVisible();

      // Check form inputs have labels
      await expect(page.locator('label[for="newPassword"]')).toBeVisible();
      await expect(page.locator('label[for="confirmPassword"]')).toBeVisible();
    });

    test('error messages are announced to screen readers', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);

      // Submit empty form
      await page.click('button[type="submit"]');

      // Error should have role="alert"
      const error = page.locator('.auth-error');
      await expect(error).toHaveAttribute('role', 'alert');
    });

    test('password strength is announced to screen readers', async ({ page }) => {
      const token = '0'.repeat(64);
      await page.goto(`${BASE_URL}/reset-password?token=${token}`);

      // Enter password to trigger strength indicator
      await page.fill('input[name="newPassword"]', 'Test123');

      // Strength should have live region
      const strength = page.locator('.password-strength');
      await expect(strength).toHaveAttribute('role', 'status');
    });
  });

  test.describe('Responsive Design', () => {
    test('forgot password page is responsive on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto(`${BASE_URL}/forgot-password`);

      // Container should be visible and properly sized
      await expect(page.locator('.auth-container')).toBeVisible();

      // Form should be usable
      await page.fill('input[name="email"]', 'test@example.com');
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('reset password page is responsive on tablet', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      const token = '0'.repeat(64);
      await page.goto(`${BASE_URL}/reset-password?token=${token}`);

      // Form should be visible and properly sized
      await expect(page.locator('.auth-container')).toBeVisible();
      await expect(page.locator('input[name="newPassword"]')).toBeVisible();
      await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    });

    test('forgot password page is responsive on desktop', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });

      await page.goto(`${BASE_URL}/forgot-password`);

      // Page should be centered
      const container = page.locator('.auth-container');
      await expect(container).toBeVisible();

      // Container should have max-width constraint
      const box = await container.boundingBox();
      expect(box?.width).toBeLessThanOrEqual(500);
    });
  });

  test.describe('Security', () => {
    test('forgot password does not reveal email existence', async ({ page }) => {
      // Mock API to return success for any email
      await page.route(`${API_URL}/auth/forgot-password`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'If the email exists, a password reset link has been sent' }),
        });
      });

      await page.goto(`${BASE_URL}/forgot-password`);

      // Try with existing email
      await page.fill('input[name="email"]', 'existing@example.com');
      await page.click('button[type="submit"]');

      const successMessage1 = await page.locator('.auth-success__message').textContent();

      // Go back and try with non-existing email
      await page.goto(`${BASE_URL}/forgot-password`);
      await page.fill('input[name="email"]', 'nonexistent@example.com');
      await page.click('button[type="submit"]');

      const successMessage2 = await page.locator('.auth-success__message').textContent();

      // Both messages should be the same (no email enumeration)
      expect(successMessage1).toBe(successMessage2);
    });

    test('password input is masked by default', async ({ page }) => {
      const token = '0'.repeat(64);
      await page.goto(`${BASE_URL}/reset-password?token=${token}`);

      // Both password inputs should be of type password
      await expect(page.locator('input[name="newPassword"]')).toHaveAttribute('type', 'password');
      await expect(page.locator('input[name="confirmPassword"]')).toHaveAttribute('type', 'password');
    });
  });
});
