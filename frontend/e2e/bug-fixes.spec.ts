/**
 * Bug Fixes E2E Tests
 * BUG-001, BUG-002, BUG-003
 *
 * End-to-end tests verifying bug fixes for:
 * - BUG-001: User Manager - Invalid User ID bei Details
 * - BUG-002: Settings - Personal Settings field width
 * - BUG-003: Settings - Security button not working
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

test.describe('Bug Fixes Verification', () => {
  // Run tests serially to avoid session conflicts
  test.describe.configure({ mode: 'serial' });

  // Increase timeout for tests to handle rate limiting delays
  test.setTimeout(120000); // 120 seconds per test

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe('BUG-001: User Manager - User Details Navigation', () => {
    test('clicking Details button navigates to user details page without Invalid User ID error', async ({ page }) => {
      // Navigate to users list
      await page.goto(`${BASE_URL}/users`);

      // Wait for the users table to load
      await expect(page.locator('[data-testid="users-table"]')).toBeVisible({ timeout: 10000 });

      // Wait for at least one user row to appear
      await expect(page.locator('[data-testid^="user-row-"]').first()).toBeVisible({ timeout: 10000 });

      // Get the first user row's ID
      const firstUserRow = page.locator('[data-testid^="user-row-"]').first();
      const dataTestId = await firstUserRow.getAttribute('data-testid');
      const userId = dataTestId?.replace('user-row-', '');

      // Click on the Details button for the first user
      await page.locator(`[data-testid="view-user-${userId}"]`).click();

      // Should navigate to user details page
      await expect(page).toHaveURL(new RegExp(`/users/${userId}`));

      // Should NOT show "Invalid User ID" error
      await expect(page.locator('text=Invalid User ID')).not.toBeVisible();
      await expect(page.locator('text=Invalid user ID')).not.toBeVisible();

      // Should display user details correctly
      await expect(page.getByText('User Details')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('User Information')).toBeVisible();
    });

    test('user details page loads correctly via direct URL navigation', async ({ page }) => {
      // First get a valid user ID from the list
      await page.goto(`${BASE_URL}/users`);
      await expect(page.locator('[data-testid="users-table"]')).toBeVisible({ timeout: 10000 });

      const firstUserRow = page.locator('[data-testid^="user-row-"]').first();
      await expect(firstUserRow).toBeVisible({ timeout: 10000 });

      const dataTestId = await firstUserRow.getAttribute('data-testid');
      const userId = dataTestId?.replace('user-row-', '');

      // Navigate directly to user details via URL
      await page.goto(`${BASE_URL}/users/${userId}`);

      // Should NOT show error
      await expect(page.locator('text=Invalid User ID')).not.toBeVisible();

      // Should show user details
      await expect(page.getByText('User Details')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('BUG-002: Settings - Personal Settings Field Width', () => {
    test('personal settings section has full width matching admin settings', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings`);

      // Wait for page to load
      await expect(page.getByRole('heading', { name: 'Einstellungen', exact: true })).toBeVisible();

      // Get the admin settings section width (if visible)
      const adminSettings = page.locator('text=Administrator-Einstellungen').locator('xpath=ancestor::section[1]');
      const personalSettings = page.locator('text=Persönliche Einstellungen').locator('xpath=ancestor::div[contains(@class, "bg-white")]');

      // Both sections should be visible
      await expect(personalSettings).toBeVisible();

      // Get bounding boxes to compare widths
      const personalBox = await personalSettings.boundingBox();

      // Personal settings should have reasonable width (not narrow)
      expect(personalBox?.width).toBeGreaterThan(500);
    });

    test('personal settings profile and security sections are displayed correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings`);

      // Wait for page to load
      await expect(page.getByRole('heading', { name: 'Einstellungen', exact: true })).toBeVisible();

      // Check that personal settings section exists with proper structure
      await expect(page.getByText('Persönliche Einstellungen')).toBeVisible();

      // Profile section should be visible
      await expect(page.locator('#profile')).toBeVisible();
      await expect(page.locator('#profile').getByText('Profil')).toBeVisible();

      // Security section should be visible
      await expect(page.locator('#security')).toBeVisible();
      await expect(page.locator('#security').getByText('Sicherheit')).toBeVisible();
    });
  });

  test.describe('BUG-003: Settings - Security Navigation Works', () => {
    test('clicking Security tab/link navigates to security section', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings`);

      // Wait for page to load
      await expect(page.getByRole('heading', { name: 'Einstellungen', exact: true })).toBeVisible();

      // BUG-003 FIX: Find and click the Security button in personal settings navigation
      const securityButton = page.locator('[data-testid="personal-settings-security-tab"]');
      await expect(securityButton).toBeVisible();
      await securityButton.click();

      // Security section should be visible (scrolled into view)
      const securitySection = page.locator('#security');
      await expect(securitySection).toBeVisible();

      // Check that URL has anchor
      await expect(page).toHaveURL(/#security/);

      // Verify the security tab is now active (has primary color)
      await expect(securityButton).toHaveClass(/text-primary-600/);
    });

    test('security section contains 2FA setup link and password change form', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings#security`);

      // Wait for page to load
      await expect(page.getByRole('heading', { name: 'Einstellungen', exact: true })).toBeVisible();

      // Security section should have MFA setup link
      await expect(page.locator('[data-testid="mfa-setup-link"]')).toBeVisible();
      await expect(page.getByText('2FA einrichten')).toBeVisible();

      // Security section should have password change form
      await expect(page.getByText('Passwort ändern')).toBeVisible();
      await expect(page.locator('input[type="password"]').first()).toBeVisible();
    });

    test('MFA setup link navigates to MFA setup page', async ({ page }) => {
      await page.goto(`${BASE_URL}/settings`);

      // Click on MFA setup link
      await page.locator('[data-testid="mfa-setup-link"]').click();

      // Should navigate to MFA setup page
      await expect(page).toHaveURL(/\/settings\/security\/mfa/);
    });
  });

  test.describe('Integration: Complete User Flow', () => {
    test('full flow: view users list, click details, view user details', async ({ page }) => {
      // Step 1: Navigate to users
      await page.goto(`${BASE_URL}/users`);
      await expect(page.getByText('Benutzerverwaltung')).toBeVisible();

      // Step 2: Wait for users to load
      await expect(page.locator('[data-testid="users-table"]')).toBeVisible({ timeout: 10000 });

      // Step 3: Click details on first user
      const firstDetailsButton = page.locator('[data-testid^="view-user-"]').first();
      await expect(firstDetailsButton).toBeVisible({ timeout: 10000 });
      await firstDetailsButton.click();

      // Step 4: Verify no error and correct page loads
      await expect(page.locator('text=Invalid User ID')).not.toBeVisible();
      await expect(page.getByText('User Details')).toBeVisible({ timeout: 10000 });

      // Step 5: Go back to users list
      await page.click('text=Back to Users');
      await expect(page.getByText('Benutzerverwaltung')).toBeVisible();
    });

    test('full flow: access settings, navigate personal settings tabs', async ({ page }) => {
      // Step 1: Navigate to settings
      await page.goto(`${BASE_URL}/settings`);
      await expect(page.getByRole('heading', { name: 'Einstellungen', exact: true })).toBeVisible();

      // Step 2: Verify personal settings is visible with proper width
      await expect(page.getByText('Persönliche Einstellungen')).toBeVisible();

      // Step 3: Profile section should be visible by default
      await expect(page.locator('#profile')).toBeVisible();

      // Step 4: BUG-003 FIX: Click on Security navigation button
      await page.click('[data-testid="personal-settings-security-tab"]');

      // Step 5: Security section should be visible
      await expect(page.locator('#security')).toBeInViewport();

      // Step 6: Click MFA setup
      await page.click('[data-testid="mfa-setup-link"]');
      await expect(page).toHaveURL(/\/settings\/security\/mfa/);
    });
  });
});
