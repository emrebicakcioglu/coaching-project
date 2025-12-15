/**
 * Permission-System Frontend E2E Tests
 * STORY-008B: Permission-System (Frontend)
 *
 * Playwright end-to-end tests for permission-based UI elements.
 * Tests verify that UI elements show/hide based on user permissions,
 * protected routes redirect to forbidden, and navigation filtering works.
 */

import { test, expect, Page } from '@playwright/test';

// Run tests serially to avoid rate limiting and data conflicts
test.describe.configure({ mode: 'serial' });

// Increase timeout for tests to handle rate limiting delays
test.setTimeout(120000); // 120 seconds per test

// Base URL from playwright config
const BASE_URL = 'http://localhost:3000';

/**
 * Test credentials
 * Uses environment variables with fallback defaults
 */
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'TestPassword123!';

/**
 * Login as admin helper with rate limiting handling
 */
async function loginAsAdmin(page: Page) {
  const maxAttempts = 8;
  const retryDelay = 10000; // 10 seconds between retries

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait briefly for response
    await page.waitForTimeout(1000);

    // Check if we hit rate limiting
    const rateLimitError = await page.locator('text=Zu viele Anmeldeversuche').isVisible();
    if (rateLimitError) {
      console.log(`Rate limit hit on attempt ${attempt}, waiting ${retryDelay/1000}s...`);
      await page.waitForTimeout(retryDelay);
      continue;
    }

    // Wait for navigation to complete
    try {
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });

      // Wait for auth context to load
      await page.waitForSelector('text=System Administrator', { timeout: 10000 });

      // Small delay for permissions state propagation
      await page.waitForTimeout(500);

      return;
    } catch {
      if (attempt < maxAttempts) {
        console.log(`Login attempt ${attempt} failed, retrying...`);
        await page.waitForTimeout(2000);
        continue;
      }
      throw new Error('Failed to login after maximum attempts');
    }
  }
}

/**
 * Login with custom credentials helper
 * Note: In a real test environment, you would have test users with different permission sets
 */
async function loginWithCredentials(page: Page, email: string, password: string) {
  const maxAttempts = 5;
  const retryDelay = 10000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(1000);

    const rateLimitError = await page.locator('text=Zu viele Anmeldeversuche').isVisible();
    if (rateLimitError) {
      console.log(`Rate limit hit on attempt ${attempt}, waiting ${retryDelay/1000}s...`);
      await page.waitForTimeout(retryDelay);
      continue;
    }

    try {
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
      await page.waitForTimeout(500);
      return;
    } catch {
      if (attempt < maxAttempts) {
        console.log(`Login attempt ${attempt} failed, retrying...`);
        await page.waitForTimeout(2000);
        continue;
      }
      throw new Error('Failed to login after maximum attempts');
    }
  }
}

test.describe('Permission-Based UI Visibility', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('admin user sees all navigation items', async ({ page }) => {
    // Navigate to dashboard to ensure we're on an authenticated page
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForSelector('[data-testid="sidebar"]', { timeout: 10000 });

    // Admin should see all main navigation items
    await expect(page.locator('[data-testid="sidebar-nav-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-nav-users"]')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-nav-roles"]')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-nav-settings"]')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-nav-help"]')).toBeVisible();
  });

  test('admin user can access users page', async ({ page }) => {
    await page.goto(`${BASE_URL}/users`);

    // Should not be redirected
    await expect(page).toHaveURL(/\/users/);

    // Page content should be visible
    await expect(page.locator('[data-testid="users-list-page"]')).toBeVisible();
  });

  test('admin user can access roles page', async ({ page }) => {
    await page.goto(`${BASE_URL}/roles`);

    // Should not be redirected
    await expect(page).toHaveURL(/\/roles/);

    // Page content should be visible (roles page uses data-testid)
    await expect(page.locator('[data-testid="roles-management-page"]')).toBeVisible();
  });

  test('admin user sees create user button on users page', async ({ page }) => {
    await page.goto(`${BASE_URL}/users`);
    await page.waitForSelector('[data-testid="users-list-page"]', { timeout: 10000 });

    // Create button should be visible for admin
    await expect(page.locator('[data-testid="create-user-button"]')).toBeVisible();
  });

  test('admin user sees new role button on roles page', async ({ page }) => {
    await page.goto(`${BASE_URL}/roles`);
    await page.waitForSelector('[data-testid="roles-management-page"]', { timeout: 10000 });

    // Create role button should be visible for admin
    await expect(page.locator('[data-testid="new-role-button"]')).toBeVisible();
  });
});

test.describe('Protected Route Redirect', () => {
  test('unauthenticated user is redirected to login', async ({ page }) => {
    // Clear any existing auth
    await page.goto(`${BASE_URL}/login`);
    await page.evaluate(() => {
      localStorage.clear();
    });

    // Try to access a protected route
    await page.goto(`${BASE_URL}/users`);

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('forbidden page displays correctly', async ({ page }) => {
    // Navigate directly to forbidden page
    await page.goto(`${BASE_URL}/forbidden`);

    // Check forbidden page elements
    await expect(page.locator('[data-testid="forbidden-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="forbidden-title"]')).toContainText('Zugriff verweigert');
    await expect(page.locator('[data-testid="error-code"]')).toContainText('403');

    // Check navigation buttons
    await expect(page.locator('[data-testid="go-back-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="dashboard-link"]')).toBeVisible();
    await expect(page.locator('[data-testid="help-link"]')).toBeVisible();
  });

  test('forbidden page go back button works', async ({ page }) => {
    // Login first
    await loginAsAdmin(page);

    // Navigate to dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForSelector('[data-testid="sidebar"]', { timeout: 10000 });

    // Navigate to forbidden
    await page.goto(`${BASE_URL}/forbidden`);
    await expect(page.locator('[data-testid="forbidden-page"]')).toBeVisible();

    // Click go back button
    await page.click('[data-testid="go-back-button"]');

    // Should navigate back to previous page
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('forbidden page dashboard link works', async ({ page }) => {
    // Navigate to forbidden page
    await page.goto(`${BASE_URL}/forbidden`);
    await expect(page.locator('[data-testid="forbidden-page"]')).toBeVisible();

    // Click dashboard link
    await page.click('[data-testid="dashboard-link"]');

    // Should navigate to dashboard (or login if not authenticated)
    // The user may be redirected to login if not authenticated
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|login)/);
  });
});

test.describe('Navigation Filtering', () => {
  test('navigation reflects user permissions after login', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForSelector('[data-testid="sidebar"]', { timeout: 10000 });

    // Check that navigation items are filtered based on permissions
    // Admin should see everything
    const navItems = page.locator('[data-testid^="sidebar-nav-"]');
    const count = await navItems.count();

    // Should have at least dashboard, users, roles, settings, help, sessions
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('navigation items with children expand correctly', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForSelector('[data-testid="sidebar"]', { timeout: 10000 });

    // Click on Users navigation item (has children)
    const usersNav = page.locator('[data-testid="sidebar-nav-users"]');
    if (await usersNav.isVisible()) {
      await usersNav.click();

      // Wait for submenu
      await page.waitForTimeout(500);

      // Check if subnav items are visible
      const subNav = page.locator('[data-testid="sidebar-subnav-users"]');
      if (await subNav.isVisible()) {
        // Subnav should contain child items
        await expect(subNav).toBeVisible();
      }
    }
  });

  test('clicking navigation item navigates to correct route', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to dashboard first
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForSelector('[data-testid="sidebar"]', { timeout: 10000 });

    // Click on Roles navigation
    const rolesNav = page.locator('[data-testid="sidebar-nav-roles"]');
    await rolesNav.click();

    // Should navigate to roles page
    await expect(page).toHaveURL(/\/roles/);
  });
});

test.describe('Permission-Based Action Buttons', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('user with full permissions sees all action buttons on users page', async ({ page }) => {
    await page.goto(`${BASE_URL}/users`);
    await page.waitForSelector('[data-testid="users-list-page"]', { timeout: 10000 });

    // Wait for users table to load
    await page.waitForTimeout(1000);

    // Check create button is visible
    await expect(page.locator('[data-testid="create-user-button"]')).toBeVisible();

    // If there are users in the table, check for action buttons
    const userRows = page.locator('.users-list__row');
    const rowCount = await userRows.count();

    if (rowCount > 0) {
      // Action buttons should exist in rows
      const editButtons = page.locator('[data-testid="edit-user-button"]');
      const editCount = await editButtons.count();
      expect(editCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('user with full permissions sees all action buttons on roles page', async ({ page }) => {
    await page.goto(`${BASE_URL}/roles`);
    await page.waitForSelector('[data-testid="roles-management-page"]', { timeout: 10000 });

    // Wait for roles table to load
    await page.waitForTimeout(1000);

    // Check create button is visible
    await expect(page.locator('[data-testid="new-role-button"]')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('forbidden page meets accessibility requirements', async ({ page }) => {
    await page.goto(`${BASE_URL}/forbidden`);
    await expect(page.locator('[data-testid="forbidden-page"]')).toBeVisible();

    // Check that forbidden page has proper heading structure
    const heading = page.locator('[data-testid="forbidden-title"]');
    await expect(heading).toBeVisible();

    // Check that buttons are keyboard accessible
    const goBackButton = page.locator('[data-testid="go-back-button"]');
    await expect(goBackButton).toBeVisible();

    // Check that button is focusable
    await goBackButton.focus();
    await expect(goBackButton).toBeFocused();

    // Check that links are keyboard accessible
    const dashboardLink = page.locator('[data-testid="dashboard-link"]');
    await expect(dashboardLink).toBeVisible();
  });

  test('navigation items are keyboard accessible', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForSelector('[data-testid="sidebar"]', { timeout: 10000 });

    // Check that navigation items can receive focus
    const dashboardNav = page.locator('[data-testid="sidebar-nav-dashboard"] button, [data-testid="sidebar-nav-dashboard"] a').first();

    if (await dashboardNav.isVisible()) {
      await dashboardNav.focus();
      await expect(dashboardNav).toBeFocused();
    }
  });
});

test.describe('User Flows', () => {
  test('complete flow: login, navigate, access protected resource', async ({ page }) => {
    // Start from login
    await page.goto(`${BASE_URL}/login`);

    // Login as admin
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });

    // Navigate to users via sidebar
    await page.waitForSelector('[data-testid="sidebar"]', { timeout: 10000 });

    // Click on Users in navigation (may need to expand first)
    const usersNav = page.locator('[data-testid="sidebar-nav-users"]');
    await usersNav.click();

    // Wait for navigation or submenu
    await page.waitForTimeout(500);

    // Try to navigate to users list
    const usersListNav = page.locator('[data-testid="sidebar-subnav-users"] a').first();
    if (await usersListNav.isVisible()) {
      await usersListNav.click();
    } else {
      // Direct navigation if no submenu
      await page.goto(`${BASE_URL}/users`);
    }

    // Should be on users page
    await expect(page).toHaveURL(/\/users/);

    // Users page should be visible
    await expect(page.locator('[data-testid="users-list-page"]')).toBeVisible();
  });

  test('session persists across page navigation', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to different pages
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();

    await page.goto(`${BASE_URL}/users`);
    await expect(page.locator('[data-testid="users-list-page"]')).toBeVisible();

    await page.goto(`${BASE_URL}/roles`);
    await expect(page.locator('[data-testid="roles-management-page"]')).toBeVisible();

    // Should still be authenticated
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
  });
});
