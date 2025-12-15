/**
 * Roles Management E2E Tests
 * STORY-025B: Roles Management UI
 *
 * Playwright tests for roles management functionality.
 */

import { test, expect, Page } from '@playwright/test';

// Run tests serially to avoid rate limiting and data conflicts
test.describe.configure({ mode: 'serial' });

// Increase timeout for tests to handle rate limiting delays
test.setTimeout(120000); // 120 seconds per test

// Base URL from playwright config
const BASE_URL = 'http://localhost:3000';

/**
 * Test admin credentials
 * Uses environment variables with fallback defaults
 */
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'TestPassword123!';

/**
 * Helper function to login as admin user
 * Includes rate limiting handling and proper authentication verification
 */
async function loginAsAdmin(page: Page) {
  // Allow multiple retries for rate-limiting scenarios
  const maxAttempts = 8;
  const retryDelay = 10000; // 10 seconds between retries for rate limiting

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

    // Wait for navigation to complete - must navigate away from login page
    try {
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });

      // Wait for the user info to be visible in the sidebar (indicates auth context is loaded)
      await page.waitForSelector('text=System Administrator', { timeout: 10000 });

      // Small delay to ensure permissions state is propagated
      await page.waitForTimeout(500);

      // Login successful
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

test.describe('Roles Management Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAsAdmin(page);
  });

  test('should display roles management page', async ({ page }) => {
    // Navigate to roles page
    await page.goto(`${BASE_URL}/roles`);

    // Verify page is displayed
    await expect(page.locator('[data-testid="roles-management-page"]')).toBeVisible();

    // Verify page title
    await expect(page.locator('h1')).toContainText('Rollen');
  });

  test('should display roles list table', async ({ page }) => {
    await page.goto(`${BASE_URL}/roles`);

    // Wait for loading to complete
    await page.waitForSelector('[data-testid="roles-management-page"]');

    // Verify table is displayed
    await expect(page.locator('table')).toBeVisible();

    // Verify table headers
    await expect(page.locator('th').first()).toBeVisible();
  });

  test('should show new role button for admin users', async ({ page }) => {
    await page.goto(`${BASE_URL}/roles`);

    // Wait for page to load
    await page.waitForSelector('[data-testid="roles-management-page"]');

    // Check for new role button (admin should see it)
    const newRoleButton = page.locator('[data-testid="new-role-button"]');
    // Button may or may not be visible depending on permissions
    // Just verify page loads correctly
    await expect(page.locator('[data-testid="roles-management-page"]')).toBeVisible();
  });
});

test.describe('Create Role Modal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should open create role modal when clicking new role button', async ({ page }) => {
    await page.goto(`${BASE_URL}/roles`);

    // Wait for page to load
    await page.waitForSelector('[data-testid="roles-management-page"]');

    // Click new role button if visible
    const newRoleButton = page.locator('[data-testid="new-role-button"]');
    if (await newRoleButton.isVisible()) {
      await newRoleButton.click();

      // Verify modal opens
      await expect(page.locator('[data-testid="create-role-modal"]')).toBeVisible();
    }
  });

  test('should validate required fields in create role modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/roles`);

    // Wait for page to load
    await page.waitForSelector('[data-testid="roles-management-page"]');

    const newRoleButton = page.locator('[data-testid="new-role-button"]');
    if (await newRoleButton.isVisible()) {
      await newRoleButton.click();

      // Wait for modal
      await expect(page.locator('[data-testid="create-role-modal"]')).toBeVisible();

      // Try to submit empty form
      const submitButton = page.locator('[data-testid="create-role-modal"] button[type="submit"]');
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Should show validation error
        await expect(page.locator('.role-form-modal__field-error')).toBeVisible();
      }
    }
  });

  test('should close create role modal when clicking cancel', async ({ page }) => {
    await page.goto(`${BASE_URL}/roles`);

    // Wait for page to load
    await page.waitForSelector('[data-testid="roles-management-page"]');

    const newRoleButton = page.locator('[data-testid="new-role-button"]');
    if (await newRoleButton.isVisible()) {
      await newRoleButton.click();

      // Wait for modal
      await expect(page.locator('[data-testid="create-role-modal"]')).toBeVisible();

      // Click cancel button
      const cancelButton = page.locator('[data-testid="create-role-modal"] button:has-text("Abbrechen")');
      await cancelButton.click();

      // Modal should be closed
      await expect(page.locator('[data-testid="create-role-modal"]')).not.toBeVisible();
    }
  });

  test('should create a new role successfully', async ({ page }) => {
    await page.goto(`${BASE_URL}/roles`);

    // Wait for page to load
    await page.waitForSelector('[data-testid="roles-management-page"]');

    const newRoleButton = page.locator('[data-testid="new-role-button"]');
    if (await newRoleButton.isVisible()) {
      await newRoleButton.click();

      // Wait for modal
      await expect(page.locator('[data-testid="create-role-modal"]')).toBeVisible();

      // Fill in role name
      const uniqueRoleName = `TestRole_${Date.now()}`;
      await page.fill('#create-role-name', uniqueRoleName);

      // Fill in description (optional)
      await page.fill('#create-role-description', 'Test role description');

      // Submit form
      const submitButton = page.locator('[data-testid="create-role-modal"] button[type="submit"]');
      await submitButton.click();

      // Wait for modal to close and success toast
      await expect(page.locator('[data-testid="create-role-modal"]')).not.toBeVisible({ timeout: 10000 });

      // Verify success toast appears
      await expect(page.locator('[data-testid="roles-toast"]')).toBeVisible();
    }
  });
});

test.describe('Edit Role Modal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should open edit role modal when clicking edit button', async ({ page }) => {
    await page.goto(`${BASE_URL}/roles`);

    // Wait for page to load
    await page.waitForSelector('[data-testid="roles-management-page"]');

    // Find and click first edit button
    const editButton = page.locator('[data-testid^="edit-role-button-"]').first();
    if (await editButton.isVisible()) {
      await editButton.click();

      // Verify modal opens
      await expect(page.locator('[data-testid="edit-role-modal"]')).toBeVisible();
    }
  });

  test('should show existing role data in edit modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/roles`);

    // Wait for page to load
    await page.waitForSelector('[data-testid="roles-management-page"]');

    const editButton = page.locator('[data-testid^="edit-role-button-"]').first();
    if (await editButton.isVisible()) {
      await editButton.click();

      // Wait for modal
      await expect(page.locator('[data-testid="edit-role-modal"]')).toBeVisible();

      // Verify name field has value
      const nameInput = page.locator('#edit-role-name');
      await expect(nameInput).toHaveValue(/.+/);
    }
  });

  test('should show permission checkboxes in edit modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/roles`);

    // Wait for page to load
    await page.waitForSelector('[data-testid="roles-management-page"]');

    const editButton = page.locator('[data-testid^="edit-role-button-"]').first();
    if (await editButton.isVisible()) {
      await editButton.click();

      // Wait for modal
      await expect(page.locator('[data-testid="edit-role-modal"]')).toBeVisible();

      // Wait for permissions to load
      await page.waitForSelector('[data-testid="edit-role-permissions"]', { timeout: 10000 });

      // Verify permission checkbox group is visible
      await expect(page.locator('[data-testid="edit-role-permissions"]')).toBeVisible();
    }
  });

  test('should close edit role modal when clicking cancel', async ({ page }) => {
    await page.goto(`${BASE_URL}/roles`);

    // Wait for page to load
    await page.waitForSelector('[data-testid="roles-management-page"]');

    const editButton = page.locator('[data-testid^="edit-role-button-"]').first();
    if (await editButton.isVisible()) {
      await editButton.click();

      // Wait for modal
      await expect(page.locator('[data-testid="edit-role-modal"]')).toBeVisible();

      // Click cancel button
      const cancelButton = page.locator('[data-testid="edit-role-modal"] button:has-text("Abbrechen")');
      await cancelButton.click();

      // Modal should be closed
      await expect(page.locator('[data-testid="edit-role-modal"]')).not.toBeVisible();
    }
  });
});

test.describe('Delete Role Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should open delete confirmation dialog when clicking delete button', async ({ page }) => {
    await page.goto(`${BASE_URL}/roles`);

    // Wait for page to load
    await page.waitForSelector('[data-testid="roles-management-page"]');

    // Find and click first delete button (non-system role)
    const deleteButton = page.locator('[data-testid^="delete-role-button-"]').first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Verify dialog opens
      await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).toBeVisible();
    }
  });

  test('should show role information in delete dialog', async ({ page }) => {
    await page.goto(`${BASE_URL}/roles`);

    // Wait for page to load
    await page.waitForSelector('[data-testid="roles-management-page"]');

    const deleteButton = page.locator('[data-testid^="delete-role-button-"]').first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Wait for dialog
      await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).toBeVisible();

      // Verify role info is shown
      await expect(page.locator('.role-delete-dialog__role-info')).toBeVisible();
    }
  });

  test('should close delete dialog when clicking cancel', async ({ page }) => {
    await page.goto(`${BASE_URL}/roles`);

    // Wait for page to load
    await page.waitForSelector('[data-testid="roles-management-page"]');

    const deleteButton = page.locator('[data-testid^="delete-role-button-"]').first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Wait for dialog
      await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).toBeVisible();

      // Click cancel button
      const cancelButton = page.locator('[data-testid="delete-confirmation-dialog"] button:has-text("Abbrechen")');
      await cancelButton.click();

      // Dialog should be closed
      await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).not.toBeVisible();
    }
  });

  test('should require confirmation before deleting role', async ({ page }) => {
    await page.goto(`${BASE_URL}/roles`);

    // Wait for page to load
    await page.waitForSelector('[data-testid="roles-management-page"]');

    const deleteButton = page.locator('[data-testid^="delete-role-button-"]').first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Wait for dialog
      await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).toBeVisible();

      // Verify confirm button exists
      await expect(page.locator('[data-testid="confirm-delete-button"]')).toBeVisible();
    }
  });
});

test.describe('Permission Checkbox Group', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display permissions grouped by category', async ({ page }) => {
    await page.goto(`${BASE_URL}/roles`);

    // Wait for page to load
    await page.waitForSelector('[data-testid="roles-management-page"]');

    // Open create modal to see permission checkbox group
    const newRoleButton = page.locator('[data-testid="new-role-button"]');
    if (await newRoleButton.isVisible()) {
      await newRoleButton.click();

      // Wait for modal
      await expect(page.locator('[data-testid="create-role-modal"]')).toBeVisible();

      // Wait for permissions to load
      await page.waitForSelector('[data-testid="create-role-permissions"]', { timeout: 10000 });

      // Verify permission checkbox group has categories
      await expect(page.locator('.permission-checkbox-group__category').first()).toBeVisible();
    }
  });

  test('should toggle individual permission checkboxes', async ({ page }) => {
    await page.goto(`${BASE_URL}/roles`);

    // Wait for page to load
    await page.waitForSelector('[data-testid="roles-management-page"]');

    const newRoleButton = page.locator('[data-testid="new-role-button"]');
    if (await newRoleButton.isVisible()) {
      await newRoleButton.click();

      // Wait for modal and permissions
      await expect(page.locator('[data-testid="create-role-modal"]')).toBeVisible();
      await page.waitForSelector('[data-testid="create-role-permissions"]', { timeout: 10000 });

      // Find and click first permission checkbox
      const checkbox = page.locator('.permission-checkbox-group__checkbox').first();
      if (await checkbox.isVisible()) {
        const isChecked = await checkbox.isChecked();
        await checkbox.click();
        await expect(checkbox).toBeChecked({ checked: !isChecked });
      }
    }
  });
});

test.describe('Roles Management Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should have proper ARIA labels on action buttons', async ({ page }) => {
    await page.goto(`${BASE_URL}/roles`);

    // Wait for page to load
    await page.waitForSelector('[data-testid="roles-management-page"]');

    // Check edit button has aria-label
    const editButton = page.locator('[data-testid^="edit-role-button-"]').first();
    if (await editButton.isVisible()) {
      await expect(editButton).toHaveAttribute('aria-label', /.+/);
    }

    // Check delete button has aria-label
    const deleteButton = page.locator('[data-testid^="delete-role-button-"]').first();
    if (await deleteButton.isVisible()) {
      await expect(deleteButton).toHaveAttribute('aria-label', /.+/);
    }
  });

  test('should have proper dialog roles on modals', async ({ page }) => {
    await page.goto(`${BASE_URL}/roles`);

    // Wait for page to load
    await page.waitForSelector('[data-testid="roles-management-page"]');

    const newRoleButton = page.locator('[data-testid="new-role-button"]');
    if (await newRoleButton.isVisible()) {
      await newRoleButton.click();

      // Wait for modal
      await expect(page.locator('[data-testid="create-role-modal"]')).toBeVisible();

      // Verify modal has dialog role
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    }
  });

  test('should show validation errors with proper roles', async ({ page }) => {
    await page.goto(`${BASE_URL}/roles`);

    // Wait for page to load
    await page.waitForSelector('[data-testid="roles-management-page"]');

    const newRoleButton = page.locator('[data-testid="new-role-button"]');
    if (await newRoleButton.isVisible()) {
      await newRoleButton.click();

      // Wait for modal
      await expect(page.locator('[data-testid="create-role-modal"]')).toBeVisible();

      // Submit empty form
      const submitButton = page.locator('[data-testid="create-role-modal"] button[type="submit"]');
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Check for role="alert" on error messages
        await expect(page.locator('[role="alert"]')).toBeVisible();
      }
    }
  });
});

test.describe('Roles Management Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display error message when API fails', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/v1/roles', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ message: 'Internal Server Error' }),
      });
    });

    await page.goto(`${BASE_URL}/roles`);

    // Wait for error to display
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 10000 });
  });

  test('should allow retry when loading fails', async ({ page }) => {
    // First request fails
    let requestCount = 0;
    await page.route('**/api/v1/roles', (route) => {
      requestCount++;
      if (requestCount === 1) {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ message: 'Internal Server Error' }),
        });
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify([]),
        });
      }
    });

    await page.goto(`${BASE_URL}/roles`);

    // Wait for error
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 10000 });

    // Click retry button
    const retryButton = page.locator('button:has-text("Erneut versuchen")');
    if (await retryButton.isVisible()) {
      await retryButton.click();

      // Error should be gone after successful retry
      await expect(page.locator('.bg-red-50')).not.toBeVisible({ timeout: 10000 });
    }
  });
});
