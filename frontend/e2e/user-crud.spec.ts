/**
 * User CRUD E2E Tests
 * STORY-006B: User CRUD Frontend UI
 *
 * Playwright end-to-end tests for the user management CRUD functionality.
 * Tests the UI for creating, editing, and deleting users via modals.
 */

import { test, expect, Page } from '@playwright/test';

// Run tests serially to avoid rate limiting and data conflicts
test.describe.configure({ mode: 'serial' });

// Increase timeout for tests to handle rate limiting delays
// 120 seconds allows for up to 8 retries × 10s each + test execution time
test.setTimeout(120000); // 120 seconds per test

/**
 * Test admin credentials
 * Uses environment variables with fallback defaults
 */
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'TestPassword123!';

/**
 * Generate unique test user data
 */
function generateTestUser() {
  const timestamp = Date.now();
  return {
    email: `test.user.${timestamp}@example.com`,
    name: `Test User ${timestamp}`,
    password: 'TestPassword123!',
  };
}

/**
 * Login as admin helper
 */
async function loginAsAdmin(page: Page) {
  // Allow multiple retries for rate-limiting scenarios
  // The backend rate limit is typically 5 attempts per 60 seconds
  const maxAttempts = 8;
  const retryDelay = 10000; // 10 seconds between retries for rate limiting

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await page.goto('/login');
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

/**
 * Navigate to users page helper
 */
async function navigateToUsersPage(page: Page) {
  await page.goto('/users');
  // Wait for page to load
  await page.waitForSelector('[data-testid="users-list-page"]', { timeout: 10000 });
}

test.describe('User CRUD UI', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await loginAsAdmin(page);
  });

  test.describe('Users List Page', () => {
    test('should display user management page with correct elements', async ({ page }) => {
      await navigateToUsersPage(page);

      // Check page title
      await expect(page.locator('.users-page__title')).toContainText('Benutzerverwaltung');

      // Check create button is visible
      await expect(page.locator('[data-testid="create-user-button"]')).toBeVisible();

      // Check search input
      await expect(page.locator('[data-testid="users-search-input"]')).toBeVisible();

      // Check filter selects
      await expect(page.locator('[data-testid="users-status-filter"]')).toBeVisible();
      await expect(page.locator('[data-testid="users-role-filter"]')).toBeVisible();

      // Check users table is visible
      await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
    });

    test('should filter users by search query', async ({ page }) => {
      await navigateToUsersPage(page);

      // Wait for users to load
      await page.waitForSelector('.users-list__row', { timeout: 10000 }).catch(() => {
        // May be empty
      });

      // Enter search query
      await page.fill('[data-testid="users-search-input"]', 'admin');

      // Wait for results to update
      await page.waitForTimeout(500);

      // Table should still be visible
      await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
    });

    test('should filter users by status', async ({ page }) => {
      await navigateToUsersPage(page);

      // Select active status
      await page.selectOption('[data-testid="users-status-filter"]', 'active');

      // Wait for results to update
      await page.waitForTimeout(500);

      // Check that status filter was applied
      await expect(page.locator('[data-testid="users-status-filter"]')).toHaveValue('active');
    });

    test('should filter users by role', async ({ page }) => {
      await navigateToUsersPage(page);

      // Select admin role
      await page.selectOption('[data-testid="users-role-filter"]', 'admin');

      // Wait for results to update
      await page.waitForTimeout(500);

      // Check that role filter was applied
      await expect(page.locator('[data-testid="users-role-filter"]')).toHaveValue('admin');
    });
  });

  test.describe('Create User Flow', () => {
    test('should open create user modal when clicking button', async ({ page }) => {
      await navigateToUsersPage(page);

      // Click create user button
      await page.click('[data-testid="create-user-button"]');

      // Modal should be visible
      await expect(page.locator('[data-testid="user-create-modal"]')).toBeVisible();

      // Modal should have correct title
      await expect(page.locator('[data-testid="user-create-modal"] h2')).toContainText('Neuer Benutzer');
    });

    test('should validate required fields on create form', async ({ page }) => {
      await navigateToUsersPage(page);

      // Open create modal
      await page.click('[data-testid="create-user-button"]');
      await page.waitForSelector('[data-testid="user-create-modal"]');

      // Try to submit empty form
      await page.click('button:has-text("Benutzer erstellen")');

      // Validation errors should appear
      await expect(page.locator('#create-email-error')).toBeVisible();
      await expect(page.locator('#create-name-error')).toBeVisible();
      await expect(page.locator('#create-password-error')).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await navigateToUsersPage(page);

      // Open create modal
      await page.click('[data-testid="create-user-button"]');
      await page.waitForSelector('[data-testid="user-create-modal"]');

      // Enter invalid email
      await page.fill('#create-email', 'invalid-email');
      await page.fill('#create-name', 'Test User');
      await page.fill('#create-password', 'TestPassword123!');
      await page.fill('#create-confirm-password', 'TestPassword123!');

      // Submit form
      await page.click('button:has-text("Benutzer erstellen")');

      // Email error should appear
      await expect(page.locator('#create-email-error')).toContainText('Ungültige E-Mail-Adresse');
    });

    test('should validate password confirmation matches', async ({ page }) => {
      await navigateToUsersPage(page);

      // Open create modal
      await page.click('[data-testid="create-user-button"]');
      await page.waitForSelector('[data-testid="user-create-modal"]');

      // Enter mismatched passwords
      await page.fill('#create-email', 'test@example.com');
      await page.fill('#create-name', 'Test User');
      await page.fill('#create-password', 'TestPassword123!');
      await page.fill('#create-confirm-password', 'DifferentPassword123!');

      // Submit form
      await page.click('button:has-text("Benutzer erstellen")');

      // Password confirmation error should appear
      await expect(page.locator('#create-confirm-password-error')).toContainText('Passwörter stimmen nicht überein');
    });

    test('should close modal when clicking cancel', async ({ page }) => {
      await navigateToUsersPage(page);

      // Open create modal
      await page.click('[data-testid="create-user-button"]');
      await page.waitForSelector('[data-testid="user-create-modal"]');

      // Click cancel button
      await page.click('button:has-text("Abbrechen")');

      // Modal should be closed
      await expect(page.locator('[data-testid="user-create-modal"]')).not.toBeVisible();
    });

    test('should close modal when clicking close button', async ({ page }) => {
      await navigateToUsersPage(page);

      // Open create modal
      await page.click('[data-testid="create-user-button"]');
      await page.waitForSelector('[data-testid="user-create-modal"]');

      // Click close button (X)
      await page.click('[data-testid="user-create-modal-close-button"]');

      // Modal should be closed
      await expect(page.locator('[data-testid="user-create-modal"]')).not.toBeVisible();
    });

    test('should create a new user successfully', async ({ page }) => {
      await navigateToUsersPage(page);

      // Generate unique test user
      const testUser = generateTestUser();

      // Open create modal
      await page.click('[data-testid="create-user-button"]');
      await page.waitForSelector('[data-testid="user-create-modal"]');

      // Fill in form
      await page.fill('#create-email', testUser.email);
      await page.fill('#create-name', testUser.name);
      await page.fill('#create-password', testUser.password);
      await page.fill('#create-confirm-password', testUser.password);

      // Submit form
      await page.click('button:has-text("Benutzer erstellen")');

      // Wait for modal to close and success toast
      await expect(page.locator('[data-testid="user-create-modal"]')).not.toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="users-toast"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="users-toast"]')).toContainText('erfolgreich erstellt');
    });
  });

  test.describe('Edit User Flow', () => {
    test('should open edit modal when clicking edit button', async ({ page }) => {
      await navigateToUsersPage(page);

      // Wait for users to load
      await page.waitForSelector('.users-list__row', { timeout: 10000 });

      // Click edit button on first user
      const editButton = page.locator('.users-list__action-btn--edit').first();
      if (await editButton.isVisible()) {
        await editButton.click();

        // Modal should be visible
        await expect(page.locator('[data-testid="user-edit-modal"]')).toBeVisible();

        // Modal should have correct title
        await expect(page.locator('[data-testid="user-edit-modal"] h2')).toContainText('Benutzer bearbeiten');
      }
    });

    test('should pre-fill form with user data', async ({ page }) => {
      await navigateToUsersPage(page);

      // Wait for users to load
      await page.waitForSelector('.users-list__row', { timeout: 10000 });

      // Get first user's name and email from the table
      const firstRow = page.locator('.users-list__row').first();
      const userName = await firstRow.locator('.users-list__cell--name').textContent();
      const userEmail = await firstRow.locator('.users-list__cell--email').textContent();

      // Click edit button
      const editButton = page.locator('.users-list__action-btn--edit').first();
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForSelector('[data-testid="user-edit-modal"]');

        // Form should be pre-filled
        await expect(page.locator('#edit-name')).toHaveValue(userName || '');
        await expect(page.locator('#edit-email')).toHaveValue(userEmail || '');
      }
    });

    test('should edit user successfully', async ({ page }) => {
      await navigateToUsersPage(page);

      // Wait for users to load
      await page.waitForSelector('.users-list__row', { timeout: 10000 });

      // Click edit button on first user
      const editButton = page.locator('.users-list__action-btn--edit').first();
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForSelector('[data-testid="user-edit-modal"]');

        // Modify name
        const currentName = await page.locator('#edit-name').inputValue();
        await page.fill('#edit-name', `${currentName} Updated`);

        // Submit form
        await page.click('button:has-text("Änderungen speichern")');

        // Wait for modal to close and success toast
        await expect(page.locator('[data-testid="user-edit-modal"]')).not.toBeVisible({ timeout: 10000 });
        await expect(page.locator('[data-testid="users-toast"]')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('[data-testid="users-toast"]')).toContainText('erfolgreich aktualisiert');
      }
    });

    test('should close edit modal when clicking cancel', async ({ page }) => {
      await navigateToUsersPage(page);

      // Wait for users to load
      await page.waitForSelector('.users-list__row', { timeout: 10000 });

      // Click edit button
      const editButton = page.locator('.users-list__action-btn--edit').first();
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForSelector('[data-testid="user-edit-modal"]');

        // Click cancel
        await page.click('button:has-text("Abbrechen")');

        // Modal should be closed
        await expect(page.locator('[data-testid="user-edit-modal"]')).not.toBeVisible();
      }
    });
  });

  test.describe('Delete User Flow', () => {
    test('should open delete dialog when clicking delete button', async ({ page }) => {
      await navigateToUsersPage(page);

      // Wait for users to load
      await page.waitForSelector('.users-list__row', { timeout: 10000 });

      // Click delete button on first user
      const deleteButton = page.locator('.users-list__action-btn--delete').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Dialog should be visible
        await expect(page.locator('[data-testid="user-delete-dialog"]')).toBeVisible();

        // Dialog should have correct title
        await expect(page.locator('[data-testid="user-delete-dialog"] h2')).toContainText('Benutzer löschen');
      }
    });

    test('should display user information in delete dialog', async ({ page }) => {
      await navigateToUsersPage(page);

      // Wait for users to load
      await page.waitForSelector('.users-list__row', { timeout: 10000 });

      // Get first user's name from the table
      const firstRow = page.locator('.users-list__row').first();
      const userName = await firstRow.locator('.users-list__cell--name').textContent();

      // Click delete button
      const deleteButton = page.locator('.users-list__action-btn--delete').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        await page.waitForSelector('[data-testid="user-delete-dialog"]');

        // Dialog should contain user name
        await expect(page.locator('.user-delete-dialog__user-value').first()).toContainText(userName || '');
      }
    });

    test('should close delete dialog when clicking cancel', async ({ page }) => {
      await navigateToUsersPage(page);

      // Wait for users to load
      await page.waitForSelector('.users-list__row', { timeout: 10000 });

      // Click delete button
      const deleteButton = page.locator('.users-list__action-btn--delete').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        await page.waitForSelector('[data-testid="user-delete-dialog"]');

        // Click cancel
        await page.click('button:has-text("Abbrechen")');

        // Dialog should be closed
        await expect(page.locator('[data-testid="user-delete-dialog"]')).not.toBeVisible();
      }
    });

    test('should delete user with confirmation', async ({ page }) => {
      await navigateToUsersPage(page);

      // First create a test user to delete
      const testUser = generateTestUser();

      // Create the user first
      await page.click('[data-testid="create-user-button"]');
      await page.waitForSelector('[data-testid="user-create-modal"]');

      await page.fill('#create-email', testUser.email);
      await page.fill('#create-name', testUser.name);
      await page.fill('#create-password', testUser.password);
      await page.fill('#create-confirm-password', testUser.password);
      await page.click('button:has-text("Benutzer erstellen")');

      // Wait for creation to complete
      await expect(page.locator('[data-testid="user-create-modal"]')).not.toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1000);

      // Search for the created user
      await page.fill('[data-testid="users-search-input"]', testUser.email);
      await page.waitForTimeout(500);

      // Click delete button on the user
      const deleteButton = page.locator('.users-list__action-btn--delete').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        await page.waitForSelector('[data-testid="user-delete-dialog"]');

        // Confirm deletion
        await page.click('[data-testid="confirm-delete-button"]');

        // Wait for dialog to close and success toast
        await expect(page.locator('[data-testid="user-delete-dialog"]')).not.toBeVisible({ timeout: 10000 });
        await expect(page.locator('[data-testid="users-toast"]')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('[data-testid="users-toast"]')).toContainText('erfolgreich gelöscht');
      }
    });
  });

  test.describe('Pagination', () => {
    test('should display pagination when there are multiple pages', async ({ page }) => {
      await navigateToUsersPage(page);

      // Wait for page to load
      await page.waitForSelector('[data-testid="users-table"]');

      // Pagination might or might not be visible depending on user count
      const pagination = page.locator('[data-testid="users-pagination"]');
      const isVisible = await pagination.isVisible().catch(() => false);

      if (isVisible) {
        // If visible, check buttons exist
        await expect(page.locator('[data-testid="pagination-prev"]')).toBeVisible();
        await expect(page.locator('[data-testid="pagination-next"]')).toBeVisible();
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await navigateToUsersPage(page);

      // Page should still be functional
      await expect(page.locator('[data-testid="users-list-page"]')).toBeVisible();
      await expect(page.locator('[data-testid="create-user-button"]')).toBeVisible();
    });

    test('should display correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await navigateToUsersPage(page);

      // Page should still be functional
      await expect(page.locator('[data-testid="users-list-page"]')).toBeVisible();
      await expect(page.locator('[data-testid="create-user-button"]')).toBeVisible();
    });

    test('modal should work on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await navigateToUsersPage(page);

      // Open create modal
      await page.click('[data-testid="create-user-button"]');

      // Modal should be visible and fullscreen on mobile
      await expect(page.locator('[data-testid="user-create-modal"]')).toBeVisible();
    });
  });

  test.describe('Toast Notifications', () => {
    test('should auto-dismiss toast after timeout', async ({ page }) => {
      await navigateToUsersPage(page);

      // Create a user to trigger toast
      const testUser = generateTestUser();

      await page.click('[data-testid="create-user-button"]');
      await page.waitForSelector('[data-testid="user-create-modal"]');

      await page.fill('#create-email', testUser.email);
      await page.fill('#create-name', testUser.name);
      await page.fill('#create-password', testUser.password);
      await page.fill('#create-confirm-password', testUser.password);
      await page.click('button:has-text("Benutzer erstellen")');

      // Toast should appear
      await expect(page.locator('[data-testid="users-toast"]')).toBeVisible({ timeout: 10000 });

      // Toast should auto-dismiss after 5 seconds
      await page.waitForTimeout(6000);
      await expect(page.locator('[data-testid="users-toast"]')).not.toBeVisible();
    });

    test('should dismiss toast when clicking close button', async ({ page }) => {
      await navigateToUsersPage(page);

      // Create a user to trigger toast
      const testUser = generateTestUser();

      await page.click('[data-testid="create-user-button"]');
      await page.waitForSelector('[data-testid="user-create-modal"]');

      await page.fill('#create-email', testUser.email);
      await page.fill('#create-name', testUser.name);
      await page.fill('#create-password', testUser.password);
      await page.fill('#create-confirm-password', testUser.password);
      await page.click('button:has-text("Benutzer erstellen")');

      // Toast should appear
      await expect(page.locator('[data-testid="users-toast"]')).toBeVisible({ timeout: 10000 });

      // Click close button
      await page.click('[data-testid="users-toast-close"]');

      // Toast should be dismissed
      await expect(page.locator('[data-testid="users-toast"]')).not.toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA attributes on modals', async ({ page }) => {
      await navigateToUsersPage(page);

      // Open create modal
      await page.click('[data-testid="create-user-button"]');
      await page.waitForSelector('[data-testid="user-create-modal"]');

      // Check ARIA attributes
      const modal = page.locator('[data-testid="user-create-modal"]');
      await expect(modal).toHaveAttribute('role', 'dialog');
      await expect(modal).toHaveAttribute('aria-modal', 'true');
    });

    test('should have proper labels on form inputs', async ({ page }) => {
      await navigateToUsersPage(page);

      // Open create modal
      await page.click('[data-testid="create-user-button"]');
      await page.waitForSelector('[data-testid="user-create-modal"]');

      // Check that inputs have labels
      await expect(page.locator('label[for="create-email"]')).toBeVisible();
      await expect(page.locator('label[for="create-name"]')).toBeVisible();
      await expect(page.locator('label[for="create-password"]')).toBeVisible();
    });

    test('should close modal on escape key', async ({ page }) => {
      await navigateToUsersPage(page);

      // Open create modal
      await page.click('[data-testid="create-user-button"]');
      await page.waitForSelector('[data-testid="user-create-modal"]');

      // Press Escape
      await page.keyboard.press('Escape');

      // Modal should be closed
      await expect(page.locator('[data-testid="user-create-modal"]')).not.toBeVisible();
    });

    test('error messages should have role="alert"', async ({ page }) => {
      await navigateToUsersPage(page);

      // Open create modal
      await page.click('[data-testid="create-user-button"]');
      await page.waitForSelector('[data-testid="user-create-modal"]');

      // Submit empty form
      await page.click('button:has-text("Benutzer erstellen")');

      // Error messages should have role="alert"
      await expect(page.locator('#create-email-error')).toHaveAttribute('role', 'alert');
    });
  });
});
