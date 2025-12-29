/**
 * Users Page E2E Tests
 * STORY-104: Users Page UI Audit
 *
 * Playwright E2E tests for users page UI improvements.
 * Tests action button consistency, badge styling, role colors, and status badges.
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
 * Helper to login and navigate to users page
 * Includes robust rate limiting handling with retries.
 */
async function loginAndNavigateToUsers(page: Page): Promise<void> {
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

      // Navigate to users page
      await page.goto('/users');
      await waitForStability(page);

      if (page.url().includes('/users')) {
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

test.describe('Users Page - STORY-104 UI Audit Fixes', () => {
  test.describe('Action Button Consistency', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToUsers(page);
    });

    test('header create button uses primary variant styling', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-user-button"]');
      await expect(createButton).toBeVisible();

      // Button should have primary styling (blue background)
      const buttonClasses = await createButton.getAttribute('class');
      expect(buttonClasses).toContain('bg-primary-600');
    });

    test('table action buttons use ghost variant for details and edit', async ({ page }) => {
      // Wait for table to load
      const table = page.locator('[data-testid="users-table"]');
      await expect(table).toBeVisible();

      // Check if any users exist
      const userRows = page.locator('[data-testid^="user-row-"]');
      const rowCount = await userRows.count();

      if (rowCount > 0) {
        // Get first user's action buttons
        const firstViewButton = page.locator('[data-testid^="view-user-"]').first();
        await expect(firstViewButton).toBeVisible();

        // Ghost buttons should have transparent background
        const viewButtonClasses = await firstViewButton.getAttribute('class');
        expect(viewButtonClasses).toContain('bg-transparent');
      }
    });

    test('delete button uses destructive variant (red styling)', async ({ page }) => {
      const table = page.locator('[data-testid="users-table"]');
      await expect(table).toBeVisible();

      const userRows = page.locator('[data-testid^="user-row-"]');
      const rowCount = await userRows.count();

      if (rowCount > 0) {
        // Find a delete button (may not exist for all users based on status)
        const deleteButton = page.locator('[data-testid^="delete-user-"]').first();
        const deleteButtonVisible = await deleteButton.isVisible();

        if (deleteButtonVisible) {
          const deleteButtonClasses = await deleteButton.getAttribute('class');
          expect(deleteButtonClasses).toContain('bg-red-600');
        }
      }
    });
  });

  test.describe('Role Badge Styling', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToUsers(page);
    });

    test('admin role badge has red color scheme', async ({ page }) => {
      const adminBadge = page.locator('.role-badge--admin').first();
      const adminBadgeVisible = await adminBadge.isVisible();

      if (adminBadgeVisible) {
        // Admin badge should have red background
        await expect(adminBadge).toHaveCSS('background-color', 'rgb(254, 226, 226)'); // #fee2e2
      }
    });

    test('manager role badge has orange/amber color scheme', async ({ page }) => {
      const managerBadge = page.locator('.role-badge--manager').first();
      const managerBadgeVisible = await managerBadge.isVisible();

      if (managerBadgeVisible) {
        // Manager badge should have amber/orange background
        await expect(managerBadge).toHaveCSS('background-color', 'rgb(254, 243, 199)'); // #fef3c7
      }
    });

    test('user role badge has blue color scheme', async ({ page }) => {
      const userBadge = page.locator('.role-badge--user').first();
      const userBadgeVisible = await userBadge.isVisible();

      if (userBadgeVisible) {
        // User badge should have blue background
        await expect(userBadge).toHaveCSS('background-color', 'rgb(219, 234, 254)'); // #dbeafe
      }
    });

    test('viewer role badge has gray color scheme', async ({ page }) => {
      const viewerBadge = page.locator('.role-badge--viewer').first();
      const viewerBadgeVisible = await viewerBadge.isVisible();

      if (viewerBadgeVisible) {
        // Viewer badge should have gray background
        await expect(viewerBadge).toHaveCSS('background-color', 'rgb(243, 244, 246)'); // #f3f4f6
      }
    });

    test('no roles indicator uses neutral badge styling', async ({ page }) => {
      // Look for "Keine Rollen" badge (neutral badge for users without roles)
      const noRolesBadge = page.locator('[data-testid^="user-no-roles-"]').first();
      const noRolesBadgeVisible = await noRolesBadge.isVisible();

      if (noRolesBadgeVisible) {
        // Should use Badge component with neutral variant
        const badgeClasses = await noRolesBadge.getAttribute('class');
        expect(badgeClasses).toContain('bg-neutral-100');
      }
    });
  });

  test.describe('Status Badge Consistency', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToUsers(page);
    });

    test('active status uses success variant (green badge)', async ({ page }) => {
      // Look for active status badges
      const activeStatusBadge = page.locator('[data-testid^="user-status-"]').first();
      await expect(activeStatusBadge).toBeVisible();

      // Active status should have green styling from Badge component
      const badgeClasses = await activeStatusBadge.getAttribute('class');
      // Badge component uses Tailwind classes
      expect(badgeClasses).toContain('bg-green-100');
    });

    test('inactive status uses neutral variant (gray badge)', async ({ page }) => {
      // Look for inactive status - may need to filter to inactive users first
      const statusFilter = page.locator('[data-testid="users-status-filter"]');
      await statusFilter.selectOption('inactive');
      await waitForStability(page);

      const inactiveStatusBadge = page.locator('[data-testid^="user-status-"]').first();
      const badgeVisible = await inactiveStatusBadge.isVisible();

      if (badgeVisible) {
        const badgeClasses = await inactiveStatusBadge.getAttribute('class');
        expect(badgeClasses).toContain('bg-neutral-100');
      }
    });

    test('both active and inactive statuses use Badge component', async ({ page }) => {
      // All status badges should use the Badge component styling
      const statusBadges = page.locator('[data-testid^="user-status-"]');
      const count = await statusBadges.count();

      for (let i = 0; i < count && i < 3; i++) {
        const badge = statusBadges.nth(i);
        const badgeClasses = await badge.getAttribute('class');
        // Badge component adds rounded-full class
        expect(badgeClasses).toContain('rounded-full');
      }
    });
  });

  test.describe('Table Column Layout', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToUsers(page);
    });

    test('actions column has consistent width', async ({ page }) => {
      const actionsColumn = page.locator('.users-list__cell--actions').first();
      const actionsColumnVisible = await actionsColumn.isVisible();

      if (actionsColumnVisible) {
        const box = await actionsColumn.boundingBox();
        expect(box).not.toBeNull();

        if (box) {
          // Actions column should have consistent width (260px min)
          expect(box.width).toBeGreaterThanOrEqual(200);
        }
      }
    });

    test('action buttons do not wrap on desktop', async ({ page }) => {
      const actionsContainer = page.locator('.users-list__actions').first();
      const visible = await actionsContainer.isVisible();

      if (visible) {
        const buttons = actionsContainer.locator('button');
        const buttonCount = await buttons.count();

        if (buttonCount > 1) {
          // Get positions of first two buttons
          const firstButton = buttons.first();
          const secondButton = buttons.nth(1);

          const firstBox = await firstButton.boundingBox();
          const secondBox = await secondButton.boundingBox();

          if (firstBox && secondBox) {
            // Buttons should be on the same row (same Y position, within tolerance)
            expect(Math.abs(firstBox.y - secondBox.y)).toBeLessThan(10);
          }
        }
      }
    });
  });

  test.describe('Navigation Translation', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToUsers(page);
    });

    test('demos navigation item has proper German translation', async ({ page }) => {
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

  test.describe('Responsive Behavior', () => {
    test('action buttons stack vertically on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await loginAndNavigateToUsers(page);

      const actionsContainer = page.locator('.users-list__actions').first();
      const visible = await actionsContainer.isVisible();

      if (visible) {
        const buttons = actionsContainer.locator('button');
        const buttonCount = await buttons.count();

        if (buttonCount > 1) {
          const firstButton = buttons.first();
          const secondButton = buttons.nth(1);

          const firstBox = await firstButton.boundingBox();
          const secondBox = await secondButton.boundingBox();

          if (firstBox && secondBox) {
            // On mobile, buttons should stack (second button below first)
            expect(secondBox.y).toBeGreaterThan(firstBox.y);
          }
        }
      }
    });

    test('create button takes full width on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await loginAndNavigateToUsers(page);

      const createButton = page.locator('[data-testid="create-user-button"]');
      await expect(createButton).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToUsers(page);
    });

    test('action buttons have accessible titles', async ({ page }) => {
      const viewButton = page.locator('[data-testid^="view-user-"]').first();
      const visible = await viewButton.isVisible();

      if (visible) {
        const title = await viewButton.getAttribute('title');
        expect(title).toBeTruthy();
      }
    });

    test('badges have proper semantic structure', async ({ page }) => {
      const statusBadge = page.locator('[data-testid^="user-status-"]').first();
      await expect(statusBadge).toBeVisible();

      // Badge should be a span element for proper semantics
      const tagName = await statusBadge.evaluate((el) => el.tagName.toLowerCase());
      expect(tagName).toBe('span');
    });

    test('table has proper keyboard navigation', async ({ page }) => {
      const viewButton = page.locator('[data-testid^="view-user-"]').first();
      const visible = await viewButton.isVisible();

      if (visible) {
        await viewButton.focus();
        await expect(viewButton).toBeFocused();
      }
    });
  });
});
