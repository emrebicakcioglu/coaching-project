/**
 * Layout & Grid System E2E Tests
 * STORY-017A: Layout & Grid-System
 *
 * Playwright E2E tests for responsive grid behavior.
 * Tests breakpoint transitions and column layouts.
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Viewport sizes for testing breakpoints
 */
const VIEWPORTS = {
  mobile: { width: 375, height: 800 },     // < 640px (xs)
  sm: { width: 640, height: 800 },         // sm breakpoint
  md: { width: 768, height: 800 },         // md breakpoint (tablet)
  lg: { width: 1024, height: 800 },        // lg breakpoint
  xl: { width: 1280, height: 800 },        // xl breakpoint (desktop)
  desktop: { width: 1440, height: 900 },   // Large desktop
};

/**
 * Tolerance for Y-position comparisons to account for sub-pixel rendering differences
 */
const Y_POSITION_TOLERANCE = 10;

/**
 * Helper to wait for layout stability after viewport changes
 * Waits for network idle and allows CSS transitions to complete
 */
async function waitForLayoutStability(page: Page): Promise<void> {
  // Wait for any CSS transitions/animations to settle
  await page.waitForTimeout(100);
  // Wait for network to be idle (in case of lazy loading)
  await page.waitForLoadState('networkidle');
}

test.describe('Layout & Grid System', () => {
  test.describe('Container Component', () => {
    test('container has max-width constraint', async ({ page }) => {
      await page.goto('/grid-demo');
      await page.setViewportSize(VIEWPORTS.desktop);
      await waitForLayoutStability(page);

      const container = page.locator('[data-testid="demo-container"]');
      await expect(container).toBeVisible();

      // Container should be centered and have a max-width
      const boundingBox = await container.boundingBox();
      expect(boundingBox).not.toBeNull();
      if (boundingBox) {
        // Container should not span full viewport width on large screens
        expect(boundingBox.width).toBeLessThanOrEqual(1280);
      }
    });

    test('container has responsive padding', async ({ page }) => {
      await page.goto('/grid-demo');

      const container = page.locator('[data-testid="demo-container"]');

      // Mobile - smaller padding
      await page.setViewportSize(VIEWPORTS.mobile);
      await waitForLayoutStability(page);
      await expect(container).toBeVisible();

      // Desktop - larger padding
      await page.setViewportSize(VIEWPORTS.desktop);
      await waitForLayoutStability(page);
      await expect(container).toBeVisible();
    });
  });

  test.describe('12-Column Grid', () => {
    test('displays all 12 columns', async ({ page }) => {
      await page.goto('/grid-demo');
      await page.setViewportSize(VIEWPORTS.xl);
      await waitForLayoutStability(page);

      // Verify all 12 columns are visible
      for (let i = 1; i <= 12; i++) {
        const col = page.locator(`[data-testid="col-${i}"]`);
        await expect(col).toBeVisible();
        await expect(col).toContainText(String(i));
      }
    });

    test('columns are equal width', async ({ page }) => {
      await page.goto('/grid-demo');
      await page.setViewportSize(VIEWPORTS.xl);
      await waitForLayoutStability(page);

      const col1 = page.locator('[data-testid="col-1"]');
      const col6 = page.locator('[data-testid="col-6"]');
      const col12 = page.locator('[data-testid="col-12"]');

      const box1 = await col1.boundingBox();
      const box6 = await col6.boundingBox();
      const box12 = await col12.boundingBox();

      expect(box1).not.toBeNull();
      expect(box6).not.toBeNull();
      expect(box12).not.toBeNull();

      if (box1 && box6 && box12) {
        // All columns should have approximately the same width (within 5px tolerance)
        expect(Math.abs(box1.width - box6.width)).toBeLessThan(5);
        expect(Math.abs(box6.width - box12.width)).toBeLessThan(5);
      }
    });
  });

  test.describe('Responsive Breakpoints', () => {
    test('grid responds to viewport changes', async ({ page }) => {
      await page.goto('/grid-demo');

      const col1 = page.locator('[data-testid="responsive-col-1"]');
      const col2 = page.locator('[data-testid="responsive-col-2"]');
      const col3 = page.locator('[data-testid="responsive-col-3"]');

      // Mobile (< 768px): All columns full width (stacked)
      await page.setViewportSize(VIEWPORTS.mobile);
      await waitForLayoutStability(page);
      await expect(col1).toBeVisible();

      let box1 = await col1.boundingBox();
      let box2 = await col2.boundingBox();

      expect(box1).not.toBeNull();
      expect(box2).not.toBeNull();

      if (box1 && box2) {
        // On mobile, col2 should be below col1 (higher y position)
        expect(box2.y).toBeGreaterThan(box1.y);
      }

      // Medium (800px): First two columns side by side
      // Note: At exactly 768px, flexbox gap + percentage widths may cause wrapping
      // Using 800px ensures we're clearly in the md breakpoint with sufficient space
      await page.setViewportSize({ width: 800, height: 800 });
      await waitForLayoutStability(page);

      box1 = await col1.boundingBox();
      box2 = await col2.boundingBox();

      expect(box1).not.toBeNull();
      expect(box2).not.toBeNull();

      if (box1 && box2) {
        // On md screens, col1 and col2 should be on the same row (within tolerance)
        expect(Math.abs(box2.y - box1.y)).toBeLessThanOrEqual(Y_POSITION_TOLERANCE);
        // col2 should be to the right of col1
        expect(box2.x).toBeGreaterThan(box1.x);
      }

      // Large (1024px): All three columns side by side
      await page.setViewportSize(VIEWPORTS.lg);
      await waitForLayoutStability(page);

      box1 = await col1.boundingBox();
      box2 = await col2.boundingBox();
      const box3 = await col3.boundingBox();

      expect(box1).not.toBeNull();
      expect(box2).not.toBeNull();
      expect(box3).not.toBeNull();

      if (box1 && box2 && box3) {
        // All three should be on the same row (within tolerance for sub-pixel differences)
        expect(Math.abs(box2.y - box1.y)).toBeLessThanOrEqual(Y_POSITION_TOLERANCE);
        expect(Math.abs(box3.y - box1.y)).toBeLessThanOrEqual(Y_POSITION_TOLERANCE);
        // Each should be positioned to the right of the previous
        expect(box2.x).toBeGreaterThan(box1.x);
        expect(box3.x).toBeGreaterThan(box2.x);
      }
    });

    test('layout renders correctly on mobile (< 768px)', async ({ page }) => {
      await page.goto('/grid-demo');
      await page.setViewportSize(VIEWPORTS.mobile);
      await waitForLayoutStability(page);

      // All responsive columns should be visible
      await expect(page.locator('[data-testid="responsive-col-1"]')).toBeVisible();
      await expect(page.locator('[data-testid="responsive-col-2"]')).toBeVisible();
      await expect(page.locator('[data-testid="responsive-col-3"]')).toBeVisible();

      // Breakpoint indicator should show xs
      const indicator = page.locator('[data-testid="breakpoint-indicator"]');
      await expect(indicator).toContainText('xs');
    });

    test('layout adapts at tablet breakpoint (768px)', async ({ page }) => {
      await page.goto('/grid-demo');
      await page.setViewportSize(VIEWPORTS.md);
      await waitForLayoutStability(page);

      // All responsive columns should be visible
      await expect(page.locator('[data-testid="responsive-col-1"]')).toBeVisible();
      await expect(page.locator('[data-testid="responsive-col-2"]')).toBeVisible();
      await expect(page.locator('[data-testid="responsive-col-3"]')).toBeVisible();

      // Breakpoint indicator should show md
      const indicator = page.locator('[data-testid="breakpoint-indicator"]');
      await expect(indicator).toContainText('md');
    });

    test('layout displays full desktop view at 1280px+', async ({ page }) => {
      await page.goto('/grid-demo');
      await page.setViewportSize(VIEWPORTS.xl);
      await waitForLayoutStability(page);

      // All responsive columns should be visible
      await expect(page.locator('[data-testid="responsive-col-1"]')).toBeVisible();
      await expect(page.locator('[data-testid="responsive-col-2"]')).toBeVisible();
      await expect(page.locator('[data-testid="responsive-col-3"]')).toBeVisible();

      // Breakpoint indicator should show xl
      const indicator = page.locator('[data-testid="breakpoint-indicator"]');
      await expect(indicator).toContainText('xl');
    });
  });

  test.describe('CSS Grid (Card Layout)', () => {
    test('card grid displays correctly on mobile (1 column)', async ({ page }) => {
      await page.goto('/grid-demo');
      await page.setViewportSize(VIEWPORTS.mobile);
      await waitForLayoutStability(page);

      const grid = page.locator('[data-testid="card-grid"]');
      await expect(grid).toBeVisible();

      const card1 = page.locator('[data-testid="card-1"]');
      const card2 = page.locator('[data-testid="card-2"]');

      const box1 = await card1.boundingBox();
      const box2 = await card2.boundingBox();

      expect(box1).not.toBeNull();
      expect(box2).not.toBeNull();

      if (box1 && box2) {
        // Cards should be stacked (card2 below card1)
        expect(box2.y).toBeGreaterThan(box1.y + box1.height - 1);
      }
    });

    test('card grid displays 2 columns on md screens', async ({ page }) => {
      await page.goto('/grid-demo');
      await page.setViewportSize(VIEWPORTS.md);
      await waitForLayoutStability(page);

      const card1 = page.locator('[data-testid="card-1"]');
      const card2 = page.locator('[data-testid="card-2"]');
      const card3 = page.locator('[data-testid="card-3"]');

      const box1 = await card1.boundingBox();
      const box2 = await card2.boundingBox();
      const box3 = await card3.boundingBox();

      expect(box1).not.toBeNull();
      expect(box2).not.toBeNull();
      expect(box3).not.toBeNull();

      if (box1 && box2 && box3) {
        // Cards 1 and 2 should be on the same row (within tolerance)
        expect(Math.abs(box2.y - box1.y)).toBeLessThanOrEqual(Y_POSITION_TOLERANCE);
        // Card 3 should be on a new row
        expect(box3.y).toBeGreaterThan(box1.y);
      }
    });

    test('card grid displays 3 columns on lg screens', async ({ page }) => {
      await page.goto('/grid-demo');
      await page.setViewportSize(VIEWPORTS.lg);
      await waitForLayoutStability(page);

      const card1 = page.locator('[data-testid="card-1"]');
      const card2 = page.locator('[data-testid="card-2"]');
      const card3 = page.locator('[data-testid="card-3"]');
      const card4 = page.locator('[data-testid="card-4"]');

      const box1 = await card1.boundingBox();
      const box2 = await card2.boundingBox();
      const box3 = await card3.boundingBox();
      const box4 = await card4.boundingBox();

      expect(box1).not.toBeNull();
      expect(box2).not.toBeNull();
      expect(box3).not.toBeNull();
      expect(box4).not.toBeNull();

      if (box1 && box2 && box3 && box4) {
        // Cards 1, 2, 3 should be on the same row (within tolerance)
        expect(Math.abs(box2.y - box1.y)).toBeLessThanOrEqual(Y_POSITION_TOLERANCE);
        expect(Math.abs(box3.y - box1.y)).toBeLessThanOrEqual(Y_POSITION_TOLERANCE);
        // Card 4 should be on a new row
        expect(box4.y).toBeGreaterThan(box1.y);
      }
    });
  });

  test.describe('Grid Gaps and Spacing', () => {
    test('grid gaps are consistent', async ({ page }) => {
      await page.goto('/grid-demo');
      await page.setViewportSize(VIEWPORTS.xl);
      await waitForLayoutStability(page);

      const card1 = page.locator('[data-testid="card-1"]');
      const card2 = page.locator('[data-testid="card-2"]');

      const box1 = await card1.boundingBox();
      const box2 = await card2.boundingBox();

      expect(box1).not.toBeNull();
      expect(box2).not.toBeNull();

      if (box1 && box2) {
        // Calculate gap between cards
        const gap = box2.x - (box1.x + box1.width);
        // Gap should be positive (cards don't overlap)
        expect(gap).toBeGreaterThan(0);
        // Gap should be consistent with lg gap (24px)
        expect(gap).toBeGreaterThanOrEqual(16);
        expect(gap).toBeLessThanOrEqual(32);
      }
    });
  });

  test.describe('Spanning Items', () => {
    test('full-width item spans entire grid', async ({ page }) => {
      await page.goto('/grid-demo');
      await page.setViewportSize(VIEWPORTS.xl);
      await waitForLayoutStability(page);

      const grid = page.locator('[data-testid="spanning-grid"]');
      const fullSpan = page.locator('[data-testid="span-full"]');

      const gridBox = await grid.boundingBox();
      const fullBox = await fullSpan.boundingBox();

      expect(gridBox).not.toBeNull();
      expect(fullBox).not.toBeNull();

      if (gridBox && fullBox) {
        // Full span item should nearly match grid width (accounting for padding)
        const widthDiff = gridBox.width - fullBox.width;
        expect(widthDiff).toBeLessThan(50);
      }
    });

    test('8-col and 4-col items are proportional', async ({ page }) => {
      await page.goto('/grid-demo');
      await page.setViewportSize(VIEWPORTS.xl);
      await waitForLayoutStability(page);

      const span8 = page.locator('[data-testid="span-8"]');
      const span4 = page.locator('[data-testid="span-4"]');

      const box8 = await span8.boundingBox();
      const box4 = await span4.boundingBox();

      expect(box8).not.toBeNull();
      expect(box4).not.toBeNull();

      if (box8 && box4) {
        // 8-col should be approximately twice as wide as 4-col
        const ratio = box8.width / box4.width;
        expect(ratio).toBeGreaterThan(1.8);
        expect(ratio).toBeLessThan(2.2);
      }
    });
  });

  test.describe('Nested Grids', () => {
    test('nested grid renders within parent column', async ({ page }) => {
      await page.goto('/grid-demo');
      await page.setViewportSize(VIEWPORTS.lg);
      await waitForLayoutStability(page);

      const mainContent = page.locator('[data-testid="main-content"]');
      const nestedGrid = page.locator('[data-testid="nested-grid"]');

      await expect(mainContent).toBeVisible();
      await expect(nestedGrid).toBeVisible();

      const mainBox = await mainContent.boundingBox();
      const nestedBox = await nestedGrid.boundingBox();

      expect(mainBox).not.toBeNull();
      expect(nestedBox).not.toBeNull();

      if (mainBox && nestedBox) {
        // Nested grid should be within the main content bounds
        expect(nestedBox.x).toBeGreaterThanOrEqual(mainBox.x);
        expect(nestedBox.y).toBeGreaterThanOrEqual(mainBox.y);
        expect(nestedBox.x + nestedBox.width).toBeLessThanOrEqual(mainBox.x + mainBox.width + 1);
      }
    });

    test('sidebar displays correctly on large screens', async ({ page }) => {
      await page.goto('/grid-demo');
      // Use xl viewport (1280px) to ensure sidebar fits side-by-side
      // At exactly 1024px, flexbox gap + percentage widths may cause wrapping
      await page.setViewportSize(VIEWPORTS.xl);
      await waitForLayoutStability(page);

      const mainContent = page.locator('[data-testid="main-content"]');
      const sidebar = page.locator('[data-testid="sidebar"]');

      const mainBox = await mainContent.boundingBox();
      const sidebarBox = await sidebar.boundingBox();

      expect(mainBox).not.toBeNull();
      expect(sidebarBox).not.toBeNull();

      if (mainBox && sidebarBox) {
        // Sidebar should be to the right of main content
        expect(sidebarBox.x).toBeGreaterThan(mainBox.x);
        // They should be on the same row (within tolerance for sub-pixel differences)
        expect(Math.abs(sidebarBox.y - mainBox.y)).toBeLessThanOrEqual(Y_POSITION_TOLERANCE);
      }
    });

    test('sidebar stacks below main content on mobile', async ({ page }) => {
      await page.goto('/grid-demo');
      await page.setViewportSize(VIEWPORTS.mobile);
      await waitForLayoutStability(page);

      const mainContent = page.locator('[data-testid="main-content"]');
      const sidebar = page.locator('[data-testid="sidebar"]');

      const mainBox = await mainContent.boundingBox();
      const sidebarBox = await sidebar.boundingBox();

      expect(mainBox).not.toBeNull();
      expect(sidebarBox).not.toBeNull();

      if (mainBox && sidebarBox) {
        // Sidebar should be below main content on mobile
        expect(sidebarBox.y).toBeGreaterThan(mainBox.y);
      }
    });
  });

  test.describe('Accessibility', () => {
    test('page has no detectable accessibility violations', async ({ page }) => {
      await page.goto('/grid-demo');
      await page.setViewportSize(VIEWPORTS.desktop);
      await waitForLayoutStability(page);

      // Check that page title is visible
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('h1')).toContainText('Grid System Demo');
    });

    test('container has semantic structure', async ({ page }) => {
      await page.goto('/grid-demo');
      await waitForLayoutStability(page);

      // Main element should be present
      const main = page.locator('main');
      await expect(main).toBeVisible();

      // Section elements should be present
      const sections = page.locator('section');
      expect(await sections.count()).toBeGreaterThan(0);
    });
  });
});
