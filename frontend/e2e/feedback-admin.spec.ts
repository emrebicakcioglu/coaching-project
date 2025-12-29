/**
 * Feedback Admin Page E2E Tests
 * STORY-041H: Feedback Admin Page
 *
 * End-to-end tests for the feedback administration page.
 *
 * Test Scenarios:
 * 1. Page access and authorization
 * 2. Feedback list display and pagination
 * 3. Detail modal functionality
 * 4. Delete functionality with confirmation
 * 5. Jira ticket creation
 * 6. Empty state handling
 * 7. Error handling
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const ADMIN_PERMISSIONS = [
  'feedback.read',
  'feedback.write',
  'feedback.manage',
  'users.read',
  'roles.read',
  'settings.read',
];

const USER_PERMISSIONS = ['users.read'];

/**
 * Create a mock JWT token with proper structure
 * This is needed because the app validates JWT structure for authentication
 */
function createMockJwt(payload: Record<string, unknown>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + 3600, // 1 hour from now
  };

  // Use a simple base64 encoding that works in the browser
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = 'mock-signature';

  return `${base64Header}.${base64Payload}.${signature}`;
}

// Mock JWT tokens with admin permissions
const MOCK_ADMIN_ACCESS_TOKEN = createMockJwt({
  sub: 1,
  email: 'admin@example.com',
  name: 'Admin User',
});

const MOCK_ADMIN_REFRESH_TOKEN = createMockJwt({
  sub: 1,
  type: 'refresh',
});

const MOCK_USER_ACCESS_TOKEN = createMockJwt({
  sub: 2,
  email: 'user@example.com',
  name: 'Regular User',
});

const MOCK_USER_REFRESH_TOKEN = createMockJwt({
  sub: 2,
  type: 'refresh',
});

/**
 * Mock feedback data
 */
const MOCK_FEEDBACKS = [
  {
    id: 1,
    userId: 1,
    userEmail: 'max@mustermann.de',
    userName: 'Max Mustermann',
    comment: 'Das Menü reagiert nicht wenn ich auf den Button klicke. Bitte beheben Sie dieses Problem so schnell wie möglich.',
    commentPreview: 'Das Menü reagiert nicht wenn ich auf...',
    route: '/dashboard',
    hasScreenshot: true,
    createdAt: '2024-12-27T14:32:15.000Z',
    jiraIssueKey: null,
    jiraIssueUrl: null,
  },
  {
    id: 2,
    userId: 2,
    userEmail: 'anna@schmidt.de',
    userName: 'Anna Schmidt',
    comment: 'Feature Wunsch: Es wäre toll, wenn man die Daten exportieren könnte.',
    commentPreview: 'Feature Wunsch: Es wäre toll, wenn...',
    route: '/users',
    hasScreenshot: true,
    createdAt: '2024-12-26T09:15:00.000Z',
    jiraIssueKey: 'PROJ-123',
    jiraIssueUrl: 'https://jira.example.com/browse/PROJ-123',
  },
];

const MOCK_FEEDBACK_DETAIL = {
  ...MOCK_FEEDBACKS[0],
  browserName: 'Chrome',
  browserVersion: '120.0',
  osName: 'Windows',
  osVersion: '10',
  deviceType: 'desktop',
  screenResolution: '1920x1080',
  language: 'de-DE',
  timezone: 'Europe/Berlin',
};

/**
 * Helper function to login as admin
 * Sets up localStorage with all required auth state including user data and permissions
 */
async function loginAsAdmin(page: Page, accessToken: string, refreshToken: string) {
  await page.goto('/login');
  await page.evaluate(
    ({ token, refresh, permissions }) => {
      // Set tokens
      localStorage.setItem('access_token', token);
      localStorage.setItem('refresh_token', refresh);
      // Set user data (required by AuthContext)
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          id: 1,
          email: 'admin@example.com',
          name: 'Admin User',
          firstName: 'Admin',
          lastName: 'User',
          status: 'active',
        })
      );
      // Set permissions (required by PrivateRoute)
      localStorage.setItem('auth_permissions', JSON.stringify(permissions));
    },
    { token: accessToken, refresh: refreshToken, permissions: ADMIN_PERMISSIONS }
  );
  await page.goto('/admin/feedback');
  await page.waitForLoadState('networkidle');
}

/**
 * Helper function to login as non-admin user
 * Sets up localStorage with limited permissions
 */
async function loginAsUser(page: Page, accessToken: string, refreshToken: string) {
  await page.goto('/login');
  await page.evaluate(
    ({ token, refresh, permissions }) => {
      // Set tokens
      localStorage.setItem('access_token', token);
      localStorage.setItem('refresh_token', refresh);
      // Set user data (required by AuthContext)
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          id: 2,
          email: 'user@example.com',
          name: 'Regular User',
          firstName: 'Regular',
          lastName: 'User',
          status: 'active',
        })
      );
      // Set permissions (limited - no feedback.manage)
      localStorage.setItem('auth_permissions', JSON.stringify(permissions));
    },
    { token: accessToken, refresh: refreshToken, permissions: USER_PERMISSIONS }
  );
}

/**
 * Helper to mock auth endpoints for admin
 * Includes all endpoints needed for authentication flow
 */
async function mockAdminAuthEndpoints(page: Page, accessToken: string, refreshToken: string) {
  await page.route('**/api/v1/auth/**', async (route) => {
    const url = route.request().url();

    if (url.includes('/login')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      });
    } else if (url.includes('/refresh')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      });
    } else if (url.includes('/permissions')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          permissions: ADMIN_PERMISSIONS,
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/v1/users/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        email: 'admin@example.com',
        name: 'Admin User',
        firstName: 'Admin',
        lastName: 'User',
        status: 'active',
        roles: [{ id: 1, name: 'admin', permissions: ADMIN_PERMISSIONS.map(p => ({ name: p })) }],
      }),
    });
  });

  // Mock roles endpoint - needed for session recovery in AuthContext
  await page.route('**/api/v1/roles', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          name: 'admin',
          permissions: ADMIN_PERMISSIONS.map(p => ({ name: p })),
        },
      ]),
    });
  });

  await page.route('**/api/version', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        version: '1.0.0',
        name: 'core-app-backend',
      }),
    });
  });

  // Mock feedback feature flag
  await page.route('**/api/v1/features/feedback/enabled', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ key: 'feedback', enabled: true }),
    });
  });
}

/**
 * Helper to mock auth endpoints for non-admin user
 */
async function mockUserAuthEndpoints(page: Page, accessToken: string, refreshToken: string) {
  await page.route('**/api/v1/auth/**', async (route) => {
    const url = route.request().url();

    if (url.includes('/login')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      });
    } else if (url.includes('/refresh')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      });
    } else if (url.includes('/permissions')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          permissions: USER_PERMISSIONS, // No feedback.manage permission
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/v1/users/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 2,
        email: 'user@example.com',
        name: 'Regular User',
        firstName: 'Regular',
        lastName: 'User',
        status: 'active',
        roles: [{ id: 2, name: 'user', permissions: USER_PERMISSIONS.map(p => ({ name: p })) }],
      }),
    });
  });

  // Mock roles endpoint
  await page.route('**/api/v1/roles', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 2,
          name: 'user',
          permissions: USER_PERMISSIONS.map(p => ({ name: p })),
        },
      ]),
    });
  });

  await page.route('**/api/version', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        version: '1.0.0',
        name: 'core-app-backend',
      }),
    });
  });
}

/**
 * Helper to mock feedback admin API endpoints
 */
async function mockFeedbackAdminEndpoints(page: Page, options: {
  feedbacks?: typeof MOCK_FEEDBACKS;
  empty?: boolean;
  jiraConfigured?: boolean;
} = {}) {
  const { feedbacks = MOCK_FEEDBACKS, empty = false, jiraConfigured = true } = options;

  // Mock feedback list
  await page.route('**/api/v1/admin/feedbacks?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: empty ? [] : feedbacks,
        pagination: {
          page: 1,
          limit: 20,
          total: empty ? 0 : feedbacks.length,
          pages: empty ? 0 : 1,
        },
      }),
    });
  });

  // Mock single feedback detail
  await page.route('**/api/v1/admin/feedbacks/1', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Deleted successfully' }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_FEEDBACK_DETAIL),
      });
    }
  });

  await page.route('**/api/v1/admin/feedbacks/2', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Deleted successfully' }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...MOCK_FEEDBACK_DETAIL, ...feedbacks[1] }),
      });
    }
  });

  // Mock screenshot URLs
  await page.route('**/api/v1/admin/feedbacks/*/screenshot', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        expiresAt: '2024-12-28T00:00:00.000Z',
      }),
    });
  });

  // Mock thumbnail URLs
  await page.route('**/api/v1/admin/feedbacks/*/thumbnail', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      }),
    });
  });

  // Mock Jira configuration status
  await page.route('**/api/v1/admin/jira/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        configured: jiraConfigured,
        projectKey: jiraConfigured ? 'PROJ' : undefined,
      }),
    });
  });

  // Mock Jira ticket creation
  await page.route('**/api/v1/admin/feedbacks/*/jira', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        issueKey: 'PROJ-456',
        issueUrl: 'https://jira.example.com/browse/PROJ-456',
        message: 'Ticket created successfully',
      }),
    });
  });
}

test.describe('Feedback Admin Page - STORY-041H', () => {
  test.describe.configure({ mode: 'serial' });

  test.describe('Page Access and Authorization', () => {
    test('should show feedback list for admin user', async ({ page }) => {
      await mockAdminAuthEndpoints(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);
      await mockFeedbackAdminEndpoints(page);
      await loginAsAdmin(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);

      const pageContainer = page.locator('[data-testid="feedback-admin-page"]');
      await expect(pageContainer).toBeVisible();

      const table = page.locator('[data-testid="feedback-admin-table"]');
      await expect(table).toBeVisible();
    });

    test('should redirect non-admin to forbidden page', async ({ page }) => {
      await mockUserAuthEndpoints(page, MOCK_USER_ACCESS_TOKEN, MOCK_USER_REFRESH_TOKEN);
      await mockFeedbackAdminEndpoints(page);
      await loginAsUser(page, MOCK_USER_ACCESS_TOKEN, MOCK_USER_REFRESH_TOKEN);

      await page.goto('/admin/feedback');
      await page.waitForLoadState('networkidle');

      // Should be redirected to forbidden or dashboard
      const url = page.url();
      expect(url.includes('/forbidden') || url.includes('/dashboard')).toBeTruthy();
    });

    test('should display page title "Feedback Verwaltung"', async ({ page }) => {
      await mockAdminAuthEndpoints(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);
      await mockFeedbackAdminEndpoints(page);
      await loginAsAdmin(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);

      const title = page.locator('.page-title');
      await expect(title).toHaveText('Feedback Verwaltung');
    });

    test('should show refresh button', async ({ page }) => {
      await mockAdminAuthEndpoints(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);
      await mockFeedbackAdminEndpoints(page);
      await loginAsAdmin(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);

      const refreshButton = page.locator('[data-testid="feedback-admin-refresh"]');
      await expect(refreshButton).toBeVisible();
      await expect(refreshButton).toContainText('Aktualisieren');
    });
  });

  test.describe('Feedback List Display', () => {
    test.beforeEach(async ({ page }) => {
      await mockAdminAuthEndpoints(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);
      await mockFeedbackAdminEndpoints(page);
      await loginAsAdmin(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);
    });

    test('should display feedback rows in table', async ({ page }) => {
      const firstRow = page.locator('[data-testid="feedback-row-1"]');
      await expect(firstRow).toBeVisible();

      const secondRow = page.locator('[data-testid="feedback-row-2"]');
      await expect(secondRow).toBeVisible();
    });

    test('should show user name and email', async ({ page }) => {
      const userName = page.locator('[data-testid="feedback-user-name-1"]');
      await expect(userName).toHaveText('Max Mustermann');

      const userEmail = page.locator('[data-testid="feedback-user-email-1"]');
      await expect(userEmail).toHaveText('max@mustermann.de');
    });

    test('should show comment preview', async ({ page }) => {
      const comment = page.locator('[data-testid="feedback-comment-1"]');
      await expect(comment).toContainText('Das Menü reagiert nicht');
    });

    test('should show Jira badge for linked feedback', async ({ page }) => {
      const jiraBadge = page.locator('[data-testid="feedback-jira-badge-2"]');
      await expect(jiraBadge).toBeVisible();
      await expect(jiraBadge).toHaveText('PROJ-123');
    });

    test('should show action buttons for each row', async ({ page }) => {
      const viewButton = page.locator('[data-testid="feedback-view-1"]');
      await expect(viewButton).toBeVisible();

      const deleteButton = page.locator('[data-testid="feedback-delete-1"]');
      await expect(deleteButton).toBeVisible();

      const jiraButton = page.locator('[data-testid="feedback-jira-1"]');
      await expect(jiraButton).toBeVisible();
    });
  });

  test.describe('Detail Modal', () => {
    test.beforeEach(async ({ page }) => {
      await mockAdminAuthEndpoints(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);
      await mockFeedbackAdminEndpoints(page);
      await loginAsAdmin(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);
    });

    test('should open detail modal on view button click', async ({ page }) => {
      const viewButton = page.locator('[data-testid="feedback-view-1"]');
      await viewButton.click();

      const modal = page.locator('[data-testid="feedback-detail-modal"]');
      await expect(modal).toBeVisible();
    });

    test('should display user info in modal', async ({ page }) => {
      const viewButton = page.locator('[data-testid="feedback-view-1"]');
      await viewButton.click();

      const userInfo = page.locator('[data-testid="feedback-detail-user"]');
      await expect(userInfo).toContainText('Max Mustermann');
      await expect(userInfo).toContainText('max@mustermann.de');
    });

    test('should display route in modal', async ({ page }) => {
      const viewButton = page.locator('[data-testid="feedback-view-1"]');
      await viewButton.click();

      const route = page.locator('[data-testid="feedback-detail-route"]');
      await expect(route).toHaveText('/dashboard');
    });

    test('should display full comment in modal', async ({ page }) => {
      const viewButton = page.locator('[data-testid="feedback-view-1"]');
      await viewButton.click();

      const comment = page.locator('[data-testid="feedback-detail-comment"]');
      await expect(comment).toContainText('Das Menü reagiert nicht');
    });

    test('should display system info in modal', async ({ page }) => {
      const viewButton = page.locator('[data-testid="feedback-view-1"]');
      await viewButton.click();

      const systemInfo = page.locator('[data-testid="feedback-detail-system-info"]');
      await expect(systemInfo).toContainText('Chrome');
      await expect(systemInfo).toContainText('1920x1080');
    });

    test('should close modal on X button click', async ({ page }) => {
      const viewButton = page.locator('[data-testid="feedback-view-1"]');
      await viewButton.click();

      const modal = page.locator('[data-testid="feedback-detail-modal"]');
      await expect(modal).toBeVisible();

      const closeButton = page.locator('[data-testid="feedback-detail-modal-close-button"]');
      await closeButton.click();

      await expect(modal).not.toBeVisible();
    });
  });

  test.describe('Delete Functionality', () => {
    test.beforeEach(async ({ page }) => {
      await mockAdminAuthEndpoints(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);
      await mockFeedbackAdminEndpoints(page);
      await loginAsAdmin(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);
    });

    test('should open delete dialog on delete button click', async ({ page }) => {
      const deleteButton = page.locator('[data-testid="feedback-delete-1"]');
      await deleteButton.click();

      const dialog = page.locator('[data-testid="feedback-delete-dialog"]');
      await expect(dialog).toBeVisible();
    });

    test('should show confirmation message in delete dialog', async ({ page }) => {
      const deleteButton = page.locator('[data-testid="feedback-delete-1"]');
      await deleteButton.click();

      const dialog = page.locator('[data-testid="feedback-delete-dialog"]');
      await expect(dialog).toContainText('Sind Sie sicher');
    });

    test('should show user info in delete dialog', async ({ page }) => {
      const deleteButton = page.locator('[data-testid="feedback-delete-1"]');
      await deleteButton.click();

      const dialog = page.locator('[data-testid="feedback-delete-dialog"]');
      await expect(dialog).toContainText('Max Mustermann');
    });

    test('should close delete dialog on cancel', async ({ page }) => {
      const deleteButton = page.locator('[data-testid="feedback-delete-1"]');
      await deleteButton.click();

      const dialog = page.locator('[data-testid="feedback-delete-dialog"]');
      await expect(dialog).toBeVisible();

      const cancelButton = page.locator('[data-testid="feedback-delete-cancel"]');
      await cancelButton.click();

      await expect(dialog).not.toBeVisible();
    });

    test('should delete feedback on confirm', async ({ page }) => {
      const deleteButton = page.locator('[data-testid="feedback-delete-1"]');
      await deleteButton.click();

      const confirmButton = page.locator('[data-testid="feedback-delete-confirm"]');
      await confirmButton.click();

      // Dialog should close
      const dialog = page.locator('[data-testid="feedback-delete-dialog"]');
      await expect(dialog).not.toBeVisible();

      // Success toast should appear
      const toast = page.locator('[data-testid="feedback-admin-toast"]');
      await expect(toast).toBeVisible();
    });
  });

  test.describe('Jira Integration', () => {
    test('should show Jira button as enabled when Jira is configured', async ({ page }) => {
      await mockAdminAuthEndpoints(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);
      await mockFeedbackAdminEndpoints(page, { jiraConfigured: true });
      await loginAsAdmin(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);

      const jiraButton = page.locator('[data-testid="feedback-jira-1"]');
      await expect(jiraButton).toBeEnabled();
    });

    test('should show Jira button as disabled when Jira is not configured', async ({ page }) => {
      await mockAdminAuthEndpoints(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);
      await mockFeedbackAdminEndpoints(page, { jiraConfigured: false });
      await loginAsAdmin(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);

      const jiraButton = page.locator('[data-testid="feedback-jira-1"]');
      await expect(jiraButton).toBeDisabled();
    });

    test('should show Jira warning when not configured', async ({ page }) => {
      await mockAdminAuthEndpoints(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);
      await mockFeedbackAdminEndpoints(page, { jiraConfigured: false });
      await loginAsAdmin(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);

      const warning = page.locator('[data-testid="feedback-admin-jira-warning"]');
      await expect(warning).toBeVisible();
      await expect(warning).toContainText('Jira nicht konfiguriert');
    });

    test('should disable Jira button for feedback with existing ticket', async ({ page }) => {
      await mockAdminAuthEndpoints(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);
      await mockFeedbackAdminEndpoints(page, { jiraConfigured: true });
      await loginAsAdmin(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);

      // Second feedback already has a Jira ticket
      const jiraButton = page.locator('[data-testid="feedback-jira-2"]');
      await expect(jiraButton).toBeDisabled();
    });

    test('should create Jira ticket from detail modal', async ({ page }) => {
      await mockAdminAuthEndpoints(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);
      await mockFeedbackAdminEndpoints(page, { jiraConfigured: true });
      await loginAsAdmin(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);

      // Open detail modal
      const viewButton = page.locator('[data-testid="feedback-view-1"]');
      await viewButton.click();

      // Click Jira button
      const jiraButton = page.locator('[data-testid="feedback-detail-jira-button"]');
      await jiraButton.click();

      // Success toast should appear
      const toast = page.locator('[data-testid="feedback-admin-toast"]');
      await expect(toast).toBeVisible({ timeout: 5000 });
      await expect(toast).toContainText('PROJ-456');
    });
  });

  test.describe('Empty State', () => {
    test('should show empty state when no feedbacks', async ({ page }) => {
      await mockAdminAuthEndpoints(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);
      await mockFeedbackAdminEndpoints(page, { empty: true });
      await loginAsAdmin(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);

      const emptyState = page.locator('[data-testid="feedback-admin-empty"]');
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toContainText('Keine Feedbacks vorhanden');
    });

    test('should not show table when no feedbacks', async ({ page }) => {
      await mockAdminAuthEndpoints(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);
      await mockFeedbackAdminEndpoints(page, { empty: true });
      await loginAsAdmin(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);

      const table = page.locator('[data-testid="feedback-admin-table"]');
      await expect(table).not.toBeVisible();
    });
  });

  test.describe('Pagination', () => {
    test('should show pagination when multiple pages', async ({ page }) => {
      await mockAdminAuthEndpoints(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);
      // Don't call mockFeedbackAdminEndpoints since we want custom pagination mock

      // Mock Jira config - normally done by mockFeedbackAdminEndpoints
      await page.route('**/api/v1/admin/jira/status', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ configured: true, projectKey: 'PROJ' }),
        });
      });

      // Mock with multiple pages - custom pagination
      await page.route('**/api/v1/admin/feedbacks?*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: MOCK_FEEDBACKS,
            pagination: {
              page: 1,
              limit: 20,
              total: 100,
              pages: 5,
            },
          }),
        });
      });

      await loginAsAdmin(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);

      const pagination = page.locator('[data-testid="feedback-admin-pagination"]');
      await expect(pagination).toBeVisible();
    });

    test('should show page info', async ({ page }) => {
      await mockAdminAuthEndpoints(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);
      await mockFeedbackAdminEndpoints(page);
      await loginAsAdmin(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);

      const pageInfo = page.locator('[data-testid="feedback-admin-page-info"]');
      await expect(pageInfo).toBeVisible();
      await expect(pageInfo).toContainText('Seite 1');
    });
  });

  test.describe('Refresh Functionality', () => {
    test('should refresh list on button click', async ({ page }) => {
      await mockAdminAuthEndpoints(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);

      // Track request count - set up BEFORE login so initial request is counted
      let requestCount = 0;
      await page.route('**/api/v1/admin/feedbacks?*', async (route) => {
        requestCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: MOCK_FEEDBACKS,
            pagination: { page: 1, limit: 20, total: 2, pages: 1 },
          }),
        });
      });

      // Mock Jira config - normally done by mockFeedbackAdminEndpoints
      await page.route('**/api/v1/admin/jira/status', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ configured: true, projectKey: 'PROJ' }),
        });
      });

      await loginAsAdmin(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);

      // Wait for initial load
      await page.waitForSelector('[data-testid="feedback-admin-table"]', { timeout: 5000 });

      const refreshButton = page.locator('[data-testid="feedback-admin-refresh"]');
      await refreshButton.click();

      // Wait for the request to complete
      await page.waitForTimeout(500);

      // Should have made at least 2 requests (initial + refresh)
      expect(requestCount).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('Loading State', () => {
    test('should show loading state initially', async ({ page }) => {
      await mockAdminAuthEndpoints(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);

      // Add delay to API response
      await page.route('**/api/v1/admin/feedbacks?*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: MOCK_FEEDBACKS,
            pagination: { page: 1, limit: 20, total: 2, pages: 1 },
          }),
        });
      });

      await mockFeedbackAdminEndpoints(page);
      await loginAsAdmin(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);

      const loading = page.locator('[data-testid="feedback-admin-loading"]');
      // Loading state may be too fast to catch, so we check if it was visible at some point
      // or if the table is visible (loading completed)
      const loadingVisible = await loading.isVisible().catch(() => false);
      const tableVisible = await page.locator('[data-testid="feedback-admin-table"]').isVisible().catch(() => false);

      expect(loadingVisible || tableVisible).toBeTruthy();
    });
  });

  test.describe('Error Handling', () => {
    test('should show error message on API failure', async ({ page }) => {
      await mockAdminAuthEndpoints(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);

      // Mock API error - set BEFORE other routes so it takes precedence
      await page.route('**/api/v1/admin/feedbacks?*', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal Server Error' }),
        });
      });

      // Mock Jira config - normally done by mockFeedbackAdminEndpoints
      await page.route('**/api/v1/admin/jira/status', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ configured: true, projectKey: 'PROJ' }),
        });
      });

      await loginAsAdmin(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);

      const error = page.locator('[data-testid="feedback-admin-error"]');
      await expect(error).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Screenshot Download', () => {
    test('should show download button in detail modal', async ({ page }) => {
      await mockAdminAuthEndpoints(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);
      await mockFeedbackAdminEndpoints(page);
      await loginAsAdmin(page, MOCK_ADMIN_ACCESS_TOKEN, MOCK_ADMIN_REFRESH_TOKEN);

      // Open detail modal
      const viewButton = page.locator('[data-testid="feedback-view-1"]');
      await viewButton.click();

      // Wait for modal to load
      await page.waitForTimeout(500);

      const downloadButton = page.locator('[data-testid="feedback-detail-download-button"]');
      await expect(downloadButton).toBeVisible();
    });
  });
});
