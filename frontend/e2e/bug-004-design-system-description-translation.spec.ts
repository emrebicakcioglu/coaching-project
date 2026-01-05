/**
 * BUG-004: Nicht übersetzte Beschreibung im Design System
 *
 * This test verifies that the Default color scheme description in the Design System
 * is displayed in German when the UI is set to German.
 *
 * Bug Description:
 * - Design System page shows "Standard color scheme with blue primary colors" (English)
 * - Should show "Standard-Farbschema mit blauen Primärfarben" (German)
 *
 * Expected Behavior:
 * - German mode: "Standard-Farbschema mit blauen Primärfarben"
 * - English mode: "Standard color scheme with blue primary colors"
 *
 * Fix Applied:
 * 1. Migration 034 adds description_key column and sets it to 'schemeDescriptions.default'
 * 2. Frontend uses t(description_key) to display translated description
 * 3. Fixed modal translation keys to use correct nested paths (modal.create.title, etc.)
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

test.describe('BUG-004: Design System Description Translation', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    // Clear storage and set German language
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('language', 'de');
    });
    await loginAsAdmin(page);
  });

  test('Default color scheme shows German description in German mode', async ({ page }) => {
    // Navigate to Design System page
    await page.goto('/design');
    await page.waitForLoadState('networkidle');

    // Wait for the page to load with German title
    await page.waitForSelector('h1:has-text("Design System")', { timeout: 15000 });

    // Click on the Default scheme button to select it (page may show a different active scheme)
    const defaultSchemeButton = page.locator('button:has-text("Default")').first();
    await expect(defaultSchemeButton).toBeVisible({ timeout: 10000 });
    await defaultSchemeButton.click();
    await page.waitForTimeout(500); // Wait for scheme content to load

    // Look for the scheme description text
    const schemeHeader = page.locator('.rounded-xl.p-6.mb-6');

    // Wait for scheme to be loaded and visible
    await expect(schemeHeader).toBeVisible({ timeout: 10000 });

    // The description should be in German
    const descriptionText = schemeHeader.locator('p').first();
    await expect(descriptionText).toContainText('Standard-Farbschema mit blauen Primärfarben');

    // Should NOT contain the English description
    const fullText = await descriptionText.textContent();
    expect(fullText).not.toContain('Standard color scheme with blue primary colors');
  });

  test('Default color scheme description does not show English text in German mode', async ({ page }) => {
    await page.goto('/design');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h1:has-text("Design System")', { timeout: 15000 });

    // Click on the Default scheme button to select it (page may show a different active scheme)
    const defaultSchemeButton = page.locator('button:has-text("Default")').first();
    await expect(defaultSchemeButton).toBeVisible({ timeout: 10000 });
    await defaultSchemeButton.click();
    await page.waitForTimeout(500); // Wait for scheme content to load

    // Get all visible text from the main content area
    const mainContent = page.locator('.max-w-7xl');
    const textContent = await mainContent.textContent();

    // The English description for Default scheme should NOT appear on the page in German mode
    expect(textContent).not.toContain('Standard color scheme with blue primary colors');
  });

  test('English mode shows English description correctly', async ({ page }) => {
    // Switch to English
    await page.evaluate(() => {
      localStorage.setItem('language', 'en');
    });

    await page.goto('/design');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h1:has-text("Design System")', { timeout: 15000 });

    // Click on the Default scheme button to select it (page may show a different active scheme)
    const defaultSchemeButton = page.locator('button:has-text("Default")').first();
    await expect(defaultSchemeButton).toBeVisible({ timeout: 10000 });
    await defaultSchemeButton.click();
    await page.waitForTimeout(500); // Wait for scheme content to load

    // The scheme header with description
    const schemeHeader = page.locator('.rounded-xl.p-6.mb-6');
    await expect(schemeHeader).toBeVisible({ timeout: 10000 });

    // In English mode, description should be in English
    const descriptionText = schemeHeader.locator('p').first();
    await expect(descriptionText).toContainText('Standard color scheme with blue primary colors');
  });

  test('language switch updates scheme description correctly', async ({ page }) => {
    // Start in German
    await page.goto('/design');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h1:has-text("Design System")', { timeout: 15000 });

    // Click on the Default scheme button to select it (page may show a different active scheme)
    const defaultSchemeButton = page.locator('button:has-text("Default")').first();
    await expect(defaultSchemeButton).toBeVisible({ timeout: 10000 });
    await defaultSchemeButton.click();
    await page.waitForTimeout(500); // Wait for scheme content to load

    const descriptionText = page.locator('.rounded-xl.p-6.mb-6 p').first();

    // Verify German description
    await expect(descriptionText).toContainText('Standard-Farbschema mit blauen Primärfarben');

    // Switch to English
    await page.evaluate(() => {
      localStorage.setItem('language', 'en');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h1:has-text("Design System")', { timeout: 15000 });

    // Re-click on Default scheme after reload (page may show different active scheme)
    await expect(defaultSchemeButton).toBeVisible({ timeout: 10000 });
    await defaultSchemeButton.click();
    await page.waitForTimeout(500);

    // Verify English description
    await expect(descriptionText).toContainText('Standard color scheme with blue primary colors');

    // Switch back to German
    await page.evaluate(() => {
      localStorage.setItem('language', 'de');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h1:has-text("Design System")', { timeout: 15000 });

    // Re-click on Default scheme after reload
    await expect(defaultSchemeButton).toBeVisible({ timeout: 10000 });
    await defaultSchemeButton.click();
    await page.waitForTimeout(500);

    // Verify German description again
    await expect(descriptionText).toContainText('Standard-Farbschema mit blauen Primärfarben');
  });

  test('Default scheme is correctly identified in sidebar', async ({ page }) => {
    await page.goto('/design');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h1:has-text("Design System")', { timeout: 15000 });

    // Find the Default scheme in the sidebar
    const sidebarScheme = page.locator('button:has-text("Default")').first();
    await expect(sidebarScheme).toBeVisible();

    // Click on Default scheme to select it and verify its details
    await sidebarScheme.click();
    await page.waitForTimeout(500);

    // Verify the Default scheme header shows the scheme name
    const schemeHeader = page.locator('.rounded-xl.p-6.mb-6');
    await expect(schemeHeader).toContainText('Default');
  });

  test('page title and subtitle are in German', async ({ page }) => {
    await page.goto('/design');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h1:has-text("Design System")', { timeout: 15000 });

    // Page title
    const pageTitle = page.locator('h1');
    await expect(pageTitle).toContainText('Design System');

    // Subtitle should be in German
    const subtitle = page.locator('h1 + p');
    await expect(subtitle).toContainText('Farbschemata und Design-Tokens für die Anwendung verwalten');
  });

  test('create modal shows German translations', async ({ page }) => {
    await page.goto('/design');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h1:has-text("Design System")', { timeout: 15000 });

    // Click the create new scheme button (+ icon in sidebar)
    const createButton = page.locator('button[title="Neues Schema erstellen"]');
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.click();

    // Wait for modal to appear
    const modal = page.locator('.fixed.inset-0.bg-black\\/50');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Check modal title is in German (modal.create.title)
    const modalTitle = modal.locator('h3');
    await expect(modalTitle).toContainText('Farbschema erstellen');

    // Check placeholder is in German (modal.create.placeholder)
    const inputField = modal.locator('input[type="text"]');
    const placeholder = await inputField.getAttribute('placeholder');
    expect(placeholder).toBe('Schema-Name');

    // Check cancel button text (buttons.cancel)
    const cancelButton = modal.locator('button:has-text("Abbrechen")');
    await expect(cancelButton).toBeVisible();

    // Check create button text (buttons.create)
    const createSchemeButton = modal.locator('button:has-text("Erstellen")');
    await expect(createSchemeButton).toBeVisible();

    // Close modal
    await cancelButton.click();
    await expect(modal).not.toBeVisible();
  });

  test('delete modal shows German translations', async ({ page }) => {
    await page.goto('/design');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h1:has-text("Design System")', { timeout: 15000 });

    // First, create a test scheme that we can delete (can't delete default scheme)
    const createButton = page.locator('button[title="Neues Schema erstellen"]');
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.click();

    // Create a test scheme
    const createModal = page.locator('.fixed.inset-0.bg-black\\/50');
    await expect(createModal).toBeVisible({ timeout: 5000 });
    const inputField = createModal.locator('input[type="text"]');
    await inputField.fill('Test Delete Schema');
    await createModal.locator('button:has-text("Erstellen")').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Now click delete button for the new scheme
    const deleteButton = page.locator('button:has-text("Löschen")').first();
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
    await deleteButton.click();

    // Wait for delete modal to appear
    const deleteModal = page.locator('.fixed.inset-0.bg-black\\/50');
    await expect(deleteModal).toBeVisible({ timeout: 5000 });

    // Check modal title is in German (modal.delete.title)
    const modalTitle = deleteModal.locator('h3');
    await expect(modalTitle).toContainText('Farbschema löschen');

    // Check confirmation message is in German (modal.delete.confirm)
    const confirmText = deleteModal.locator('p');
    await expect(confirmText).toContainText('Sind Sie sicher, dass Sie');
    await expect(confirmText).toContainText('Test Delete Schema');

    // Cancel to not actually delete
    const cancelButton = deleteModal.locator('button:has-text("Abbrechen")');
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();
    await expect(deleteModal).not.toBeVisible();

    // Clean up: delete the test scheme
    await deleteButton.click();
    await page.waitForTimeout(300);
    const confirmDeleteButton = page.locator('.fixed.inset-0.bg-black\\/50 button:has-text("Löschen")');
    await confirmDeleteButton.click();
    await page.waitForLoadState('networkidle');
  });
});
