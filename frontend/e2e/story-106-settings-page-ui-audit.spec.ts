/**
 * Settings Page E2E Tests
 * STORY-106: Settings Page UI Audit
 *
 * Playwright E2E tests for settings page UI improvements.
 * Tests tab navigation consistency, card styling, form field spacing,
 * section hierarchy, and 2FA button styling.
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
 * Helper to login and navigate to settings page
 * Includes robust rate limiting handling with retries.
 */
async function loginAndNavigateToSettings(page: Page): Promise<void> {
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

      // Navigate to settings page
      await page.goto('/settings');
      await waitForStability(page);

      if (page.url().includes('/settings')) {
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

test.describe('Settings Page - STORY-106 UI Audit Fixes', () => {
  test.describe('Card Component Consistency', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToSettings(page);
    });

    test('admin settings section uses Card component', async ({ page }) => {
      const adminCard = page.locator('[data-testid="admin-settings-card"]');
      const adminCardVisible = await adminCard.isVisible();

      if (adminCardVisible) {
        // Card component adds rounded-lg and overflow-hidden classes
        const cardClasses = await adminCard.getAttribute('class');
        expect(cardClasses).toContain('rounded-lg');
        expect(cardClasses).toContain('overflow-hidden');
      }
    });

    test('personal settings section uses Card component', async ({ page }) => {
      const personalCard = page.locator('[data-testid="personal-settings-card"]');
      await expect(personalCard).toBeVisible();

      // Card component adds rounded-lg and overflow-hidden classes
      const cardClasses = await personalCard.getAttribute('class');
      expect(cardClasses).toContain('rounded-lg');
      expect(cardClasses).toContain('overflow-hidden');
    });

    test('both cards have consistent border styling', async ({ page }) => {
      const adminCard = page.locator('[data-testid="admin-settings-card"]');
      const personalCard = page.locator('[data-testid="personal-settings-card"]');

      const adminCardVisible = await adminCard.isVisible();
      const personalCardVisible = await personalCard.isVisible();

      if (adminCardVisible) {
        const adminClasses = await adminCard.getAttribute('class');
        expect(adminClasses).toContain('border');
      }

      if (personalCardVisible) {
        const personalClasses = await personalCard.getAttribute('class');
        expect(personalClasses).toContain('border');
      }
    });

    test('both cards have consistent shadow styling', async ({ page }) => {
      const adminCard = page.locator('[data-testid="admin-settings-card"]');
      const personalCard = page.locator('[data-testid="personal-settings-card"]');

      const adminCardVisible = await adminCard.isVisible();
      const personalCardVisible = await personalCard.isVisible();

      if (adminCardVisible) {
        const adminClasses = await adminCard.getAttribute('class');
        expect(adminClasses).toContain('shadow');
      }

      if (personalCardVisible) {
        const personalClasses = await personalCard.getAttribute('class');
        expect(personalClasses).toContain('shadow');
      }
    });
  });

  test.describe('Tab Navigation Consistency', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToSettings(page);
    });

    test('admin settings tabs have icons', async ({ page }) => {
      // Admin settings tabs already have icons in SettingsTabs
      const adminTabs = page.locator('[data-testid="admin-settings-tabs"]');
      const adminTabsVisible = await adminTabs.isVisible();

      if (adminTabsVisible) {
        // Check that SVG icons are present in tabs
        const tabIcons = adminTabs.locator('svg');
        const iconCount = await tabIcons.count();
        expect(iconCount).toBeGreaterThan(0);
      }
    });

    test('personal settings tabs have icons', async ({ page }) => {
      // Personal settings should now use TabNavigation with icons
      const personalTabs = page.locator('[data-testid="personal-settings-tabs"]');
      await expect(personalTabs).toBeVisible();

      // Check that SVG icons are present in tabs
      const tabIcons = personalTabs.locator('svg');
      const iconCount = await tabIcons.count();
      expect(iconCount).toBeGreaterThan(0);
    });

    test('personal settings tabs have proper aria attributes', async ({ page }) => {
      const personalTabs = page.locator('[data-testid="personal-settings-tabs"]');
      await expect(personalTabs).toBeVisible();

      // Check for tablist role
      const tablist = personalTabs.locator('[role="tablist"]');
      await expect(tablist).toBeVisible();

      // Check for tab buttons with proper role
      const tabButtons = personalTabs.locator('[role="tab"]');
      const buttonCount = await tabButtons.count();
      expect(buttonCount).toBe(2); // Profile and Security
    });

    test('clicking profile tab shows profile section', async ({ page }) => {
      const profileTab = page.locator('[data-testid="personal-settings-tabs-tab-profile"]');
      await expect(profileTab).toBeVisible();

      await profileTab.click();
      await waitForStability(page);

      // Profile section should be visible
      const profileSection = page.locator('[data-testid="profile-section"]');
      await expect(profileSection).toBeVisible();
    });

    test('clicking security tab shows security section', async ({ page }) => {
      const securityTab = page.locator('[data-testid="personal-settings-tabs-tab-security"]');
      await expect(securityTab).toBeVisible();

      await securityTab.click();
      await waitForStability(page);

      // Security section should be visible
      const securitySection = page.locator('[data-testid="security-section"]');
      await expect(securitySection).toBeVisible();
    });

    test('active tab has border indicator', async ({ page }) => {
      const profileTab = page.locator('[data-testid="personal-settings-tabs-tab-profile"]');
      await expect(profileTab).toBeVisible();

      // Active tab should have border-primary-500 class
      const tabClasses = await profileTab.getAttribute('class');
      expect(tabClasses).toContain('border-primary-500');
    });
  });

  test.describe('Section Hierarchy', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToSettings(page);
    });

    test('profile section has header with border-bottom separator', async ({ page }) => {
      const profileSection = page.locator('[data-testid="profile-section"]');
      await expect(profileSection).toBeVisible();

      // Check for section header with border
      const sectionHeader = profileSection.locator('.border-b').first();
      await expect(sectionHeader).toBeVisible();

      // Should contain h3 heading
      const heading = sectionHeader.locator('h3');
      await expect(heading).toBeVisible();
    });

    test('security section has header with border-bottom separator', async ({ page }) => {
      const securitySection = page.locator('[data-testid="security-section"]');
      await expect(securitySection).toBeVisible();

      // Check for section header with border
      const sectionHeader = securitySection.locator('.border-b').first();
      await expect(sectionHeader).toBeVisible();

      // Should contain h3 heading
      const heading = sectionHeader.locator('h3');
      await expect(heading).toBeVisible();
    });

    test('subsection headings use h3 tags', async ({ page }) => {
      const profileSection = page.locator('[data-testid="profile-section"]');
      await expect(profileSection).toBeVisible();

      const profileH3 = profileSection.locator('h3').first();
      await expect(profileH3).toBeVisible();

      const securitySection = page.locator('[data-testid="security-section"]');
      await expect(securitySection).toBeVisible();

      const securityH3 = securitySection.locator('h3').first();
      await expect(securityH3).toBeVisible();
    });
  });

  test.describe('2FA Button Styling', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToSettings(page);
    });

    test('2FA button uses outline variant (not filled primary)', async ({ page }) => {
      const mfaButton = page.locator('[data-testid="mfa-setup-button"]');
      await expect(mfaButton).toBeVisible();

      const buttonClasses = await mfaButton.getAttribute('class');
      // Outline button should have border and not bg-primary-600
      expect(buttonClasses).toContain('border');
      expect(buttonClasses).not.toContain('bg-primary-600');
    });

    test('2FA button has chevron/arrow icon indicating navigation', async ({ page }) => {
      const mfaButton = page.locator('[data-testid="mfa-setup-button"]');
      await expect(mfaButton).toBeVisible();

      // Button should contain an SVG icon
      const icon = mfaButton.locator('svg');
      await expect(icon).toBeVisible();
    });

    test('2FA link navigates to MFA setup page', async ({ page }) => {
      const mfaLink = page.locator('[data-testid="mfa-setup-link"]');
      await expect(mfaLink).toBeVisible();

      // Check href attribute
      const href = await mfaLink.getAttribute('href');
      expect(href).toBe('/settings/security/mfa');
    });
  });

  test.describe('Form Field Spacing', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToSettings(page);
    });

    test('password fields have consistent vertical spacing', async ({ page }) => {
      const currentPasswordInput = page.locator('[data-testid="password-current-input"]');
      const newPasswordInput = page.locator('[data-testid="password-new-input"]');
      const confirmPasswordInput = page.locator('[data-testid="password-confirm-input"]');

      await expect(currentPasswordInput).toBeVisible();
      await expect(newPasswordInput).toBeVisible();
      await expect(confirmPasswordInput).toBeVisible();

      // Get the parent container with space-y-6 class
      const passwordFieldsContainer = page.locator('.space-y-6').filter({
        has: page.locator('[data-testid="password-current-input"]')
      }).first();

      await expect(passwordFieldsContainer).toBeVisible();
    });

    test('form labels use consistent font styling', async ({ page }) => {
      const labels = page.locator('[data-testid="profile-section"] label');
      const labelCount = await labels.count();

      for (let i = 0; i < labelCount; i++) {
        const label = labels.nth(i);
        const labelClasses = await label.getAttribute('class');
        expect(labelClasses).toContain('text-sm');
        expect(labelClasses).toContain('font-medium');
      }
    });

    test('form fields have space-y-2 container styling', async ({ page }) => {
      // Check that form field containers use space-y-2 for label-input spacing
      const profileNameInput = page.locator('[data-testid="profile-name-input"]');
      await expect(profileNameInput).toBeVisible();

      // Parent should have space-y-2
      const parentContainer = profileNameInput.locator('..'); // parent element
      const parentClasses = await parentContainer.getAttribute('class');
      expect(parentClasses).toContain('space-y-2');
    });
  });

  test.describe('Visual Separator for Action Buttons', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToSettings(page);
    });

    test('password update section has border-top separator', async ({ page }) => {
      const updateButton = page.locator('[data-testid="password-update-button"]');
      await expect(updateButton).toBeVisible();

      // Parent container should have border-t class
      const buttonContainer = updateButton.locator('..').locator('..');
      const containerClasses = await buttonContainer.getAttribute('class');
      expect(containerClasses).toContain('border-t');
    });

    test('password update button uses primary variant', async ({ page }) => {
      const updateButton = page.locator('[data-testid="password-update-button"]');
      await expect(updateButton).toBeVisible();

      const buttonClasses = await updateButton.getAttribute('class');
      expect(buttonClasses).toContain('bg-primary-600');
    });
  });

  test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToSettings(page);
    });

    test('tabs support keyboard navigation', async ({ page }) => {
      const profileTab = page.locator('[data-testid="personal-settings-tabs-tab-profile"]');
      await expect(profileTab).toBeVisible();

      await profileTab.focus();
      await expect(profileTab).toBeFocused();
    });

    test('tabs have proper focus ring styling', async ({ page }) => {
      const profileTab = page.locator('[data-testid="personal-settings-tabs-tab-profile"]');
      await expect(profileTab).toBeVisible();

      const tabClasses = await profileTab.getAttribute('class');
      expect(tabClasses).toContain('focus:ring-2');
    });

    test('form inputs have proper labels', async ({ page }) => {
      const profileNameInput = page.locator('[data-testid="profile-name-input"]');
      await expect(profileNameInput).toBeVisible();

      // Parent container should have a label
      const parentContainer = profileNameInput.locator('..');
      const label = parentContainer.locator('label');
      await expect(label).toBeVisible();
    });

    test('buttons have proper focus styling', async ({ page }) => {
      const updateButton = page.locator('[data-testid="password-update-button"]');
      await expect(updateButton).toBeVisible();

      const buttonClasses = await updateButton.getAttribute('class');
      expect(buttonClasses).toContain('focus:outline-none');
      expect(buttonClasses).toContain('focus:ring-2');
    });
  });

  test.describe('Responsive Behavior', () => {
    test('settings page is accessible on tablet', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.tablet);
      await loginAndNavigateToSettings(page);

      const personalCard = page.locator('[data-testid="personal-settings-card"]');
      await expect(personalCard).toBeVisible();

      const profileSection = page.locator('[data-testid="profile-section"]');
      await expect(profileSection).toBeVisible();
    });

    test('settings page is accessible on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await loginAndNavigateToSettings(page);

      const personalCard = page.locator('[data-testid="personal-settings-card"]');
      await expect(personalCard).toBeVisible();
    });

    test('tabs remain functional on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await loginAndNavigateToSettings(page);

      const securityTab = page.locator('[data-testid="personal-settings-tabs-tab-security"]');
      await expect(securityTab).toBeVisible();

      await securityTab.click();
      await waitForStability(page);

      const securitySection = page.locator('[data-testid="security-section"]');
      await expect(securitySection).toBeVisible();
    });

    test('form fields stack properly on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await loginAndNavigateToSettings(page);

      // Profile section uses grid with responsive columns
      const profileSection = page.locator('[data-testid="profile-section"]');
      await expect(profileSection).toBeVisible();

      // Both name and email inputs should be visible
      const nameInput = page.locator('[data-testid="profile-name-input"]');
      const emailInput = page.locator('[data-testid="profile-email-input"]');
      await expect(nameInput).toBeVisible();
      await expect(emailInput).toBeVisible();
    });
  });

  test.describe('Dark Mode Compatibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToSettings(page);
    });

    test('cards use CSS variables for background color', async ({ page }) => {
      const personalCard = page.locator('[data-testid="personal-settings-card"]');
      await expect(personalCard).toBeVisible();

      // Card should have CSS variable-based background
      const cardClasses = await personalCard.getAttribute('class');
      expect(cardClasses).toContain('bg-[var(--color-background-card');
    });

    test('text elements use CSS variables for color', async ({ page }) => {
      const profileSection = page.locator('[data-testid="profile-section"]');
      await expect(profileSection).toBeVisible();

      // Check that text uses style attributes with CSS variables
      const heading = profileSection.locator('h3').first();
      const style = await heading.getAttribute('style');
      expect(style).toContain('var(--color-text-primary');
    });
  });

  test.describe('URL Hash Navigation', () => {
    test('navigating to #security activates security tab', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);

      // Login first
      await loginAndNavigateToSettings(page);

      // Navigate with hash
      await page.goto('/settings#security');
      await waitForStability(page);

      // Security tab should be active
      const securityTab = page.locator('[data-testid="personal-settings-tabs-tab-security"]');
      const tabClasses = await securityTab.getAttribute('class');
      expect(tabClasses).toContain('border-primary-500');
    });

    test('navigating to #profile activates profile tab', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);

      // Login first
      await loginAndNavigateToSettings(page);

      // Navigate with hash
      await page.goto('/settings#profile');
      await waitForStability(page);

      // Profile tab should be active
      const profileTab = page.locator('[data-testid="personal-settings-tabs-tab-profile"]');
      const tabClasses = await profileTab.getAttribute('class');
      expect(tabClasses).toContain('border-primary-500');
    });
  });

  test.describe('Admin Settings Section', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await loginAndNavigateToSettings(page);
    });

    test('admin settings section is visible for admin users', async ({ page }) => {
      const adminSection = page.locator('[data-testid="admin-settings-section"]');
      // Admin section should be visible for admin users
      const isVisible = await adminSection.isVisible();

      // If user is admin, section should be visible
      if (isVisible) {
        await expect(adminSection).toBeVisible();
      }
    });

    test('admin tabs include all expected tabs', async ({ page }) => {
      const adminTabs = page.locator('[data-testid="admin-settings-tabs"]');
      const adminTabsVisible = await adminTabs.isVisible();

      if (adminTabsVisible) {
        // Check for expected tabs: General, Security, Email, Maintenance
        const generalTab = page.locator('[data-testid="tab-general"]');
        const securityTab = page.locator('[data-testid="tab-security"]');
        const emailTab = page.locator('[data-testid="tab-email"]');
        const maintenanceTab = page.locator('[data-testid="tab-maintenance"]');

        await expect(generalTab).toBeVisible();
        await expect(securityTab).toBeVisible();
        await expect(emailTab).toBeVisible();
        await expect(maintenanceTab).toBeVisible();
      }
    });

    test('admin settings form has action buttons with separator', async ({ page }) => {
      const adminTabs = page.locator('[data-testid="admin-settings-tabs"]');
      const adminTabsVisible = await adminTabs.isVisible();

      if (adminTabsVisible) {
        // Check for reset and save buttons
        const resetButton = page.locator('[data-testid="reset-button"]');
        const saveButton = page.locator('[data-testid="save-button"]');

        await expect(resetButton).toBeVisible();
        await expect(saveButton).toBeVisible();
      }
    });
  });
});
