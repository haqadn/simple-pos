import { test, expect } from '@playwright/test';

/**
 * Smoke test to verify Playwright is configured correctly
 * and the Next.js application loads successfully.
 */
test.describe('Smoke Tests', () => {
  test('application loads successfully', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');

    // Wait for the page to be ready
    await page.waitForLoadState('networkidle');

    // Verify the page loaded (check for common POS elements)
    // The page should not show a generic error
    await expect(page).not.toHaveTitle(/error/i);

    // Verify we're on a valid page (not a 404 or error page)
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('orders page is accessible', async ({ page }) => {
    // Navigate to the orders page
    await page.goto('/orders');

    // Wait for the page to be ready
    await page.waitForLoadState('networkidle');

    // Verify the page loaded successfully
    await expect(page).not.toHaveTitle(/404/i);
    await expect(page).not.toHaveTitle(/error/i);
  });
});
