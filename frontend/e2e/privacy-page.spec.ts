/**
 * Privacy Policy Page E2E Tests
 * BUG-006: Fehlende Datenschutzbestimmungen-Seite
 *
 * End-to-end tests verifying that the privacy policy page:
 * 1. Is accessible without authentication (public route)
 * 2. Displays GDPR-compliant content
 * 3. Links correctly from registration page
 * 4. Navigation works correctly
 */

import { test, expect } from '@playwright/test';

// Base URL from playwright config
const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

test.describe('BUG-006: Privacy Policy Page', () => {
  test.describe('Page Accessibility (Public Route)', () => {
    test('privacy page is accessible without authentication', async ({ page }) => {
      // Navigate directly to privacy page without logging in
      const response = await page.goto(`${BASE_URL}/privacy`);

      // Verify the page loads successfully (not redirected to login)
      expect(response?.status()).toBe(200);

      // Verify we're on the privacy page, not redirected
      expect(page.url()).toContain('/privacy');

      // Verify the privacy page content is visible
      await expect(page.getByTestId('privacy-page')).toBeVisible();
    });

    test('privacy page does not redirect to login', async ({ page }) => {
      await page.goto(`${BASE_URL}/privacy`);

      // Wait for the page to fully load
      await page.waitForLoadState('networkidle');

      // Verify we're still on the privacy page
      expect(page.url()).toContain('/privacy');
      expect(page.url()).not.toContain('/login');
    });
  });

  test.describe('Page Content', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/privacy`);
      await page.waitForLoadState('networkidle');
    });

    test('displays the privacy page title', async ({ page }) => {
      const title = page.getByTestId('privacy-title');
      await expect(title).toBeVisible();

      // Title should contain "Datenschutz" (German) or "Privacy" (English)
      const titleText = await title.textContent();
      expect(titleText?.toLowerCase()).toMatch(/datenschutz|privacy/);
    });

    test('displays all required GDPR sections', async ({ page }) => {
      // Verify all major sections are present
      await expect(page.getByTestId('privacy-section-intro')).toBeVisible();
      await expect(page.getByTestId('privacy-section-responsible')).toBeVisible();
      await expect(page.getByTestId('privacy-section-collection')).toBeVisible();
      await expect(page.getByTestId('privacy-section-purpose')).toBeVisible();
      await expect(page.getByTestId('privacy-section-legal')).toBeVisible();
      await expect(page.getByTestId('privacy-section-retention')).toBeVisible();
      await expect(page.getByTestId('privacy-section-rights')).toBeVisible();
      await expect(page.getByTestId('privacy-section-contact')).toBeVisible();
    });

    test('displays last updated date', async ({ page }) => {
      const lastUpdated = page.getByTestId('privacy-last-updated');
      await expect(lastUpdated).toBeVisible();
    });

    test('displays contact email link', async ({ page }) => {
      const emailLink = page.getByTestId('privacy-email-link');
      await expect(emailLink).toBeVisible();
      await expect(emailLink).toHaveAttribute('href', 'mailto:privacy@example.com');
    });
  });

  test.describe('Navigation', () => {
    test('back to register link works', async ({ page }) => {
      await page.goto(`${BASE_URL}/privacy`);
      await page.waitForLoadState('networkidle');

      // Click the back to register link
      const backLink = page.getByTestId('back-to-register-link');
      await expect(backLink).toBeVisible();
      await backLink.click();

      // Verify navigation to register page
      await page.waitForURL('**/register');
      expect(page.url()).toContain('/register');
    });

    test('footer register link works', async ({ page }) => {
      await page.goto(`${BASE_URL}/privacy`);
      await page.waitForLoadState('networkidle');

      // Click the register link in footer
      const registerLink = page.getByTestId('register-link');
      await expect(registerLink).toBeVisible();
      await registerLink.click();

      // Verify navigation to register page
      await page.waitForURL('**/register');
      expect(page.url()).toContain('/register');
    });

    test('footer login link works', async ({ page }) => {
      await page.goto(`${BASE_URL}/privacy`);
      await page.waitForLoadState('networkidle');

      // Click the login link in footer
      const loginLink = page.getByTestId('login-link');
      await expect(loginLink).toBeVisible();
      await loginLink.click();

      // Verify navigation to login page
      await page.waitForURL('**/login');
      expect(page.url()).toContain('/login');
    });
  });

  test.describe('Registration Page Integration', () => {
    test('privacy link on registration page leads to privacy page', async ({ page }) => {
      // Navigate to registration page
      await page.goto(`${BASE_URL}/register`);
      await page.waitForLoadState('networkidle');

      // Click the privacy policy link
      const privacyLink = page.getByTestId('privacy-link');
      await expect(privacyLink).toBeVisible();
      await privacyLink.click();

      // Verify navigation to privacy page
      await page.waitForURL('**/privacy');
      expect(page.url()).toContain('/privacy');

      // Verify privacy page content is displayed
      await expect(page.getByTestId('privacy-page')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('privacy page displays correctly on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto(`${BASE_URL}/privacy`);
      await page.waitForLoadState('networkidle');

      // Verify page is visible
      await expect(page.getByTestId('privacy-page')).toBeVisible();
      await expect(page.getByTestId('privacy-title')).toBeVisible();

      // Verify container is responsive
      const container = page.getByTestId('privacy-container');
      await expect(container).toBeVisible();
    });

    test('privacy page displays correctly on tablet', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto(`${BASE_URL}/privacy`);
      await page.waitForLoadState('networkidle');

      // Verify page is visible
      await expect(page.getByTestId('privacy-page')).toBeVisible();
      await expect(page.getByTestId('privacy-title')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('page has proper heading structure', async ({ page }) => {
      await page.goto(`${BASE_URL}/privacy`);
      await page.waitForLoadState('networkidle');

      // Check for h1 (main title)
      const h1 = page.locator('h1');
      await expect(h1).toHaveCount(1);

      // Check for section headings (h2)
      const h2s = page.locator('h2');
      const h2Count = await h2s.count();
      expect(h2Count).toBeGreaterThanOrEqual(8); // At least 8 sections
    });

    test('logo is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/privacy`);
      await page.waitForLoadState('networkidle');

      // AuthLogo should be visible
      const logo = page.getByTestId('privacy-auth-logo');
      await expect(logo).toBeVisible();
    });
  });

  test.describe('No Authentication Required', () => {
    test('page loads without any cookies or auth tokens', async ({ browser }) => {
      // Create a fresh context with no cookies
      const context = await browser.newContext();
      const page = await context.newPage();

      // Navigate to privacy page
      await page.goto(`${BASE_URL}/privacy`);
      await page.waitForLoadState('networkidle');

      // Verify page content is visible
      await expect(page.getByTestId('privacy-page')).toBeVisible();
      await expect(page.getByTestId('privacy-title')).toBeVisible();

      // Cleanup
      await context.close();
    });
  });
});
