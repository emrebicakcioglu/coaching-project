/**
 * Settings Page i18n E2E Tests
 * STORY-002-003: Settings Page i18n Support
 *
 * End-to-end tests to verify that the settings page displays correctly
 * in both English and German languages.
 *
 * Test Scenarios:
 * 1. Admin settings tabs display in correct language
 * 2. General settings fields display in correct language
 * 3. Security settings fields display in correct language
 * 4. Email settings fields display in correct language
 * 5. Maintenance settings fields display in correct language
 * 6. Buttons display in correct language
 */

import { test, expect } from '@playwright/test';

// Admin credentials for login - using environment variables with fallbacks matching other test files
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'TestPassword123!';

/**
 * Helper function to wait for translations to load.
 * Translations are fetched from the backend API asynchronously.
 *
 * @param page - Playwright page object
 * @param language - The expected language ('en' or 'de')
 */
async function waitForTranslationsToLoad(page: import('@playwright/test').Page, language: 'en' | 'de') {
  // Wait for the settings page title to contain the expected translated text
  const expectedTitle = language === 'de' ? 'Einstellungen' : 'Settings';
  await page.waitForSelector(`h1:has-text("${expectedTitle}")`, { timeout: 15000 });
}

/**
 * Helper function to login as admin user
 */
async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', ADMIN_EMAIL);
  await page.fill('[data-testid="password-input"]', ADMIN_PASSWORD);
  await page.click('[data-testid="login-button"]');
  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  // Wait for permissions to load (async rolesService.listRoles() call)
  // This is critical to prevent 403 Forbidden when navigating to /settings
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

test.describe('Settings Page i18n - STORY-002-003', () => {
  // Run tests serially to avoid language state conflicts
  test.describe.configure({ mode: 'serial' });

  test.describe('German Language (Default)', () => {
    test.beforeEach(async ({ page }) => {
      // Clear any existing state and set German language
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'de');
      });

      // Login as admin
      await loginAsAdmin(page);

      // Navigate to settings page
      await page.goto('/settings');
      await waitForTranslationsToLoad(page, 'de');
    });

    test('displays settings page title in German', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Einstellungen');
    });

    test('displays admin settings section header in German', async ({ page }) => {
      await expect(page.locator('[data-testid="admin-settings-card"]')).toContainText('Administrator-Einstellungen');
    });

    test('displays tab labels in German', async ({ page }) => {
      // Check all admin tabs are in German
      await expect(page.locator('[data-testid="tab-general"]')).toContainText('Allgemein');
      await expect(page.locator('[data-testid="tab-security"]')).toContainText('Sicherheit');
      await expect(page.locator('[data-testid="tab-email"]')).toContainText('E-Mail');
      await expect(page.locator('[data-testid="tab-maintenance"]')).toContainText('Wartung');
    });

    test('General tab displays fields in German', async ({ page }) => {
      // Click general tab (should be active by default)
      await page.click('[data-testid="tab-general"]');

      // Wait for settings to load
      await page.waitForSelector('[data-testid="general-settings"]', { timeout: 10000 });

      // Check labels are in German
      await expect(page.getByText('Support E-Mail')).toBeVisible();
      await expect(page.getByText('Session-Timeout')).toBeVisible();
      await expect(page.getByText('Timeout-Warnung anzeigen')).toBeVisible();
    });

    test('General tab displays buttons in German', async ({ page }) => {
      await page.click('[data-testid="tab-general"]');
      await page.waitForSelector('[data-testid="general-settings"]', { timeout: 10000 });

      await expect(page.locator('[data-testid="reset-button"]')).toContainText('Zurücksetzen');
      await expect(page.locator('[data-testid="save-button"]')).toContainText('Speichern');
    });

    test('Security tab displays fields in German', async ({ page }) => {
      // Click security tab
      await page.click('[data-testid="tab-security"]');
      await page.waitForSelector('[data-testid="security-settings"]', { timeout: 10000 });

      // Check labels are in German
      await expect(page.getByText('Login-Sicherheit')).toBeVisible();
      await expect(page.getByText('Maximale Login-Versuche')).toBeVisible();
      await expect(page.getByText('Passwort-Richtlinie')).toBeVisible();
      await expect(page.getByText('Minimale Passwortlänge')).toBeVisible();
    });

    test('Security tab displays buttons in German', async ({ page }) => {
      await page.click('[data-testid="tab-security"]');
      await page.waitForSelector('[data-testid="security-settings"]', { timeout: 10000 });

      await expect(page.locator('[data-testid="reset-to-defaults-button"]')).toContainText('Auf Standard zurücksetzen');
      await expect(page.locator('[data-testid="reset-button"]')).toContainText('Änderungen verwerfen');
      await expect(page.locator('[data-testid="save-button"]')).toContainText('Speichern');
    });

    test('Email tab displays fields in German', async ({ page }) => {
      // Click email tab
      await page.click('[data-testid="tab-email"]');
      await page.waitForSelector('[data-testid="email-settings"]', { timeout: 10000 });

      // Check labels are in German
      await expect(page.getByText('E-Mail-Signatur')).toBeVisible();
      await expect(page.getByText('Vorschau')).toBeVisible();
    });

    test('Maintenance tab displays fields in German', async ({ page }) => {
      // Click maintenance tab
      await page.click('[data-testid="tab-maintenance"]');
      await page.waitForSelector('[data-testid="maintenance-toggle"]', { timeout: 10000 });

      // Check labels are in German
      await expect(page.getByText('Wartungsmodus')).toBeVisible();
      await expect(page.getByText('Wartungsnachricht')).toBeVisible();
      await expect(page.getByText('Geschätzte Dauer (Minuten)')).toBeVisible();
      await expect(page.getByText('Hinweise:')).toBeVisible();
    });

    test('personal settings tabs display in German', async ({ page }) => {
      await expect(page.locator('[data-testid="personal-settings-card"]')).toContainText('Persönliche Einstellungen');
    });
  });

  test.describe('English Language', () => {
    test.beforeEach(async ({ page }) => {
      // Clear any existing state and set English language
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'en');
      });

      // Login as admin
      await loginAsAdmin(page);

      // Navigate to settings page
      await page.goto('/settings');
      await waitForTranslationsToLoad(page, 'en');
    });

    test('displays settings page title in English', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Settings');
    });

    test('displays admin settings section header in English', async ({ page }) => {
      await expect(page.locator('[data-testid="admin-settings-card"]')).toContainText('Administrator Settings');
    });

    test('displays tab labels in English', async ({ page }) => {
      // Check all admin tabs are in English
      await expect(page.locator('[data-testid="tab-general"]')).toContainText('General');
      await expect(page.locator('[data-testid="tab-security"]')).toContainText('Security');
      await expect(page.locator('[data-testid="tab-email"]')).toContainText('Email');
      await expect(page.locator('[data-testid="tab-maintenance"]')).toContainText('Maintenance');
    });

    test('General tab displays fields in English', async ({ page }) => {
      // Click general tab (should be active by default)
      await page.click('[data-testid="tab-general"]');

      // Wait for settings to load
      await page.waitForSelector('[data-testid="general-settings"]', { timeout: 10000 });

      // Check labels are in English
      await expect(page.getByText('Support Email')).toBeVisible();
      await expect(page.getByText('Session Timeout')).toBeVisible();
      await expect(page.getByText('Show timeout warning')).toBeVisible();
    });

    test('General tab displays buttons in English', async ({ page }) => {
      await page.click('[data-testid="tab-general"]');
      await page.waitForSelector('[data-testid="general-settings"]', { timeout: 10000 });

      await expect(page.locator('[data-testid="reset-button"]')).toContainText('Reset');
      await expect(page.locator('[data-testid="save-button"]')).toContainText('Save');
    });

    test('Security tab displays fields in English', async ({ page }) => {
      // Click security tab
      await page.click('[data-testid="tab-security"]');
      await page.waitForSelector('[data-testid="security-settings"]', { timeout: 10000 });

      // Check labels are in English
      await expect(page.getByText('Login Security')).toBeVisible();
      await expect(page.getByText('Maximum login attempts')).toBeVisible();
      await expect(page.getByText('Password Policy')).toBeVisible();
      await expect(page.getByText('Minimum password length')).toBeVisible();
    });

    test('Security tab displays buttons in English', async ({ page }) => {
      await page.click('[data-testid="tab-security"]');
      await page.waitForSelector('[data-testid="security-settings"]', { timeout: 10000 });

      await expect(page.locator('[data-testid="reset-to-defaults-button"]')).toContainText('Reset to defaults');
      await expect(page.locator('[data-testid="reset-button"]')).toContainText('Discard changes');
      await expect(page.locator('[data-testid="save-button"]')).toContainText('Save');
    });

    test('Email tab displays fields in English', async ({ page }) => {
      // Click email tab
      await page.click('[data-testid="tab-email"]');
      await page.waitForSelector('[data-testid="email-settings"]', { timeout: 10000 });

      // Check labels are in English
      await expect(page.getByText('Email Signature')).toBeVisible();
      await expect(page.getByText('Preview')).toBeVisible();
    });

    test('Maintenance tab displays fields in English', async ({ page }) => {
      // Click maintenance tab
      await page.click('[data-testid="tab-maintenance"]');
      await page.waitForSelector('[data-testid="maintenance-toggle"]', { timeout: 10000 });

      // Check labels are in English
      await expect(page.getByText('Maintenance Mode')).toBeVisible();
      await expect(page.getByText('Maintenance message')).toBeVisible();
      await expect(page.getByText('Estimated duration (minutes)')).toBeVisible();
      await expect(page.getByText('Notes:')).toBeVisible();
    });

    test('personal settings tabs display in English', async ({ page }) => {
      await expect(page.locator('[data-testid="personal-settings-card"]')).toContainText('Personal Settings');
    });
  });

  test.describe('Language Switching', () => {
    test('can switch from German to English and see updated tab labels', async ({ page }) => {
      // Start with German - navigate first, then set localStorage
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'de');
      });

      // Login and navigate to settings
      await loginAsAdmin(page);
      await page.goto('/settings');
      await waitForTranslationsToLoad(page, 'de');

      // Verify German
      await expect(page.locator('[data-testid="tab-general"]')).toContainText('Allgemein');

      // Switch to English
      await page.evaluate(() => {
        localStorage.setItem('language', 'en');
      });
      await page.reload();
      await waitForTranslationsToLoad(page, 'en');

      // Verify English
      await expect(page.locator('[data-testid="tab-general"]')).toContainText('General');
    });

    test('can switch from English to German and see updated tab labels', async ({ page }) => {
      // Start with English - navigate first, then set localStorage
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'en');
      });

      // Login and navigate to settings
      await loginAsAdmin(page);
      await page.goto('/settings');
      await waitForTranslationsToLoad(page, 'en');

      // Verify English
      await expect(page.locator('[data-testid="tab-general"]')).toContainText('General');

      // Switch to German
      await page.evaluate(() => {
        localStorage.setItem('language', 'de');
      });
      await page.reload();
      await waitForTranslationsToLoad(page, 'de');

      // Verify German
      await expect(page.locator('[data-testid="tab-general"]')).toContainText('Allgemein');
    });

    test('settings content updates on language switch', async ({ page }) => {
      // Start with German
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'de');
      });

      // Login and navigate to settings
      await loginAsAdmin(page);
      await page.goto('/settings');
      await waitForTranslationsToLoad(page, 'de');

      // Go to security tab
      await page.click('[data-testid="tab-security"]');
      await page.waitForSelector('[data-testid="security-settings"]', { timeout: 10000 });

      // Verify German content
      await expect(page.getByText('Login-Sicherheit')).toBeVisible();

      // Switch to English
      await page.evaluate(() => {
        localStorage.setItem('language', 'en');
      });
      await page.reload();
      await waitForTranslationsToLoad(page, 'en');

      // Go to security tab again
      await page.click('[data-testid="tab-security"]');
      await page.waitForSelector('[data-testid="security-settings"]', { timeout: 10000 });

      // Verify English content
      await expect(page.getByText('Login Security')).toBeVisible();
    });
  });
});
