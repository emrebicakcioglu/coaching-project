/**
 * Favicon E2E Tests
 * BUG-001: Fehlendes Favicon (vite.svg)
 *
 * End-to-end tests verifying that the favicon loads correctly
 * without producing 404 errors in the browser console.
 */

import { test, expect } from '@playwright/test';

// Base URL from playwright config
const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

test.describe('BUG-001: Favicon Loading', () => {
  test('favicon.svg loads successfully without 404 error', async ({ page }) => {
    // Track network requests to detect 404 errors
    const failedRequests: string[] = [];

    page.on('response', (response) => {
      if (response.status() === 404 && response.url().includes('favicon')) {
        failedRequests.push(response.url());
      }
    });

    // Navigate to the application
    await page.goto(BASE_URL);

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Verify no 404 errors for favicon
    expect(failedRequests).toHaveLength(0);
  });

  test('favicon link element is present in the document head', async ({ page }) => {
    await page.goto(BASE_URL);

    // Check that the favicon link element exists
    const faviconLink = page.locator('link[rel="icon"]');
    await expect(faviconLink).toHaveCount(1);

    // Verify the href attribute points to favicon.svg
    await expect(faviconLink).toHaveAttribute('href', '/favicon.svg');
    await expect(faviconLink).toHaveAttribute('type', 'image/svg+xml');
  });

  test('favicon resource returns 200 status', async ({ page, request }) => {
    // Directly request the favicon resource
    const response = await request.get(`${BASE_URL}/favicon.svg`);

    // Verify the response is successful
    expect(response.status()).toBe(200);

    // Verify content type is SVG
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('svg');
  });

  test('favicon SVG content is valid', async ({ page, request }) => {
    // Request the favicon
    const response = await request.get(`${BASE_URL}/favicon.svg`);
    const content = await response.text();

    // Verify it's a valid SVG (starts with svg element or xml declaration)
    expect(content).toMatch(/<svg[\s\S]*?>/);

    // Verify it has required SVG attributes
    expect(content).toContain('xmlns');
    expect(content).toContain('viewBox');
  });

  test('no console errors related to favicon on page load', async ({ page }) => {
    // Track console errors
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().toLowerCase().includes('favicon')) {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate and wait for load
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Give a moment for any delayed console messages
    await page.waitForTimeout(1000);

    // Verify no favicon-related console errors
    expect(consoleErrors).toHaveLength(0);
  });
});
