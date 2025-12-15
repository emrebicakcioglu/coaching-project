/**
 * Settings UI E2E Tests
 * STORY-013B: In-App Settings Frontend UI
 *
 * End-to-end tests for the settings page, admin settings tabs,
 * form validation, and save/reset functionality.
 *
 * Test Scenarios:
 * 1. Settings navigation - tab switching
 * 2. Settings display - form rendering
 * 3. Form validation
 * 4. Save functionality
 * 5. Reset functionality
 * 6. Responsive design
 * 7. Accessibility
 */

import { test, expect, Page } from '@playwright/test';

// Base URL from playwright config
const BASE_URL = 'http://localhost:3000';

/**
 * Test admin credentials
 * Uses environment variables with fallback defaults
 */
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'TestPassword123!';

/**
 * Helper function to login as admin user
 * Includes rate limiting handling and proper authentication verification
 */
async function loginAsAdmin(page: Page) {
  // Allow multiple retries for rate-limiting scenarios
  const maxAttempts = 8;
  const retryDelay = 10000; // 10 seconds between retries for rate limiting

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await page.goto(`${BASE_URL}/login`);

    // Clear storage on first attempt to ensure clean state
    if (attempt === 1) {
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.reload();
    }

    // Use name attribute as fallback selector for consistency
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait briefly for response
    await page.waitForTimeout(1000);

    // Check if we hit rate limiting
    const rateLimitError = await page.locator('text=Zu viele Anmeldeversuche').isVisible();
    if (rateLimitError) {
      console.log(`Rate limit hit on attempt ${attempt}, waiting ${retryDelay/1000}s...`);
      await page.waitForTimeout(retryDelay);
      continue;
    }

    // Wait for navigation to complete - must navigate away from login page
    try {
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });

      // Wait for the user info to be visible in the sidebar (indicates auth context is loaded)
      await page.waitForSelector('text=System Administrator', { timeout: 10000 });

      // Small delay to ensure permissions state is propagated
      await page.waitForTimeout(500);

      // Login successful
      return;
    } catch {
      if (attempt < maxAttempts) {
        console.log(`Login attempt ${attempt} failed, retrying...`);
        await page.waitForTimeout(2000);
        continue;
      }
      throw new Error('Failed to login after maximum attempts');
    }
  }
}

test.describe('Settings UI - STORY-013B', () => {
  // Run tests serially to avoid session conflicts
  test.describe.configure({ mode: 'serial' });

  // Increase timeout for tests to handle rate limiting delays
  test.setTimeout(120000); // 120 seconds per test

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe('Settings Navigation', () => {
    test('navigate between settings tabs', async ({ page }) => {
      await page.goto('/settings');

      // Check General tab is visible by default
      await page.click('[data-testid="tab-general"]');
      await expect(page.locator('[data-testid="general-settings"]')).toBeVisible();

      // Switch to Security tab
      await page.click('[data-testid="tab-security"]');
      await expect(page.locator('[data-testid="security-settings"]')).toBeVisible();

      // Switch to Email tab
      await page.click('[data-testid="tab-email"]');
      await expect(page.locator('[data-testid="email-settings"]')).toBeVisible();
    });

    test('tab navigation highlights active tab', async ({ page }) => {
      await page.goto('/settings');

      // General tab should be active initially
      const generalTab = page.locator('[data-testid="tab-general"]');
      await expect(generalTab).toHaveAttribute('aria-selected', 'true');

      // Switch to Security tab
      await page.click('[data-testid="tab-security"]');
      const securityTab = page.locator('[data-testid="tab-security"]');
      await expect(securityTab).toHaveAttribute('aria-selected', 'true');
      await expect(generalTab).toHaveAttribute('aria-selected', 'false');
    });
  });

  test.describe('Settings Display', () => {
    test('displays admin settings section for admin users', async ({ page }) => {
      await page.goto('/settings');

      // Admin settings should be visible
      await expect(page.getByText('Administrator-Einstellungen')).toBeVisible();
      await expect(page.locator('[data-testid="settings-tabs"]')).toBeVisible();
    });

    test('displays personal settings section', async ({ page }) => {
      await page.goto('/settings');

      // Personal settings should be visible
      await expect(page.getByText('Persönliche Einstellungen')).toBeVisible();
    });

    test('displays all general settings fields', async ({ page }) => {
      await page.goto('/settings');
      await page.click('[data-testid="tab-general"]');

      // Wait for loading to complete
      await expect(page.locator('[data-testid="general-settings-loading"]')).not.toBeVisible({ timeout: 10000 });

      // Check for general settings fields
      await expect(page.locator('[data-testid="setting-input-support-email"]')).toBeVisible();
      await expect(page.locator('[data-testid="setting-input-session-timeout"]')).toBeVisible();
      await expect(page.locator('[data-testid="setting-toggle-show-warning"]')).toBeVisible();
    });

    test('displays all security settings fields', async ({ page }) => {
      await page.goto('/settings');
      await page.click('[data-testid="tab-security"]');

      // Wait for loading to complete
      await expect(page.locator('[data-testid="security-settings-loading"]')).not.toBeVisible({ timeout: 10000 });

      // Check for security settings fields
      await expect(page.locator('[data-testid="setting-input-max-login-attempts"]')).toBeVisible();
      await expect(page.locator('[data-testid="setting-input-password-min-length"]')).toBeVisible();
      await expect(page.locator('[data-testid="setting-toggle-require-uppercase"]')).toBeVisible();
    });
  });

  test.describe('Settings Update via UI', () => {
    test('update settings via UI', async ({ page }) => {
      await page.goto('/settings');
      await page.click('[data-testid="tab-general"]');

      // Wait for form to load
      await expect(page.locator('[data-testid="general-settings-loading"]')).not.toBeVisible({ timeout: 10000 });

      // Get the current session timeout value
      const sessionTimeoutInput = page.locator('[data-testid="setting-input-session-timeout"]');
      const currentValue = await sessionTimeoutInput.inputValue();

      // Change to a new value
      const newValue = currentValue === '30' ? '45' : '30';
      await sessionTimeoutInput.fill(newValue);

      // Save button should be enabled
      const saveButton = page.locator('[data-testid="save-button"]');
      await expect(saveButton).not.toBeDisabled();

      // Click save
      await page.click('[data-testid="save-button"]');

      // Wait for success message (toast)
      await expect(page.locator('[data-testid="settings-toast"]')).toBeVisible({ timeout: 5000 });

      // Verify the value persists after reload
      await page.reload();
      await page.click('[data-testid="tab-general"]');
      await expect(page.locator('[data-testid="general-settings-loading"]')).not.toBeVisible({ timeout: 10000 });
      await expect(sessionTimeoutInput).toHaveValue(newValue);
    });

    test('shows unsaved changes indicator', async ({ page }) => {
      await page.goto('/settings');
      await page.click('[data-testid="tab-general"]');

      // Wait for form to load
      await expect(page.locator('[data-testid="general-settings-loading"]')).not.toBeVisible({ timeout: 10000 });

      // Modify a value
      await page.locator('[data-testid="setting-input-session-timeout"]').fill('60');

      // Unsaved indicator should appear
      await expect(page.locator('[data-testid="unsaved-indicator"]')).toBeVisible();
    });
  });

  test.describe('Reset to Default', () => {
    test('reset settings to default', async ({ page }) => {
      await page.goto('/settings');
      await page.click('[data-testid="tab-security"]');

      // Wait for form to load
      await expect(page.locator('[data-testid="security-settings-loading"]')).not.toBeVisible({ timeout: 10000 });

      // Click reset to defaults button
      await page.click('[data-testid="reset-to-defaults-button"]');

      // Confirmation dialog should appear
      await expect(page.locator('[data-testid="reset-confirm-dialog"]')).toBeVisible();

      // Click confirm
      await page.click('[data-testid="confirm-reset"]');

      // Wait for success message
      await expect(page.locator('[data-testid="settings-toast"]')).toBeVisible({ timeout: 5000 });
    });

    test('cancel reset does not modify settings', async ({ page }) => {
      await page.goto('/settings');
      await page.click('[data-testid="tab-security"]');

      // Wait for form to load
      await expect(page.locator('[data-testid="security-settings-loading"]')).not.toBeVisible({ timeout: 10000 });

      // Get current value
      const maxAttemptsInput = page.locator('[data-testid="setting-input-max-login-attempts"]');
      const originalValue = await maxAttemptsInput.inputValue();

      // Click reset to defaults button
      await page.click('[data-testid="reset-to-defaults-button"]');
      await expect(page.locator('[data-testid="reset-confirm-dialog"]')).toBeVisible();

      // Cancel
      await page.getByText('Abbrechen').click();

      // Dialog should close
      await expect(page.locator('[data-testid="reset-confirm-dialog"]')).not.toBeVisible();

      // Value should remain unchanged
      await expect(maxAttemptsInput).toHaveValue(originalValue);
    });
  });

  test.describe('Form Validation', () => {
    test('display validation errors', async ({ page }) => {
      await page.goto('/settings');
      await page.click('[data-testid="tab-general"]');

      // Wait for form to load
      await expect(page.locator('[data-testid="general-settings-loading"]')).not.toBeVisible({ timeout: 10000 });

      // Enter invalid email
      await page.locator('[data-testid="setting-input-support-email"]').fill('invalid-email');

      // Try to save
      await page.click('[data-testid="save-button"]');

      // Validation error should appear
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    });

    test('validates session timeout range', async ({ page }) => {
      await page.goto('/settings');
      await page.click('[data-testid="tab-general"]');

      // Wait for form to load
      await expect(page.locator('[data-testid="general-settings-loading"]')).not.toBeVisible({ timeout: 10000 });

      // Enter out of range value
      await page.locator('[data-testid="setting-input-session-timeout"]').fill('9999');

      // Try to save
      await page.click('[data-testid="save-button"]');

      // Validation error should appear
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    });

    test('validates password policy settings', async ({ page }) => {
      await page.goto('/settings');
      await page.click('[data-testid="tab-security"]');

      // Wait for form to load
      await expect(page.locator('[data-testid="security-settings-loading"]')).not.toBeVisible({ timeout: 10000 });

      // Enter invalid password min length
      await page.locator('[data-testid="setting-input-password-min-length"]').fill('3');

      // Try to save
      await page.click('[data-testid="save-button"]');

      // Validation error should appear
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('settings page works on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/settings');

      // Settings should still be visible
      await expect(page.getByRole('heading', { name: 'Einstellungen' })).toBeVisible();

      // Tabs should be visible
      await expect(page.locator('[data-testid="tab-general"]')).toBeVisible();
    });

    test('settings page works on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/settings');

      await expect(page.getByRole('heading', { name: 'Einstellungen' })).toBeVisible();
      await expect(page.locator('[data-testid="settings-tabs"]')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('tabs have proper ARIA attributes', async ({ page }) => {
      await page.goto('/settings');

      // Check for tablist role
      await expect(page.getByRole('tablist')).toBeVisible();

      // Check individual tabs have tab role
      const tabs = await page.getByRole('tab').all();
      expect(tabs.length).toBe(3);

      // Active tab should have aria-selected="true"
      const generalTab = page.locator('[data-testid="tab-general"]');
      await expect(generalTab).toHaveAttribute('aria-selected', 'true');
    });

    test('form fields have proper labels', async ({ page }) => {
      await page.goto('/settings');
      await page.click('[data-testid="tab-general"]');

      // Wait for form to load
      await expect(page.locator('[data-testid="general-settings-loading"]')).not.toBeVisible({ timeout: 10000 });

      // Check that labels are associated with inputs
      await expect(page.getByLabelText('Support E-Mail')).toBeVisible();
      await expect(page.getByLabelText('Session-Timeout')).toBeVisible();
    });

    test('toggle switches have switch role', async ({ page }) => {
      await page.goto('/settings');
      await page.click('[data-testid="tab-general"]');

      // Wait for form to load
      await expect(page.locator('[data-testid="general-settings-loading"]')).not.toBeVisible({ timeout: 10000 });

      // Check for switch role
      const toggleSwitch = page.locator('[data-testid="setting-toggle-show-warning"]');
      await expect(toggleSwitch).toHaveAttribute('role', 'switch');
    });

    test('validation errors have alert role', async ({ page }) => {
      await page.goto('/settings');
      await page.click('[data-testid="tab-general"]');

      // Wait for form to load
      await expect(page.locator('[data-testid="general-settings-loading"]')).not.toBeVisible({ timeout: 10000 });

      // Trigger validation error
      await page.locator('[data-testid="setting-input-support-email"]').fill('invalid-email');
      await page.click('[data-testid="save-button"]');

      // Error should have alert role
      const error = page.locator('[data-testid="validation-error"]');
      await expect(error).toHaveAttribute('role', 'alert');
    });
  });

  test.describe('User Flows', () => {
    test('complete flow: navigate, modify, save settings', async ({ page }) => {
      await page.goto('/settings');

      // Step 1: Navigate to Security tab
      await page.click('[data-testid="tab-security"]');
      await expect(page.locator('[data-testid="security-settings-loading"]')).not.toBeVisible({ timeout: 10000 });

      // Step 2: Modify a setting
      const maxAttemptsInput = page.locator('[data-testid="setting-input-max-login-attempts"]');
      const originalValue = await maxAttemptsInput.inputValue();
      const newValue = originalValue === '5' ? '10' : '5';
      await maxAttemptsInput.fill(newValue);

      // Step 3: Verify unsaved indicator appears
      await expect(page.locator('[data-testid="unsaved-indicator"]')).toBeVisible();

      // Step 4: Save
      await page.click('[data-testid="save-button"]');

      // Step 5: Verify success
      await expect(page.locator('[data-testid="settings-toast"]')).toBeVisible({ timeout: 5000 });

      // Step 6: Verify persistence
      await page.reload();
      await page.click('[data-testid="tab-security"]');
      await expect(page.locator('[data-testid="security-settings-loading"]')).not.toBeVisible({ timeout: 10000 });
      await expect(maxAttemptsInput).toHaveValue(newValue);

      // Cleanup: restore original value
      await maxAttemptsInput.fill(originalValue);
      await page.click('[data-testid="save-button"]');
      await expect(page.locator('[data-testid="settings-toast"]')).toBeVisible({ timeout: 5000 });
    });

    test('complete flow: undo changes before saving', async ({ page }) => {
      await page.goto('/settings');
      await page.click('[data-testid="tab-general"]');

      // Wait for form to load
      await expect(page.locator('[data-testid="general-settings-loading"]')).not.toBeVisible({ timeout: 10000 });

      // Get original value
      const sessionTimeoutInput = page.locator('[data-testid="setting-input-session-timeout"]');
      const originalValue = await sessionTimeoutInput.inputValue();

      // Modify value
      await sessionTimeoutInput.fill('99');
      await expect(page.locator('[data-testid="unsaved-indicator"]')).toBeVisible();

      // Click reset (undo changes)
      await page.click('[data-testid="reset-button"]');

      // Value should be restored
      await expect(sessionTimeoutInput).toHaveValue(originalValue);
      await expect(page.locator('[data-testid="unsaved-indicator"]')).not.toBeVisible();
    });
  });

  test.describe('MFA Setup Link', () => {
    test('navigates to MFA setup from settings', async ({ page }) => {
      await page.goto('/settings');

      // Find and click the MFA setup link in personal settings
      await page.click('[data-testid="mfa-setup-link"]');

      // Should navigate to MFA setup page
      await expect(page).toHaveURL(/\/settings\/security\/mfa/);
    });
  });
});
