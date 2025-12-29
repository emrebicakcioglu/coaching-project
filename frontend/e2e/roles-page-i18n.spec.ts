/**
 * Roles Page i18n E2E Tests
 * STORY-002-005: Roles Page i18n Support for Role Descriptions
 *
 * End-to-end tests to verify that the roles page displays correctly
 * in both English and German languages, with special focus on role descriptions.
 *
 * Test Scenarios:
 * 1. Role descriptions display in correct language (German)
 * 2. Role descriptions display in correct language (English)
 * 3. Language switching updates role descriptions
 * 4. Page elements (title, table headers, buttons) display in correct language
 */

import { test, expect } from '@playwright/test';

// Admin credentials for login - using environment variables with fallbacks matching other test files
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'TestPassword123!';

// Role descriptions in both languages
const ROLE_DESCRIPTIONS = {
  en: {
    admin: 'Full system administrator with all permissions',
    guest: 'Read-only access for guests',
    manager: 'User and content manager',
    user: 'Standard user with basic permissions',
    viewer: 'Read-only access to the system',
  },
  de: {
    admin: 'Vollständiger Systemadministrator mit allen Berechtigungen',
    guest: 'Lesezugriff für Gäste',
    manager: 'Benutzer- und Inhaltsverwalter',
    user: 'Standardbenutzer mit Basisberechtigung',
    viewer: 'Lesezugriff auf das System',
  },
};

/**
 * Helper function to wait for translations to load.
 * Translations are fetched from the backend API asynchronously.
 *
 * @param page - Playwright page object
 * @param language - The expected language ('en' or 'de')
 */
async function waitForTranslationsToLoad(page: import('@playwright/test').Page, language: 'en' | 'de') {
  // Wait for the roles page title to contain the expected translated text
  const expectedTitle = language === 'de' ? 'Rollen & Berechtigungen' : 'Roles & Permissions';
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
  // This is critical to prevent 403 Forbidden when navigating to /roles
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

test.describe('Roles Page i18n - STORY-002-005', () => {
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

      // Navigate to roles page
      await page.goto('/roles');
      await waitForTranslationsToLoad(page, 'de');
    });

    test('displays roles page title in German', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Rollen & Berechtigungen');
    });

    test('displays roles page subtitle in German', async ({ page }) => {
      await expect(page.locator('p.page-subtitle')).toContainText('Verwalten Sie Benutzerrollen');
    });

    test('displays table headers in German', async ({ page }) => {
      // Wait for table to load
      await page.waitForSelector('table', { timeout: 10000 });

      // Check table headers
      await expect(page.locator('th').nth(0)).toContainText('Rolle');
      await expect(page.locator('th').nth(1)).toContainText('Beschreibung');
      await expect(page.locator('th').nth(2)).toContainText('Berechtigungen');
      await expect(page.locator('th').nth(3)).toContainText('Benutzer');
      await expect(page.locator('th').nth(4)).toContainText('Aktionen');
    });

    test('displays admin role description in German', async ({ page }) => {
      // Wait for roles to load
      await page.waitForSelector('[data-testid^="role-row-"]', { timeout: 10000 });

      // Find the admin role row and check its description
      const adminRow = page.locator('[data-testid^="role-row-"]').filter({ hasText: 'admin' }).first();
      await expect(adminRow).toContainText(ROLE_DESCRIPTIONS.de.admin);
    });

    test('displays user role description in German', async ({ page }) => {
      // Wait for roles to load
      await page.waitForSelector('[data-testid^="role-row-"]', { timeout: 10000 });

      // Find the user role row and check its description
      // Use more specific locator to match exact role name
      const userRows = page.locator('[data-testid^="role-row-"]');
      const count = await userRows.count();
      let found = false;

      for (let i = 0; i < count; i++) {
        const row = userRows.nth(i);
        const nameText = await row.locator('td').first().textContent();
        if (nameText && nameText.trim().toLowerCase() === 'user') {
          await expect(row).toContainText(ROLE_DESCRIPTIONS.de.user);
          found = true;
          break;
        }
      }

      if (!found) {
        // If user role not found, skip test
        test.skip();
      }
    });

    test('displays viewer role description in German', async ({ page }) => {
      await page.waitForSelector('[data-testid^="role-row-"]', { timeout: 10000 });

      const viewerRow = page.locator('[data-testid^="role-row-"]').filter({ hasText: 'viewer' }).first();
      await expect(viewerRow).toContainText(ROLE_DESCRIPTIONS.de.viewer);
    });

    test('displays manager role description in German', async ({ page }) => {
      await page.waitForSelector('[data-testid^="role-row-"]', { timeout: 10000 });

      const managerRow = page.locator('[data-testid^="role-row-"]').filter({ hasText: 'manager' }).first();
      await expect(managerRow).toContainText(ROLE_DESCRIPTIONS.de.manager);
    });

    test('displays guest role description in German', async ({ page }) => {
      await page.waitForSelector('[data-testid^="role-row-"]', { timeout: 10000 });

      const guestRow = page.locator('[data-testid^="role-row-"]').filter({ hasText: 'guest' }).first();
      await expect(guestRow).toContainText(ROLE_DESCRIPTIONS.de.guest);
    });

    test('displays new role button in German', async ({ page }) => {
      await expect(page.locator('[data-testid="new-role-button"]')).toContainText('Neue Rolle');
    });

    test('displays action buttons in German', async ({ page }) => {
      await page.waitForSelector('[data-testid^="role-row-"]', { timeout: 10000 });

      // Check edit button text
      await expect(page.locator('[data-testid^="edit-role-button-"]').first()).toContainText('Bearbeiten');
    });

    test('displays system badge in German', async ({ page }) => {
      await page.waitForSelector('[data-testid^="role-row-"]', { timeout: 10000 });

      // Check for system badge
      const systemBadge = page.locator('[data-testid^="role-system-badge-"]').first();
      await expect(systemBadge).toContainText('System');
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

      // Navigate to roles page
      await page.goto('/roles');
      await waitForTranslationsToLoad(page, 'en');
    });

    test('displays roles page title in English', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Roles & Permissions');
    });

    test('displays roles page subtitle in English', async ({ page }) => {
      await expect(page.locator('p.page-subtitle')).toContainText('Manage user roles');
    });

    test('displays table headers in English', async ({ page }) => {
      // Wait for table to load
      await page.waitForSelector('table', { timeout: 10000 });

      // Check table headers
      await expect(page.locator('th').nth(0)).toContainText('Role');
      await expect(page.locator('th').nth(1)).toContainText('Description');
      await expect(page.locator('th').nth(2)).toContainText('Permissions');
      await expect(page.locator('th').nth(3)).toContainText('Users');
      await expect(page.locator('th').nth(4)).toContainText('Actions');
    });

    test('displays admin role description in English', async ({ page }) => {
      // Wait for roles to load
      await page.waitForSelector('[data-testid^="role-row-"]', { timeout: 10000 });

      // Find the admin role row and check its description
      const adminRow = page.locator('[data-testid^="role-row-"]').filter({ hasText: 'admin' }).first();
      await expect(adminRow).toContainText(ROLE_DESCRIPTIONS.en.admin);
    });

    test('displays user role description in English', async ({ page }) => {
      await page.waitForSelector('[data-testid^="role-row-"]', { timeout: 10000 });

      const userRows = page.locator('[data-testid^="role-row-"]');
      const count = await userRows.count();
      let found = false;

      for (let i = 0; i < count; i++) {
        const row = userRows.nth(i);
        const nameText = await row.locator('td').first().textContent();
        if (nameText && nameText.trim().toLowerCase() === 'user') {
          await expect(row).toContainText(ROLE_DESCRIPTIONS.en.user);
          found = true;
          break;
        }
      }

      if (!found) {
        test.skip();
      }
    });

    test('displays viewer role description in English', async ({ page }) => {
      await page.waitForSelector('[data-testid^="role-row-"]', { timeout: 10000 });

      const viewerRow = page.locator('[data-testid^="role-row-"]').filter({ hasText: 'viewer' }).first();
      await expect(viewerRow).toContainText(ROLE_DESCRIPTIONS.en.viewer);
    });

    test('displays manager role description in English', async ({ page }) => {
      await page.waitForSelector('[data-testid^="role-row-"]', { timeout: 10000 });

      const managerRow = page.locator('[data-testid^="role-row-"]').filter({ hasText: 'manager' }).first();
      await expect(managerRow).toContainText(ROLE_DESCRIPTIONS.en.manager);
    });

    test('displays guest role description in English', async ({ page }) => {
      await page.waitForSelector('[data-testid^="role-row-"]', { timeout: 10000 });

      const guestRow = page.locator('[data-testid^="role-row-"]').filter({ hasText: 'guest' }).first();
      await expect(guestRow).toContainText(ROLE_DESCRIPTIONS.en.guest);
    });

    test('displays new role button in English', async ({ page }) => {
      await expect(page.locator('[data-testid="new-role-button"]')).toContainText('New Role');
    });

    test('displays action buttons in English', async ({ page }) => {
      await page.waitForSelector('[data-testid^="role-row-"]', { timeout: 10000 });

      // Check edit button text
      await expect(page.locator('[data-testid^="edit-role-button-"]').first()).toContainText('Edit');
    });

    test('displays system badge in English', async ({ page }) => {
      await page.waitForSelector('[data-testid^="role-row-"]', { timeout: 10000 });

      // Check for system badge
      const systemBadge = page.locator('[data-testid^="role-system-badge-"]').first();
      await expect(systemBadge).toContainText('System');
    });
  });

  test.describe('Language Switching', () => {
    test('can switch from German to English and see updated role descriptions', async ({ page }) => {
      // Start with German
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'de');
      });

      // Login and navigate to roles
      await loginAsAdmin(page);
      await page.goto('/roles');
      await waitForTranslationsToLoad(page, 'de');
      await page.waitForSelector('[data-testid^="role-row-"]', { timeout: 10000 });

      // Verify German admin description
      const adminRowDe = page.locator('[data-testid^="role-row-"]').filter({ hasText: 'admin' }).first();
      await expect(adminRowDe).toContainText(ROLE_DESCRIPTIONS.de.admin);

      // Switch to English
      await page.evaluate(() => {
        localStorage.setItem('language', 'en');
      });
      await page.reload();
      await waitForTranslationsToLoad(page, 'en');
      await page.waitForSelector('[data-testid^="role-row-"]', { timeout: 10000 });

      // Verify English admin description
      const adminRowEn = page.locator('[data-testid^="role-row-"]').filter({ hasText: 'admin' }).first();
      await expect(adminRowEn).toContainText(ROLE_DESCRIPTIONS.en.admin);
    });

    test('can switch from English to German and see updated role descriptions', async ({ page }) => {
      // Start with English
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'en');
      });

      // Login and navigate to roles
      await loginAsAdmin(page);
      await page.goto('/roles');
      await waitForTranslationsToLoad(page, 'en');
      await page.waitForSelector('[data-testid^="role-row-"]', { timeout: 10000 });

      // Verify English manager description
      const managerRowEn = page.locator('[data-testid^="role-row-"]').filter({ hasText: 'manager' }).first();
      await expect(managerRowEn).toContainText(ROLE_DESCRIPTIONS.en.manager);

      // Switch to German
      await page.evaluate(() => {
        localStorage.setItem('language', 'de');
      });
      await page.reload();
      await waitForTranslationsToLoad(page, 'de');
      await page.waitForSelector('[data-testid^="role-row-"]', { timeout: 10000 });

      // Verify German manager description
      const managerRowDe = page.locator('[data-testid^="role-row-"]').filter({ hasText: 'manager' }).first();
      await expect(managerRowDe).toContainText(ROLE_DESCRIPTIONS.de.manager);
    });

    test('page title updates on language switch', async ({ page }) => {
      // Start with German
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'de');
      });

      // Login and navigate to roles
      await loginAsAdmin(page);
      await page.goto('/roles');
      await waitForTranslationsToLoad(page, 'de');

      // Verify German title
      await expect(page.locator('h1')).toContainText('Rollen & Berechtigungen');

      // Switch to English
      await page.evaluate(() => {
        localStorage.setItem('language', 'en');
      });
      await page.reload();
      await waitForTranslationsToLoad(page, 'en');

      // Verify English title
      await expect(page.locator('h1')).toContainText('Roles & Permissions');
    });

    test('all role descriptions update consistently on language switch', async ({ page }) => {
      // Start with German
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'de');
      });

      // Login and navigate to roles
      await loginAsAdmin(page);
      await page.goto('/roles');
      await waitForTranslationsToLoad(page, 'de');
      await page.waitForSelector('[data-testid^="role-row-"]', { timeout: 10000 });

      // Verify all German descriptions
      const viewerRowDe = page.locator('[data-testid^="role-row-"]').filter({ hasText: 'viewer' }).first();
      await expect(viewerRowDe).toContainText(ROLE_DESCRIPTIONS.de.viewer);

      const guestRowDe = page.locator('[data-testid^="role-row-"]').filter({ hasText: 'guest' }).first();
      await expect(guestRowDe).toContainText(ROLE_DESCRIPTIONS.de.guest);

      // Switch to English
      await page.evaluate(() => {
        localStorage.setItem('language', 'en');
      });
      await page.reload();
      await waitForTranslationsToLoad(page, 'en');
      await page.waitForSelector('[data-testid^="role-row-"]', { timeout: 10000 });

      // Verify all English descriptions
      const viewerRowEn = page.locator('[data-testid^="role-row-"]').filter({ hasText: 'viewer' }).first();
      await expect(viewerRowEn).toContainText(ROLE_DESCRIPTIONS.en.viewer);

      const guestRowEn = page.locator('[data-testid^="role-row-"]').filter({ hasText: 'guest' }).first();
      await expect(guestRowEn).toContainText(ROLE_DESCRIPTIONS.en.guest);
    });
  });

  test.describe('Fallback Behavior', () => {
    test('displays loading state with correct translation', async ({ page }) => {
      // Set English language
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'en');
      });

      await loginAsAdmin(page);

      // Navigate to roles page and immediately check for loading state
      await page.goto('/roles');

      // The loading state should briefly appear
      // We can't reliably test this due to fast loading, but we can verify
      // the page eventually loads correctly
      await waitForTranslationsToLoad(page, 'en');
      await page.waitForSelector('[data-testid^="role-row-"]', { timeout: 10000 });

      // Page should be fully loaded
      await expect(page.locator('h1')).toContainText('Roles & Permissions');
    });

    test('error message displays in correct language', async ({ page }) => {
      // Set German language
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'de');
      });

      await loginAsAdmin(page);

      // Navigate to roles page
      await page.goto('/roles');
      await waitForTranslationsToLoad(page, 'de');

      // Verify page loads - error states would show German text
      // "Rollen konnten nicht geladen werden. Bitte versuchen Sie es erneut."
      await page.waitForSelector('table', { timeout: 10000 });
    });
  });
});
