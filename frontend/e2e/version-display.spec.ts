/**
 * Version Display E2E Tests
 * STORY-030: Application Versioning
 *
 * Playwright E2E tests for version display functionality.
 * Tests version in footer and About dialog.
 */

import { test, expect } from '@playwright/test';

test.describe('STORY-030: Application Versioning', () => {
  // Helper to mock API response
  const mockVersionResponse = {
    version: '1.0.0',
    name: 'core-app-backend',
    description: 'Core Application Backend API',
    timestamp: new Date().toISOString(),
    build: '12345',
    commit: 'abc123def456',
  };

  test.beforeEach(async ({ page }) => {
    // Mock the version API endpoint
    await page.route('**/api/version', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockVersionResponse),
      });
    });

    // Mock auth to access protected pages
    await page.route('**/api/v1/auth/**', async (route) => {
      if (route.request().url().includes('refresh')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            token_type: 'Bearer',
            expires_in: 3600,
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock users endpoint for auth context
    await page.route('**/api/v1/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          status: 'active',
          roles: [{ id: 1, name: 'admin', permissions: [] }],
        }),
      });
    });
  });

  test.describe('Footer Version Display', () => {
    test('displays version in sidebar footer on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/dashboard');

      // Wait for the page to load
      await page.waitForLoadState('networkidle');

      // Find version footer in sidebar
      const versionFooter = page.locator('[data-testid="app-layout-sidebar-version"]');

      // Version should be visible
      await expect(versionFooter).toBeVisible();

      // Should contain version number pattern
      const versionText = page.locator('[data-testid="app-layout-sidebar-version-version"]');
      await expect(versionText).toContainText(/v\d+\.\d+\.\d+/);
    });

    test('displays version in mobile sidebar', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');

      await page.waitForLoadState('networkidle');

      // Open hamburger menu
      const hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');
      await hamburger.click();

      // Wait for sidebar to open
      await page.waitForSelector('[data-testid="app-layout-sidebar"][data-variant="mobile"]');

      // Version should be visible in mobile sidebar
      const versionFooter = page.locator('[data-testid="app-layout-sidebar-version"]');
      await expect(versionFooter).toBeVisible();
    });

    test('version footer shows semantic version format', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/dashboard');

      await page.waitForLoadState('networkidle');

      // Check version format (MAJOR.MINOR.PATCH)
      const versionText = page.locator('[data-testid="app-layout-sidebar-version-version"]');
      const text = await versionText.textContent();

      // Should match v followed by semantic version
      expect(text).toMatch(/^v\d+\.\d+\.\d+$/);
    });
  });

  test.describe('About Dialog', () => {
    test('opens About dialog when clicking version footer', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/dashboard');

      await page.waitForLoadState('networkidle');

      // Click on version footer
      const versionFooter = page.locator('[data-testid="app-layout-sidebar-version"]');
      await versionFooter.click();

      // About dialog should open
      const aboutDialog = page.locator('[data-testid="about-dialog"]');
      await expect(aboutDialog).toBeVisible();
    });

    test('displays version in About dialog', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/dashboard');

      await page.waitForLoadState('networkidle');

      // Open About dialog
      await page.locator('[data-testid="app-layout-sidebar-version"]').click();

      // Check version is displayed
      const versionElement = page.locator('[data-testid="about-dialog-version"]');
      await expect(versionElement).toBeVisible();
      await expect(versionElement).toContainText('1.0.0');
    });

    test('displays application name in About dialog', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/dashboard');

      await page.waitForLoadState('networkidle');

      // Open About dialog
      await page.locator('[data-testid="app-layout-sidebar-version"]').click();

      // Check name is displayed
      const nameElement = page.locator('[data-testid="about-dialog-name"]');
      await expect(nameElement).toBeVisible();
    });

    test('displays application description in About dialog', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/dashboard');

      await page.waitForLoadState('networkidle');

      // Open About dialog
      await page.locator('[data-testid="app-layout-sidebar-version"]').click();

      // Check description is displayed
      const descElement = page.locator('[data-testid="about-dialog-description"]');
      await expect(descElement).toBeVisible();
    });

    test('displays build number when available', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/dashboard');

      await page.waitForLoadState('networkidle');

      // Open About dialog
      await page.locator('[data-testid="app-layout-sidebar-version"]').click();

      // Check build is displayed
      const buildElement = page.locator('[data-testid="about-dialog-build"]');
      await expect(buildElement).toBeVisible();
      await expect(buildElement).toContainText('12345');
    });

    test('displays git commit when available', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/dashboard');

      await page.waitForLoadState('networkidle');

      // Open About dialog
      await page.locator('[data-testid="app-layout-sidebar-version"]').click();

      // Check commit is displayed
      const commitElement = page.locator('[data-testid="about-dialog-commit"]');
      await expect(commitElement).toBeVisible();
      await expect(commitElement).toContainText('abc123def456');
    });

    test('closes About dialog when clicking close button', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/dashboard');

      await page.waitForLoadState('networkidle');

      // Open About dialog
      await page.locator('[data-testid="app-layout-sidebar-version"]').click();

      // Wait for dialog to be visible
      await expect(page.locator('[data-testid="about-dialog"]')).toBeVisible();

      // Click close button
      await page.locator('[data-testid="about-dialog-close-button"]').click();

      // Dialog should be closed
      await expect(page.locator('[data-testid="about-dialog"]')).not.toBeVisible();
    });

    test('closes About dialog when pressing Escape', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/dashboard');

      await page.waitForLoadState('networkidle');

      // Open About dialog
      await page.locator('[data-testid="app-layout-sidebar-version"]').click();

      // Wait for dialog to be visible
      await expect(page.locator('[data-testid="about-dialog"]')).toBeVisible();

      // Press Escape
      await page.keyboard.press('Escape');

      // Dialog should be closed
      await expect(page.locator('[data-testid="about-dialog"]')).not.toBeVisible();
    });
  });

  test.describe('Version API Endpoint', () => {
    test('API returns correct version format', async ({ request }) => {
      const response = await request.get('http://localhost:14102/api/version');

      // Should return 200
      expect(response.status()).toBe(200);

      const body = await response.json();

      // Should have required fields
      expect(body).toHaveProperty('version');
      expect(body).toHaveProperty('name');
      expect(body).toHaveProperty('description');
      expect(body).toHaveProperty('timestamp');

      // Version should match semantic versioning
      expect(body.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  test.describe('Responsive Behavior', () => {
    test('version is accessible on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/dashboard');

      await page.waitForLoadState('networkidle');

      // Open hamburger menu (tablet uses mobile layout)
      const hamburger = page.locator('[data-testid="app-layout-sidebar-hamburger"]');
      await hamburger.click();

      // Version should be accessible
      const versionFooter = page.locator('[data-testid="app-layout-sidebar-version"]');
      await expect(versionFooter).toBeVisible();
    });

    test('About dialog is responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');

      await page.waitForLoadState('networkidle');

      // Open hamburger menu
      await page.locator('[data-testid="app-layout-sidebar-hamburger"]').click();

      // Open About dialog
      await page.locator('[data-testid="app-layout-sidebar-version"]').click();

      // Dialog should be visible with mobile variant
      const aboutDialog = page.locator('[data-testid="about-dialog"]');
      await expect(aboutDialog).toBeVisible();

      // On mobile, dialog should be fullscreen (check variant attribute)
      const variant = await aboutDialog.getAttribute('data-variant');
      expect(variant).toBe('mobile');
    });
  });

  test.describe('Accessibility', () => {
    test('version footer has accessible aria-label', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/dashboard');

      await page.waitForLoadState('networkidle');

      const versionFooter = page.locator('[data-testid="app-layout-sidebar-version"]');
      const ariaLabel = await versionFooter.getAttribute('aria-label');

      // Should have accessible label
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain('version');
    });

    test('About dialog has proper ARIA attributes', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/dashboard');

      await page.waitForLoadState('networkidle');

      // Open About dialog
      await page.locator('[data-testid="app-layout-sidebar-version"]').click();

      const aboutDialog = page.locator('[data-testid="about-dialog"]');

      // Check ARIA attributes
      await expect(aboutDialog).toHaveAttribute('role', 'dialog');
      await expect(aboutDialog).toHaveAttribute('aria-modal', 'true');
    });

    test('About dialog close button has accessible label', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/dashboard');

      await page.waitForLoadState('networkidle');

      // Open About dialog
      await page.locator('[data-testid="app-layout-sidebar-version"]').click();

      const closeButton = page.locator('[data-testid="about-dialog-close-button"]');
      const ariaLabel = await closeButton.getAttribute('aria-label');

      // Should have accessible label
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel?.toLowerCase()).toContain('close');
    });
  });
});
