/**
 * Login Page i18n E2E Tests
 * STORY-002-001: Login Page i18n Support
 * STORY-002-REWORK-001: Login Error Message Localization
 *
 * End-to-end tests to verify that the login page displays correctly
 * in both English and German languages.
 *
 * Test Scenarios:
 * 1. Login page displays in German (default)
 * 2. Login page displays in English when language is switched
 * 3. All form elements use translated text
 * 4. Validation messages display in correct language
 * 5. Login error messages display in the correct language (STORY-002-REWORK-001)
 */

import { test, expect } from '@playwright/test';

/**
 * Helper function to wait for translations to load.
 * Translations are fetched from the backend API asynchronously,
 * so we need to wait for them to load before asserting on translated text.
 *
 * @param page - Playwright page object
 * @param language - The expected language ('en' or 'de')
 */
async function waitForTranslationsToLoad(page: import('@playwright/test').Page, language: 'en' | 'de') {
  // Wait for the login title to contain the expected translated text
  // This indicates that translations have been loaded from the API
  const expectedTitle = language === 'de' ? 'Anmelden' : 'Sign In';
  await page.waitForSelector(`[data-testid="login-title"]:has-text("${expectedTitle}")`, { timeout: 10000 });
}

test.describe('Login Page i18n - STORY-002-001', () => {
  // Run tests serially to avoid language state conflicts
  test.describe.configure({ mode: 'serial' });

  test.describe('German Language (Default)', () => {
    test.beforeEach(async ({ page }) => {
      // Clear any existing state and set German language
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'de');
      });
      await page.reload();
      // Wait for translations to load from the backend API
      await waitForTranslationsToLoad(page, 'de');
    });

    test('displays login page title in German', async ({ page }) => {
      await expect(page.locator('[data-testid="login-title"]')).toContainText('Anmelden');
    });

    test('displays form labels in German', async ({ page }) => {
      // Check email label
      await expect(page.getByText('E-Mail-Adresse')).toBeVisible();

      // Check password label
      await expect(page.getByText('Passwort', { exact: false })).toBeVisible();
    });

    test('displays placeholders in German', async ({ page }) => {
      const emailInput = page.locator('[data-testid="email-input"]');
      const passwordInput = page.locator('[data-testid="password-input"]');

      await expect(emailInput).toHaveAttribute('placeholder', 'ihre@email.de');
      await expect(passwordInput).toHaveAttribute('placeholder', 'Ihr Passwort');
    });

    test('displays submit button in German', async ({ page }) => {
      const loginButton = page.locator('[data-testid="login-button"]');
      await expect(loginButton).toContainText('Anmelden');
    });

    test('displays remember me checkbox in German', async ({ page }) => {
      await expect(page.getByText('Angemeldet bleiben')).toBeVisible();
      await expect(page.getByText('Bei Aktivierung bleiben Sie 30 Tage angemeldet')).toBeVisible();
    });

    test('displays forgot password link in German', async ({ page }) => {
      const forgotPasswordLink = page.locator('[data-testid="forgot-password-link"]');
      await expect(forgotPasswordLink).toContainText('Passwort vergessen?');
    });

    test('displays register link text in German', async ({ page }) => {
      await expect(page.getByText('Noch kein Konto?')).toBeVisible();
      await expect(page.locator('[data-testid="register-link"]')).toContainText('Registrieren');
    });

    test('form has German aria-label', async ({ page }) => {
      const form = page.locator('[data-testid="login-form"]');
      await expect(form).toHaveAttribute('aria-label', 'Anmeldeformular');
    });

    test('password toggle has German aria-label', async ({ page }) => {
      const passwordToggle = page.locator('[data-testid="password-toggle"]');
      await expect(passwordToggle).toHaveAttribute('aria-label', 'Passwort anzeigen');

      // Click toggle and check for updated aria-label
      await passwordToggle.click();
      await expect(passwordToggle).toHaveAttribute('aria-label', 'Passwort verbergen');
    });

    test('validation messages display in German', async ({ page }) => {
      // Click submit without entering data
      await page.click('[data-testid="login-button"]');

      // Should show German validation error
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Bitte geben Sie Ihre E-Mail-Adresse ein');
    });

    test('invalid email validation in German', async ({ page }) => {
      // Enter invalid email
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');

      // Should show German validation error
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Bitte geben Sie eine gültige E-Mail-Adresse ein');
    });
  });

  test.describe('English Language', () => {
    test.beforeEach(async ({ page }) => {
      // Clear any existing state and set English language
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'en');
      });
      await page.reload();
      // Wait for translations to load from the backend API
      await waitForTranslationsToLoad(page, 'en');
    });

    test('displays login page title in English', async ({ page }) => {
      await expect(page.locator('[data-testid="login-title"]')).toContainText('Sign In');
    });

    test('displays form labels in English', async ({ page }) => {
      // Check email label
      await expect(page.getByText('Email Address')).toBeVisible();

      // Check password label
      await expect(page.getByText('Password', { exact: false })).toBeVisible();
    });

    test('displays placeholders in English', async ({ page }) => {
      const emailInput = page.locator('[data-testid="email-input"]');
      const passwordInput = page.locator('[data-testid="password-input"]');

      await expect(emailInput).toHaveAttribute('placeholder', 'your@email.com');
      await expect(passwordInput).toHaveAttribute('placeholder', 'Your password');
    });

    test('displays submit button in English', async ({ page }) => {
      const loginButton = page.locator('[data-testid="login-button"]');
      await expect(loginButton).toContainText('Sign In');
    });

    test('displays remember me checkbox in English', async ({ page }) => {
      await expect(page.getByText('Remember me')).toBeVisible();
      await expect(page.getByText('When enabled, you will stay logged in for 30 days')).toBeVisible();
    });

    test('displays forgot password link in English', async ({ page }) => {
      const forgotPasswordLink = page.locator('[data-testid="forgot-password-link"]');
      await expect(forgotPasswordLink).toContainText('Forgot password?');
    });

    test('displays register link text in English', async ({ page }) => {
      await expect(page.getByText("Don't have an account?")).toBeVisible();
      await expect(page.locator('[data-testid="register-link"]')).toContainText('Register');
    });

    test('form has English aria-label', async ({ page }) => {
      const form = page.locator('[data-testid="login-form"]');
      await expect(form).toHaveAttribute('aria-label', 'Login form');
    });

    test('password toggle has English aria-label', async ({ page }) => {
      const passwordToggle = page.locator('[data-testid="password-toggle"]');
      await expect(passwordToggle).toHaveAttribute('aria-label', 'Show password');

      // Click toggle and check for updated aria-label
      await passwordToggle.click();
      await expect(passwordToggle).toHaveAttribute('aria-label', 'Hide password');
    });

    test('validation messages display in English', async ({ page }) => {
      // Click submit without entering data
      await page.click('[data-testid="login-button"]');

      // Should show English validation error
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Please enter your email address');
    });

    test('invalid email validation in English', async ({ page }) => {
      // Enter invalid email
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');

      // Should show English validation error
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Please enter a valid email address');
    });
  });

  test.describe('Language Switching', () => {
    test('can switch from German to English and see updated text', async ({ page }) => {
      // Start with German - navigate first, then set localStorage
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'de');
      });
      await page.reload();
      await waitForTranslationsToLoad(page, 'de');

      // Verify German
      await expect(page.locator('[data-testid="login-title"]')).toContainText('Anmelden');

      // Switch to English
      await page.evaluate(() => {
        localStorage.setItem('language', 'en');
      });
      await page.reload();
      await waitForTranslationsToLoad(page, 'en');

      // Verify English
      await expect(page.locator('[data-testid="login-title"]')).toContainText('Sign In');
    });

    test('can switch from English to German and see updated text', async ({ page }) => {
      // Start with English - navigate first, then set localStorage
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'en');
      });
      await page.reload();
      await waitForTranslationsToLoad(page, 'en');

      // Verify English
      await expect(page.locator('[data-testid="login-title"]')).toContainText('Sign In');

      // Switch to German
      await page.evaluate(() => {
        localStorage.setItem('language', 'de');
      });
      await page.reload();
      await waitForTranslationsToLoad(page, 'de');

      // Verify German
      await expect(page.locator('[data-testid="login-title"]')).toContainText('Anmelden');
    });
  });

  /**
   * STORY-002-REWORK-001: Login Error Message Localization
   *
   * Tests to verify that login error messages (from backend)
   * are displayed in the correct language.
   */
  test.describe('Login Error Message Localization - STORY-002-REWORK-001', () => {
    // Run tests serially to avoid rate limiting from multiple failed login attempts
    test.describe.configure({ mode: 'serial' });

    test.describe('German Error Messages', () => {
      test.beforeEach(async ({ page }) => {
        // Clear any existing state and set German language
        await page.goto('/login');
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
          localStorage.setItem('language', 'de');
        });
        await page.reload();
        await waitForTranslationsToLoad(page, 'de');
      });

      test('displays invalid credentials error in German', async ({ page }) => {
        // Enter invalid credentials
        await page.fill('[data-testid="email-input"]', 'wrong@example.com');
        await page.fill('[data-testid="password-input"]', 'WrongPassword123!');
        await page.click('[data-testid="login-button"]');

        // Should show German error message
        const errorMessage = page.locator('[data-testid="error-message"]');
        await expect(errorMessage).toBeVisible({ timeout: 10000 });
        // The error message should be in German: "Ungültige E-Mail-Adresse oder Passwort."
        await expect(errorMessage).toContainText('Ungültige');
      });

      test('displays invalid password error in German', async ({ page }) => {
        // Use valid email but wrong password
        await page.fill('[data-testid="email-input"]', 'admin@example.com');
        await page.fill('[data-testid="password-input"]', 'WrongPassword123!');
        await page.click('[data-testid="login-button"]');

        // Should show German error message
        const errorMessage = page.locator('[data-testid="error-message"]');
        await expect(errorMessage).toBeVisible({ timeout: 10000 });
        // The error message should be in German
        await expect(errorMessage).toContainText('Ungültige');
      });
    });

    test.describe('English Error Messages', () => {
      test.beforeEach(async ({ page }) => {
        // Clear any existing state and set English language
        await page.goto('/login');
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
          localStorage.setItem('language', 'en');
        });
        await page.reload();
        await waitForTranslationsToLoad(page, 'en');
      });

      test('displays invalid credentials error in English', async ({ page }) => {
        // Enter invalid credentials
        await page.fill('[data-testid="email-input"]', 'wrong@example.com');
        await page.fill('[data-testid="password-input"]', 'WrongPassword123!');
        await page.click('[data-testid="login-button"]');

        // Should show English error message
        const errorMessage = page.locator('[data-testid="error-message"]');
        await expect(errorMessage).toBeVisible({ timeout: 10000 });
        // The error message should be in English: "Invalid email or password."
        await expect(errorMessage).toContainText('Invalid');
      });

      test('displays invalid password error in English', async ({ page }) => {
        // Use valid email but wrong password
        await page.fill('[data-testid="email-input"]', 'admin@example.com');
        await page.fill('[data-testid="password-input"]', 'WrongPassword123!');
        await page.click('[data-testid="login-button"]');

        // Should show English error message
        const errorMessage = page.locator('[data-testid="error-message"]');
        await expect(errorMessage).toBeVisible({ timeout: 10000 });
        // The error message should be in English
        await expect(errorMessage).toContainText('Invalid');
      });
    });

    test.describe('Error Message Language Consistency', () => {
      test('error message language matches UI language (German)', async ({ page }) => {
        // Set German language
        await page.goto('/login');
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
          localStorage.setItem('language', 'de');
        });
        await page.reload();
        await waitForTranslationsToLoad(page, 'de');

        // Verify UI is in German
        await expect(page.locator('[data-testid="login-title"]')).toContainText('Anmelden');

        // Trigger login error
        await page.fill('[data-testid="email-input"]', 'wrong@example.com');
        await page.fill('[data-testid="password-input"]', 'WrongPassword123!');
        await page.click('[data-testid="login-button"]');

        // Error should be in German (not English like "Invalid email or password")
        const errorMessage = page.locator('[data-testid="error-message"]');
        await expect(errorMessage).toBeVisible({ timeout: 10000 });
        // Should NOT contain English error message
        await expect(errorMessage).not.toContainText('Invalid email or password');
      });

      test('error message language matches UI language (English)', async ({ page }) => {
        // Set English language
        await page.goto('/login');
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
          localStorage.setItem('language', 'en');
        });
        await page.reload();
        await waitForTranslationsToLoad(page, 'en');

        // Verify UI is in English
        await expect(page.locator('[data-testid="login-title"]')).toContainText('Sign In');

        // Trigger login error
        await page.fill('[data-testid="email-input"]', 'wrong@example.com');
        await page.fill('[data-testid="password-input"]', 'WrongPassword123!');
        await page.click('[data-testid="login-button"]');

        // Error should be in English (not German like "Ungültige E-Mail-Adresse oder Passwort")
        const errorMessage = page.locator('[data-testid="error-message"]');
        await expect(errorMessage).toBeVisible({ timeout: 10000 });
        // Should NOT contain German error message
        await expect(errorMessage).not.toContainText('Ungültige');
      });
    });
  });
});
