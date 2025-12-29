/**
 * Register Page i18n E2E Tests
 * STORY-002-002: Register Page i18n Support
 *
 * End-to-end tests to verify that the register page displays correctly
 * in both English and German languages.
 *
 * Test Scenarios:
 * 1. Register page displays in German (default)
 * 2. Register page displays in English when language is switched
 * 3. All form elements use translated text
 * 4. Validation messages display in correct language
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
  // Wait for the register title to contain the expected translated text
  // This indicates that translations have been loaded from the API
  const expectedTitle = language === 'de' ? 'Registrieren' : 'Register';
  await page.waitForSelector(`[data-testid="register-title"]:has-text("${expectedTitle}")`, { timeout: 10000 });
}

test.describe('Register Page i18n - STORY-002-002', () => {
  // Run tests serially to avoid language state conflicts
  test.describe.configure({ mode: 'serial' });

  test.describe('German Language (Default)', () => {
    test.beforeEach(async ({ page }) => {
      // Clear any existing state and set German language
      await page.goto('/register');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'de');
      });
      await page.reload();
      // Wait for translations to load from the backend API
      await waitForTranslationsToLoad(page, 'de');
    });

    test('displays register page title in German', async ({ page }) => {
      await expect(page.locator('[data-testid="register-title"]')).toContainText('Registrieren');
    });

    test('displays form labels in German', async ({ page }) => {
      // Check email label
      await expect(page.getByText('E-Mail-Adresse')).toBeVisible();

      // Check name label
      await expect(page.getByText('Name', { exact: true })).toBeVisible();

      // Check password label
      await expect(page.getByText('Passwort', { exact: false })).toBeVisible();

      // Check confirm password label
      await expect(page.getByText('Passwort bestätigen')).toBeVisible();
    });

    test('displays placeholders in German', async ({ page }) => {
      const emailInput = page.locator('[data-testid="email-input"]');
      const nameInput = page.locator('[data-testid="name-input"]');
      const passwordInput = page.locator('[data-testid="password-input"]');
      const confirmPasswordInput = page.locator('[data-testid="password-confirm-input"]');

      await expect(emailInput).toHaveAttribute('placeholder', 'ihre@email.de');
      await expect(nameInput).toHaveAttribute('placeholder', 'Ihr Name');
      await expect(passwordInput).toHaveAttribute('placeholder', 'Mindestens 8 Zeichen');
      await expect(confirmPasswordInput).toHaveAttribute('placeholder', 'Passwort wiederholen');
    });

    test('displays submit button in German', async ({ page }) => {
      const registerButton = page.locator('[data-testid="register-button"]');
      await expect(registerButton).toContainText('Registrieren');
    });

    test('displays password requirements in German', async ({ page }) => {
      const passwordRequirements = page.locator('[data-testid="password-requirements"]');
      await expect(passwordRequirements).toContainText('Mindestens 8 Zeichen');
      await expect(passwordRequirements).toContainText('Groß- und Kleinbuchstaben');
      await expect(passwordRequirements).toContainText('Sonderzeichen');
    });

    test('displays privacy policy text in German', async ({ page }) => {
      const privacyNotice = page.locator('[data-testid="privacy-notice"]');
      await expect(privacyNotice).toContainText('Mit der Registrierung stimmen Sie unseren');
      await expect(page.locator('[data-testid="privacy-link"]')).toContainText('Datenschutzbestimmungen');
    });

    test('displays login link text in German', async ({ page }) => {
      await expect(page.getByText('Bereits registriert?')).toBeVisible();
      await expect(page.locator('[data-testid="login-link"]')).toContainText('Anmelden');
    });

    test('form has German aria-label', async ({ page }) => {
      const form = page.locator('[data-testid="register-form"]');
      await expect(form).toHaveAttribute('aria-label', 'Registrierungsformular');
    });

    test('password toggle has German aria-label', async ({ page }) => {
      const passwordToggle = page.locator('[data-testid="password-toggle"]');
      await expect(passwordToggle).toHaveAttribute('aria-label', 'Passwort anzeigen');

      // Click toggle and check for updated aria-label
      await passwordToggle.click();
      await expect(passwordToggle).toHaveAttribute('aria-label', 'Passwort verbergen');
    });

    test('confirm password toggle has German aria-label', async ({ page }) => {
      const confirmToggle = page.locator('[data-testid="password-confirm-toggle"]');
      await expect(confirmToggle).toHaveAttribute('aria-label', 'Passwort anzeigen');

      // Click toggle and check for updated aria-label
      await confirmToggle.click();
      await expect(confirmToggle).toHaveAttribute('aria-label', 'Passwort verbergen');
    });

    test('validation messages display in German - email required', async ({ page }) => {
      // Click submit without entering data
      await page.click('[data-testid="register-button"]');

      // Should show German validation error
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Bitte geben Sie Ihre E-Mail-Adresse ein');
    });

    test('validation messages display in German - invalid email', async ({ page }) => {
      // Enter invalid email
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.fill('[data-testid="name-input"]', 'Test Name');
      await page.fill('[data-testid="password-input"]', 'Password1!');
      await page.fill('[data-testid="password-confirm-input"]', 'Password1!');
      await page.click('[data-testid="register-button"]');

      // Should show German validation error
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Bitte geben Sie eine gültige E-Mail-Adresse ein');
    });

    test('validation messages display in German - name required', async ({ page }) => {
      await page.fill('[data-testid="email-input"]', 'test@example.de');
      await page.click('[data-testid="register-button"]');

      // Should show German validation error for name
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Bitte geben Sie Ihren Namen ein');
    });

    test('validation messages display in German - password mismatch', async ({ page }) => {
      await page.fill('[data-testid="email-input"]', 'test@example.de');
      await page.fill('[data-testid="name-input"]', 'Test Name');
      await page.fill('[data-testid="password-input"]', 'Password1!');
      await page.fill('[data-testid="password-confirm-input"]', 'DifferentPass1!');
      await page.click('[data-testid="register-button"]');

      // Should show German validation error
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Die Passwörter stimmen nicht überein');
    });
  });

  test.describe('English Language', () => {
    test.beforeEach(async ({ page }) => {
      // Clear any existing state and set English language
      await page.goto('/register');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'en');
      });
      await page.reload();
      // Wait for translations to load from the backend API
      await waitForTranslationsToLoad(page, 'en');
    });

    test('displays register page title in English', async ({ page }) => {
      await expect(page.locator('[data-testid="register-title"]')).toContainText('Register');
    });

    test('displays form labels in English', async ({ page }) => {
      // Check email label
      await expect(page.getByText('Email Address')).toBeVisible();

      // Check name label
      await expect(page.getByText('Name', { exact: true })).toBeVisible();

      // Check password label
      await expect(page.getByText('Password', { exact: false })).toBeVisible();

      // Check confirm password label
      await expect(page.getByText('Confirm Password')).toBeVisible();
    });

    test('displays placeholders in English', async ({ page }) => {
      const emailInput = page.locator('[data-testid="email-input"]');
      const nameInput = page.locator('[data-testid="name-input"]');
      const passwordInput = page.locator('[data-testid="password-input"]');
      const confirmPasswordInput = page.locator('[data-testid="password-confirm-input"]');

      await expect(emailInput).toHaveAttribute('placeholder', 'your@email.com');
      await expect(nameInput).toHaveAttribute('placeholder', 'Your name');
      await expect(passwordInput).toHaveAttribute('placeholder', 'At least 8 characters');
      await expect(confirmPasswordInput).toHaveAttribute('placeholder', 'Repeat password');
    });

    test('displays submit button in English', async ({ page }) => {
      const registerButton = page.locator('[data-testid="register-button"]');
      await expect(registerButton).toContainText('Register');
    });

    test('displays password requirements in English', async ({ page }) => {
      const passwordRequirements = page.locator('[data-testid="password-requirements"]');
      await expect(passwordRequirements).toContainText('At least 8 characters');
      await expect(passwordRequirements).toContainText('uppercase and lowercase');
      await expect(passwordRequirements).toContainText('special character');
    });

    test('displays privacy policy text in English', async ({ page }) => {
      const privacyNotice = page.locator('[data-testid="privacy-notice"]');
      await expect(privacyNotice).toContainText('By registering, you agree to our');
      await expect(page.locator('[data-testid="privacy-link"]')).toContainText('Privacy Policy');
    });

    test('displays login link text in English', async ({ page }) => {
      await expect(page.getByText('Already have an account?')).toBeVisible();
      await expect(page.locator('[data-testid="login-link"]')).toContainText('Sign In');
    });

    test('form has English aria-label', async ({ page }) => {
      const form = page.locator('[data-testid="register-form"]');
      await expect(form).toHaveAttribute('aria-label', 'Registration form');
    });

    test('password toggle has English aria-label', async ({ page }) => {
      const passwordToggle = page.locator('[data-testid="password-toggle"]');
      await expect(passwordToggle).toHaveAttribute('aria-label', 'Show password');

      // Click toggle and check for updated aria-label
      await passwordToggle.click();
      await expect(passwordToggle).toHaveAttribute('aria-label', 'Hide password');
    });

    test('confirm password toggle has English aria-label', async ({ page }) => {
      const confirmToggle = page.locator('[data-testid="password-confirm-toggle"]');
      await expect(confirmToggle).toHaveAttribute('aria-label', 'Show password');

      // Click toggle and check for updated aria-label
      await confirmToggle.click();
      await expect(confirmToggle).toHaveAttribute('aria-label', 'Hide password');
    });

    test('validation messages display in English - email required', async ({ page }) => {
      // Click submit without entering data
      await page.click('[data-testid="register-button"]');

      // Should show English validation error
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Please enter your email address');
    });

    test('validation messages display in English - invalid email', async ({ page }) => {
      // Enter invalid email
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.fill('[data-testid="name-input"]', 'Test Name');
      await page.fill('[data-testid="password-input"]', 'Password1!');
      await page.fill('[data-testid="password-confirm-input"]', 'Password1!');
      await page.click('[data-testid="register-button"]');

      // Should show English validation error
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Please enter a valid email address');
    });

    test('validation messages display in English - name required', async ({ page }) => {
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.click('[data-testid="register-button"]');

      // Should show English validation error for name
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Please enter your name');
    });

    test('validation messages display in English - password mismatch', async ({ page }) => {
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="name-input"]', 'Test Name');
      await page.fill('[data-testid="password-input"]', 'Password1!');
      await page.fill('[data-testid="password-confirm-input"]', 'DifferentPass1!');
      await page.click('[data-testid="register-button"]');

      // Should show English validation error
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Passwords do not match');
    });
  });

  test.describe('Language Switching', () => {
    test('can switch from German to English and see updated text', async ({ page }) => {
      // Start with German - navigate first, then set localStorage
      await page.goto('/register');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'de');
      });
      await page.reload();
      await waitForTranslationsToLoad(page, 'de');

      // Verify German
      await expect(page.locator('[data-testid="register-title"]')).toContainText('Registrieren');
      await expect(page.locator('[data-testid="register-button"]')).toContainText('Registrieren');

      // Switch to English
      await page.evaluate(() => {
        localStorage.setItem('language', 'en');
      });
      await page.reload();
      await waitForTranslationsToLoad(page, 'en');

      // Verify English
      await expect(page.locator('[data-testid="register-title"]')).toContainText('Register');
      await expect(page.locator('[data-testid="register-button"]')).toContainText('Register');
    });

    test('can switch from English to German and see updated text', async ({ page }) => {
      // Start with English - navigate first, then set localStorage
      await page.goto('/register');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'en');
      });
      await page.reload();
      await waitForTranslationsToLoad(page, 'en');

      // Verify English
      await expect(page.locator('[data-testid="register-title"]')).toContainText('Register');
      await expect(page.locator('[data-testid="privacy-link"]')).toContainText('Privacy Policy');

      // Switch to German
      await page.evaluate(() => {
        localStorage.setItem('language', 'de');
      });
      await page.reload();
      await waitForTranslationsToLoad(page, 'de');

      // Verify German
      await expect(page.locator('[data-testid="register-title"]')).toContainText('Registrieren');
      await expect(page.locator('[data-testid="privacy-link"]')).toContainText('Datenschutzbestimmungen');
    });

    test('form elements switch languages correctly', async ({ page }) => {
      // Start with German
      await page.goto('/register');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('language', 'de');
      });
      await page.reload();
      await waitForTranslationsToLoad(page, 'de');

      // Verify German placeholders
      await expect(page.locator('[data-testid="email-input"]')).toHaveAttribute('placeholder', 'ihre@email.de');
      await expect(page.locator('[data-testid="password-input"]')).toHaveAttribute('placeholder', 'Mindestens 8 Zeichen');

      // Switch to English
      await page.evaluate(() => {
        localStorage.setItem('language', 'en');
      });
      await page.reload();
      await waitForTranslationsToLoad(page, 'en');

      // Verify English placeholders
      await expect(page.locator('[data-testid="email-input"]')).toHaveAttribute('placeholder', 'your@email.com');
      await expect(page.locator('[data-testid="password-input"]')).toHaveAttribute('placeholder', 'At least 8 characters');
    });
  });
});
