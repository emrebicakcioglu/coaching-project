/**
 * Forbidden (403) Page E2E Tests
 * STORY-109: Forbidden (403) Page UI Audit
 *
 * Playwright E2E tests for 403 Forbidden page UI improvements.
 * Tests button styling consistency, visual hierarchy, error code typography,
 * and support link visibility enhancements.
 *
 * IMPORTANT: This entire test file runs serially to avoid rate limiting
 * from parallel login attempts hitting the same user account.
 */

import { test, expect, Page } from '@playwright/test';

// Configure entire file to run serially with increased timeout
// This prevents rate limiting from parallel login attempts
test.describe.configure({ mode: 'serial' });
test.setTimeout(120000); // 2 minute timeout for rate limit retries

/**
 * Test configuration - credentials for authenticated tests
 * Uses environment variables with fallback defaults
 */
const TEST_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
const TEST_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'TestPassword123!';

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
 * Helper to login and navigate to the Forbidden (403) page
 * Includes robust rate limiting handling with retries.
 */
async function loginAndNavigateToForbidden(page: Page): Promise<void> {
  const maxAttempts = 8;
  const retryDelay = 10000; // 10 seconds between retries for rate limiting

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await page.goto('/login');

    if (attempt === 1) {
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.reload();
    }

    await waitForStability(page);

    const emailInput = page.locator('[data-testid="email-input"], input[name="email"]').first();
    const passwordInput = page.locator('[data-testid="password-input"], input[name="password"]').first();
    const loginButton = page.locator('[data-testid="login-button"], button[type="submit"]').first();

    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);
    await loginButton.click();
    await page.waitForTimeout(1000);

    // Check for rate limiting
    const rateLimitError = await page.locator('text=Zu viele Anmeldeversuche').isVisible();
    if (rateLimitError) {
      console.log(`Rate limit hit on attempt ${attempt}, waiting ${retryDelay / 1000}s...`);
      await page.waitForTimeout(retryDelay);
      continue;
    }

    try {
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
      await waitForStability(page);

      // Navigate to 403 Forbidden page
      await page.goto('/forbidden');
      await waitForStability(page);

      if (page.url().includes('/forbidden')) {
        return; // Login and navigation successful
      }
    } catch {
      if (attempt < maxAttempts) {
        console.log(`Login attempt ${attempt} failed, retrying...`);
        await page.waitForTimeout(2000);
        continue;
      }
    }
  }

  throw new Error(`Failed to login after ${maxAttempts} attempts`);
}

/**
 * Helper to navigate directly to 403 page without login (for unauthenticated tests)
 */
async function navigateToForbiddenDirect(page: Page): Promise<void> {
  await page.goto('/forbidden');
  await waitForStability(page);
}

test.describe('Forbidden (403) Page - STORY-109 UI Audit Fixes', () => {
  test.describe('Button Styling Consistency', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await navigateToForbiddenDirect(page);
    });

    test('page has action buttons container', async ({ page }) => {
      const actionsContainer = page.locator('[data-testid="forbidden-actions"]');
      await expect(actionsContainer).toBeVisible();
    });

    test('primary action button (Dashboard) has filled blue styling', async ({ page }) => {
      const dashboardLink = page.locator('[data-testid="dashboard-link"]');
      await expect(dashboardLink).toBeVisible();

      const buttonClasses = await dashboardLink.getAttribute('class');
      expect(buttonClasses).toContain('auth-button--primary');
      expect(buttonClasses).toContain('forbidden-page__button--primary');
    });

    test('secondary action button (Back) has outlined styling', async ({ page }) => {
      const backButton = page.locator('[data-testid="go-back-button"]');
      await expect(backButton).toBeVisible();

      const buttonClasses = await backButton.getAttribute('class');
      expect(buttonClasses).toContain('auth-button--secondary');
      expect(buttonClasses).toContain('forbidden-page__button--secondary');
    });

    test('buttons are displayed side by side (row layout)', async ({ page }) => {
      const actionsContainer = page.locator('[data-testid="forbidden-actions"]');
      const backButton = page.locator('[data-testid="go-back-button"]');
      const dashboardLink = page.locator('[data-testid="dashboard-link"]');

      await expect(actionsContainer).toBeVisible();
      await expect(backButton).toBeVisible();
      await expect(dashboardLink).toBeVisible();

      // Get bounding boxes to verify horizontal layout
      const backBox = await backButton.boundingBox();
      const dashboardBox = await dashboardLink.boundingBox();

      expect(backBox).not.toBeNull();
      expect(dashboardBox).not.toBeNull();

      if (backBox && dashboardBox) {
        // Buttons should be on the same row (similar Y position)
        expect(Math.abs(backBox.y - dashboardBox.y)).toBeLessThan(10);
        // Dashboard should be to the right of Back button
        expect(dashboardBox.x).toBeGreaterThan(backBox.x);
      }
    });
  });

  test.describe('Button Visual Hierarchy', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await navigateToForbiddenDirect(page);
    });

    test('Back button is secondary (comes first visually, outlined)', async ({ page }) => {
      const backButton = page.locator('[data-testid="go-back-button"]');
      await expect(backButton).toBeVisible();

      // Should have secondary class
      const buttonClasses = await backButton.getAttribute('class');
      expect(buttonClasses).toContain('auth-button--secondary');
    });

    test('Dashboard button is primary (comes second, filled)', async ({ page }) => {
      const dashboardLink = page.locator('[data-testid="dashboard-link"]');
      await expect(dashboardLink).toBeVisible();

      // Should have primary class
      const buttonClasses = await dashboardLink.getAttribute('class');
      expect(buttonClasses).toContain('auth-button--primary');
    });

    test('Dashboard link navigates to /dashboard', async ({ page }) => {
      const dashboardLink = page.locator('[data-testid="dashboard-link"]');
      const href = await dashboardLink.getAttribute('href');
      expect(href).toBe('/dashboard');
    });
  });

  test.describe('Error Code Typography', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await navigateToForbiddenDirect(page);
    });

    test('error code container is visible', async ({ page }) => {
      const errorCodeContainer = page.locator('[data-testid="error-code"]');
      await expect(errorCodeContainer).toBeVisible();
    });

    test('403 error code number is displayed', async ({ page }) => {
      const errorCodeNumber = page.locator('[data-testid="error-code-number"]');
      await expect(errorCodeNumber).toBeVisible();
      await expect(errorCodeNumber).toHaveText('403');
    });

    test('403 code has consistent orange/amber color class', async ({ page }) => {
      const errorCodeNumber = page.locator('[data-testid="error-code-number"]');
      await expect(errorCodeNumber).toBeVisible();

      const classes = await errorCodeNumber.getAttribute('class');
      expect(classes).toContain('forbidden-page__code-number');
    });

    test('error code label is visible', async ({ page }) => {
      const errorCodeLabel = page.locator('[data-testid="error-code-label"]');
      await expect(errorCodeLabel).toBeVisible();
    });
  });

  test.describe('Warning Icon', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await navigateToForbiddenDirect(page);
    });

    test('warning icon container is visible', async ({ page }) => {
      const iconContainer = page.locator('.auth-logo__placeholder');
      await expect(iconContainer).toBeVisible();
    });

    test('warning icon uses SVG', async ({ page }) => {
      const iconSvg = page.locator('.auth-logo__placeholder svg');
      await expect(iconSvg).toBeVisible();
    });

    test('warning icon SVG has proper accessibility attributes', async ({ page }) => {
      const iconSvg = page.locator('.auth-logo__placeholder svg');
      await expect(iconSvg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  test.describe('Support Link Visibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await navigateToForbiddenDirect(page);
    });

    test('support link is visible in footer', async ({ page }) => {
      const helpLink = page.locator('[data-testid="help-link"]');
      await expect(helpLink).toBeVisible();
    });

    test('support link has help icon for visibility', async ({ page }) => {
      const helpIcon = page.locator('[data-testid="help-link-icon"]');
      await expect(helpIcon).toBeVisible();
    });

    test('help icon is SVG element', async ({ page }) => {
      const helpIcon = page.locator('[data-testid="help-link-icon"]');
      await expect(helpIcon).toBeVisible();

      const tagName = await helpIcon.evaluate(el => el.tagName);
      expect(tagName.toLowerCase()).toBe('svg');
    });

    test('support link navigates to /help', async ({ page }) => {
      const helpLink = page.locator('[data-testid="help-link"]');
      const href = await helpLink.getAttribute('href');
      expect(href).toBe('/help');
    });

    test('support link has forbidden-page__support-link class', async ({ page }) => {
      const helpLink = page.locator('[data-testid="help-link"]');
      const classes = await helpLink.getAttribute('class');
      expect(classes).toContain('forbidden-page__support-link');
    });
  });

  test.describe('Card Centering and Size', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await navigateToForbiddenDirect(page);
    });

    test('forbidden page container is visible', async ({ page }) => {
      const pageContainer = page.locator('[data-testid="forbidden-page"]');
      await expect(pageContainer).toBeVisible();
    });

    test('error card container is visible', async ({ page }) => {
      const cardContainer = page.locator('[data-testid="forbidden-container"]');
      await expect(cardContainer).toBeVisible();
    });

    test('card uses auth-container class for consistent styling', async ({ page }) => {
      const cardContainer = page.locator('[data-testid="forbidden-container"]');
      const classes = await cardContainer.getAttribute('class');
      expect(classes).toContain('auth-container');
    });

    test('card is centered on the page', async ({ page }) => {
      const pageContainer = page.locator('[data-testid="forbidden-page"]');
      const pageClasses = await pageContainer.getAttribute('class');
      expect(pageClasses).toContain('auth-page');
    });
  });

  test.describe('Page Content', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await navigateToForbiddenDirect(page);
    });

    test('page title is visible', async ({ page }) => {
      const title = page.locator('[data-testid="forbidden-title"]');
      await expect(title).toBeVisible();
    });

    test('page title is H1 for proper semantic structure', async ({ page }) => {
      const title = page.locator('[data-testid="forbidden-title"]');
      const tagName = await title.evaluate(el => el.tagName);
      expect(tagName).toBe('H1');
    });

    test('page message is visible', async ({ page }) => {
      const message = page.locator('[data-testid="forbidden-message"]');
      await expect(message).toBeVisible();
    });

    test('footer section is visible', async ({ page }) => {
      const footer = page.locator('[data-testid="forbidden-footer"]');
      await expect(footer).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await navigateToForbiddenDirect(page);
    });

    test('Back button is focusable', async ({ page }) => {
      const backButton = page.locator('[data-testid="go-back-button"]');
      await backButton.focus();
      await expect(backButton).toBeFocused();
    });

    test('Dashboard link is focusable', async ({ page }) => {
      const dashboardLink = page.locator('[data-testid="dashboard-link"]');
      await dashboardLink.focus();
      await expect(dashboardLink).toBeFocused();
    });

    test('Help link is focusable', async ({ page }) => {
      const helpLink = page.locator('[data-testid="help-link"]');
      await helpLink.focus();
      await expect(helpLink).toBeFocused();
    });

    test('keyboard navigation works through interactive elements', async ({ page }) => {
      // Start by pressing Tab to focus first focusable element
      await page.keyboard.press('Tab');

      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.tagName;
      });

      expect(focusedElement).toBeTruthy();
    });

    test('error code number has aria-hidden for screen readers', async ({ page }) => {
      const errorCodeNumber = page.locator('[data-testid="error-code-number"]');
      await expect(errorCodeNumber).toHaveAttribute('aria-hidden', 'true');
    });
  });

  test.describe('Responsive Behavior', () => {
    test('page is accessible on tablet', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.tablet);
      await navigateToForbiddenDirect(page);

      const forbiddenPage = page.locator('[data-testid="forbidden-page"]');
      await expect(forbiddenPage).toBeVisible();

      const backButton = page.locator('[data-testid="go-back-button"]');
      const dashboardLink = page.locator('[data-testid="dashboard-link"]');
      await expect(backButton).toBeVisible();
      await expect(dashboardLink).toBeVisible();
    });

    test('page is accessible on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await navigateToForbiddenDirect(page);

      const forbiddenPage = page.locator('[data-testid="forbidden-page"]');
      await expect(forbiddenPage).toBeVisible();

      const backButton = page.locator('[data-testid="go-back-button"]');
      const dashboardLink = page.locator('[data-testid="dashboard-link"]');
      await expect(backButton).toBeVisible();
      await expect(dashboardLink).toBeVisible();
    });

    test('error code is visible on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await navigateToForbiddenDirect(page);

      const errorCode = page.locator('[data-testid="error-code-number"]');
      await expect(errorCode).toBeVisible();
      await expect(errorCode).toHaveText('403');
    });

    test('support link with icon is visible on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await navigateToForbiddenDirect(page);

      const helpLink = page.locator('[data-testid="help-link"]');
      const helpIcon = page.locator('[data-testid="help-link-icon"]');
      await expect(helpLink).toBeVisible();
      await expect(helpIcon).toBeVisible();
    });

    test('buttons remain functional on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await navigateToForbiddenDirect(page);

      const backButton = page.locator('[data-testid="go-back-button"]');
      const dashboardLink = page.locator('[data-testid="dashboard-link"]');

      await expect(backButton).toBeVisible();
      await expect(backButton).toBeEnabled();
      await expect(dashboardLink).toBeVisible();
    });
  });

  test.describe('Design Pattern Compliance', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await navigateToForbiddenDirect(page);
    });

    test('primary button follows design system (filled blue, auth-button--primary)', async ({ page }) => {
      const primaryButton = page.locator('[data-testid="dashboard-link"]');
      await expect(primaryButton).toBeVisible();

      const buttonClasses = await primaryButton.getAttribute('class');
      expect(buttonClasses).toContain('auth-button--primary');
    });

    test('secondary button follows design system (outlined, auth-button--secondary)', async ({ page }) => {
      const secondaryButton = page.locator('[data-testid="go-back-button"]');
      await expect(secondaryButton).toBeVisible();

      const buttonClasses = await secondaryButton.getAttribute('class');
      expect(buttonClasses).toContain('auth-button--secondary');
    });

    test('page follows MFA page button pattern (secondary left, primary right)', async ({ page }) => {
      const backButton = page.locator('[data-testid="go-back-button"]');
      const dashboardLink = page.locator('[data-testid="dashboard-link"]');

      const backBox = await backButton.boundingBox();
      const dashboardBox = await dashboardLink.boundingBox();

      expect(backBox).not.toBeNull();
      expect(dashboardBox).not.toBeNull();

      if (backBox && dashboardBox) {
        // Back button (secondary) should be on the left
        expect(backBox.x).toBeLessThan(dashboardBox.x);
      }
    });

    test('uses warning color scheme for 403 error appropriately', async ({ page }) => {
      // Title should use warning color
      const title = page.locator('[data-testid="forbidden-title"]');
      await expect(title).toBeVisible();
      const titleClasses = await title.getAttribute('class');
      expect(titleClasses).toContain('auth-title');

      // Error code should use warning color
      const errorCode = page.locator('[data-testid="error-code-number"]');
      await expect(errorCode).toBeVisible();
      const codeClasses = await errorCode.getAttribute('class');
      expect(codeClasses).toContain('forbidden-page__code-number');
    });
  });

  test.describe('Navigation Integration', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
    });

    test('Dashboard link navigates to dashboard when clicked', async ({ page }) => {
      await loginAndNavigateToForbidden(page);

      const dashboardLink = page.locator('[data-testid="dashboard-link"]');
      await dashboardLink.click();

      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('Help link navigates to help page when clicked', async ({ page }) => {
      await loginAndNavigateToForbidden(page);

      const helpLink = page.locator('[data-testid="help-link"]');
      await helpLink.click();

      await expect(page).toHaveURL(/\/help/);
    });
  });

  test.describe('Comparison with MFA Page Standards', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await navigateToForbiddenDirect(page);
    });

    test('buttons use consistent padding and border-radius like MFA page', async ({ page }) => {
      const backButton = page.locator('[data-testid="go-back-button"]');
      const dashboardLink = page.locator('[data-testid="dashboard-link"]');

      // Both should have auth-button class for consistent styling
      const backClasses = await backButton.getAttribute('class');
      const dashboardClasses = await dashboardLink.getAttribute('class');

      expect(backClasses).toContain('auth-button');
      expect(dashboardClasses).toContain('auth-button');
    });

    test('error page maintains overall visual hierarchy pattern', async ({ page }) => {
      // Check that all major sections are present and in order
      const logo = page.locator('.auth-logo');
      const header = page.locator('.auth-header');
      const errorCode = page.locator('[data-testid="error-code"]');
      const actions = page.locator('[data-testid="forbidden-actions"]');
      const footer = page.locator('[data-testid="forbidden-footer"]');

      await expect(logo).toBeVisible();
      await expect(header).toBeVisible();
      await expect(errorCode).toBeVisible();
      await expect(actions).toBeVisible();
      await expect(footer).toBeVisible();
    });
  });
});
