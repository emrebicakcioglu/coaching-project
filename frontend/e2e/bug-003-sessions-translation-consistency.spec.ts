/**
 * BUG-003: Inkonsistente Übersetzung "Sessions" vs "Sitzungen"
 *
 * This test verifies that the German translations for the sessions page
 * use "Sitzungen" consistently instead of the English word "Sessions".
 *
 * Bug Description:
 * - Sidebar shows "Sitzungen" (correct German)
 * - Page title showed "Sessions verwalten" (incorrect - mixed English/German)
 *
 * Expected Behavior:
 * - Sidebar: "Sitzungen" (German)
 * - Page title: "Sitzungen verwalten" (German)
 * - All session-related text uses "Sitzung/Sitzungen" in German
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

test.describe('BUG-003: Sessions Translation Consistency', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    // Set German language
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('language', 'de');
    });
    await loginAsAdmin(page);
  });

  test('sidebar and page title both use "Sitzungen" in German', async ({ page }) => {
    // Check sidebar navigation uses "Sitzungen"
    const sidebarLink = page.locator('nav a:has-text("Sitzungen")');
    await expect(sidebarLink).toBeVisible();

    // Navigate to sessions page
    await sidebarLink.click();
    await page.waitForURL('**/sessions');

    // Verify page title uses "Sitzungen verwalten" (NOT "Sessions verwalten")
    const pageTitle = page.locator('h1');
    await expect(pageTitle).toContainText('Sitzungen verwalten');

    // Verify it does NOT contain the English word "Sessions" in the title
    const titleText = await pageTitle.textContent();
    expect(titleText).not.toMatch(/Sessions verwalten/);
  });

  test('all session-related German text uses "Sitzung/Sitzungen"', async ({ page }) => {
    await page.goto('/sessions');
    await page.waitForSelector('h1:has-text("Sitzungen verwalten")', { timeout: 15000 });

    // List title should use "Sitzungen"
    const listTitle = page.locator('.sessions-list__title');
    await expect(listTitle).toContainText('Aktive Sitzungen');
    const listTitleText = await listTitle.textContent();
    expect(listTitleText).not.toMatch(/Aktive Sessions/);

    // Session count should use "Sitzung" or "Sitzungen"
    const subtitle = page.locator('.sessions-list__subtitle');
    const subtitleText = await subtitle.textContent();
    expect(subtitleText).toMatch(/aktive Sitzung/); // Matches both singular and plural
    expect(subtitleText).not.toMatch(/aktive Session/);
  });

  test('page does not contain incorrect English "Sessions" in German mode', async ({ page }) => {
    await page.goto('/sessions');
    await page.waitForSelector('h1:has-text("Sitzungen verwalten")', { timeout: 15000 });

    // Get all visible text content from the main content area
    const mainContent = page.locator('main');
    const textContent = await mainContent.textContent();

    // Should NOT find these incorrect German/English mixed phrases
    const incorrectPhrases = [
      'Sessions verwalten',
      'Aktive Sessions',
      'aktive Session', // Should be "aktive Sitzung"
      'Sessions werden geladen',
      'Laden der Sessions',
      'Session auf', // Should be "Sitzung auf"
    ];

    for (const phrase of incorrectPhrases) {
      // Use a case-sensitive check since German nouns are capitalized
      expect(textContent, `Found incorrect phrase: "${phrase}"`).not.toContain(phrase);
    }
  });

  test('security tip uses correct German translation', async ({ page }) => {
    await page.goto('/sessions');
    await page.waitForSelector('h1:has-text("Sitzungen verwalten")', { timeout: 15000 });

    // Security tip should use "Sitzung" not "Session"
    const securityTip = page.locator('.bg-blue-50');
    const tipText = await securityTip.textContent();

    // Should contain "die Sitzung" not "die Session"
    expect(tipText).toContain('beenden Sie die Sitzung');
    expect(tipText).not.toContain('beenden Sie die Session');
  });

  test('English mode continues to use "Sessions" correctly', async ({ page }) => {
    // Switch to English
    await page.evaluate(() => {
      localStorage.setItem('language', 'en');
    });
    await page.goto('/sessions');
    await page.waitForSelector('h1:has-text("Manage Sessions")', { timeout: 15000 });

    // Verify English uses "Sessions" (which is correct for English)
    const pageTitle = page.locator('h1');
    await expect(pageTitle).toContainText('Manage Sessions');

    const listTitle = page.locator('.sessions-list__title');
    await expect(listTitle).toContainText('Active Sessions');

    // Sidebar should show "Sessions" in English
    const sidebarLink = page.locator('nav a:has-text("Sessions")');
    await expect(sidebarLink).toBeVisible();
  });

  test('language switch maintains translation consistency', async ({ page }) => {
    // Start in German
    await page.goto('/sessions');
    await page.waitForSelector('h1:has-text("Sitzungen verwalten")', { timeout: 15000 });

    // Verify German
    await expect(page.locator('h1')).toContainText('Sitzungen verwalten');
    await expect(page.locator('.sessions-list__title')).toContainText('Aktive Sitzungen');

    // Switch to English
    await page.evaluate(() => {
      localStorage.setItem('language', 'en');
    });
    await page.reload();
    await page.waitForSelector('h1:has-text("Manage Sessions")', { timeout: 15000 });

    // Verify English
    await expect(page.locator('h1')).toContainText('Manage Sessions');
    await expect(page.locator('.sessions-list__title')).toContainText('Active Sessions');

    // Switch back to German
    await page.evaluate(() => {
      localStorage.setItem('language', 'de');
    });
    await page.reload();
    await page.waitForSelector('h1:has-text("Sitzungen verwalten")', { timeout: 15000 });

    // Verify German again - should still be consistent
    await expect(page.locator('h1')).toContainText('Sitzungen verwalten');
    await expect(page.locator('.sessions-list__title')).toContainText('Aktive Sitzungen');
  });
});
