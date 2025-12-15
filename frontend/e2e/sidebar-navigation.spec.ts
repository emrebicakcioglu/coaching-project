/**
 * Sidebar Navigation E2E Tests
 * STORY-016A: Context Menu Core Navigation
 *
 * Playwright E2E tests for sidebar navigation functionality.
 */

import { test, expect, Page } from '@playwright/test';

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
 * Helper to login and navigate to dashboard
 * In a real app, this would perform actual login
 */
async function loginAndNavigateToDashboard(page: Page): Promise<void> {
  // Navigate to dashboard (protected route)
  await page.goto('/dashboard');
  await waitForStability(page);
}

test.describe('Sidebar Navigation - Desktop', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await loginAndNavigateToDashboard(page);
  });

  test('displays sidebar with logo and company name', async ({ page }) => {
    const sidebar = page.locator('[data-testid="app-layout-sidebar"]');
    await expect(sidebar).toBeVisible();

    // Check for logo
    const logo = page.locator('[data-testid="app-layout-sidebar-logo"]');
    await expect(logo).toBeVisible();
  });

  test('shows navigation menu items', async ({ page }) => {
    // Dashboard should always be visible
    const dashboardNav = page.locator('[data-testid="app-layout-sidebar-nav-dashboard"]');
    await expect(dashboardNav).toBeVisible();

    // Help should always be visible (public)
    const helpNav = page.locator('[data-testid="app-layout-sidebar-nav-help"]');
    await expect(helpNav).toBeVisible();
  });

  test('navigate between pages via sidebar', async ({ page }) => {
    // Click on Help in sidebar
    await page.click('[data-testid="app-layout-sidebar-nav-help"]');
    await waitForStability(page);

    // Verify URL changed
    await expect(page).toHaveURL('/help');

    // Navigate back to Dashboard
    await page.click('[data-testid="app-layout-sidebar-nav-dashboard"]');
    await waitForStability(page);

    await expect(page).toHaveURL('/dashboard');
  });

  test('active menu item is highlighted', async ({ page }) => {
    // On dashboard page
    const dashboardNav = page.locator('[data-testid="app-layout-sidebar-nav-dashboard"]');
    await expect(dashboardNav).toHaveAttribute('aria-current', 'page');

    // Navigate to help
    await page.click('[data-testid="app-layout-sidebar-nav-help"]');
    await waitForStability(page);

    // Help should now be active
    const helpNav = page.locator('[data-testid="app-layout-sidebar-nav-help"]');
    await expect(helpNav).toHaveAttribute('aria-current', 'page');

    // Dashboard should no longer be active
    await expect(dashboardNav).not.toHaveAttribute('aria-current', 'page');
  });

  test('sidebar collapses and expands', async ({ page }) => {
    const sidebar = page.locator('[data-testid="app-layout-sidebar"]');
    const toggle = page.locator('[data-testid="app-layout-sidebar-toggle"]');

    // Initially expanded
    await expect(sidebar).toHaveAttribute('data-collapsed', 'false');
    await expect(toggle).toHaveAttribute('aria-label', 'Collapse sidebar');

    // Click to collapse
    await toggle.click();
    await waitForStability(page);

    // Verify collapsed
    await expect(sidebar).toHaveAttribute('data-collapsed', 'true');
    await expect(toggle).toHaveAttribute('aria-label', 'Expand sidebar');

    // Click to expand
    await toggle.click();
    await waitForStability(page);

    // Verify expanded
    await expect(sidebar).toHaveAttribute('data-collapsed', 'false');
  });

  test('sidebar collapse state persists', async ({ page }) => {
    const toggle = page.locator('[data-testid="app-layout-sidebar-toggle"]');

    // Collapse sidebar
    await toggle.click();
    await waitForStability(page);

    // Reload page
    await page.reload();
    await waitForStability(page);

    // Should still be collapsed
    const sidebar = page.locator('[data-testid="app-layout-sidebar"]');
    await expect(sidebar).toHaveAttribute('data-collapsed', 'true');
  });

  test('displays user profile in sidebar footer', async ({ page }) => {
    const userProfile = page.locator('[data-testid="app-layout-sidebar-user-profile"]');
    await expect(userProfile).toBeVisible();

    // Check for logout button
    const logoutButton = page.locator('[data-testid="app-layout-sidebar-user-profile-logout"]');
    await expect(logoutButton).toBeVisible();
    await expect(logoutButton).toHaveAttribute('aria-label', 'Logout');
  });
});

test.describe('Sidebar Navigation - Sub-Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await loginAndNavigateToDashboard(page);
  });

  test('sub-navigation expands and navigates', async ({ page }) => {
    // Find users menu (has children)
    const usersNav = page.locator('[data-testid="app-layout-sidebar-nav-users"]');

    // Check if users nav exists (may be hidden if no permission)
    if (await usersNav.isVisible()) {
      // Initially collapsed
      await expect(usersNav).toHaveAttribute('aria-expanded', 'false');

      // Click to expand
      await usersNav.click();
      await waitForStability(page);

      // Should be expanded
      await expect(usersNav).toHaveAttribute('aria-expanded', 'true');

      // Sub-navigation should be visible
      const subNav = page.locator('[data-testid="app-layout-sidebar-subnav-users"]');
      await expect(subNav).toBeVisible();

      // Click on sub-item
      const allUsersLink = page.locator('[data-testid="app-layout-sidebar-subnav-users-users-list"]');
      await allUsersLink.click();
      await waitForStability(page);

      // Should navigate to users page
      await expect(page).toHaveURL('/users');
    }
  });

  test('sub-navigation collapses when clicking parent again', async ({ page }) => {
    const usersNav = page.locator('[data-testid="app-layout-sidebar-nav-users"]');

    if (await usersNav.isVisible()) {
      // Expand
      await usersNav.click();
      await waitForStability(page);
      await expect(usersNav).toHaveAttribute('aria-expanded', 'true');

      // Collapse
      await usersNav.click();
      await waitForStability(page);
      await expect(usersNav).toHaveAttribute('aria-expanded', 'false');

      // Sub-navigation should not be visible
      const subNav = page.locator('[data-testid="app-layout-sidebar-subnav-users"]');
      await expect(subNav).not.toBeVisible();
    }
  });

  test('parent item auto-expands when child route is active', async ({ page }) => {
    // Navigate directly to users list page
    await page.goto('/users');
    await waitForStability(page);

    const usersNav = page.locator('[data-testid="app-layout-sidebar-nav-users"]');

    if (await usersNav.isVisible()) {
      // Parent should be auto-expanded
      await expect(usersNav).toHaveAttribute('aria-expanded', 'true');

      // Child should be highlighted as active
      const allUsersLink = page.locator('[data-testid="app-layout-sidebar-subnav-users-users-list"]');
      await expect(allUsersLink).toHaveAttribute('aria-current', 'page');
    }
  });
});

test.describe('Sidebar Navigation - Permission Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await loginAndNavigateToDashboard(page);
  });

  test('public menu items are always visible', async ({ page }) => {
    // Dashboard has null permission
    const dashboardNav = page.locator('[data-testid="app-layout-sidebar-nav-dashboard"]');
    await expect(dashboardNav).toBeVisible();

    // Help has null permission
    const helpNav = page.locator('[data-testid="app-layout-sidebar-nav-help"]');
    await expect(helpNav).toBeVisible();

    // Sessions has null permission
    const sessionsNav = page.locator('[data-testid="app-layout-sidebar-nav-sessions"]');
    await expect(sessionsNav).toBeVisible();
  });

  // Note: Testing permission-restricted items would require mocking auth context
  // In a real app, we'd use API mocking or test fixtures for different user roles
});

test.describe('Sidebar Navigation - Mobile', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await loginAndNavigateToDashboard(page);
  });

  test('displays hamburger button on mobile', async ({ page }) => {
    const hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');
    await expect(hamburger).toBeVisible();
  });

  test('hamburger button has correct aria attributes when closed', async ({ page }) => {
    const hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');

    await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    await expect(hamburger).toHaveAttribute('aria-label', 'Open menu');
  });

  test('opens sidebar when hamburger is clicked', async ({ page }) => {
    const hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');

    // Click to open
    await hamburger.click();
    await waitForStability(page);

    // Hamburger should update
    await expect(hamburger).toHaveAttribute('aria-expanded', 'true');
    await expect(hamburger).toHaveAttribute('aria-label', 'Close menu');

    // Backdrop should appear
    const backdrop = page.locator('[data-testid="app-layout-sidebar-backdrop"]');
    await expect(backdrop).toBeVisible();

    // Sidebar drawer should be visible
    const sidebar = page.locator('[data-testid="app-layout-sidebar"]');
    await expect(sidebar).toBeVisible();
  });

  test('closes sidebar when backdrop is clicked', async ({ page }) => {
    const hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');

    // Open sidebar
    await hamburger.click();
    await waitForStability(page);

    // Click backdrop (positioned away from sidebar)
    const backdrop = page.locator('[data-testid="app-layout-sidebar-backdrop"]');
    await backdrop.click({ position: { x: 300, y: 400 } });
    await waitForStability(page);

    // Sidebar should close
    await expect(backdrop).not.toBeVisible();
    await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
  });

  test('closes sidebar when close button is clicked', async ({ page }) => {
    const hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');

    // Open sidebar
    await hamburger.click();
    await waitForStability(page);

    // Click close button
    const closeButton = page.locator('[data-testid="app-layout-sidebar-close"]');
    await closeButton.click();
    await waitForStability(page);

    // Sidebar should close
    const backdrop = page.locator('[data-testid="app-layout-sidebar-backdrop"]');
    await expect(backdrop).not.toBeVisible();
  });

  test('closes sidebar when Escape key is pressed', async ({ page }) => {
    const hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');

    // Open sidebar
    await hamburger.click();
    await waitForStability(page);

    // Press Escape
    await page.keyboard.press('Escape');
    await waitForStability(page);

    // Sidebar should close
    const backdrop = page.locator('[data-testid="app-layout-sidebar-backdrop"]');
    await expect(backdrop).not.toBeVisible();
  });

  test('closes sidebar after navigation', async ({ page }) => {
    const hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');

    // Open sidebar
    await hamburger.click();
    await waitForStability(page);

    // Click on Help navigation item
    await page.click('[data-testid="app-layout-sidebar-nav-help"]');
    await waitForStability(page);

    // Should navigate
    await expect(page).toHaveURL('/help');

    // Sidebar should close
    const backdrop = page.locator('[data-testid="app-layout-sidebar-backdrop"]');
    await expect(backdrop).not.toBeVisible();
  });

  test('mobile header shows logo', async ({ page }) => {
    const logo = page.locator('[data-testid="app-layout-sidebar-logo"]');
    await expect(logo).toBeVisible();
  });
});

test.describe('Sidebar Navigation - Tablet', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await loginAndNavigateToDashboard(page);
  });

  test('displays hamburger button on tablet', async ({ page }) => {
    const hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');
    await expect(hamburger).toBeVisible();
  });

  test('sidebar opens as overlay on tablet', async ({ page }) => {
    const hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');

    // Click to open
    await hamburger.click();
    await waitForStability(page);

    // Backdrop should appear (overlay mode)
    const backdrop = page.locator('[data-testid="app-layout-sidebar-backdrop"]');
    await expect(backdrop).toBeVisible();
  });
});

test.describe('Sidebar Navigation - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await loginAndNavigateToDashboard(page);
  });

  test('sidebar has proper ARIA landmark', async ({ page }) => {
    const sidebar = page.locator('[data-testid="app-layout-sidebar"]');
    await expect(sidebar).toHaveAttribute('aria-label', 'Sidebar');
  });

  test('navigation items are keyboard accessible', async ({ page }) => {
    // Focus on dashboard nav
    const dashboardNav = page.locator('[data-testid="app-layout-sidebar-nav-dashboard"]');
    await dashboardNav.focus();

    // Should be focusable
    await expect(dashboardNav).toBeFocused();

    // Tab to next item
    await page.keyboard.press('Tab');

    // Some item should now be focused
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('navigation works with Enter key', async ({ page }) => {
    // Focus on help nav and press Enter
    const helpNav = page.locator('[data-testid="app-layout-sidebar-nav-help"]');
    await helpNav.focus();
    await page.keyboard.press('Enter');
    await waitForStability(page);

    // Should navigate
    await expect(page).toHaveURL('/help');
  });

  test('toggle button is keyboard accessible', async ({ page }) => {
    const toggle = page.locator('[data-testid="app-layout-sidebar-toggle"]');
    await toggle.focus();

    // Press Enter to toggle
    await page.keyboard.press('Enter');
    await waitForStability(page);

    // Should collapse
    const sidebar = page.locator('[data-testid="app-layout-sidebar"]');
    await expect(sidebar).toHaveAttribute('data-collapsed', 'true');
  });

  test('logout button has accessible label', async ({ page }) => {
    const logoutButton = page.locator('[data-testid="app-layout-sidebar-user-profile-logout"]');
    await expect(logoutButton).toHaveAttribute('aria-label', 'Logout');
  });
});

test.describe('Sidebar Navigation - Responsive Transitions', () => {
  test('transitions from desktop to mobile layout', async ({ page }) => {
    // Start in desktop mode
    await page.setViewportSize(VIEWPORTS.desktop);
    await loginAndNavigateToDashboard(page);

    // Desktop sidebar should be visible
    let sidebar = page.locator('[data-testid="app-layout-sidebar"]');
    await expect(sidebar).toHaveAttribute('data-variant', 'desktop');

    // Resize to mobile
    await page.setViewportSize(VIEWPORTS.mobile);
    await waitForStability(page);

    // Mobile header should appear
    const hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');
    await expect(hamburger).toBeVisible();
  });

  test('transitions from mobile to desktop layout', async ({ page }) => {
    // Start in mobile mode
    await page.setViewportSize(VIEWPORTS.mobile);
    await loginAndNavigateToDashboard(page);

    // Hamburger should be visible
    const hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');
    await expect(hamburger).toBeVisible();

    // Resize to desktop
    await page.setViewportSize(VIEWPORTS.desktop);
    await waitForStability(page);

    // Desktop sidebar should appear
    const sidebar = page.locator('[data-testid="app-layout-sidebar"]');
    await expect(sidebar).toHaveAttribute('data-variant', 'desktop');

    // Hamburger should not be visible
    await expect(hamburger).not.toBeVisible();
  });
});
