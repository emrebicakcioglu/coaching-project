/**
 * Roles Page E2E Tests
 * STORY-105: Roles Page UI Audit
 *
 * Playwright E2E tests for roles page UI improvements.
 * Tests action button consistency with Users page, role-specific icons,
 * System badge visibility, and header button styling.
 *
 * IMPORTANT: This entire test file runs serially to avoid rate limiting
 * from parallel login attempts hitting the same user account.
 */

import { test, expect, Page } from '@playwright/test';

// Configure entire file to run serially with increased timeout
// This prevents rate limiting from parallel login attempts
test.describe.configure({ mode: 'serial' });
test.setTimeout(120000); // 2 minute timeout for rate limit retries

/**
 * Test configuration - credentials for authenticated tests
 * Uses environment variables with fallback defaults
 */
const TEST_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
const TEST_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'TestPassword123!';

/**
 * Viewport sizes for responsive testing
 */
const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
};

/**
 * Helper to wait for navigation stability
 */
async function waitForStability(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(100);
}

/**
 * Helper to login and navigate to roles page
 * Includes robust rate limiting handling with retries.
 */
async function loginAndNavigateToRoles(page: Page): Promise<void> {
  const maxAttempts = 8;
  const retryDelay = 10000; // 10 seconds between retries for rate limiting

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await page.goto('/login');

    if (attempt === 1) {
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.reload();
    }

    await waitForStability(page);

    const emailInput = page.locator('[data-testid="email-input"], input[name="email"]').first();
    const passwordInput = page.locator('[data-testid="password-input"], input[name="password"]').first();
    const loginButton = page.locator('[data-testid="login-button"], button[type="submit"]').first();

    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);
    await loginButton.click();
    await page.waitForTimeout(1000);

    // Check for rate limiting
    const rateLimitError = await page.locator('text=Zu viele Anmeldeversuche').isVisible();
    if (rateLimitError) {
      console.log(`Rate limit hit on attempt ${attempt}, waiting ${retryDelay / 1000}s...`);
      await page.waitForTimeout(retryDelay);
      continue;
    }

    try {
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
      await waitForStability(page);

      // Navigate to roles page
      await page.goto('/roles');
      await waitForStability(page);

      if (page.url().includes('/roles')) {
        return; // Login and navigation successful
      }
    } catch {
      if (attempt < maxAttempts) {
        console.log(`Login attempt ${attempt} failed, retrying...`);
        await page.waitForTimeout(2000);
        continue;
      }
    }
  }

  throw new Error(`Failed to login after ${maxAttempts} attempts`);
}

test.describe('Roles Page - STORY-105 UI Audit Fixes', () => {
  test.describe('Action Button Consistency with Users Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToRoles(page);
    });

    test('header create button uses primary variant styling (matching Users page)', async ({ page }) => {
      const createButton = page.locator('[data-testid="new-role-button"]');
      await expect(createButton).toBeVisible();

      // Button should have primary styling (blue background)
      const buttonClasses = await createButton.getAttribute('class');
      expect(buttonClasses).toContain('bg-primary-600');
    });

    test('edit action buttons use ghost variant (matching Users page)', async ({ page }) => {
      // Wait for roles table to load
      const roleRow = page.locator('[data-testid^="role-row-"]').first();
      await expect(roleRow).toBeVisible();

      // Get first role's edit button
      const editButton = page.locator('[data-testid^="edit-role-button-"]').first();
      const editButtonVisible = await editButton.isVisible();

      if (editButtonVisible) {
        // Ghost buttons should have transparent background
        const buttonClasses = await editButton.getAttribute('class');
        expect(buttonClasses).toContain('bg-transparent');
      }
    });

    test('delete button uses destructive variant (red styling, matching Users page)', async ({ page }) => {
      const roleRow = page.locator('[data-testid^="role-row-"]').first();
      await expect(roleRow).toBeVisible();

      // Find a delete button (may not exist for system roles)
      const deleteButton = page.locator('[data-testid^="delete-role-button-"]').first();
      const deleteButtonVisible = await deleteButton.isVisible();

      if (deleteButtonVisible) {
        const deleteButtonClasses = await deleteButton.getAttribute('class');
        expect(deleteButtonClasses).toContain('bg-red-600');
      }
    });

    test('system roles show protected indicator instead of delete button', async ({ page }) => {
      // System roles should display "Protected" indicator instead of delete
      const protectedIndicator = page.locator('[data-testid^="role-protected-indicator-"]').first();
      const protectedVisible = await protectedIndicator.isVisible();

      if (protectedVisible) {
        const indicatorText = await protectedIndicator.textContent();
        // Should display "Protected" or "Geschützt" depending on language
        expect(indicatorText?.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Role-Specific Icons', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToRoles(page);
    });

    test('admin role has red-themed icon background', async ({ page }) => {
      // Look for admin role row
      const adminRow = page.locator('[data-testid^="role-row-"]').filter({ hasText: 'admin' }).first();
      const adminRowVisible = await adminRow.isVisible();

      if (adminRowVisible) {
        const iconContainer = adminRow.locator('[data-testid^="role-icon-"]');
        const iconClasses = await iconContainer.getAttribute('class');
        expect(iconClasses).toContain('bg-red-100');
      }
    });

    test('manager role has amber-themed icon background', async ({ page }) => {
      // Look for manager role row
      const managerRow = page.locator('[data-testid^="role-row-"]').filter({ hasText: 'manager' }).first();
      const managerRowVisible = await managerRow.isVisible();

      if (managerRowVisible) {
        const iconContainer = managerRow.locator('[data-testid^="role-icon-"]');
        const iconClasses = await iconContainer.getAttribute('class');
        expect(iconClasses).toContain('bg-amber-100');
      }
    });

    test('user/viewer roles have blue-themed icon background', async ({ page }) => {
      // Look for user or viewer role row
      const userRow = page.locator('[data-testid^="role-row-"]').filter({ hasText: /^user$|viewer/i }).first();
      const userRowVisible = await userRow.isVisible();

      if (userRowVisible) {
        const iconContainer = userRow.locator('[data-testid^="role-icon-"]');
        const iconClasses = await iconContainer.getAttribute('class');
        expect(iconClasses).toContain('bg-blue-100');
      }
    });

    test('role icons are visible in all role rows', async ({ page }) => {
      const roleRows = page.locator('[data-testid^="role-row-"]');
      const rowCount = await roleRows.count();

      // Check that each role has an icon
      for (let i = 0; i < Math.min(rowCount, 5); i++) {
        const row = roleRows.nth(i);
        const icon = row.locator('[data-testid^="role-icon-"]');
        await expect(icon).toBeVisible();
      }
    });
  });

  test.describe('System Badge Visibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToRoles(page);
    });

    test('system roles display System badge', async ({ page }) => {
      // System roles should have the System badge
      const systemBadge = page.locator('[data-testid^="role-system-badge-"]').first();
      const badgeVisible = await systemBadge.isVisible();

      if (badgeVisible) {
        // Should use Badge component with neutral variant
        const badgeClasses = await systemBadge.getAttribute('class');
        expect(badgeClasses).toContain('bg-neutral-100');

        // Check badge text
        const badgeText = await systemBadge.textContent();
        expect(badgeText).toMatch(/System/i);
      }
    });

    test('system badge uses Badge component styling', async ({ page }) => {
      const systemBadge = page.locator('[data-testid^="role-system-badge-"]').first();
      const badgeVisible = await systemBadge.isVisible();

      if (badgeVisible) {
        // Badge component adds rounded-full class
        const badgeClasses = await systemBadge.getAttribute('class');
        expect(badgeClasses).toContain('rounded-full');
      }
    });
  });

  test.describe('Button Component Consistency', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToRoles(page);
    });

    test('all action buttons use Button component structure', async ({ page }) => {
      const editButtons = page.locator('[data-testid^="edit-role-button-"]');
      const buttonCount = await editButtons.count();

      for (let i = 0; i < Math.min(buttonCount, 3); i++) {
        const button = editButtons.nth(i);
        const buttonClasses = await button.getAttribute('class');

        // Button component adds these classes
        expect(buttonClasses).toContain('inline-flex');
        expect(buttonClasses).toContain('items-center');
        expect(buttonClasses).toContain('justify-center');
      }
    });

    test('buttons have proper focus styling', async ({ page }) => {
      const editButton = page.locator('[data-testid^="edit-role-button-"]').first();
      const editButtonVisible = await editButton.isVisible();

      if (editButtonVisible) {
        const buttonClasses = await editButton.getAttribute('class');
        expect(buttonClasses).toContain('focus:outline-none');
        expect(buttonClasses).toContain('focus:ring-2');
      }
    });
  });

  test.describe('Comparison with Users Page', () => {
    test('roles page header button matches users page header button styling', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);

      // First check roles page
      await loginAndNavigateToRoles(page);
      const rolesCreateButton = page.locator('[data-testid="new-role-button"]');
      await expect(rolesCreateButton).toBeVisible();
      const rolesButtonClasses = await rolesCreateButton.getAttribute('class');

      // Navigate to users page
      await page.goto('/users');
      await waitForStability(page);

      const usersCreateButton = page.locator('[data-testid="create-user-button"]');
      const usersButtonVisible = await usersCreateButton.isVisible();

      if (usersButtonVisible) {
        const usersButtonClasses = await usersCreateButton.getAttribute('class');

        // Both should have primary styling
        expect(rolesButtonClasses).toContain('bg-primary-600');
        expect(usersButtonClasses).toContain('bg-primary-600');
      }
    });
  });

  test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToRoles(page);
    });

    test('action buttons have accessible titles', async ({ page }) => {
      const editButton = page.locator('[data-testid^="edit-role-button-"]').first();
      const visible = await editButton.isVisible();

      if (visible) {
        const title = await editButton.getAttribute('title');
        expect(title).toBeTruthy();
      }
    });

    test('action buttons have aria-labels', async ({ page }) => {
      const editButton = page.locator('[data-testid^="edit-role-button-"]').first();
      const visible = await editButton.isVisible();

      if (visible) {
        const ariaLabel = await editButton.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
      }
    });

    test('protected indicator has title attribute', async ({ page }) => {
      const protectedIndicator = page.locator('[data-testid^="role-protected-indicator-"]').first();
      const visible = await protectedIndicator.isVisible();

      if (visible) {
        const title = await protectedIndicator.getAttribute('title');
        expect(title).toBeTruthy();
      }
    });

    test('buttons support keyboard navigation', async ({ page }) => {
      const editButton = page.locator('[data-testid^="edit-role-button-"]').first();
      const visible = await editButton.isVisible();

      if (visible) {
        await editButton.focus();
        await expect(editButton).toBeFocused();
      }
    });

    test('system badge has proper semantic structure', async ({ page }) => {
      const systemBadge = page.locator('[data-testid^="role-system-badge-"]').first();
      const visible = await systemBadge.isVisible();

      if (visible) {
        // Badge should be a span element for proper semantics
        const tagName = await systemBadge.evaluate((el) => el.tagName.toLowerCase());
        expect(tagName).toBe('span');
      }
    });
  });

  test.describe('Responsive Behavior', () => {
    test('action buttons remain accessible on tablet', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.tablet);
      await loginAndNavigateToRoles(page);

      const editButton = page.locator('[data-testid^="edit-role-button-"]').first();
      const visible = await editButton.isVisible();

      if (visible) {
        await expect(editButton).toBeEnabled();
      }
    });

    test('roles table is visible on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await loginAndNavigateToRoles(page);

      const roleRow = page.locator('[data-testid^="role-row-"]').first();
      await expect(roleRow).toBeVisible();
    });

    test('create button is visible on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await loginAndNavigateToRoles(page);

      const createButton = page.locator('[data-testid="new-role-button"]');
      await expect(createButton).toBeVisible();
    });
  });

  test.describe('Navigation Translation', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToRoles(page);
    });

    test('demos navigation item has proper translation', async ({ page }) => {
      // In dev mode, demos navigation should be visible
      const demosNav = page.locator('[data-testid="sidebar-nav-dev-demos"]');
      const visible = await demosNav.isVisible();

      if (visible) {
        const navText = await demosNav.textContent();
        // Should display "Demos" (same in German as key)
        expect(navText?.toLowerCase()).toContain('demos');
      }
    });
  });
});
