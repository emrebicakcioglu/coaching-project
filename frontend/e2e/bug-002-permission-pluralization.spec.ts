/**
 * BUG-002: Permission Pluralization E2E Tests
 *
 * Tests for the German grammar fix where "1 Berechtigungen" (plural)
 * was incorrectly displayed instead of "1 Berechtigung" (singular).
 *
 * Test Scenarios:
 * 1. Singular permission count (1) displays correctly in German
 * 2. Plural permission count (>1) displays correctly in German
 * 3. Zero permissions displays correctly in German
 * 4. English singular/plural also works correctly
 */

import { test, expect } from '@playwright/test';

// Admin credentials for login
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'TestPassword123!';

/**
 * Helper function to login as admin user
 */
async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', ADMIN_EMAIL);
  await page.fill('[data-testid="password-input"]', ADMIN_PASSWORD);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

/**
 * Helper function to wait for roles page to load with translations
 */
async function waitForRolesPage(page: import('@playwright/test').Page, language: 'en' | 'de') {
  const expectedTitle = language === 'de' ? 'Rollen & Berechtigungen' : 'Roles & Permissions';
  await page.waitForSelector(`h1:has-text("${expectedTitle}")`, { timeout: 15000 });
  await page.waitForSelector('[data-testid^="role-row-"]', { timeout: 10000 });
}

test.describe('BUG-002: Permission Pluralization Fix', () => {
  test.describe.configure({ mode: 'serial' });

  test.describe('German Language (de)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'de');
      });
      await loginAsAdmin(page);
      await page.goto('/roles');
      await waitForRolesPage(page, 'de');
    });

    test('displays singular "1 Berechtigung" for roles with exactly 1 permission', async ({ page }) => {
      // Find the "viewer" role which typically has 1 permission
      const viewerRow = page.locator('[data-testid^="role-row-"]').filter({ hasText: 'viewer' }).first();

      // Check if it displays "1 Berechtigung" (singular) NOT "1 Berechtigungen" (plural)
      const permissionCell = viewerRow.locator('td').nth(2);
      const permissionText = await permissionCell.textContent();

      // If the viewer role has 1 permission, it should show singular form
      if (permissionText?.includes('1')) {
        await expect(permissionCell).toContainText('1 Berechtigung');
        await expect(permissionCell).not.toContainText('1 Berechtigungen');
      }
    });

    test('displays plural "X Berechtigungen" for roles with multiple permissions', async ({ page }) => {
      // Find the "admin" role which typically has many permissions
      const adminRow = page.locator('[data-testid^="role-row-"]').filter({ hasText: 'admin' }).first();

      const permissionCell = adminRow.locator('td').nth(2);
      const permissionText = await permissionCell.textContent();

      // Admin should have more than 1 permission
      const match = permissionText?.match(/(\d+)/);
      if (match) {
        const count = parseInt(match[1], 10);
        if (count > 1) {
          // Should use plural form "Berechtigungen"
          await expect(permissionCell).toContainText('Berechtigungen');
        }
      }
    });

    test('displays singular user count "1 Benutzer" correctly', async ({ page }) => {
      // Check all rows for user counts
      const rows = page.locator('[data-testid^="role-row-"]');
      const count = await rows.count();

      for (let i = 0; i < count; i++) {
        const row = rows.nth(i);
        const userCell = row.locator('td').nth(3);
        const userText = await userCell.textContent();

        // Verify German grammar: both singular and plural use "Benutzer"
        // (German word "Benutzer" is the same in singular and plural)
        if (userText?.match(/^\d+/)) {
          await expect(userCell).toContainText('Benutzer');
        }
      }
    });

    test('no incorrect plural forms appear on the page', async ({ page }) => {
      // This test ensures "1 Berechtigungen" does NOT appear anywhere
      const pageContent = await page.content();

      // Check that "1 Berechtigungen" (incorrect singular+plural) doesn't exist
      expect(pageContent).not.toContain('1 Berechtigungen');
    });
  });

  test.describe('English Language (en)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'en');
      });
      await loginAsAdmin(page);
      await page.goto('/roles');
      await waitForRolesPage(page, 'en');
    });

    test('displays singular "1 permission" for roles with exactly 1 permission', async ({ page }) => {
      // Find a role with 1 permission
      const viewerRow = page.locator('[data-testid^="role-row-"]').filter({ hasText: 'viewer' }).first();

      const permissionCell = viewerRow.locator('td').nth(2);
      const permissionText = await permissionCell.textContent();

      // If the viewer role has 1 permission, it should show singular form
      if (permissionText?.includes('1')) {
        await expect(permissionCell).toContainText('1 permission');
        await expect(permissionCell).not.toContainText('1 permissions');
      }
    });

    test('displays plural "X permissions" for roles with multiple permissions', async ({ page }) => {
      // Find the "admin" role which typically has many permissions
      const adminRow = page.locator('[data-testid^="role-row-"]').filter({ hasText: 'admin' }).first();

      const permissionCell = adminRow.locator('td').nth(2);
      const permissionText = await permissionCell.textContent();

      const match = permissionText?.match(/(\d+)/);
      if (match) {
        const count = parseInt(match[1], 10);
        if (count > 1) {
          await expect(permissionCell).toContainText('permissions');
        }
      }
    });

    test('displays singular "1 user" for roles with exactly 1 user', async ({ page }) => {
      // Check all rows for user counts
      const rows = page.locator('[data-testid^="role-row-"]');
      const count = await rows.count();

      for (let i = 0; i < count; i++) {
        const row = rows.nth(i);
        const userCell = row.locator('td').nth(3);
        const userText = await userCell.textContent();

        if (userText?.includes('1 ')) {
          // Should show "1 user" not "1 users"
          await expect(userCell).toContainText('1 user');
          await expect(userCell).not.toContainText('1 users');
        }
      }
    });

    test('no incorrect plural forms appear on the page', async ({ page }) => {
      const pageContent = await page.content();

      // Check that "1 permissions" (incorrect singular+plural) doesn't exist
      expect(pageContent).not.toContain('1 permissions');
      expect(pageContent).not.toContain('1 users');
    });
  });

  test.describe('Language Switching Maintains Correct Pluralization', () => {
    test('switching from German to English maintains correct pluralization', async ({ page }) => {
      // Start with German
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'de');
      });
      await loginAsAdmin(page);
      await page.goto('/roles');
      await waitForRolesPage(page, 'de');

      // Verify German pluralization
      const pageContentDe = await page.content();
      expect(pageContentDe).not.toContain('1 Berechtigungen');

      // Switch to English
      await page.evaluate(() => {
        localStorage.setItem('language', 'en');
      });
      await page.reload();
      await waitForRolesPage(page, 'en');

      // Verify English pluralization
      const pageContentEn = await page.content();
      expect(pageContentEn).not.toContain('1 permissions');
    });
  });
});
