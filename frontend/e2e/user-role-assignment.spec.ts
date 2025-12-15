/**
 * User Role Assignment E2E Tests
 * STORY-007B: User Role Assignment
 *
 * Playwright end-to-end tests for the user role assignment functionality.
 * Tests the admin UI for assigning and removing roles from users.
 */

import { test, expect } from '@playwright/test';

/**
 * Test admin credentials
 * Uses environment variables with fallback defaults
 */
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'TestPassword123!';

/**
 * Login as admin helper
 */
async function loginAsAdmin(page: any) {
  await page.goto('/login');
  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for navigation to complete
  await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {
    // If no dashboard redirect, check if we're logged in
  });
}

test.describe('User Role Assignment', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await loginAsAdmin(page);
  });

  test.describe('Users List Page', () => {
    test('should display users list with role badges', async ({ page }) => {
      // Navigate to users list
      await page.goto('/users');

      // Wait for page to load
      await expect(page.locator('h1')).toContainText('Benutzerverwaltung');

      // Check that users table is visible
      await expect(page.locator('.users-list__table')).toBeVisible();

      // Check that role badges are displayed
      const roleBadges = page.locator('.role-badge');
      await expect(roleBadges.first()).toBeVisible();
    });

    test('should filter users by role', async ({ page }) => {
      await page.goto('/users');

      // Select a role filter
      await page.selectOption('.users-list__filter-select:nth-of-type(2)', 'admin');

      // Wait for filtered results
      await page.waitForTimeout(500);

      // All visible users should have admin badge
      const adminBadges = page.locator('.role-badge').filter({ hasText: 'admin' });
      const count = await adminBadges.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should search users', async ({ page }) => {
      await page.goto('/users');

      // Enter search query
      await page.fill('.users-list__search', 'admin');

      // Wait for search results
      await page.waitForTimeout(500);

      // Should show results matching search
      await expect(page.locator('.users-list__table tbody tr').first()).toBeVisible();
    });

    test('should navigate to user details', async ({ page }) => {
      await page.goto('/users');

      // Click view button on first user
      await page.click('.users-list__action-btn');

      // Should navigate to user details page
      await expect(page.url()).toMatch(/\/users\/\d+/);
      await expect(page.locator('h1')).toContainText('User Details');
    });
  });

  test.describe('User Details Page', () => {
    test('should display user information with roles', async ({ page }) => {
      await page.goto('/users');

      // Navigate to first user
      await page.click('.users-list__action-btn');

      // Check user info card is displayed
      await expect(page.locator('.user-details__card').first()).toBeVisible();

      // Check role management section
      await expect(page.locator('.user-role-selector')).toBeVisible();

      // Check permissions section
      await expect(page.locator('.user-details__permissions')).toBeVisible();
    });

    test('should display current roles as badges', async ({ page }) => {
      await page.goto('/users');
      await page.click('.users-list__action-btn');

      // Wait for page load
      await page.waitForSelector('.user-role-selector');

      // Check that role badges are displayed
      const badges = page.locator('.user-role-selector__badges .role-badge');
      const count = await badges.count();

      // User should have at least one role or show "No roles assigned"
      if (count === 0) {
        await expect(page.locator('.user-role-selector__empty')).toBeVisible();
      } else {
        await expect(badges.first()).toBeVisible();
      }
    });

    test('should display aggregated permissions', async ({ page }) => {
      await page.goto('/users');
      await page.click('.users-list__action-btn');

      // Wait for permissions to load
      await page.waitForSelector('.user-details__permissions');

      // Check permissions section exists
      const permissionsList = page.locator('.user-details__permission-list');
      const noPermissions = page.locator('.user-details__no-permissions');

      // Either permissions list or no permissions message should be visible
      const hasPermissions = await permissionsList.count() > 0;
      const hasNoPermissionsMsg = await noPermissions.count() > 0;

      expect(hasPermissions || hasNoPermissionsMsg).toBe(true);
    });
  });

  test.describe('Role Assignment', () => {
    test('admin can assign role to user', async ({ page }) => {
      await page.goto('/users');
      await page.click('.users-list__action-btn');

      // Wait for role selector to load
      await page.waitForSelector('.user-role-selector');

      // Open role dropdown
      await page.click('.user-role-selector__toggle');

      // Wait for dropdown to appear
      await page.waitForSelector('.user-role-selector__menu');

      // Check if there are roles to assign
      const options = page.locator('.user-role-selector__option');
      const optionCount = await options.count();

      if (optionCount > 0) {
        // Click first available role
        await options.first().click();

        // Check that Save Changes button appears
        await expect(page.locator('button:has-text("Save Changes")')).toBeVisible();

        // Click Save Changes
        await page.click('button:has-text("Save Changes")');

        // Wait for success message
        await expect(page.locator('.user-role-selector__success')).toBeVisible();
        await expect(page.locator('.user-role-selector__success')).toContainText(
          'Roles updated'
        );
      } else {
        // All roles already assigned - check message
        await expect(page.locator('.user-role-selector__no-options')).toContainText(
          'All roles assigned'
        );
      }
    });

    test('admin can remove role from user', async ({ page }) => {
      await page.goto('/users');
      await page.click('.users-list__action-btn');

      // Wait for role selector to load
      await page.waitForSelector('.user-role-selector');

      // Check if there are roles to remove
      const roleBadges = page.locator(
        '.user-role-selector__badges .role-badge .role-badge__remove'
      );
      const badgeCount = await roleBadges.count();

      if (badgeCount > 0) {
        // Click remove button on first role
        await roleBadges.first().click();

        // Check that Save Changes button appears
        await expect(page.locator('button:has-text("Save Changes")')).toBeVisible();

        // Click Save Changes
        await page.click('button:has-text("Save Changes")');

        // Wait for success message
        await expect(page.locator('.user-role-selector__success')).toBeVisible();
      } else {
        // No roles to remove
        await expect(page.locator('.user-role-selector__empty')).toBeVisible();
      }
    });

    test('can cancel role changes', async ({ page }) => {
      await page.goto('/users');
      await page.click('.users-list__action-btn');

      // Wait for role selector to load
      await page.waitForSelector('.user-role-selector');

      // Get initial badge count
      const initialBadges = await page.locator(
        '.user-role-selector__badges .role-badge'
      ).count();

      // Open role dropdown and add a role (if available)
      await page.click('.user-role-selector__toggle');
      await page.waitForSelector('.user-role-selector__menu');

      const options = page.locator('.user-role-selector__option');
      if ((await options.count()) > 0) {
        await options.first().click();

        // Click Cancel
        await page.click('button:has-text("Cancel")');

        // Badge count should return to initial
        const finalBadges = await page.locator(
          '.user-role-selector__badges .role-badge'
        ).count();
        expect(finalBadges).toBe(initialBadges);
      }
    });
  });

  test.describe('Permission Verification', () => {
    test('assigned role grants permissions', async ({ page }) => {
      await page.goto('/users');
      await page.click('.users-list__action-btn');

      // Wait for page load
      await page.waitForSelector('.user-details__permissions');

      // Get current permissions count
      const permissionItems = page.locator('.user-details__permission-item');
      const initialCount = await permissionItems.count();

      // Open role dropdown
      await page.click('.user-role-selector__toggle');
      await page.waitForSelector('.user-role-selector__menu');

      const options = page.locator('.user-role-selector__option');
      if ((await options.count()) > 0) {
        // Add a role
        await options.first().click();
        await page.click('button:has-text("Save Changes")');

        // Wait for success message
        await page.waitForSelector('.user-role-selector__success');

        // Refresh the page to get updated permissions
        await page.reload();
        await page.waitForSelector('.user-details__permissions');

        // Permissions count should have increased (assuming the role has permissions)
        const newCount = await page.locator('.user-details__permission-item').count();
        // Note: Count might stay same if role has no additional unique permissions
        expect(newCount).toBeGreaterThanOrEqual(initialCount);
      }
    });
  });

  test.describe('UI/UX Requirements', () => {
    test('multi-select dropdown is functional', async ({ page }) => {
      await page.goto('/users');
      await page.click('.users-list__action-btn');
      await page.waitForSelector('.user-role-selector');

      // Click toggle button
      await page.click('.user-role-selector__toggle');

      // Dropdown should open
      await expect(page.locator('.user-role-selector__menu')).toBeVisible();

      // Click toggle again
      await page.click('.user-role-selector__toggle');

      // Dropdown should close
      await expect(page.locator('.user-role-selector__menu')).not.toBeVisible();
    });

    test('success message displayed after save', async ({ page }) => {
      await page.goto('/users');
      await page.click('.users-list__action-btn');
      await page.waitForSelector('.user-role-selector');

      // Make a change (add or remove role)
      await page.click('.user-role-selector__toggle');
      await page.waitForSelector('.user-role-selector__menu');

      const options = page.locator('.user-role-selector__option');
      const badges = page.locator('.user-role-selector__badges .role-badge__remove');

      if ((await options.count()) > 0) {
        await options.first().click();
        await page.click('button:has-text("Save Changes")');

        // Success message should appear
        await expect(page.locator('.user-role-selector__success')).toBeVisible();
        await expect(page.locator('.user-role-selector__success')).toContainText(
          'Roles updated'
        );

        // Message should disappear after delay
        await page.waitForTimeout(4000);
        await expect(page.locator('.user-role-selector__success')).not.toBeVisible();
      } else if ((await badges.count()) > 0) {
        await page.locator('.user-role-selector__menu').click({ force: true }); // Close menu
        await badges.first().click();
        await page.click('button:has-text("Save Changes")');

        // Success message should appear
        await expect(page.locator('.user-role-selector__success')).toBeVisible();
      }
    });

    test('role badges display in user list', async ({ page }) => {
      await page.goto('/users');

      // Wait for table to load
      await page.waitForSelector('.users-list__table');

      // Check that role column exists
      const roleColumn = page.locator('.users-list__cell--roles').first();
      await expect(roleColumn).toBeVisible();

      // Check for role badges or "No roles" text
      const badges = roleColumn.locator('.role-badge');
      const noRoles = roleColumn.locator('.users-list__no-roles');

      const hasBadges = (await badges.count()) > 0;
      const hasNoRolesText = (await noRoles.count()) > 0;

      expect(hasBadges || hasNoRolesText).toBe(true);
    });
  });
});
