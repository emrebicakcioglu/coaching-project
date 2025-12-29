/**
 * UI Consistency E2E Tests
 * UI-AUDIT: Testing UI/UX improvements from audit
 *
 * End-to-end tests verifying consistent UI patterns across the application:
 * - Logo branding consistency
 * - Password toggle icon consistency
 * - Button hierarchy and styling
 * - Tab navigation consistency
 * - Translation completeness
 * - Card and badge styling
 */

import { test, expect } from '@playwright/test';

// Test credentials
const TEST_EMAIL = 'admin@example.com';
const TEST_PASSWORD = 'TestPassword123!';

test.describe('UI Consistency - UI-AUDIT', () => {
  test.describe.configure({ mode: 'serial' });

  test.describe('Logo Branding', () => {
    test('displays SVG logo on login page - STORY-3', async ({ page }) => {
      await page.goto('/login');

      // STORY-3: Check that the AuthLogo component is rendered
      const authLogo = page.locator('[data-testid="login-auth-logo"]');
      await expect(authLogo).toBeVisible();

      // Check that the logo placeholder contains an SVG
      const logoContainer = page.locator('.auth-logo__placeholder');
      await expect(logoContainer).toBeVisible();

      // Verify SVG is present instead of text "LOGO"
      const svgElement = logoContainer.locator('svg');
      await expect(svgElement).toBeVisible();

      // Verify no "LOGO" text is present
      const logoText = page.locator('.auth-logo__placeholder:has-text("LOGO")');
      await expect(logoText).toHaveCount(0);
    });

    test('displays SVG logo on register page - STORY-3', async ({ page }) => {
      await page.goto('/register');

      // STORY-3: Check that the AuthLogo component is rendered
      const authLogo = page.locator('[data-testid="register-auth-logo"]');
      await expect(authLogo).toBeVisible();

      const logoContainer = page.locator('.auth-logo__placeholder');
      await expect(logoContainer).toBeVisible();

      const svgElement = logoContainer.locator('svg');
      await expect(svgElement).toBeVisible();
    });

    test('displays branded logo in sidebar when authenticated', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', TEST_EMAIL);
      await page.fill('[data-testid="password-input"]', TEST_PASSWORD);
      await page.click('[data-testid="login-button"]');

      // Wait for navigation to dashboard
      await page.waitForURL('**/dashboard');

      // Check sidebar logo
      const sidebarLogo = page.locator('[data-testid="sidebar-logo"]');
      await expect(sidebarLogo).toBeVisible();

      // Verify logo contains SVG
      const svgInLogo = sidebarLogo.locator('svg');
      await expect(svgInLogo).toBeVisible();
    });
  });

  test.describe('Password Toggle Icons', () => {
    test('login page uses consistent SVG eye icons', async ({ page }) => {
      await page.goto('/login');

      const passwordToggle = page.locator('[data-testid="password-toggle"]');
      await expect(passwordToggle).toBeVisible();

      // Check for SVG icon (should not be emoji)
      const svgIcon = passwordToggle.locator('svg');
      await expect(svgIcon).toBeVisible();

      // Toggle visibility
      await passwordToggle.click();

      // Icon should still be SVG after toggle
      await expect(svgIcon).toBeVisible();
    });

    test('register page uses consistent SVG eye icons', async ({ page }) => {
      await page.goto('/register');

      const passwordToggle = page.locator('[data-testid="password-toggle"]');
      await expect(passwordToggle).toBeVisible();

      const svgIcon = passwordToggle.locator('svg');
      await expect(svgIcon).toBeVisible();

      // Check confirm password toggle too
      const confirmToggle = page.locator('[data-testid="password-confirm-toggle"]');
      await expect(confirmToggle).toBeVisible();

      const confirmSvg = confirmToggle.locator('svg');
      await expect(confirmSvg).toBeVisible();
    });
  });

  test.describe('Button Hierarchy', () => {
    test('forbidden page has clear primary/secondary button hierarchy', async ({ page }) => {
      await page.goto('/forbidden');

      // Check go back button (primary - should be filled blue)
      const goBackButton = page.locator('[data-testid="go-back-button"]');
      await expect(goBackButton).toBeVisible();

      // Check dashboard link (secondary - should be outlined)
      const dashboardLink = page.locator('[data-testid="dashboard-link"]');
      await expect(dashboardLink).toBeVisible();

      // Verify styling differences
      const goBackBgColor = await goBackButton.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      // Primary button should have blue background
      expect(goBackBgColor).toContain('37, 99, 235'); // rgb for #2563eb
    });
  });

  test.describe('Tab Navigation Consistency', () => {
    test('settings page tabs have consistent styling with icons', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', TEST_EMAIL);
      await page.fill('[data-testid="password-input"]', TEST_PASSWORD);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('**/dashboard');

      // Navigate to settings
      await page.goto('/settings');

      // Check personal settings tabs
      const profileTab = page.locator('[data-testid="personal-settings-profile-tab"]');
      const securityTab = page.locator('[data-testid="personal-settings-security-tab"]');

      await expect(profileTab).toBeVisible();
      await expect(securityTab).toBeVisible();

      // Verify tabs have icons (SVG)
      const profileIcon = profileTab.locator('svg');
      const securityIcon = securityTab.locator('svg');

      await expect(profileIcon).toBeVisible();
      await expect(securityIcon).toBeVisible();

      // Test tab switching
      await securityTab.click();
      await expect(securityTab).toHaveClass(/text-primary-600/);
    });
  });

  test.describe('Table Action Buttons', () => {
    test('roles page has styled action buttons', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', TEST_EMAIL);
      await page.fill('[data-testid="password-input"]', TEST_PASSWORD);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('**/dashboard');

      // Navigate to roles
      await page.goto('/roles');
      await page.waitForSelector('[data-testid="roles-management-page"]');

      // Check for styled edit buttons (should have border)
      const editButtons = page.locator('[data-testid^="edit-role-button-"]');
      if (await editButtons.count() > 0) {
        const firstEditButton = editButtons.first();
        await expect(firstEditButton).toBeVisible();

        // Verify button has border styling
        const borderStyle = await firstEditButton.evaluate((el) => {
          return window.getComputedStyle(el).borderWidth;
        });
        expect(borderStyle).not.toBe('0px');
      }
    });
  });

  test.describe('Translation Completeness', () => {
    test('navigation demos translation is present', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', TEST_EMAIL);
      await page.fill('[data-testid="password-input"]', TEST_PASSWORD);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('**/dashboard');

      // Check sidebar for demos translation (in dev mode)
      // The navigation.demos key should be translated
      const sidebar = page.locator('[data-testid="sidebar"]');
      await expect(sidebar).toBeVisible();

      // Verify no untranslated keys are visible (no "navigation.demos" text)
      const untranslatedKey = page.locator('text=navigation.demos');
      await expect(untranslatedKey).toHaveCount(0);
    });

    test('help page API documentation translation is present', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', TEST_EMAIL);
      await page.fill('[data-testid="password-input"]', TEST_PASSWORD);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('**/dashboard');

      // Navigate to help
      await page.goto('/help');

      // Check for API documentation link - should be translated
      const apiLink = page.locator('text=API-Dokumentation, text=API Documentation').first();
      await expect(apiLink).toBeVisible();

      // Verify no untranslated keys
      const untranslatedApiKey = page.locator('text=documentation.api');
      await expect(untranslatedApiKey).toHaveCount(0);
    });
  });

  test.describe('Component Styling', () => {
    test('login form has proper input styling', async ({ page }) => {
      await page.goto('/login');

      const emailInput = page.locator('[data-testid="email-input"]');
      await expect(emailInput).toBeVisible();

      // Verify input has proper border and focus styles
      const borderRadius = await emailInput.evaluate((el) => {
        return window.getComputedStyle(el).borderRadius;
      });
      expect(borderRadius).toBe('8px');
    });

    test('dashboard uses consistent card styling', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', TEST_EMAIL);
      await page.fill('[data-testid="password-input"]', TEST_PASSWORD);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('**/dashboard');

      // Dashboard should have cards with consistent styling
      // Cards should have shadows and borders
      const cards = page.locator('.rounded-lg.shadow-sm.border');
      if (await cards.count() > 0) {
        await expect(cards.first()).toBeVisible();
      }
    });
  });

  test.describe('Accessibility', () => {
    test('password toggle has proper aria labels', async ({ page }) => {
      await page.goto('/login');

      const passwordToggle = page.locator('[data-testid="password-toggle"]');
      const ariaLabel = await passwordToggle.getAttribute('aria-label');

      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain('Passwort');
    });

    test('form inputs have proper labels', async ({ page }) => {
      await page.goto('/login');

      // Check email input has associated label
      const emailLabel = page.locator('label[for="email"], [data-testid="email-label"]');
      await expect(emailLabel).toBeVisible();

      // Check password input has associated label
      const passwordLabel = page.locator('label[for="password"], [data-testid="password-label"]');
      await expect(passwordLabel).toBeVisible();
    });

    test('input fields have visible focus states - STORY-2', async ({ page }) => {
      await page.goto('/login');

      const emailInput = page.locator('[data-testid="email-input"]');
      const passwordInput = page.locator('[data-testid="password-input"]');

      // Click on email input to trigger focus (more reliable than .focus())
      await emailInput.click();

      // Wait for CSS transition to complete (0.2s = 200ms)
      await page.waitForTimeout(250);

      // Verify focus border color changes to primary blue
      const emailFocusBorderColor = await emailInput.evaluate((el) => {
        return window.getComputedStyle(el).borderColor;
      });
      // Should have blue border when focused
      expect(emailFocusBorderColor).toMatch(/rgb\(37, 99, 235\)|#2563eb/i);

      // Click on password input to trigger focus
      await passwordInput.click();

      // Wait for CSS transition to complete
      await page.waitForTimeout(250);

      const passwordFocusBorderColor = await passwordInput.evaluate((el) => {
        return window.getComputedStyle(el).borderColor;
      });
      expect(passwordFocusBorderColor).toMatch(/rgb\(37, 99, 235\)|#2563eb/i);
    });

    test('password toggle button has visible focus state - STORY-2', async ({ page }) => {
      await page.goto('/login');

      const passwordToggle = page.locator('[data-testid="password-toggle"]');

      // Focus the toggle button
      await passwordToggle.focus();

      // Verify the button can receive focus
      await expect(passwordToggle).toBeFocused();

      // Verify it's keyboard accessible
      const ariaPressed = await passwordToggle.getAttribute('aria-pressed');
      expect(ariaPressed).toBe('false');

      // Toggle with keyboard
      await page.keyboard.press('Enter');

      // Verify aria-pressed changed
      const ariaPressedAfter = await passwordToggle.getAttribute('aria-pressed');
      expect(ariaPressedAfter).toBe('true');
    });

    test('focus can navigate through form with Tab key - STORY-2', async ({ page }) => {
      await page.goto('/login');

      // Start by focusing email input
      await page.locator('[data-testid="email-input"]').focus();
      await expect(page.locator('[data-testid="email-input"]')).toBeFocused();

      // Tab to password input
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="password-input"]')).toBeFocused();

      // Tab to password toggle
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="password-toggle"]')).toBeFocused();

      // Tab to forgot password link
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="forgot-password-link"]')).toBeFocused();
    });
  });

  test.describe('Focus State Styling - STORY-2', () => {
    test('email input shows box-shadow on focus', async ({ page }) => {
      await page.goto('/login');

      const emailInput = page.locator('[data-testid="email-input"]');

      // Click to focus (more reliable than .focus())
      await emailInput.click();

      // Wait for CSS transition to complete
      await page.waitForTimeout(250);

      const boxShadow = await emailInput.evaluate((el) => {
        return window.getComputedStyle(el).boxShadow;
      });

      // Should have a box-shadow when focused
      expect(boxShadow).not.toBe('none');
      expect(boxShadow).toContain('rgba');
    });

    test('register page inputs have consistent focus states', async ({ page }) => {
      await page.goto('/register');

      const emailInput = page.locator('[data-testid="email-input"]');

      // Click to focus (more reliable than .focus())
      await emailInput.click();

      // Wait for CSS transition to complete
      await page.waitForTimeout(250);

      const focusBorderColor = await emailInput.evaluate((el) => {
        return window.getComputedStyle(el).borderColor;
      });

      // Should have blue border when focused
      expect(focusBorderColor).toMatch(/rgb\(37, 99, 235\)|#2563eb/i);
    });
  });
});
