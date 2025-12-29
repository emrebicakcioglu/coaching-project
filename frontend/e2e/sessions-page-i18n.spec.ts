/**
 * Sessions Page i18n E2E Tests
 * STORY-002-004: Sessions Page - i18n Support
 *
 * End-to-end tests to verify that the sessions page displays correctly
 * in both English and German languages.
 *
 * Test Scenarios:
 * 1. Sessions list displays in correct language
 * 2. Session items display in correct language
 * 3. Confirmation dialog displays in correct language
 * 4. Language switching works correctly
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
  // Wait for the sessions page title to contain the expected translated text
  const expectedTitle = language === 'de' ? 'Sessions verwalten' : 'Manage Sessions';
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
  // This is critical to prevent 403 Forbidden when navigating to /sessions
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

test.describe('Sessions Page i18n - STORY-002-004', () => {
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

      // Navigate to sessions page
      await page.goto('/sessions');
      await waitForTranslationsToLoad(page, 'de');
    });

    test('displays sessions page title in German', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Sessions verwalten');
    });

    test('displays sessions list title in German', async ({ page }) => {
      await expect(page.locator('.sessions-list__title')).toContainText('Aktive Sessions');
    });

    test('displays session count in German', async ({ page }) => {
      // Check for the session count subtitle containing German text
      const subtitle = page.locator('.sessions-list__subtitle');
      await expect(subtitle).toContainText(/aktive Session/);
    });

    test('displays current browser badge in German', async ({ page }) => {
      // Check for the current browser badge
      await expect(page.locator('.session-item__current-badge')).toContainText('Dieser Browser');
    });

    test('displays last activity label in German', async ({ page }) => {
      // Check for the last activity label
      await expect(page.locator('.session-item__activity-row')).toContainText('Letzte Aktivität:');
    });

    test('displays security tip in German', async ({ page }) => {
      // Check for security tip section
      const securityTip = page.locator('.bg-blue-50');
      await expect(securityTip).toContainText('Sicherheitstipp:');
    });

    test('displays logout button in German for non-current sessions', async ({ page }) => {
      // Check if there are any non-current session logout buttons
      const logoutButtons = page.locator('.session-item__logout-btn');
      const count = await logoutButtons.count();

      // If there are non-current sessions, check the button text
      if (count > 0) {
        await expect(logoutButtons.first()).toContainText('Abmelden');
      }
    });

    test('displays logout all button in German when multiple sessions exist', async ({ page }) => {
      // Check for the "logout all" button (only appears when there are other sessions)
      const logoutAllBtn = page.locator('#logout-all-btn');
      const isVisible = await logoutAllBtn.isVisible();

      if (isVisible) {
        await expect(logoutAllBtn).toContainText('Alle Geräte abmelden');
      }
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

      // Navigate to sessions page
      await page.goto('/sessions');
      await waitForTranslationsToLoad(page, 'en');
    });

    test('displays sessions page title in English', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Manage Sessions');
    });

    test('displays sessions list title in English', async ({ page }) => {
      await expect(page.locator('.sessions-list__title')).toContainText('Active Sessions');
    });

    test('displays session count in English', async ({ page }) => {
      // Check for the session count subtitle containing English text
      const subtitle = page.locator('.sessions-list__subtitle');
      await expect(subtitle).toContainText(/active session/);
    });

    test('displays current browser badge in English', async ({ page }) => {
      // Check for the current browser badge
      await expect(page.locator('.session-item__current-badge')).toContainText('This browser');
    });

    test('displays last activity label in English', async ({ page }) => {
      // Check for the last activity label
      await expect(page.locator('.session-item__activity-row')).toContainText('Last activity:');
    });

    test('displays security tip in English', async ({ page }) => {
      // Check for security tip section
      const securityTip = page.locator('.bg-blue-50');
      await expect(securityTip).toContainText('Security tip:');
    });

    test('displays logout button in English for non-current sessions', async ({ page }) => {
      // Check if there are any non-current session logout buttons
      const logoutButtons = page.locator('.session-item__logout-btn');
      const count = await logoutButtons.count();

      // If there are non-current sessions, check the button text
      if (count > 0) {
        await expect(logoutButtons.first()).toContainText('Log out');
      }
    });

    test('displays logout all button in English when multiple sessions exist', async ({ page }) => {
      // Check for the "logout all" button (only appears when there are other sessions)
      const logoutAllBtn = page.locator('#logout-all-btn');
      const isVisible = await logoutAllBtn.isVisible();

      if (isVisible) {
        await expect(logoutAllBtn).toContainText('Log out all devices');
      }
    });
  });

  test.describe('Language Switching', () => {
    test('can switch from German to English and see updated text', async ({ page }) => {
      // Start with German - navigate first, then set localStorage
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'de');
      });

      // Login and navigate to sessions
      await loginAsAdmin(page);
      await page.goto('/sessions');
      await waitForTranslationsToLoad(page, 'de');

      // Verify German
      await expect(page.locator('.sessions-list__title')).toContainText('Aktive Sessions');
      await expect(page.locator('.session-item__current-badge')).toContainText('Dieser Browser');

      // Switch to English
      await page.evaluate(() => {
        localStorage.setItem('language', 'en');
      });
      await page.reload();
      await waitForTranslationsToLoad(page, 'en');

      // Verify English
      await expect(page.locator('.sessions-list__title')).toContainText('Active Sessions');
      await expect(page.locator('.session-item__current-badge')).toContainText('This browser');
    });

    test('can switch from English to German and see updated text', async ({ page }) => {
      // Start with English - navigate first, then set localStorage
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'en');
      });

      // Login and navigate to sessions
      await loginAsAdmin(page);
      await page.goto('/sessions');
      await waitForTranslationsToLoad(page, 'en');

      // Verify English
      await expect(page.locator('.sessions-list__title')).toContainText('Active Sessions');
      await expect(page.locator('.session-item__current-badge')).toContainText('This browser');

      // Switch to German
      await page.evaluate(() => {
        localStorage.setItem('language', 'de');
      });
      await page.reload();
      await waitForTranslationsToLoad(page, 'de');

      // Verify German
      await expect(page.locator('.sessions-list__title')).toContainText('Aktive Sessions');
      await expect(page.locator('.session-item__current-badge')).toContainText('Dieser Browser');
    });

    test('session activity timestamps update on language switch', async ({ page }) => {
      // Start with German
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'de');
      });

      // Login and navigate to sessions
      await loginAsAdmin(page);
      await page.goto('/sessions');
      await waitForTranslationsToLoad(page, 'de');

      // Verify German last activity label
      await expect(page.locator('.session-item__activity-row').first()).toContainText('Letzte Aktivität:');

      // Switch to English
      await page.evaluate(() => {
        localStorage.setItem('language', 'en');
      });
      await page.reload();
      await waitForTranslationsToLoad(page, 'en');

      // Verify English last activity label
      await expect(page.locator('.session-item__activity-row').first()).toContainText('Last activity:');
    });
  });

  test.describe('Confirmation Dialog i18n', () => {
    test('displays confirmation dialog in German', async ({ page }) => {
      // Set German language
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'de');
      });

      await loginAsAdmin(page);
      await page.goto('/sessions');
      await waitForTranslationsToLoad(page, 'de');

      // Check if logout all button is visible
      const logoutAllBtn = page.locator('#logout-all-btn');
      const isVisible = await logoutAllBtn.isVisible();

      if (isVisible) {
        // Click the logout all button to open dialog
        await logoutAllBtn.click();

        // Verify dialog content is in German
        await expect(page.locator('#confirm-dialog-title')).toContainText('Alle Geräte abmelden?');
        await expect(page.locator('.confirm-dialog__message')).toContainText('Sie werden auf allen anderen Geräten abgemeldet');
        await expect(page.locator('.confirm-dialog__cancel-btn')).toContainText('Abbrechen');
        await expect(page.locator('.confirm-dialog__confirm-btn')).toContainText('Ja, alle abmelden');

        // Close dialog
        await page.locator('.confirm-dialog__cancel-btn').click();
      }
    });

    test('displays confirmation dialog in English', async ({ page }) => {
      // Set English language
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'en');
      });

      await loginAsAdmin(page);
      await page.goto('/sessions');
      await waitForTranslationsToLoad(page, 'en');

      // Check if logout all button is visible
      const logoutAllBtn = page.locator('#logout-all-btn');
      const isVisible = await logoutAllBtn.isVisible();

      if (isVisible) {
        // Click the logout all button to open dialog
        await logoutAllBtn.click();

        // Verify dialog content is in English
        await expect(page.locator('#confirm-dialog-title')).toContainText('Log out all devices?');
        await expect(page.locator('.confirm-dialog__message')).toContainText('You will be logged out from all other devices');
        await expect(page.locator('.confirm-dialog__cancel-btn')).toContainText('Cancel');
        await expect(page.locator('.confirm-dialog__confirm-btn')).toContainText('Yes, log out all');

        // Close dialog
        await page.locator('.confirm-dialog__cancel-btn').click();
      }
    });
  });
});
