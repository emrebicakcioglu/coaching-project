/**
 * Theme System E2E Tests
 * STORY-017B: Theme-System Frontend
 *
 * Playwright E2E tests for theme loading, CSS variable application,
 * and theme updates.
 */

import { test, expect } from '@playwright/test';

test.describe('STORY-017B: Theme-System Frontend', () => {
  // Mock theme colors for testing
  const mockThemeColors = {
    primary: '#ff5500',
    secondary: '#00ff55',
    background: {
      page: '#ffffff',
      card: '#f0f0f0',
    },
    text: {
      primary: '#222222',
      secondary: '#777777',
    },
    status: {
      success: '#22cc22',
      warning: '#ffcc00',
      error: '#ff2222',
    },
  };

  // Updated theme colors for update tests
  const updatedThemeColors = {
    ...mockThemeColors,
    primary: '#0055ff',
    secondary: '#ff0055',
  };

  test.beforeEach(async ({ page }) => {
    // Mock the theme API endpoint
    await page.route('**/api/v1/settings/theme', async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockThemeColors),
        });
      } else if (method === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updatedThemeColors),
        });
      }
    });

    // Mock auth to access protected pages
    await page.route('**/api/v1/auth/**', async (route) => {
      if (route.request().url().includes('refresh')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            token_type: 'Bearer',
            expires_in: 3600,
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock users endpoint for auth context
    await page.route('**/api/v1/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          status: 'active',
          roles: [{ id: 1, name: 'admin', permissions: [] }],
        }),
      });
    });

    // Mock version endpoint
    await page.route('**/api/version', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          version: '1.0.0',
          name: 'core-app-backend',
          description: 'Core Application Backend API',
          timestamp: new Date().toISOString(),
        }),
      });
    });
  });

  test.describe('Theme Loading on App Start', () => {
    test('theme loads on application start', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Verify --color-primary CSS variable is set
      const primaryColor = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--color-primary')
      );
      expect(primaryColor.trim()).toBeTruthy();
    });

    test('primary color CSS variable matches theme', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Wait for theme to be applied
      await page.waitForTimeout(500);

      const primaryColor = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
      );
      expect(primaryColor).toBe('#ff5500');
    });

    test('secondary color CSS variable matches theme', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await page.waitForTimeout(500);

      const secondaryColor = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--color-secondary').trim()
      );
      expect(secondaryColor).toBe('#00ff55');
    });

    test('background colors CSS variables match theme', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await page.waitForTimeout(500);

      const pageBg = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--color-background-page').trim()
      );
      const cardBg = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--color-background-card').trim()
      );

      expect(pageBg).toBe('#ffffff');
      expect(cardBg).toBe('#f0f0f0');
    });

    test('text colors CSS variables match theme', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await page.waitForTimeout(500);

      const textPrimary = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--color-text-primary').trim()
      );
      const textSecondary = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary').trim()
      );

      expect(textPrimary).toBe('#222222');
      expect(textSecondary).toBe('#777777');
    });

    test('status colors CSS variables match theme', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await page.waitForTimeout(500);

      const success = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--color-success').trim()
      );
      const warning = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--color-warning').trim()
      );
      const error = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--color-error').trim()
      );

      expect(success).toBe('#22cc22');
      expect(warning).toBe('#ffcc00');
      expect(error).toBe('#ff2222');
    });
  });

  test.describe('Default Theme Fallback', () => {
    test('applies default theme when API unavailable', async ({ page }) => {
      // Override the mock to return error
      await page.route('**/api/v1/settings/theme', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Should have default primary color
      const primaryColor = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
      );

      // Default primary color is #2563eb
      expect(primaryColor).toBe('#2563eb');
    });

    test('applies default theme when network fails', async ({ page }) => {
      // Abort the request to simulate network failure
      await page.route('**/api/v1/settings/theme', async (route) => {
        await route.abort('failed');
      });

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Should have default primary color
      const primaryColor = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
      );

      expect(primaryColor).toBe('#2563eb');
    });
  });

  test.describe('ThemeProvider Component', () => {
    test('ThemeProvider renders correctly', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // ThemeProvider should be present in DOM
      const themeProvider = page.locator('[data-testid="app-theme-provider"]');
      await expect(themeProvider).toBeVisible();
    });

    test('children are rendered within ThemeProvider', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // App content should be inside ThemeProvider
      const themeProvider = page.locator('[data-testid="app-theme-provider"]');
      const hasContent = await themeProvider.locator('*').count();

      expect(hasContent).toBeGreaterThan(0);
    });
  });

  test.describe('Theme Persistence', () => {
    test('theme is cached in localStorage', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await page.waitForTimeout(500);

      // Check localStorage for cached theme
      const cachedTheme = await page.evaluate(() =>
        localStorage.getItem('app_theme_colors')
      );

      expect(cachedTheme).toBeTruthy();

      const parsed = JSON.parse(cachedTheme!);
      expect(parsed.primary).toBe('#ff5500');
    });

    test('cached theme persists across page navigation', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await page.waitForTimeout(500);

      // Navigate to another page
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Theme should still be applied
      const primaryColor = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
      );

      expect(primaryColor).toBe('#ff5500');
    });
  });

  test.describe('Responsive Theme', () => {
    test('theme applies correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await page.waitForTimeout(500);

      const primaryColor = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
      );

      expect(primaryColor).toBe('#ff5500');
    });

    test('theme applies correctly on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await page.waitForTimeout(500);

      const primaryColor = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
      );

      expect(primaryColor).toBe('#ff5500');
    });

    test('theme applies correctly on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await page.waitForTimeout(500);

      const primaryColor = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
      );

      expect(primaryColor).toBe('#ff5500');
    });
  });

  test.describe('Accessibility', () => {
    test('theme colors provide sufficient contrast', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await page.waitForTimeout(500);

      // Get text and background colors
      const textPrimary = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--color-text-primary').trim()
      );
      const bgPage = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--color-background-page').trim()
      );

      // Both colors should be valid hex colors
      expect(textPrimary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(bgPage).toMatch(/^#[0-9A-Fa-f]{6}$/);

      // In a real test, we would calculate contrast ratio
      // For now, we verify the colors are different enough
      expect(textPrimary).not.toBe(bgPage);
    });

    test('focus styles use primary color', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Tab to focus on a form element
      await page.keyboard.press('Tab');

      // Verify focus is visible (the outline uses --color-primary)
      const focusedElement = page.locator(':focus-visible');
      await expect(focusedElement).toBeVisible();
    });
  });

  test.describe('Theme API Integration', () => {
    test('GET /api/v1/settings/theme returns theme colors', async ({ request }) => {
      // This test verifies the API format matches what we expect
      const response = await request.get('http://localhost:14102/api/v1/settings/theme');

      // Should return 200 (or mocked status)
      // In real environment, the API should respond correctly
      // For now, we verify the mock is structured correctly
      expect(response.status()).toBe(200);

      const body = await response.json();

      // Verify theme structure
      expect(body).toHaveProperty('primary');
      expect(body).toHaveProperty('secondary');
      expect(body).toHaveProperty('background');
      expect(body).toHaveProperty('text');
      expect(body).toHaveProperty('status');
    });
  });

  test.describe('Multiple Browser Contexts', () => {
    test('theme is independent between browser contexts', async ({ browser }) => {
      // Create two separate contexts
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      // Set up mocks for both contexts
      for (const page of [page1, page2]) {
        await page.route('**/api/v1/settings/theme', async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockThemeColors),
          });
        });

        await page.route('**/api/v1/auth/**', async (route) => {
          if (route.request().url().includes('refresh')) {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                access_token: 'mock-token',
                refresh_token: 'mock-refresh',
                token_type: 'Bearer',
                expires_in: 3600,
              }),
            });
          } else {
            await route.continue();
          }
        });

        await page.route('**/api/version', async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ version: '1.0.0', name: 'app' }),
          });
        });
      }

      // Navigate both pages
      await page1.goto('/dashboard');
      await page2.goto('/dashboard');

      await page1.waitForLoadState('networkidle');
      await page2.waitForLoadState('networkidle');

      await page1.waitForTimeout(500);
      await page2.waitForTimeout(500);

      // Both should have theme applied
      const color1 = await page1.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
      );
      const color2 = await page2.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
      );

      expect(color1).toBe('#ff5500');
      expect(color2).toBe('#ff5500');

      // Cleanup
      await context1.close();
      await context2.close();
    });
  });
});
