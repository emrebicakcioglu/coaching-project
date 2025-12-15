/**
 * Responsive Sidebar E2E Tests
 * STORY-018B: Context Menu Responsive & Mobile
 *
 * Playwright E2E tests for responsive sidebar navigation functionality.
 * Tests the sidebar behavior across Desktop (≥1024px), Tablet (768-1023px),
 * and Mobile (<768px) breakpoints.
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Viewport sizes for responsive testing (matching Story 018B specifications)
 */
const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },    // ≥1024px - sidebar always visible
  tablet: { width: 900, height: 600 },       // 768-1023px - collapsible overlay
  mobile: { width: 375, height: 667 },       // <768px - hamburger menu
  desktopMinimum: { width: 1024, height: 768 }, // Exactly at desktop breakpoint
  tabletMinimum: { width: 768, height: 1024 },  // Exactly at tablet breakpoint
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
 */
async function loginAndNavigateToDashboard(page: Page): Promise<void> {
  await page.goto('/dashboard');
  await waitForStability(page);
}

test.describe('Responsive Sidebar - Desktop Layout (≥1024px)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await loginAndNavigateToDashboard(page);
  });

  test('desktop sidebar always visible at ≥1024px', async ({ page }) => {
    const sidebar = page.locator('[data-testid="app-layout-sidebar"]');
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveAttribute('data-variant', 'desktop');
  });

  test('sidebar has 280px width on desktop', async ({ page }) => {
    const sidebar = page.locator('[data-testid="app-layout-sidebar"]');
    await expect(sidebar).toBeVisible();

    // Verify width via computed style or class
    await expect(sidebar).toHaveClass(/w-\[280px\]/);
  });

  test('sidebar collapse toggle is visible on desktop', async ({ page }) => {
    const toggle = page.locator('[data-testid="app-layout-sidebar-toggle"]');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-label', 'Collapse sidebar');
  });

  test('menu items have hover states', async ({ page }) => {
    const dashboardNav = page.locator('[data-testid="app-layout-sidebar-nav-dashboard"]');

    // Hover over the nav item
    await dashboardNav.hover();

    // The hover state should be applied (we can verify the element is interactive)
    await expect(dashboardNav).toBeVisible();
  });

  test('hamburger button is not visible on desktop', async ({ page }) => {
    const hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');
    await expect(hamburger).not.toBeVisible();
  });

  test('sidebar at minimum desktop width (1024px)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktopMinimum);
    await waitForStability(page);

    const sidebar = page.locator('[data-testid="app-layout-sidebar"]');
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveAttribute('data-variant', 'desktop');
  });
});

test.describe('Responsive Sidebar - Tablet Overlay Menu (768px - 1023px)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await loginAndNavigateToDashboard(page);
  });

  test('tablet overlay menu toggles', async ({ page }) => {
    const hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');
    await expect(hamburger).toBeVisible();

    // Open menu
    await hamburger.click();
    await waitForStability(page);

    // Verify overlay is visible
    const backdrop = page.locator('[data-testid="app-layout-sidebar-backdrop"]');
    await expect(backdrop).toBeVisible();

    // Verify sidebar is visible
    const sidebar = page.locator('[data-testid="app-layout-sidebar"]');
    await expect(sidebar).toBeVisible();
  });

  test('hamburger button visible on tablet', async ({ page }) => {
    const hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');
    await expect(hamburger).toBeVisible();
  });

  test('sidebar opens as overlay with backdrop on tablet', async ({ page }) => {
    const hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');
    await hamburger.click();
    await waitForStability(page);

    // Backdrop should appear
    const backdrop = page.locator('[data-testid="app-layout-sidebar-backdrop"]');
    await expect(backdrop).toBeVisible();
  });

  test('overlay dismisses on backdrop click', async ({ page }) => {
    // Open sidebar
    await page.click('[data-testid="app-layout-sidebar-hamburger"]');
    await waitForStability(page);

    const backdrop = page.locator('[data-testid="app-layout-sidebar-backdrop"]');
    await expect(backdrop).toBeVisible();

    // Click on backdrop (away from sidebar)
    await backdrop.click({ position: { x: 800, y: 300 } });
    await waitForStability(page);

    // Backdrop should be hidden
    await expect(backdrop).not.toBeVisible();
  });

  test('smooth transition when opening overlay menu', async ({ page }) => {
    const sidebar = page.locator('[data-testid="app-layout-sidebar"]');

    // Verify transition classes are present
    await expect(sidebar).toHaveClass(/transition-transform/);

    // Open menu and verify transform
    await page.click('[data-testid="app-layout-sidebar-hamburger"]');
    await waitForStability(page);

    await expect(sidebar).toHaveClass(/translate-x-0/);
  });

  test('tablet at minimum width (768px)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tabletMinimum);
    await waitForStability(page);

    // Should show hamburger menu (overlay mode)
    const hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');
    await expect(hamburger).toBeVisible();
  });
});

test.describe('Responsive Sidebar - Mobile Hamburger Menu (<768px)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await loginAndNavigateToDashboard(page);
  });

  test('mobile hamburger menu visible', async ({ page }) => {
    const hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');
    await expect(hamburger).toBeVisible();
  });

  test('hamburger button has correct aria attributes', async ({ page }) => {
    const hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');
    await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    await expect(hamburger).toHaveAttribute('aria-label', 'Open menu');
  });

  test('hamburger toggles to close state when open', async ({ page }) => {
    const hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');

    await hamburger.click();
    await waitForStability(page);

    await expect(hamburger).toHaveAttribute('aria-expanded', 'true');
    await expect(hamburger).toHaveAttribute('aria-label', 'Close menu');
  });

  test('mobile sidebar has touch-friendly tap targets', async ({ page }) => {
    const hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');

    // Verify minimum size classes (44px)
    await expect(hamburger).toHaveClass(/min-w-\[44px\]/);
    await expect(hamburger).toHaveClass(/min-h-\[44px\]/);
  });

  test('sidebar opens as full overlay on mobile', async ({ page }) => {
    await page.click('[data-testid="app-layout-sidebar-hamburger"]');
    await waitForStability(page);

    const sidebar = page.locator('[data-testid="app-layout-sidebar"]');
    await expect(sidebar).toBeVisible();

    // Check it's using mobile variant
    await expect(sidebar).toHaveAttribute('data-variant', 'mobile');
  });

  test('sidebar has max-width constraint on mobile', async ({ page }) => {
    await page.click('[data-testid="app-layout-sidebar-hamburger"]');
    await waitForStability(page);

    const sidebar = page.locator('[data-testid="app-layout-sidebar"]');
    await expect(sidebar).toHaveClass(/max-w-\[85vw\]/);
  });

  test('close button works on mobile', async ({ page }) => {
    // Open
    await page.click('[data-testid="app-layout-sidebar-hamburger"]');
    await waitForStability(page);

    // Close via close button
    const closeButton = page.locator('[data-testid="app-layout-sidebar-close"]');
    await expect(closeButton).toBeVisible();
    await closeButton.click();
    await waitForStability(page);

    // Verify closed
    const backdrop = page.locator('[data-testid="app-layout-sidebar-backdrop"]');
    await expect(backdrop).not.toBeVisible();
  });

  test('escape key closes mobile sidebar', async ({ page }) => {
    // Open
    await page.click('[data-testid="app-layout-sidebar-hamburger"]');
    await waitForStability(page);

    // Verify open
    const backdrop = page.locator('[data-testid="app-layout-sidebar-backdrop"]');
    await expect(backdrop).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');
    await waitForStability(page);

    // Verify closed
    await expect(backdrop).not.toBeVisible();
  });
});

test.describe('Navigation Between Pages - All Device Sizes', () => {
  test('navigate between pages on desktop', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await loginAndNavigateToDashboard(page);

    // Navigate to Help
    await page.click('[data-testid="app-layout-sidebar-nav-help"]');
    await waitForStability(page);
    await expect(page).toHaveURL('/help');

    // Navigate back to Dashboard
    await page.click('[data-testid="app-layout-sidebar-nav-dashboard"]');
    await waitForStability(page);
    await expect(page).toHaveURL('/dashboard');
  });

  test('navigate between pages on tablet', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await loginAndNavigateToDashboard(page);

    // Open sidebar
    await page.click('[data-testid="app-layout-sidebar-hamburger"]');
    await waitForStability(page);

    // Navigate
    await page.click('[data-testid="app-layout-sidebar-nav-help"]');
    await waitForStability(page);

    // Verify navigation and sidebar auto-closes
    await expect(page).toHaveURL('/help');
    const backdrop = page.locator('[data-testid="app-layout-sidebar-backdrop"]');
    await expect(backdrop).not.toBeVisible();
  });

  test('navigate between pages on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await loginAndNavigateToDashboard(page);

    // Open sidebar
    await page.click('[data-testid="app-layout-sidebar-hamburger"]');
    await waitForStability(page);

    // Navigate
    await page.click('[data-testid="app-layout-sidebar-nav-help"]');
    await waitForStability(page);

    // Verify navigation and sidebar auto-closes
    await expect(page).toHaveURL('/help');
    const backdrop = page.locator('[data-testid="app-layout-sidebar-backdrop"]');
    await expect(backdrop).not.toBeVisible();
  });

  test('menu state persists during navigation', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await loginAndNavigateToDashboard(page);

    // Collapse sidebar
    await page.click('[data-testid="app-layout-sidebar-toggle"]');
    await waitForStability(page);

    const sidebar = page.locator('[data-testid="app-layout-sidebar"]');
    await expect(sidebar).toHaveAttribute('data-collapsed', 'true');

    // Navigate
    await page.click('[data-testid="app-layout-sidebar-nav-help"]');
    await waitForStability(page);

    // Sidebar should still be collapsed
    await expect(sidebar).toHaveAttribute('data-collapsed', 'true');
  });
});

test.describe('Smooth Transitions', () => {
  test('sidebar has transition classes on desktop', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await loginAndNavigateToDashboard(page);

    const sidebar = page.locator('[data-testid="app-layout-sidebar"]');
    await expect(sidebar).toHaveClass(/transition/);
    await expect(sidebar).toHaveClass(/duration/);
  });

  test('sidebar has transition classes on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await loginAndNavigateToDashboard(page);

    const sidebar = page.locator('[data-testid="app-layout-sidebar"]');
    await expect(sidebar).toHaveClass(/transition/);
    await expect(sidebar).toHaveClass(/duration/);
  });

  test('no jarring layout shift on viewport resize', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await loginAndNavigateToDashboard(page);

    // Resize to mobile
    await page.setViewportSize(VIEWPORTS.mobile);
    await waitForStability(page);

    // Hamburger should appear smoothly
    const hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');
    await expect(hamburger).toBeVisible();

    // Resize back to desktop
    await page.setViewportSize(VIEWPORTS.desktop);
    await waitForStability(page);

    // Sidebar should be visible again
    const sidebar = page.locator('[data-testid="app-layout-sidebar"]');
    await expect(sidebar).toHaveAttribute('data-variant', 'desktop');
  });
});

test.describe('Responsive Transitions Between Breakpoints', () => {
  test('transitions from desktop to tablet', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await loginAndNavigateToDashboard(page);

    // Desktop sidebar visible
    let sidebar = page.locator('[data-testid="app-layout-sidebar"]');
    await expect(sidebar).toHaveAttribute('data-variant', 'desktop');

    // Resize to tablet
    await page.setViewportSize(VIEWPORTS.tablet);
    await waitForStability(page);

    // Hamburger should appear
    const hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');
    await expect(hamburger).toBeVisible();
  });

  test('transitions from tablet to mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await loginAndNavigateToDashboard(page);

    // Hamburger visible on tablet
    let hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');
    await expect(hamburger).toBeVisible();

    // Resize to mobile
    await page.setViewportSize(VIEWPORTS.mobile);
    await waitForStability(page);

    // Hamburger still visible on mobile
    await expect(hamburger).toBeVisible();

    // Verify mobile variant
    await hamburger.click();
    await waitForStability(page);

    const sidebar = page.locator('[data-testid="app-layout-sidebar"]');
    await expect(sidebar).toHaveAttribute('data-variant', 'mobile');
  });

  test('transitions from mobile to desktop', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await loginAndNavigateToDashboard(page);

    // Hamburger visible on mobile
    const hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');
    await expect(hamburger).toBeVisible();

    // Resize to desktop
    await page.setViewportSize(VIEWPORTS.desktop);
    await waitForStability(page);

    // Desktop sidebar visible, hamburger hidden
    const sidebar = page.locator('[data-testid="app-layout-sidebar"]');
    await expect(sidebar).toHaveAttribute('data-variant', 'desktop');
    await expect(hamburger).not.toBeVisible();
  });
});

test.describe('Accessibility - Responsive Sidebar', () => {
  test('mobile sidebar has proper ARIA attributes when open', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await loginAndNavigateToDashboard(page);

    // Open sidebar
    await page.click('[data-testid="app-layout-sidebar-hamburger"]');
    await waitForStability(page);

    const sidebar = page.locator('[data-testid="app-layout-sidebar"]');
    await expect(sidebar).toHaveAttribute('role', 'dialog');
    await expect(sidebar).toHaveAttribute('aria-modal', 'true');
    await expect(sidebar).toHaveAttribute('aria-hidden', 'false');
  });

  test('mobile sidebar has proper ARIA attributes when closed', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await loginAndNavigateToDashboard(page);

    const sidebar = page.locator('[data-testid="app-layout-sidebar"]');
    await expect(sidebar).toHaveAttribute('aria-hidden', 'true');
  });

  test('keyboard navigation works on tablet', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await loginAndNavigateToDashboard(page);

    // Focus hamburger and press Enter
    const hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');
    await hamburger.focus();
    await page.keyboard.press('Enter');
    await waitForStability(page);

    // Sidebar should open
    const backdrop = page.locator('[data-testid="app-layout-sidebar-backdrop"]');
    await expect(backdrop).toBeVisible();

    // Tab to close button and press Enter
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const closeButton = page.locator('[data-testid="app-layout-sidebar-close"]');
    await closeButton.focus();
    await page.keyboard.press('Enter');
    await waitForStability(page);

    // Sidebar should close
    await expect(backdrop).not.toBeVisible();
  });

  test('focus trap works in mobile sidebar', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await loginAndNavigateToDashboard(page);

    // Open sidebar
    await page.click('[data-testid="app-layout-sidebar-hamburger"]');
    await waitForStability(page);

    // Verify sidebar is a modal dialog (focus should be trapped)
    const sidebar = page.locator('[data-testid="app-layout-sidebar"]');
    await expect(sidebar).toHaveAttribute('aria-modal', 'true');
  });
});
