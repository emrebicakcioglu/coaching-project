/**
 * Help Page E2E Tests
 * STORY-108: Help Page UI Audit
 *
 * Playwright E2E tests for help page UI improvements.
 * Tests translation loading, card styling consistency, FAQ accordion behavior,
 * contact icon sizing, documentation link hover states, and version display.
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
 * Helper to wait for help page translations to load
 * Waits for the loading state to disappear and content to be visible
 */
async function waitForHelpPageReady(page: Page): Promise<void> {
  // Wait for either the loading indicator to disappear or the content to appear
  // The page shows a loading spinner while translations are being fetched
  const loadingIndicator = page.locator('[data-testid="help-loading"]');
  const pageTitle = page.locator('[data-testid="help-page-title"]');

  // Wait up to 10 seconds for translations to load
  try {
    // First, wait for initial render
    await page.waitForTimeout(200);

    // If loading indicator is visible, wait for it to disappear
    if (await loadingIndicator.isVisible()) {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // Then wait for the main content to be visible
    await pageTitle.waitFor({ state: 'visible', timeout: 10000 });
  } catch {
    // If we timeout, proceed anyway and let the test fail with a clear error
    console.log('Warning: Help page may not have fully loaded');
  }
}

/**
 * Helper to login and navigate to help page
 * Includes robust rate limiting handling with retries.
 */
async function loginAndNavigateToHelp(page: Page): Promise<void> {
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

      // Navigate to help page
      await page.goto('/help');
      await waitForStability(page);

      // Wait for help page content to be fully loaded (translations ready)
      await waitForHelpPageReady(page);

      if (page.url().includes('/help')) {
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

test.describe('Help Page - STORY-108 UI Audit Fixes', () => {
  test.describe('Translation Loading', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToHelp(page);
    });

    test('page title shows translated text, not translation key', async ({ page }) => {
      const title = page.locator('[data-testid="help-page-title"]');
      await expect(title).toBeVisible();

      const titleText = await title.textContent();
      // Should not contain translation key format like "title" or "help.title"
      expect(titleText).not.toBe('title');
      expect(titleText).not.toBe('help.title');
      // Should contain actual translated text (German or English)
      expect(titleText?.length).toBeGreaterThan(3);
    });

    test('documentation.api shows translated text', async ({ page }) => {
      const apiDocLink = page.locator('[data-testid="doc-link-api"]');
      await expect(apiDocLink).toBeVisible();

      const linkText = await apiDocLink.textContent();
      // Should not contain raw translation key
      expect(linkText).not.toContain('documentation.api');
      // Should contain actual translated text
      expect(linkText?.length).toBeGreaterThan(3);
    });

    test('version section shows version number, not translation key', async ({ page }) => {
      const versionNumber = page.locator('[data-testid="version-number"]');
      await expect(versionNumber).toBeVisible();

      const versionText = await versionNumber.textContent();
      // Should not contain translation key
      expect(versionText).not.toContain('version.current');
      // Should contain version pattern (v followed by numbers)
      expect(versionText).toMatch(/v\d+\.\d+\.\d+/);
    });

    test('FAQ questions show translated text', async ({ page }) => {
      const firstQuestion = page.locator('[data-testid="faq-question-createUser"]');
      await expect(firstQuestion).toBeVisible();

      const questionText = await firstQuestion.textContent();
      // Should not contain translation key
      expect(questionText).not.toContain('faq.questions');
      // Should contain actual question text
      expect(questionText?.length).toBeGreaterThan(10);
    });
  });

  test.describe('Card Styling Consistency', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToHelp(page);
    });

    test('FAQ card has unified styling', async ({ page }) => {
      const faqCard = page.locator('[data-testid="faq-card"]');
      await expect(faqCard).toBeVisible();

      const cardClasses = await faqCard.getAttribute('class');
      expect(cardClasses).toContain('rounded-lg');
      expect(cardClasses).toContain('shadow-sm');
      expect(cardClasses).toContain('border');
    });

    test('contact card has unified styling', async ({ page }) => {
      const contactCard = page.locator('[data-testid="contact-card"]');
      await expect(contactCard).toBeVisible();

      const cardClasses = await contactCard.getAttribute('class');
      expect(cardClasses).toContain('rounded-lg');
      expect(cardClasses).toContain('shadow-sm');
      expect(cardClasses).toContain('border');
    });

    test('documentation card has unified styling', async ({ page }) => {
      const docCard = page.locator('[data-testid="documentation-card"]');
      await expect(docCard).toBeVisible();

      const cardClasses = await docCard.getAttribute('class');
      expect(cardClasses).toContain('rounded-lg');
      expect(cardClasses).toContain('shadow-sm');
      expect(cardClasses).toContain('border');
    });

    test('version card has unified styling', async ({ page }) => {
      const versionCard = page.locator('[data-testid="version-card"]');
      await expect(versionCard).toBeVisible();

      const cardClasses = await versionCard.getAttribute('class');
      expect(cardClasses).toContain('rounded-lg');
      expect(cardClasses).toContain('shadow-sm');
      expect(cardClasses).toContain('border');
    });

    test('all cards use CSS variables for background', async ({ page }) => {
      const faqCard = page.locator('[data-testid="faq-card"]');
      const contactCard = page.locator('[data-testid="contact-card"]');
      const docCard = page.locator('[data-testid="documentation-card"]');
      const versionCard = page.locator('[data-testid="version-card"]');

      // All cards should have CSS variable-based background
      for (const card of [faqCard, contactCard, docCard, versionCard]) {
        const cardClasses = await card.getAttribute('class');
        expect(cardClasses).toContain('bg-[var(--color-background-card');
      }
    });
  });

  test.describe('FAQ Accordion Interaction', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToHelp(page);
    });

    test('FAQ questions are clickable buttons', async ({ page }) => {
      const firstQuestion = page.locator('[data-testid="faq-question-createUser"]');
      await expect(firstQuestion).toBeVisible();

      // Should be a button element
      const tagName = await firstQuestion.evaluate((el) => el.tagName.toLowerCase());
      expect(tagName).toBe('button');
    });

    test('FAQ questions have chevron icons', async ({ page }) => {
      const firstQuestion = page.locator('[data-testid="faq-question-createUser"]');
      await expect(firstQuestion).toBeVisible();

      // Should contain an SVG icon (chevron)
      const chevronIcon = firstQuestion.locator('svg');
      await expect(chevronIcon).toBeVisible();
    });

    test('clicking FAQ question expands answer', async ({ page }) => {
      const firstQuestion = page.locator('[data-testid="faq-question-createUser"]');
      const firstAnswer = page.locator('[data-testid="faq-answer-createUser"]');

      await expect(firstQuestion).toBeVisible();

      // Initially answer should have max-h-0 (collapsed)
      let answerClasses = await firstAnswer.getAttribute('class');
      expect(answerClasses).toContain('max-h-0');

      // Click to expand
      await firstQuestion.click();
      await page.waitForTimeout(300); // Wait for animation

      // Answer should now have max-h-96 (expanded)
      answerClasses = await firstAnswer.getAttribute('class');
      expect(answerClasses).toContain('max-h-96');
    });

    test('clicking expanded FAQ question collapses it', async ({ page }) => {
      const firstQuestion = page.locator('[data-testid="faq-question-createUser"]');
      const firstAnswer = page.locator('[data-testid="faq-answer-createUser"]');

      // Expand first
      await firstQuestion.click();
      await page.waitForTimeout(300);

      let answerClasses = await firstAnswer.getAttribute('class');
      expect(answerClasses).toContain('max-h-96');

      // Click again to collapse
      await firstQuestion.click();
      await page.waitForTimeout(300);

      answerClasses = await firstAnswer.getAttribute('class');
      expect(answerClasses).toContain('max-h-0');
    });

    test('FAQ questions have hover state', async ({ page }) => {
      const firstQuestion = page.locator('[data-testid="faq-question-createUser"]');
      await expect(firstQuestion).toBeVisible();

      const questionClasses = await firstQuestion.getAttribute('class');
      expect(questionClasses).toContain('hover:bg-');
    });

    test('FAQ questions have proper ARIA attributes', async ({ page }) => {
      const firstQuestion = page.locator('[data-testid="faq-question-createUser"]');
      await expect(firstQuestion).toBeVisible();

      // Should have aria-expanded attribute
      const ariaExpanded = await firstQuestion.getAttribute('aria-expanded');
      expect(ariaExpanded).toBe('false');

      // Should have aria-controls attribute
      const ariaControls = await firstQuestion.getAttribute('aria-controls');
      expect(ariaControls).toBeTruthy();

      // Click to expand
      await firstQuestion.click();
      await page.waitForTimeout(100);

      // aria-expanded should now be true
      const ariaExpandedAfter = await firstQuestion.getAttribute('aria-expanded');
      expect(ariaExpandedAfter).toBe('true');
    });

    test('chevron icon rotates when expanded', async ({ page }) => {
      const firstQuestion = page.locator('[data-testid="faq-question-createUser"]');
      const chevronIcon = firstQuestion.locator('svg');

      await expect(chevronIcon).toBeVisible();

      // Initially should not have rotate-180 class
      let iconClasses = await chevronIcon.getAttribute('class');
      expect(iconClasses).not.toContain('rotate-180');

      // Click to expand
      await firstQuestion.click();
      await page.waitForTimeout(300);

      // Should now have rotate-180 class
      iconClasses = await chevronIcon.getAttribute('class');
      expect(iconClasses).toContain('rotate-180');
    });
  });

  test.describe('Contact Icons Sizing', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToHelp(page);
    });

    test('email icon container has consistent dimensions', async ({ page }) => {
      const emailIconContainer = page.locator('[data-testid="email-icon-container"]');
      await expect(emailIconContainer).toBeVisible();

      const classes = await emailIconContainer.getAttribute('class');
      expect(classes).toContain('w-10');
      expect(classes).toContain('h-10');
    });

    test('phone icon container has consistent dimensions', async ({ page }) => {
      const phoneIconContainer = page.locator('[data-testid="phone-icon-container"]');
      await expect(phoneIconContainer).toBeVisible();

      const classes = await phoneIconContainer.getAttribute('class');
      expect(classes).toContain('w-10');
      expect(classes).toContain('h-10');
    });

    test('both icon containers have rounded-lg styling', async ({ page }) => {
      const emailIconContainer = page.locator('[data-testid="email-icon-container"]');
      const phoneIconContainer = page.locator('[data-testid="phone-icon-container"]');

      const emailClasses = await emailIconContainer.getAttribute('class');
      const phoneClasses = await phoneIconContainer.getAttribute('class');

      expect(emailClasses).toContain('rounded-lg');
      expect(phoneClasses).toContain('rounded-lg');
    });

    test('email icon has blue background', async ({ page }) => {
      const emailIconContainer = page.locator('[data-testid="email-icon-container"]');
      const classes = await emailIconContainer.getAttribute('class');
      expect(classes).toContain('bg-primary-100');
    });

    test('phone icon has green background', async ({ page }) => {
      const phoneIconContainer = page.locator('[data-testid="phone-icon-container"]');
      const classes = await phoneIconContainer.getAttribute('class');
      expect(classes).toContain('bg-green-100');
    });
  });

  test.describe('Documentation Links', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToHelp(page);
    });

    test('documentation links have hover states', async ({ page }) => {
      const gettingStartedLink = page.locator('[data-testid="doc-link-getting-started"]');
      await expect(gettingStartedLink).toBeVisible();

      const classes = await gettingStartedLink.getAttribute('class');
      expect(classes).toContain('hover:bg-');
    });

    test('documentation links have document icons', async ({ page }) => {
      const links = [
        'doc-link-getting-started',
        'doc-link-user-management',
        'doc-link-roles-permissions',
        'doc-link-api',
      ];

      for (const linkId of links) {
        const link = page.locator(`[data-testid="${linkId}"]`);
        await expect(link).toBeVisible();

        const icon = link.locator('svg');
        await expect(icon).toBeVisible();
      }
    });

    test('documentation links have proper padding for hover area', async ({ page }) => {
      const gettingStartedLink = page.locator('[data-testid="doc-link-getting-started"]');
      await expect(gettingStartedLink).toBeVisible();

      const classes = await gettingStartedLink.getAttribute('class');
      expect(classes).toContain('py-2');
      expect(classes).toContain('px-3');
      expect(classes).toContain('rounded-md');
    });

    test('all four documentation links are present', async ({ page }) => {
      const docList = page.locator('[data-testid="documentation-list"]');
      await expect(docList).toBeVisible();

      const links = docList.locator('a');
      const count = await links.count();
      expect(count).toBe(4);
    });
  });

  test.describe('Version Information Display', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToHelp(page);
    });

    test('version card is visible', async ({ page }) => {
      const versionCard = page.locator('[data-testid="version-card"]');
      await expect(versionCard).toBeVisible();
    });

    test('version title is displayed', async ({ page }) => {
      const versionTitle = page.locator('[data-testid="version-title"]');
      await expect(versionTitle).toBeVisible();

      const titleText = await versionTitle.textContent();
      expect(titleText?.length).toBeGreaterThan(0);
    });

    test('version number is displayed prominently', async ({ page }) => {
      const versionNumber = page.locator('[data-testid="version-number"]');
      await expect(versionNumber).toBeVisible();

      const classes = await versionNumber.getAttribute('class');
      expect(classes).toContain('text-lg');
      expect(classes).toContain('font-semibold');
    });

    test('version number starts with "v"', async ({ page }) => {
      const versionNumber = page.locator('[data-testid="version-number"]');
      const versionText = await versionNumber.textContent();
      expect(versionText).toMatch(/^v/);
    });

    test('build date is displayed', async ({ page }) => {
      const buildDate = page.locator('[data-testid="version-build-date"]');
      await expect(buildDate).toBeVisible();

      const dateText = await buildDate.textContent();
      expect(dateText).toContain('Build');
    });
  });

  test.describe('Page Layout', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToHelp(page);
    });

    test('page has two-column layout on desktop', async ({ page }) => {
      // FAQ section should take 2 columns
      const faqSection = page.locator('[data-testid="faq-card"]').locator('..');
      const faqClasses = await faqSection.getAttribute('class');
      expect(faqClasses).toContain('lg:col-span-2');
    });

    test('page header is visible', async ({ page }) => {
      const title = page.locator('[data-testid="help-page-title"]');
      const subtitle = page.locator('[data-testid="help-page-subtitle"]');

      await expect(title).toBeVisible();
      await expect(subtitle).toBeVisible();
    });

    test('all sections are visible on page load', async ({ page }) => {
      await expect(page.locator('[data-testid="faq-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="contact-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="documentation-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="version-card"]')).toBeVisible();
    });
  });

  test.describe('Responsive Behavior', () => {
    test('page is accessible on tablet', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.tablet);
      await loginAndNavigateToHelp(page);

      await expect(page.locator('[data-testid="faq-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="contact-card"]')).toBeVisible();
    });

    test('page is accessible on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await loginAndNavigateToHelp(page);

      await expect(page.locator('[data-testid="faq-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="contact-card"]')).toBeVisible();
    });

    test('FAQ accordion works on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await loginAndNavigateToHelp(page);

      const firstQuestion = page.locator('[data-testid="faq-question-createUser"]');
      const firstAnswer = page.locator('[data-testid="faq-answer-createUser"]');

      await firstQuestion.click();
      await page.waitForTimeout(300);

      const answerClasses = await firstAnswer.getAttribute('class');
      expect(answerClasses).toContain('max-h-96');
    });

    test('sidebar cards stack on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await loginAndNavigateToHelp(page);

      // All cards should still be visible and stacked
      await expect(page.locator('[data-testid="faq-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="contact-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="documentation-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="version-card"]')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToHelp(page);
    });

    test('FAQ questions are keyboard accessible', async ({ page }) => {
      const firstQuestion = page.locator('[data-testid="faq-question-createUser"]');
      await expect(firstQuestion).toBeVisible();

      await firstQuestion.focus();
      await expect(firstQuestion).toBeFocused();
    });

    test('FAQ questions have focus ring styling', async ({ page }) => {
      const firstQuestion = page.locator('[data-testid="faq-question-createUser"]');
      const classes = await firstQuestion.getAttribute('class');

      expect(classes).toContain('focus:outline-none');
      expect(classes).toContain('focus:ring-2');
    });

    test('page has proper heading hierarchy', async ({ page }) => {
      // H1 for page title
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();

      // H2 for section titles
      const h2Elements = page.locator('h2');
      const h2Count = await h2Elements.count();
      expect(h2Count).toBeGreaterThanOrEqual(4); // FAQ, Contact, Documentation, Version

      // H3 for FAQ questions
      const h3Elements = page.locator('[data-testid="faq-list"] h3');
      const h3Count = await h3Elements.count();
      expect(h3Count).toBe(5); // 5 FAQ questions
    });

    test('links have descriptive text', async ({ page }) => {
      const emailLink = page.locator('a[href="mailto:support@example.com"]');
      await expect(emailLink).toBeVisible();
      const emailText = await emailLink.textContent();
      expect(emailText).toContain('support@example.com');

      const phoneLink = page.locator('a[href="tel:+1234567890"]');
      await expect(phoneLink).toBeVisible();
      const phoneText = await phoneLink.textContent();
      expect(phoneText).toContain('+1');
    });
  });

  test.describe('Dark Mode Compatibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToHelp(page);
    });

    test('cards use CSS variables for theming', async ({ page }) => {
      const faqCard = page.locator('[data-testid="faq-card"]');
      const cardClasses = await faqCard.getAttribute('class');

      // Should use CSS variable for background
      expect(cardClasses).toContain('bg-[var(--color-background-card');
      // Should use CSS variable for border
      expect(cardClasses).toContain('border-[var(--color-border-default');
    });

    test('text uses CSS variables for color', async ({ page }) => {
      const title = page.locator('[data-testid="help-page-title"]');
      const style = await title.getAttribute('style');

      expect(style).toContain('var(--color-text-primary');
    });
  });
});
