/**
 * Component Responsiveness E2E Tests
 * STORY-017B: Component Responsiveness
 *
 * Playwright E2E tests for responsive component behavior.
 * Tests breakpoint transitions, mobile/desktop views, and touch targets.
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Viewport sizes for testing different devices
 */
const VIEWPORTS = {
  // Mobile devices
  iPhoneSE: { width: 375, height: 667 },
  iPhone12Pro: { width: 390, height: 844 },
  // Tablet
  iPad: { width: 768, height: 1024 },
  // Desktop
  desktop: { width: 1280, height: 720 },
  largeDesktop: { width: 1920, height: 1080 },
};

/**
 * Minimum touch target size per WCAG guidelines
 */
const MIN_TOUCH_TARGET_SIZE = 44;

/**
 * Helper to wait for layout stability after viewport changes
 */
async function waitForLayoutStability(page: Page): Promise<void> {
  await page.waitForTimeout(150);
  await page.waitForLoadState('networkidle');
}

test.describe('STORY-017B: Component Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the responsive demo page
    await page.goto('/responsive-demo');
    await waitForLayoutStability(page);
  });

  test.describe('Sidebar Responsiveness', () => {
    test('sidebar displays as fixed on desktop', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await waitForLayoutStability(page);

      const sidebar = page.locator('[data-testid="responsive-demo-navigation-sidebar"]');
      await expect(sidebar).toBeVisible();

      // On desktop, sidebar should have desktop variant
      await expect(sidebar).toHaveAttribute('data-variant', 'desktop');
    });

    test('sidebar displays as overlay on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.iPhoneSE);
      await waitForLayoutStability(page);

      // Hamburger should be visible
      const hamburger = page.locator('[data-testid="responsive-demo-navigation-hamburger"]');
      await expect(hamburger).toBeVisible();

      // Click hamburger to open sidebar
      await hamburger.click();
      await waitForLayoutStability(page);

      // Sidebar should be visible with mobile variant
      const sidebar = page.locator('[data-testid="responsive-demo-navigation-sidebar"]');
      await expect(sidebar).toHaveAttribute('data-variant', 'mobile');

      // Backdrop should be visible
      const backdrop = page.locator('[data-testid="responsive-demo-navigation-sidebar-backdrop"]');
      await expect(backdrop).toBeVisible();
    });

    test('sidebar toggle works on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.iPhone12Pro);
      await waitForLayoutStability(page);

      const hamburger = page.locator('[data-testid="responsive-demo-navigation-hamburger"]');
      const backdrop = page.locator('[data-testid="responsive-demo-navigation-sidebar-backdrop"]');

      // Initially backdrop not visible
      await expect(backdrop).not.toBeVisible();

      // Open sidebar
      await hamburger.click();
      await waitForLayoutStability(page);
      await expect(backdrop).toBeVisible();

      // Close by clicking backdrop on the right side (away from sidebar which is on left)
      // Sidebar is w-64 (256px), so click at x=300 to be safely on the backdrop
      await backdrop.click({ position: { x: 300, y: 400 } });
      await waitForLayoutStability(page);
      await expect(backdrop).not.toBeVisible();
    });

    test('sidebar switches modes between mobile and desktop viewports', async ({ page }) => {
      // Start on mobile
      await page.setViewportSize(VIEWPORTS.iPhoneSE);
      await waitForLayoutStability(page);

      const hamburger = page.locator('[data-testid="responsive-demo-navigation-hamburger"]');
      await expect(hamburger).toBeVisible();

      // Switch to desktop
      await page.setViewportSize(VIEWPORTS.desktop);
      await waitForLayoutStability(page);

      await expect(hamburger).not.toBeVisible();

      const sidebar = page.locator('[data-testid="responsive-demo-navigation-sidebar"]');
      await expect(sidebar).toHaveAttribute('data-variant', 'desktop');
    });
  });

  test.describe('Table Responsiveness', () => {
    test('table displays as full table on desktop', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await waitForLayoutStability(page);

      const table = page.locator('[data-testid="demo-table"]');
      await expect(table).toHaveAttribute('data-variant', 'table');

      // Should have a table element
      const tableElement = page.locator('[data-testid="demo-table"] table');
      await expect(tableElement).toBeVisible();
    });

    test('table displays as cards on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.iPhoneSE);
      await waitForLayoutStability(page);

      const table = page.locator('[data-testid="demo-table"]');
      await expect(table).toHaveAttribute('data-variant', 'cards');

      // Should have card elements
      const cards = page.locator('[data-testid="demo-table-card-0"]');
      await expect(cards).toBeVisible();
    });

    test('table transitions between card and table view', async ({ page }) => {
      // Start on mobile
      await page.setViewportSize(VIEWPORTS.iPhoneSE);
      await waitForLayoutStability(page);

      const table = page.locator('[data-testid="demo-table"]');
      await expect(table).toHaveAttribute('data-variant', 'cards');

      // Switch to desktop
      await page.setViewportSize(VIEWPORTS.desktop);
      await waitForLayoutStability(page);

      await expect(table).toHaveAttribute('data-variant', 'table');
    });
  });

  test.describe('Form Responsiveness', () => {
    test('form displays multi-column layout on desktop', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await waitForLayoutStability(page);

      const firstNameField = page.locator('[data-testid="field-firstname"]');
      const lastNameField = page.locator('[data-testid="field-lastname"]');

      const firstNameBox = await firstNameField.boundingBox();
      const lastNameBox = await lastNameField.boundingBox();

      expect(firstNameBox).not.toBeNull();
      expect(lastNameBox).not.toBeNull();

      if (firstNameBox && lastNameBox) {
        // Fields should be side by side on desktop
        expect(lastNameBox.x).toBeGreaterThan(firstNameBox.x);
        // And on approximately the same row
        expect(Math.abs(lastNameBox.y - firstNameBox.y)).toBeLessThan(10);
      }
    });

    test('form displays single-column layout on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.iPhoneSE);
      await waitForLayoutStability(page);

      const firstNameField = page.locator('[data-testid="field-firstname"]');
      const lastNameField = page.locator('[data-testid="field-lastname"]');

      const firstNameBox = await firstNameField.boundingBox();
      const lastNameBox = await lastNameField.boundingBox();

      expect(firstNameBox).not.toBeNull();
      expect(lastNameBox).not.toBeNull();

      if (firstNameBox && lastNameBox) {
        // Fields should be stacked on mobile
        expect(lastNameBox.y).toBeGreaterThan(firstNameBox.y);
      }
    });

    test('form inputs have minimum touch target size', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.iPhoneSE);
      await waitForLayoutStability(page);

      // Check input fields
      const firstNameInput = page.locator('[data-testid="input-firstName"]');
      const inputBox = await firstNameInput.boundingBox();

      expect(inputBox).not.toBeNull();
      if (inputBox) {
        expect(inputBox.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
      }
    });
  });

  test.describe('Modal Responsiveness', () => {
    test('modal displays as centered dialog on desktop', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await waitForLayoutStability(page);

      // Open modal
      await page.click('[data-testid="open-modal-btn"]');
      await waitForLayoutStability(page);

      const modal = page.locator('[data-testid="demo-modal"]');
      await expect(modal).toHaveAttribute('data-variant', 'desktop');

      // Backdrop should be visible
      const backdrop = page.locator('[data-testid="demo-modal-backdrop"]');
      await expect(backdrop).toBeVisible();
    });

    test('modal displays as fullscreen on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.iPhoneSE);
      await waitForLayoutStability(page);

      // Open modal
      await page.click('[data-testid="open-modal-btn"]');
      await waitForLayoutStability(page);

      const modal = page.locator('[data-testid="demo-modal"]');
      await expect(modal).toHaveAttribute('data-variant', 'mobile');

      // Modal should be full width
      const modalBox = await modal.boundingBox();
      expect(modalBox).not.toBeNull();
      if (modalBox) {
        expect(modalBox.width).toBe(VIEWPORTS.iPhoneSE.width);
      }
    });

    test('modal close button works on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.iPhoneSE);
      await waitForLayoutStability(page);

      // Open modal
      await page.click('[data-testid="open-modal-btn"]');
      await waitForLayoutStability(page);

      const modal = page.locator('[data-testid="demo-modal"]');
      await expect(modal).toBeVisible();

      // Close modal
      await page.click('[data-testid="demo-modal-close-button"]');
      await waitForLayoutStability(page);

      await expect(modal).not.toBeVisible();
    });

    test('modal close button has minimum touch target size', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.iPhoneSE);
      await waitForLayoutStability(page);

      // Open modal
      await page.click('[data-testid="open-modal-btn"]');
      await waitForLayoutStability(page);

      const closeButton = page.locator('[data-testid="demo-modal-close-button"]');
      const buttonBox = await closeButton.boundingBox();

      expect(buttonBox).not.toBeNull();
      if (buttonBox) {
        expect(buttonBox.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
        expect(buttonBox.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
      }
    });
  });

  test.describe('Navigation Responsiveness', () => {
    test('navigation shows sidebar on desktop', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await waitForLayoutStability(page);

      const nav = page.locator('[data-testid="responsive-demo-navigation"]');
      await expect(nav).toHaveAttribute('data-variant', 'desktop');
    });

    test('navigation shows hamburger menu on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.iPhoneSE);
      await waitForLayoutStability(page);

      const nav = page.locator('[data-testid="responsive-demo-navigation"]');
      await expect(nav).toHaveAttribute('data-variant', 'mobile');

      // Hamburger button should be visible
      const hamburger = page.locator('[data-testid="responsive-demo-navigation-hamburger"]');
      await expect(hamburger).toBeVisible();
    });

    test('hamburger menu opens navigation on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.iPhoneSE);
      await waitForLayoutStability(page);

      const hamburger = page.locator('[data-testid="responsive-demo-navigation-hamburger"]');
      await hamburger.click();
      await waitForLayoutStability(page);

      // Navigation items should be visible
      const navItem = page.locator('[data-testid="responsive-demo-navigation-item-0"]');
      await expect(navItem).toBeVisible();
    });

    test('hamburger button has minimum touch target size', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.iPhoneSE);
      await waitForLayoutStability(page);

      const hamburger = page.locator('[data-testid="responsive-demo-navigation-hamburger"]');
      const hamburgerBox = await hamburger.boundingBox();

      expect(hamburgerBox).not.toBeNull();
      if (hamburgerBox) {
        expect(hamburgerBox.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
        expect(hamburgerBox.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
      }
    });
  });

  test.describe('Touch Target Validation', () => {
    test('all buttons meet minimum touch target size on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.iPhoneSE);
      await waitForLayoutStability(page);

      // Check medium and large buttons
      const mediumButton = page.locator('[data-testid="touch-btn-md"]');
      const largeButton = page.locator('[data-testid="touch-btn-lg"]');

      const mediumBox = await mediumButton.boundingBox();
      const largeBox = await largeButton.boundingBox();

      expect(mediumBox).not.toBeNull();
      expect(largeBox).not.toBeNull();

      if (mediumBox) {
        expect(mediumBox.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
      }

      if (largeBox) {
        expect(largeBox.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
      }
    });

    test('form submit button meets minimum touch target size', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.iPhoneSE);
      await waitForLayoutStability(page);

      const submitButton = page.locator('[data-testid="btn-submit"]');
      const submitBox = await submitButton.boundingBox();

      expect(submitBox).not.toBeNull();
      if (submitBox) {
        expect(submitBox.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
      }
    });
  });

  test.describe('Device Testing', () => {
    test('renders correctly on iPhone SE (375x667)', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.iPhoneSE);
      await waitForLayoutStability(page);

      // Page should load without errors
      const pageTitle = page.locator('h1');
      await expect(pageTitle).toContainText('Responsive Components Demo');

      // Mobile navigation should be visible
      const hamburger = page.locator('[data-testid="responsive-demo-navigation-hamburger"]');
      await expect(hamburger).toBeVisible();
    });

    test('renders correctly on iPhone 12 Pro (390x844)', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.iPhone12Pro);
      await waitForLayoutStability(page);

      const pageTitle = page.locator('h1');
      await expect(pageTitle).toContainText('Responsive Components Demo');

      const hamburger = page.locator('[data-testid="responsive-demo-navigation-hamburger"]');
      await expect(hamburger).toBeVisible();
    });

    test('renders correctly on iPad (768x1024)', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.iPad);
      await waitForLayoutStability(page);

      const pageTitle = page.locator('h1');
      await expect(pageTitle).toContainText('Responsive Components Demo');

      // At 768px, should be desktop mode
      const sidebar = page.locator('[data-testid="responsive-demo-navigation-sidebar"]');
      await expect(sidebar).toHaveAttribute('data-variant', 'desktop');
    });

    test('renders correctly on Desktop (1280x720)', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await waitForLayoutStability(page);

      const pageTitle = page.locator('h1');
      await expect(pageTitle).toContainText('Responsive Components Demo');

      // Desktop sidebar should be visible
      const sidebar = page.locator('[data-testid="responsive-demo-navigation-sidebar"]');
      await expect(sidebar).toHaveAttribute('data-variant', 'desktop');
    });

    test('renders correctly on Large Desktop (1920x1080)', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.largeDesktop);
      await waitForLayoutStability(page);

      const pageTitle = page.locator('h1');
      await expect(pageTitle).toContainText('Responsive Components Demo');

      const sidebar = page.locator('[data-testid="responsive-demo-navigation-sidebar"]');
      await expect(sidebar).toHaveAttribute('data-variant', 'desktop');
    });
  });

  test.describe('User Flow Testing', () => {
    test('navigate using mobile hamburger menu', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.iPhoneSE);
      await waitForLayoutStability(page);

      // Open hamburger menu
      const hamburger = page.locator('[data-testid="responsive-demo-navigation-hamburger"]');
      await hamburger.click();
      await waitForLayoutStability(page);

      // Navigation items should be visible
      const dashboardItem = page.locator('[data-testid="responsive-demo-navigation-item-0"]');
      await expect(dashboardItem).toBeVisible();

      // Click a navigation item
      await dashboardItem.click();
      await waitForLayoutStability(page);

      // Menu should close
      const backdrop = page.locator('[data-testid="responsive-demo-navigation-sidebar-backdrop"]');
      await expect(backdrop).not.toBeVisible();
    });

    test('interact with responsive table on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.iPhoneSE);
      await waitForLayoutStability(page);

      // Table should be in card view
      const table = page.locator('[data-testid="demo-table"]');
      await expect(table).toHaveAttribute('data-variant', 'cards');

      // First card should be visible
      const firstCard = page.locator('[data-testid="demo-table-card-0"]');
      await expect(firstCard).toBeVisible();
    });

    test('submit form in single-column layout', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.iPhoneSE);
      await waitForLayoutStability(page);

      // Fill form fields
      await page.fill('[data-testid="input-firstName"]', 'John');
      await page.fill('[data-testid="input-lastName"]', 'Doe');
      await page.fill('[data-testid="input-email"]', 'john@example.com');

      // Submit button should be accessible
      const submitButton = page.locator('[data-testid="btn-submit"]');
      await expect(submitButton).toBeVisible();
    });

    test('open and close modal on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.iPhoneSE);
      await waitForLayoutStability(page);

      // Open modal
      await page.click('[data-testid="open-modal-btn"]');
      await waitForLayoutStability(page);

      const modal = page.locator('[data-testid="demo-modal"]');
      await expect(modal).toBeVisible();
      await expect(modal).toHaveAttribute('data-variant', 'mobile');

      // Close modal
      await page.click('[data-testid="demo-modal-close-button"]');
      await waitForLayoutStability(page);

      await expect(modal).not.toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('navigation has proper aria attributes', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await waitForLayoutStability(page);

      const nav = page.locator('nav[aria-label="Main navigation"]');
      await expect(nav).toBeVisible();
    });

    test('modal has proper aria attributes', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await waitForLayoutStability(page);

      // Open modal
      await page.click('[data-testid="open-modal-btn"]');
      await waitForLayoutStability(page);

      const modal = page.locator('[data-testid="demo-modal"]');
      await expect(modal).toHaveAttribute('role', 'dialog');
      await expect(modal).toHaveAttribute('aria-modal', 'true');
    });

    test('hamburger button has aria-expanded attribute', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.iPhoneSE);
      await waitForLayoutStability(page);

      const hamburger = page.locator('[data-testid="responsive-demo-navigation-hamburger"]');

      // Initially closed
      await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
      await expect(hamburger).toHaveAttribute('aria-label', 'Open menu');

      // Open menu
      await hamburger.click();
      await waitForLayoutStability(page);

      // After opening, aria-expanded should be true and aria-label should change
      await expect(hamburger).toHaveAttribute('aria-expanded', 'true');
      await expect(hamburger).toHaveAttribute('aria-label', 'Close menu');
    });
  });
});
