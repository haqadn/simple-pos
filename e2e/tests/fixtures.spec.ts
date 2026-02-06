/**
 * Fixture verification tests
 *
 * These tests verify that the POSPage fixtures work correctly
 * and can be used by other tests.
 */
import { test, expect, POSPage } from '../fixtures';

test.describe('POSPage Fixture', () => {
  test('posPage fixture is available', async ({ posPage }) => {
    // Verify the fixture is an instance of POSPage
    expect(posPage).toBeInstanceOf(POSPage);
    expect(posPage.page).toBeDefined();
  });

  test('can navigate to orders page', async ({ posPage }) => {
    await posPage.gotoOrders();

    // Verify we're on the orders page
    await expect(posPage.page).toHaveURL(/\/orders/);
  });

  test('can access command bar locators', async ({ posPage }) => {
    await posPage.gotoOrders();

    // Wait for the page to be ready
    await posPage.page.waitForLoadState('networkidle');

    // The command input should exist (may be disabled if no order is selected)
    await expect(posPage.commandInput).toBeVisible();
  });

  test('can access sidebar locators', async ({ posPage }) => {
    await posPage.gotoOrders();
    await posPage.page.waitForLoadState('networkidle');

    // New order button should be visible
    await expect(posPage.newOrderButton).toBeVisible();
  });

  test('can create a new order', async ({ posPage }) => {
    await posPage.gotoOrders();
    await posPage.page.waitForLoadState('networkidle');

    // Create a new order
    await posPage.createNewOrder();

    // Verify we're on a new order page
    await expect(posPage.page).toHaveURL(/\/orders\/(new|[A-Z0-9]+)/);
  });
});
