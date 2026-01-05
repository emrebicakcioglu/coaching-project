/**
 * BUG-007: Logo Display on Forgot Password Page
 *
 * Tests to verify that the logo is displayed as an SVG image (not text)
 * on the Forgot Password page, matching Login and Register pages.
 *
 * Bug: "LOGO" text was displayed instead of the actual logo image
 * Fix: Using shared AuthLogo component for consistency
 */

import { test, expect } from '@playwright/test';

// Base URL
const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

test.describe('BUG-007: Forgot Password Logo Display', () => {
  test.describe('Logo Consistency Across Auth Pages', () => {
    test('should display SVG logo on forgot password page (not text)', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);

      // Check that AuthLogo component is rendered
      const authLogo = page.locator('[data-testid="forgot-password-auth-logo"]');
      await expect(authLogo).toBeVisible();

      // Verify SVG logo is present (not text "LOGO")
      const svgLogo = authLogo.locator('svg');
      await expect(svgLogo).toBeVisible();

      // Ensure "LOGO" text is NOT displayed
      const logoText = await authLogo.textContent();
      expect(logoText?.trim()).not.toBe('LOGO');

      // Verify SVG has expected hexagon path (Core App branding)
      const hexagonPath = authLogo.locator('path');
      await expect(hexagonPath.first()).toBeVisible();
    });

    test('should display SVG logo on login page', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Check that AuthLogo component is rendered
      const authLogo = page.locator('[data-testid="auth-logo"], [data-testid="login-auth-logo"]');
      await expect(authLogo).toBeVisible();

      // Verify SVG logo is present
      const svgLogo = authLogo.locator('svg');
      await expect(svgLogo).toBeVisible();

      // Ensure "LOGO" text is NOT displayed
      const logoText = await authLogo.textContent();
      expect(logoText?.trim()).not.toBe('LOGO');
    });

    test('should display SVG logo on register page', async ({ page }) => {
      await page.goto(`${BASE_URL}/register`);

      // Check that AuthLogo component is rendered
      const authLogo = page.locator('[data-testid="auth-logo"], [data-testid="register-auth-logo"]');
      await expect(authLogo).toBeVisible();

      // Verify SVG logo is present
      const svgLogo = authLogo.locator('svg');
      await expect(svgLogo).toBeVisible();

      // Ensure "LOGO" text is NOT displayed
      const logoText = await authLogo.textContent();
      expect(logoText?.trim()).not.toBe('LOGO');
    });

    test('logos should be consistent across all public auth pages', async ({ page }) => {
      // Check login page
      await page.goto(`${BASE_URL}/login`);
      const loginLogoSvg = page.locator('.auth-logo svg');
      await expect(loginLogoSvg).toBeVisible();
      const loginSvgContent = await loginLogoSvg.evaluate((el) => el.innerHTML);

      // Check register page
      await page.goto(`${BASE_URL}/register`);
      const registerLogoSvg = page.locator('.auth-logo svg');
      await expect(registerLogoSvg).toBeVisible();
      const registerSvgContent = await registerLogoSvg.evaluate((el) => el.innerHTML);

      // Check forgot password page
      await page.goto(`${BASE_URL}/forgot-password`);
      const forgotLogoSvg = page.locator('.auth-logo svg');
      await expect(forgotLogoSvg).toBeVisible();
      const forgotSvgContent = await forgotLogoSvg.evaluate((el) => el.innerHTML);

      // All SVG content should be identical (same logo component)
      expect(loginSvgContent).toBe(registerSvgContent);
      expect(registerSvgContent).toBe(forgotSvgContent);
    });
  });

  test.describe('Forgot Password Success State Logo', () => {
    test('should display SVG logo after successful submission', async ({ page }) => {
      // Mock the API response
      await page.route('**/api/v1/auth/forgot-password', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'If the email exists, a password reset link has been sent',
          }),
        });
      });

      await page.goto(`${BASE_URL}/forgot-password`);

      // Submit form with valid email
      await page.fill('input[name="email"]', 'test@example.com');
      await page.click('button[type="submit"]');

      // Wait for success state
      await expect(page.locator('.auth-success')).toBeVisible({ timeout: 5000 });

      // Verify logo is still displayed correctly in success state
      const authLogo = page.locator('[data-testid="forgot-password-auth-logo"]');
      await expect(authLogo).toBeVisible();

      // Verify SVG logo is present (not text)
      const svgLogo = authLogo.locator('svg');
      await expect(svgLogo).toBeVisible();
    });
  });

  test.describe('Logo Styling and Accessibility', () => {
    test('forgot password logo should have proper accessibility attributes', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);

      // Check aria-label for accessibility
      const authLogo = page.locator('.auth-logo');
      await expect(authLogo).toBeVisible();
      await expect(authLogo).toHaveAttribute('aria-label');

      // SVG should be hidden from screen readers (decorative)
      const logoPlaceholder = page.locator('.auth-logo__placeholder');
      await expect(logoPlaceholder).toHaveAttribute('aria-hidden', 'true');
    });

    test('logo should maintain visibility on small screens', async ({ page }) => {
      // Mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/forgot-password`);

      // Logo should be visible on mobile
      const svgLogo = page.locator('.auth-logo svg');
      await expect(svgLogo).toBeVisible();

      // Tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(`${BASE_URL}/forgot-password`);

      // Logo should be visible on tablet
      await expect(svgLogo).toBeVisible();
    });
  });
});
