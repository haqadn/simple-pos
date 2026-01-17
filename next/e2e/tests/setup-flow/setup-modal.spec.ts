/**
 * Setup Modal E2E Tests
 *
 * Tests for the first-run setup experience when credentials are not configured.
 * These tests verify:
 * 1. Setup modal appears when no credentials are configured
 * 2. Setup modal is non-dismissable (blocking)
 * 3. Connection testing works with invalid/valid credentials
 * 4. Setup modal dismisses after valid credentials are saved
 */

import { test, expect, Page } from '@playwright/test';
import { getWpEnvConfig } from '../../helpers/wp-env-config';

/**
 * Helper to clear all localStorage and sessionStorage
 */
async function clearBrowserStorage(page: Page) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Helper to set up valid credentials in localStorage
 */
async function setupValidCredentials(page: Page) {
  const wpConfig = getWpEnvConfig();
  const settingsPayload = {
    api: {
      baseUrl: wpConfig.baseUrl,
      consumerKey: wpConfig.consumerKey,
      consumerSecret: wpConfig.consumerSecret,
    },
    skipKotCategories: [],
    pageShortcuts: [],
    paymentMethods: [
      { key: 'bkash', label: 'bKash' },
      { key: 'nagad', label: 'Nagad' },
      { key: 'card', label: 'Card' },
    ],
  };

  await page.addInitScript((settings) => {
    localStorage.setItem('pos-settings', JSON.stringify(settings));
  }, settingsPayload);
}

test.describe('Setup Modal - Fresh State', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all storage before each test to simulate fresh install
    await clearBrowserStorage(page);
  });

  test('setup modal appears when no credentials are configured', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // The setup modal should be visible
    const setupModal = page.getByRole('dialog');
    await expect(setupModal).toBeVisible({ timeout: 10000 });

    // Verify it has the setup title
    const setupTitle = page.getByText('Setup Required');
    await expect(setupTitle).toBeVisible();

    // Verify it has the description
    const description = page.getByText('Connect to your WooCommerce store to get started');
    await expect(description).toBeVisible();
  });

  test('setup modal is non-dismissable (no close button)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for modal to appear
    const setupModal = page.getByRole('dialog');
    await expect(setupModal).toBeVisible({ timeout: 10000 });

    // Verify there's no close button (X icon)
    const closeButton = setupModal.locator('button[aria-label="Close"]');
    await expect(closeButton).not.toBeVisible();

    // Try clicking outside the modal - should not close it
    await page.mouse.click(10, 10);
    await page.waitForTimeout(500);

    // Modal should still be visible
    await expect(setupModal).toBeVisible();
  });

  test('setup modal shows API configuration fields', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for modal
    const setupModal = page.getByRole('dialog');
    await expect(setupModal).toBeVisible({ timeout: 10000 });

    // Verify URL field exists
    const urlInput = page.getByLabel('Website URL');
    await expect(urlInput).toBeVisible();

    // Verify Consumer Key field exists
    const keyInput = page.getByLabel('Consumer Key');
    await expect(keyInput).toBeVisible();

    // Verify Consumer Secret field exists
    const secretInput = page.getByLabel('Consumer Secret');
    await expect(secretInput).toBeVisible();

    // Verify Test Connection button exists
    const testButton = page.getByRole('button', { name: /Test Connection/i });
    await expect(testButton).toBeVisible();

    // Verify Save button exists but is disabled
    const saveButton = page.getByRole('button', { name: /Save & Continue/i });
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeDisabled();
  });

  test('save button is disabled until connection test passes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for modal
    const setupModal = page.getByRole('dialog');
    await expect(setupModal).toBeVisible({ timeout: 10000 });

    // Save button should be disabled initially
    const saveButton = page.getByRole('button', { name: /Save & Continue/i });
    await expect(saveButton).toBeDisabled();

    // Fill in some credentials but don't test connection
    // Using test container port (8889) for consistency
    const urlInput = page.getByLabel('Website URL');
    await urlInput.fill('http://localhost:8889');

    const keyInput = page.getByLabel('Consumer Key');
    await keyInput.fill('ck_test_key');

    const secretInput = page.getByLabel('Consumer Secret');
    await secretInput.fill('cs_test_secret');

    // Save button should still be disabled (need to test connection)
    await expect(saveButton).toBeDisabled();
  });

  test('test connection shows error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for modal
    const setupModal = page.getByRole('dialog');
    await expect(setupModal).toBeVisible({ timeout: 10000 });

    // Get the wp-env config for the base URL
    const wpConfig = getWpEnvConfig();

    // Fill in credentials with valid URL but invalid key/secret
    const urlInput = page.getByLabel('Website URL');
    await urlInput.fill(wpConfig.baseUrl);

    const keyInput = page.getByLabel('Consumer Key');
    await keyInput.fill('ck_invalid_key');

    const secretInput = page.getByLabel('Consumer Secret');
    await secretInput.fill('cs_invalid_secret');

    // Click Test Connection
    const testButton = page.getByRole('button', { name: /Test Connection/i });
    await testButton.click();

    // Wait for error message
    const errorMessage = page.getByText(/Invalid credentials|Could not connect/i);
    await expect(errorMessage).toBeVisible({ timeout: 15000 });

    // Save button should still be disabled after failed test
    const saveButton = page.getByRole('button', { name: /Save & Continue/i });
    await expect(saveButton).toBeDisabled();
  });

  test('test connection shows error for invalid URL', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for modal
    const setupModal = page.getByRole('dialog');
    await expect(setupModal).toBeVisible({ timeout: 10000 });

    // Fill in invalid URL
    const urlInput = page.getByLabel('Website URL');
    await urlInput.fill('http://invalid-domain-that-does-not-exist.local');

    const keyInput = page.getByLabel('Consumer Key');
    await keyInput.fill('ck_test_key');

    const secretInput = page.getByLabel('Consumer Secret');
    await secretInput.fill('cs_test_secret');

    // Click Test Connection
    const testButton = page.getByRole('button', { name: /Test Connection/i });
    await testButton.click();

    // Wait for error message about connection
    const errorMessage = page.getByText(/Could not connect|Network error|timed out/i);
    await expect(errorMessage).toBeVisible({ timeout: 20000 });

    // Save button should still be disabled
    const saveButton = page.getByRole('button', { name: /Save & Continue/i });
    await expect(saveButton).toBeDisabled();
  });
});

test.describe('Setup Modal - Valid Credentials Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all storage before each test
    await clearBrowserStorage(page);
  });

  test('setup modal dismisses after valid credentials are saved', async ({ page }) => {
    const wpConfig = getWpEnvConfig();

    // Skip test if no valid credentials are available
    if (!wpConfig.consumerKey || !wpConfig.consumerSecret) {
      test.skip();
      return;
    }

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for modal
    const setupModal = page.getByRole('dialog');
    await expect(setupModal).toBeVisible({ timeout: 10000 });

    // Fill in valid credentials
    const urlInput = page.getByLabel('Website URL');
    await urlInput.fill(wpConfig.baseUrl);

    const keyInput = page.getByLabel('Consumer Key');
    await keyInput.fill(wpConfig.consumerKey);

    const secretInput = page.getByLabel('Consumer Secret');
    await secretInput.fill(wpConfig.consumerSecret);

    // Click Test Connection
    const testButton = page.getByRole('button', { name: /Test Connection/i });
    await testButton.click();

    // Wait for success indicator (could be a checkmark, success message, or enabled save button)
    const saveButton = page.getByRole('button', { name: /Save & Continue/i });
    await expect(saveButton).toBeEnabled({ timeout: 15000 });

    // Click Save & Continue
    await saveButton.click();

    // Modal should close
    await expect(setupModal).not.toBeVisible({ timeout: 5000 });

    // App content should now be visible
    await page.waitForLoadState('networkidle');

    // We should be able to see the main app (e.g., New Order button or sidebar)
    const appContent = page.locator('body');
    await expect(appContent).not.toHaveClass(/opacity-50/);
  });

  test('credentials are persisted after setup', async ({ page }) => {
    const wpConfig = getWpEnvConfig();

    // Skip test if no valid credentials are available
    if (!wpConfig.consumerKey || !wpConfig.consumerSecret) {
      test.skip();
      return;
    }

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Complete setup flow
    const setupModal = page.getByRole('dialog');
    await expect(setupModal).toBeVisible({ timeout: 10000 });

    await page.getByLabel('Website URL').fill(wpConfig.baseUrl);
    await page.getByLabel('Consumer Key').fill(wpConfig.consumerKey);
    await page.getByLabel('Consumer Secret').fill(wpConfig.consumerSecret);

    await page.getByRole('button', { name: /Test Connection/i }).click();

    const saveButton = page.getByRole('button', { name: /Save & Continue/i });
    await expect(saveButton).toBeEnabled({ timeout: 15000 });
    await saveButton.click();

    // Modal should close
    await expect(setupModal).not.toBeVisible({ timeout: 5000 });

    // Verify credentials are saved to localStorage
    const savedSettings = await page.evaluate(() => {
      return localStorage.getItem('pos-settings');
    });

    expect(savedSettings).not.toBeNull();
    const settings = JSON.parse(savedSettings!);
    expect(settings.api.baseUrl).toBe(wpConfig.baseUrl);
    expect(settings.api.consumerKey).toBe(wpConfig.consumerKey);
    expect(settings.api.consumerSecret).toBe(wpConfig.consumerSecret);
  });

  test('setup modal does not appear on page reload after setup', async ({ page }) => {
    const wpConfig = getWpEnvConfig();

    // Skip test if no valid credentials are available
    if (!wpConfig.consumerKey || !wpConfig.consumerSecret) {
      test.skip();
      return;
    }

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Complete setup
    const setupModal = page.getByRole('dialog');
    await expect(setupModal).toBeVisible({ timeout: 10000 });

    await page.getByLabel('Website URL').fill(wpConfig.baseUrl);
    await page.getByLabel('Consumer Key').fill(wpConfig.consumerKey);
    await page.getByLabel('Consumer Secret').fill(wpConfig.consumerSecret);

    await page.getByRole('button', { name: /Test Connection/i }).click();

    const saveButton = page.getByRole('button', { name: /Save & Continue/i });
    await expect(saveButton).toBeEnabled({ timeout: 15000 });
    await saveButton.click();

    await expect(setupModal).not.toBeVisible({ timeout: 5000 });

    // Reload the page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Modal should NOT appear
    const modalAfterReload = page.getByRole('dialog');
    // Wait a bit to make sure modal doesn't appear
    await page.waitForTimeout(2000);
    await expect(modalAfterReload).not.toBeVisible();
  });
});

test.describe('Setup Modal - Existing Users', () => {
  test('existing users with localStorage credentials see no setup modal', async ({ page }) => {
    // Set up valid credentials before navigating
    await setupValidCredentials(page);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Modal should NOT appear for configured users
    const setupModal = page.getByRole('dialog').filter({ hasText: 'Setup Required' });
    await expect(setupModal).not.toBeVisible({ timeout: 3000 });

    // App should be fully functional
    // Check for any main app element (New Order button, sidebar, etc.)
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('orders page is accessible without setup for configured users', async ({ page }) => {
    // Set up valid credentials
    await setupValidCredentials(page);

    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Should be on orders page without setup modal
    const setupModal = page.getByRole('dialog').filter({ hasText: 'Setup Required' });
    await expect(setupModal).not.toBeVisible({ timeout: 3000 });

    // Page should not have error title
    await expect(page).not.toHaveTitle(/error/i);
  });
});
