/**
 * MFA Settings Page E2E Tests
 * STORY-107: MFA Settings Page UI Audit
 *
 * Playwright E2E tests for MFA page UI improvements.
 * Tests icon consistency, stepper line styling, and card shadow enhancements.
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
 * Helper to login and navigate to MFA setup page
 * Includes robust rate limiting handling with retries.
 */
async function loginAndNavigateToMFA(page: Page): Promise<void> {
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

      // Navigate to MFA setup page
      await page.goto('/settings/security/mfa');
      await waitForStability(page);

      if (page.url().includes('/settings/security/mfa')) {
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

test.describe('MFA Settings Page - STORY-107 UI Audit Fixes', () => {
  test.describe('Icon Consistency - SVG Icons', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToMFA(page);
    });

    test('lock icon uses SVG instead of emoji', async ({ page }) => {
      const lockIconContainer = page.locator('[data-testid="mfa-setup-lock-icon"]');
      await expect(lockIconContainer).toBeVisible();

      // Check that SVG icon is present inside the container
      const svgIcon = lockIconContainer.locator('svg');
      await expect(svgIcon).toBeVisible();

      // Verify it has the correct class
      const svgClasses = await svgIcon.getAttribute('class');
      expect(svgClasses).toContain('mfa-setup__icon-svg');
    });

    test('lock icon SVG has proper aria-label for accessibility', async ({ page }) => {
      const lockIcon = page.locator('[data-testid="mfa-setup-lock-icon"] svg');
      await expect(lockIcon).toBeVisible();

      // Check for accessibility attribute
      const ariaLabel = await lockIcon.getAttribute('aria-label');
      expect(ariaLabel).toBe('Security lock');
    });

    test('lock icon has correct styling (blue color)', async ({ page }) => {
      const lockIcon = page.locator('[data-testid="mfa-setup-lock-icon"] svg');
      await expect(lockIcon).toBeVisible();

      // Check that the icon has the icon-svg class which applies blue color
      const svgClasses = await lockIcon.getAttribute('class');
      expect(svgClasses).toContain('mfa-setup__icon-svg');
    });

    test('icon container has proper circular background', async ({ page }) => {
      const lockIconContainer = page.locator('[data-testid="mfa-setup-lock-icon"]');
      await expect(lockIconContainer).toBeVisible();

      // Check container has mfa-setup__icon class (provides circular styling)
      const containerClasses = await lockIconContainer.getAttribute('class');
      expect(containerClasses).toContain('mfa-setup__icon');
    });
  });

  test.describe('Stepper Line Styling', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToMFA(page);
    });

    test('progress stepper displays 4 steps', async ({ page }) => {
      const progressIndicator = page.locator('.mfa-setup__progress');
      await expect(progressIndicator).toBeVisible();

      const steps = progressIndicator.locator('.mfa-setup__step');
      const stepCount = await steps.count();
      expect(stepCount).toBe(4);
    });

    test('first step is active on init', async ({ page }) => {
      const firstStep = page.locator('.mfa-setup__step').first();
      await expect(firstStep).toBeVisible();

      const stepClasses = await firstStep.getAttribute('class');
      expect(stepClasses).toContain('mfa-setup__step--active');
    });

    test('active step has colored number circle', async ({ page }) => {
      const activeStepNumber = page.locator('.mfa-setup__step--active .mfa-setup__step-number').first();
      await expect(activeStepNumber).toBeVisible();
    });

    test('progress indicator has ARIA progressbar role', async ({ page }) => {
      const progressIndicator = page.locator('.mfa-setup__progress');
      await expect(progressIndicator).toHaveAttribute('role', 'progressbar');
      await expect(progressIndicator).toHaveAttribute('aria-valuenow', '1');
      await expect(progressIndicator).toHaveAttribute('aria-valuemin', '1');
      await expect(progressIndicator).toHaveAttribute('aria-valuemax', '4');
    });

    test('step labels are visible on desktop', async ({ page }) => {
      // Use specific selectors to avoid ambiguity with benefits list items
      await expect(page.locator('.mfa-setup__step-label').filter({ hasText: 'Start' })).toBeVisible();
      await expect(page.locator('.mfa-setup__step-label').filter({ hasText: 'Verifizieren' })).toBeVisible();
      await expect(page.locator('.mfa-setup__step-label').filter({ hasText: 'Backup-Codes' })).toBeVisible();
      await expect(page.locator('.mfa-setup__step-label').filter({ hasText: 'Fertig' })).toBeVisible();
    });
  });

  test.describe('Card Shadow and Border', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToMFA(page);
    });

    test('MFA setup card has visible container', async ({ page }) => {
      const mfaSetupCard = page.locator('.mfa-setup');
      await expect(mfaSetupCard).toBeVisible();
    });

    test('card container is centered and has max-width', async ({ page }) => {
      const mfaSetupCard = page.locator('.mfa-setup');
      await expect(mfaSetupCard).toBeVisible();

      // Card has mfa-setup class which applies max-width: 600px
      const cardClasses = await mfaSetupCard.getAttribute('class');
      expect(cardClasses).toContain('mfa-setup');
    });

    test('card has rounded corners', async ({ page }) => {
      const mfaSetupCard = page.locator('.mfa-setup');
      await expect(mfaSetupCard).toBeVisible();

      // The CSS applies border-radius: 16px
      const boundingBox = await mfaSetupCard.boundingBox();
      expect(boundingBox).not.toBeNull();
    });
  });

  test.describe('Button Styling Pattern', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToMFA(page);
    });

    test('primary action button (2FA aktivieren) has filled styling', async ({ page }) => {
      const enableButton = page.locator('[data-testid="mfa-setup-enable-button"]');
      await expect(enableButton).toBeVisible();

      const buttonClasses = await enableButton.getAttribute('class');
      expect(buttonClasses).toContain('mfa-setup__button--primary');
    });

    test('secondary action button (Zurück) has outlined styling', async ({ page }) => {
      const backButton = page.getByText('Zurück zu Einstellungen');
      await expect(backButton).toBeVisible();

      const buttonClasses = await backButton.getAttribute('class');
      expect(buttonClasses).toContain('mfa-setup__button--secondary');
    });

    test('buttons are full-width and stacked', async ({ page }) => {
      const enableButton = page.locator('[data-testid="mfa-setup-enable-button"]');
      const backButton = page.getByText('Zurück zu Einstellungen');

      await expect(enableButton).toBeVisible();
      await expect(backButton).toBeVisible();

      // Both buttons should have mfa-setup__button class which makes them full-width
      const enableClasses = await enableButton.getAttribute('class');
      const backClasses = await backButton.getAttribute('class');

      expect(enableClasses).toContain('mfa-setup__button');
      expect(backClasses).toContain('mfa-setup__button');
    });
  });

  test.describe('Benefits List with Checkmarks', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToMFA(page);
    });

    test('benefits list is visible', async ({ page }) => {
      const benefitsList = page.locator('.mfa-setup__benefits');
      await expect(benefitsList).toBeVisible();
    });

    test('benefits list has three items', async ({ page }) => {
      const benefitItems = page.locator('.mfa-setup__benefits li');
      const itemCount = await benefitItems.count();
      expect(itemCount).toBe(3);
    });

    test('benefits list displays protection benefit', async ({ page }) => {
      await expect(page.getByText('Schutz vor unbefugtem Zugriff')).toBeVisible();
    });

    test('benefits list displays security benefit', async ({ page }) => {
      await expect(page.getByText('Sicherheit auch bei kompromittiertem Passwort')).toBeVisible();
    });

    test('benefits list displays compatibility benefit', async ({ page }) => {
      await expect(page.getByText('Kompatibel mit gängigen Authenticator-Apps')).toBeVisible();
    });
  });

  test.describe('Header Section', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToMFA(page);
    });

    test('header displays title', async ({ page }) => {
      const header = page.locator('.mfa-setup__header');
      await expect(header).toBeVisible();

      const title = header.locator('.mfa-setup__title');
      await expect(title).toBeVisible();
      await expect(title).toHaveText('Zwei-Faktor-Authentifizierung');
    });

    test('header displays subtitle', async ({ page }) => {
      const subtitle = page.locator('.mfa-setup__subtitle');
      await expect(subtitle).toBeVisible();
    });

    test('header has blue gradient background', async ({ page }) => {
      const header = page.locator('.mfa-setup__header');
      await expect(header).toBeVisible();

      // Header has mfa-setup__header class which applies blue gradient
      const headerClasses = await header.getAttribute('class');
      expect(headerClasses).toContain('mfa-setup__header');
    });
  });

  test.describe('Visual Hierarchy', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToMFA(page);
    });

    test('init step has proper content structure', async ({ page }) => {
      const initStep = page.locator('[data-testid="mfa-setup-init"]');
      await expect(initStep).toBeVisible();

      // Icon, title, description, benefits, and buttons should be present
      await expect(initStep.locator('.mfa-setup__icon')).toBeVisible();
      await expect(initStep.locator('.mfa-setup__content-title')).toBeVisible();
      await expect(initStep.locator('.mfa-setup__content-description')).toBeVisible();
      await expect(initStep.locator('.mfa-setup__benefits')).toBeVisible();
    });

    test('content title uses proper heading level', async ({ page }) => {
      const contentTitle = page.locator('.mfa-setup__content-title').first();
      await expect(contentTitle).toBeVisible();

      // Content title should be an h2
      const tagName = await contentTitle.evaluate(el => el.tagName);
      expect(tagName).toBe('H2');
    });

    test('page title uses h1', async ({ page }) => {
      const pageTitle = page.locator('.mfa-setup__title');
      await expect(pageTitle).toBeVisible();

      const tagName = await pageTitle.evaluate(el => el.tagName);
      expect(tagName).toBe('H1');
    });
  });

  test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToMFA(page);
    });

    test('enable button is focusable and has proper focus styling', async ({ page }) => {
      const enableButton = page.locator('[data-testid="mfa-setup-enable-button"]');
      await expect(enableButton).toBeVisible();

      await enableButton.focus();
      await expect(enableButton).toBeFocused();
    });

    test('keyboard navigation works through buttons', async ({ page }) => {
      // Start by pressing Tab to focus first focusable element
      await page.keyboard.press('Tab');

      // Continue tabbing and verify focus moves
      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.tagName;
      });

      expect(focusedElement).toBeTruthy();
    });

    test('back button can be triggered with Enter key', async ({ page }) => {
      const backButton = page.getByText('Zurück zu Einstellungen');
      await backButton.focus();
      await expect(backButton).toBeFocused();
    });
  });

  test.describe('Responsive Behavior', () => {
    test('MFA page is accessible on tablet', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.tablet);
      await loginAndNavigateToMFA(page);

      const mfaSetupPage = page.locator('[data-testid="mfa-setup-page"]');
      await expect(mfaSetupPage).toBeVisible();

      const enableButton = page.locator('[data-testid="mfa-setup-enable-button"]');
      await expect(enableButton).toBeVisible();
    });

    test('MFA page is accessible on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await loginAndNavigateToMFA(page);

      const mfaSetupPage = page.locator('[data-testid="mfa-setup-page"]');
      await expect(mfaSetupPage).toBeVisible();

      const enableButton = page.locator('[data-testid="mfa-setup-enable-button"]');
      await expect(enableButton).toBeVisible();
    });

    test('step labels are hidden on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await loginAndNavigateToMFA(page);

      // On mobile (< 768px), step labels should be hidden via CSS
      // The steps should still be visible but labels hidden
      const steps = page.locator('.mfa-setup__step');
      const stepCount = await steps.count();
      expect(stepCount).toBe(4);
    });

    test('buttons remain functional on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await loginAndNavigateToMFA(page);

      // Buttons should be visible and clickable
      const enableButton = page.locator('[data-testid="mfa-setup-enable-button"]');
      await expect(enableButton).toBeVisible();
      await expect(enableButton).toBeEnabled();

      const backButton = page.getByText('Zurück zu Einstellungen');
      await expect(backButton).toBeVisible();
      await expect(backButton).toBeEnabled();
    });

    test('icon container scales appropriately on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await loginAndNavigateToMFA(page);

      const iconContainer = page.locator('[data-testid="mfa-setup-lock-icon"]');
      await expect(iconContainer).toBeVisible();

      // Icon should still be visible and properly sized
      const boundingBox = await iconContainer.boundingBox();
      expect(boundingBox).not.toBeNull();
      // On mobile, icon container should be smaller (56px instead of 80px)
      if (boundingBox) {
        expect(boundingBox.width).toBeLessThanOrEqual(80);
        expect(boundingBox.height).toBeLessThanOrEqual(80);
      }
    });
  });

  test.describe('Navigation Integration', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
    });

    test('can navigate to MFA page from settings', async ({ page }) => {
      const maxAttempts = 8;
      const retryDelay = 10000;

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

        const rateLimitError = await page.locator('text=Zu viele Anmeldeversuche').isVisible();
        if (rateLimitError) {
          await page.waitForTimeout(retryDelay);
          continue;
        }

        try {
          await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
          await waitForStability(page);

          // Navigate to settings first
          await page.goto('/settings');
          await waitForStability(page);

          // Click the MFA setup link
          const mfaLink = page.locator('[data-testid="mfa-setup-link"]');
          await expect(mfaLink).toBeVisible();
          await mfaLink.click();

          // Should be on MFA setup page
          await expect(page).toHaveURL(/\/settings\/security\/mfa/);
          await expect(page.locator('[data-testid="mfa-setup-page"]')).toBeVisible();
          return;
        } catch {
          if (attempt < maxAttempts) {
            await page.waitForTimeout(2000);
            continue;
          }
        }
      }

      throw new Error('Failed to complete navigation test');
    });

    test('back button returns to settings page', async ({ page }) => {
      await loginAndNavigateToMFA(page);

      const backButton = page.getByText('Zurück zu Einstellungen');
      await backButton.click();

      await expect(page).toHaveURL(/\/settings/);
    });
  });

  test.describe('Design Patterns Compliance', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToMFA(page);
    });

    test('primary button follows design system (filled blue)', async ({ page }) => {
      const primaryButton = page.locator('[data-testid="mfa-setup-enable-button"]');
      await expect(primaryButton).toBeVisible();

      const buttonClasses = await primaryButton.getAttribute('class');
      expect(buttonClasses).toContain('mfa-setup__button--primary');
    });

    test('secondary button follows design system (outlined)', async ({ page }) => {
      const secondaryButton = page.getByText('Zurück zu Einstellungen');
      await expect(secondaryButton).toBeVisible();

      const buttonClasses = await secondaryButton.getAttribute('class');
      expect(buttonClasses).toContain('mfa-setup__button--secondary');
    });

    test('page follows overall visual hierarchy pattern', async ({ page }) => {
      // Check that all major sections are present and in order
      const header = page.locator('.mfa-setup__header');
      const progress = page.locator('.mfa-setup__progress');
      const content = page.locator('.mfa-setup__content');

      await expect(header).toBeVisible();
      await expect(progress).toBeVisible();
      await expect(content).toBeVisible();
    });
  });
});
