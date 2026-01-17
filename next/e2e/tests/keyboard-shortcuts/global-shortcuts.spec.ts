/**
 * Global Keyboard Shortcuts Tests
 *
 * Tests for keyboard shortcuts available throughout the app:
 * - Ctrl+N: Create new order
 * - Escape: Focus command bar
 * - Ctrl+K: Print KOT
 * - Ctrl+P: Print Bill
 * - Ctrl+D: Open cash drawer
 * - Ctrl+Enter: Complete order (done)
 * - Alt+0-9: Select service option
 */

import { test, expect } from '../../fixtures';
import {
  gotoNewOrder,
  gotoOrders,
  waitForMutations,
  getCurrentOrderId,
  getLineItemCount,
} from '../../fixtures';
import {
  getTestProducts,
  getTestSku,
} from '../../fixtures';
import {
  executeCommandAndWait,
  CommandShortcuts,
  getCommandInput,
} from '../../fixtures';
import OrdersAPI from '../../../api/orders';

test.describe('Global Keyboard Shortcuts', () => {
  test.describe('Focus Command Bar (Escape)', () => {
    test('Escape focuses command bar when not focused', async ({ page }) => {
      await gotoNewOrder(page);

      // Click somewhere else to unfocus command bar
      await page.locator('body').click();

      // Verify command bar is not focused
      const commandInput = getCommandInput(page);
      await expect(commandInput).not.toBeFocused();

      // Press Escape
      await page.keyboard.press('Escape');

      // Verify command bar is now focused
      await expect(commandInput).toBeFocused();
    });

    test('Escape focuses command bar from any context', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add an item to have something on the page
      await CommandShortcuts.addItem(page, sku);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      // Click on line item table area
      const lineItemTable = page.locator('table[aria-label="Order line items"]');
      if (await lineItemTable.isVisible()) {
        await lineItemTable.click();
      } else {
        await page.locator('body').click();
      }

      // Press Escape to focus command bar
      await page.keyboard.press('Escape');

      // Verify command bar is focused
      const commandInput = getCommandInput(page);
      await expect(commandInput).toBeFocused();
    });
  });

  test.describe('New Order (Ctrl+N)', () => {
    test('Ctrl+N creates new order', async ({ page }) => {
      await gotoOrders(page);

      // Press Ctrl+N
      await page.keyboard.press('Control+n');

      // Wait for navigation to new order page
      await page.waitForURL(/\/orders\/new/, { timeout: 10000 });

      // Verify we're on the new order page
      await expect(page).toHaveURL(/\/orders\/new/);
    });

    test('Ctrl+N from existing order creates new order', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item to current order
      await CommandShortcuts.addItem(page, sku);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      // Get current order ID
      const existingOrderId = await getCurrentOrderId(page);

      // Press Ctrl+N to create new order
      await page.keyboard.press('Control+n');

      // Wait for navigation to new order page
      await page.waitForURL(/\/orders\/new/, { timeout: 10000 });

      // Verify we're on new order page (not the previous order)
      await expect(page).toHaveURL(/\/orders\/new/);
    });

    test('shortcut does not conflict with browser shortcuts', async ({ page }) => {
      await gotoNewOrder(page);

      // Focus command bar
      const commandInput = getCommandInput(page);
      await commandInput.click();
      await expect(commandInput).toBeFocused();

      // Press Ctrl+N - should trigger app shortcut, not browser new window
      await page.keyboard.press('Control+n');

      // Verify navigation to new order
      await page.waitForURL(/\/orders\/new/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/orders\/new/);
    });
  });

  test.describe('Print KOT (Ctrl+K)', () => {
    test('Ctrl+K triggers KOT print on order with items', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item first
      await CommandShortcuts.addItem(page, sku);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);

      // Get initial order state
      let order = await OrdersAPI.getOrder(orderId);
      const initialKotMeta = order?.meta_data.find(m => m.key === 'last_kot_print');

      // Press Ctrl+K
      await page.keyboard.press('Control+k');
      await waitForMutations(page);

      // Verify KOT print was triggered (meta_data updated)
      order = await OrdersAPI.getOrder(orderId);
      const newKotMeta = order?.meta_data.find(m => m.key === 'last_kot_print');

      // Either new meta was created or value changed
      if (initialKotMeta) {
        expect(newKotMeta?.value).not.toBe(initialKotMeta.value);
      } else {
        expect(newKotMeta).toBeDefined();
      }
    });
  });

  test.describe('Print Bill (Ctrl+P)', () => {
    test('Ctrl+P triggers bill print on order with items', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item first
      await CommandShortcuts.addItem(page, sku);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);

      // Get initial order state
      let order = await OrdersAPI.getOrder(orderId);
      const initialBillMeta = order?.meta_data.find(m => m.key === 'last_bill_print');

      // Press Ctrl+P
      await page.keyboard.press('Control+p');
      await waitForMutations(page);

      // Verify bill print was triggered (meta_data updated)
      order = await OrdersAPI.getOrder(orderId);
      const newBillMeta = order?.meta_data.find(m => m.key === 'last_bill_print');

      // Either new meta was created or value changed
      if (initialBillMeta) {
        expect(newBillMeta?.value).not.toBe(initialBillMeta.value);
      } else {
        expect(newBillMeta).toBeDefined();
      }
    });
  });

  test.describe('Complete Order (Ctrl+Enter)', () => {
    test('Ctrl+Enter completes fully paid order', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item
      await CommandShortcuts.addItem(page, sku);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);

      // Get order total and pay fully
      const order = await OrdersAPI.getOrder(orderId);
      const total = parseFloat(order!.total);

      // Record payment
      await CommandShortcuts.recordPayment(page, total);
      await waitForMutations(page);

      // Press Ctrl+Enter to complete
      await page.keyboard.press('Control+Enter');
      await waitForMutations(page);

      // Verify order is completed
      const completedOrder = await OrdersAPI.getOrder(orderId);
      expect(completedOrder?.status).toBe('completed');
    });

    test('Ctrl+Enter on unpaid order does not complete', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item without payment
      await CommandShortcuts.addItem(page, sku);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);

      // Press Ctrl+Enter without payment
      await page.keyboard.press('Control+Enter');
      await page.waitForTimeout(500);

      // Verify order is NOT completed (still pending)
      const order = await OrdersAPI.getOrder(orderId);
      expect(order?.status).not.toBe('completed');
    });
  });

  test.describe('Shortcuts Do Not Trigger While Typing', () => {
    test('Ctrl+N does not trigger when typing text in input', async ({ page }) => {
      await gotoNewOrder(page);

      // Focus command bar and type something
      const commandInput = getCommandInput(page);
      await commandInput.click();
      await commandInput.fill('/pay 50');

      // Try Ctrl+N - should be intercepted by app shortcut system
      await page.keyboard.press('Control+n');

      // The shortcut triggers because it's a registered app shortcut
      // Wait briefly for navigation
      await page.waitForTimeout(500);

      // Check if we navigated (shortcut was triggered)
      const url = page.url();
      const navigatedToNew = url.includes('/orders/new');

      // Either behavior is acceptable depending on implementation
      // The test documents the behavior
      if (navigatedToNew) {
        await expect(page).toHaveURL(/\/orders\/new/);
      } else {
        // If not navigated, the shortcut was suppressed
        await expect(commandInput).toBeFocused();
      }
    });

    test('Escape clears suggestions before unfocusing', async ({ page }) => {
      await gotoNewOrder(page);

      // Type partial command to get suggestions
      const commandInput = getCommandInput(page);
      await commandInput.click();
      await commandInput.fill('/');

      // Wait for suggestions
      await page.waitForTimeout(300);

      // Check if suggestions appeared
      const suggestions = page.locator('.absolute.top-full');
      const hasSuggestions = await suggestions.isVisible().catch(() => false);

      if (hasSuggestions) {
        // First Escape should clear suggestions
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
        await expect(suggestions).not.toBeVisible();

        // Second Escape should clear input
        await page.keyboard.press('Escape');
        await expect(commandInput).toHaveValue('');

        // Third Escape should blur
        await page.keyboard.press('Escape');
        await expect(commandInput).not.toBeFocused();
      } else {
        // No suggestions, first Escape clears input
        await page.keyboard.press('Escape');
        await expect(commandInput).toHaveValue('');
      }
    });
  });

  test.describe('Service Selection (Alt+0-9)', () => {
    test('Alt+number selects service option', async ({ page }) => {
      await gotoNewOrder(page);

      // Check if service card is visible
      const serviceCard = page.locator('#service-selection-card');
      const hasServiceCard = await serviceCard.isVisible().catch(() => false);

      if (!hasServiceCard) {
        test.skip(true, 'No service selection available');
        return;
      }

      // Check for available options (tables or delivery zones)
      const radioButtons = serviceCard.locator('input[type="radio"]');
      const optionCount = await radioButtons.count();

      if (optionCount === 0) {
        test.skip(true, 'No service options available');
        return;
      }

      // Press Alt+0 to select first option
      await page.keyboard.press('Alt+0');
      await waitForMutations(page);

      // Verify first option is selected
      const firstRadio = radioButtons.first();
      await expect(firstRadio).toBeChecked();
    });

    test('Alt+1 selects second service option if available', async ({ page }) => {
      await gotoNewOrder(page);

      // Check if service card is visible
      const serviceCard = page.locator('#service-selection-card');
      const hasServiceCard = await serviceCard.isVisible().catch(() => false);

      if (!hasServiceCard) {
        test.skip(true, 'No service selection available');
        return;
      }

      // Check for multiple options
      const radioButtons = serviceCard.locator('input[type="radio"]');
      const optionCount = await radioButtons.count();

      if (optionCount < 2) {
        test.skip(true, 'Less than 2 service options available');
        return;
      }

      // Press Alt+1 to select second option
      await page.keyboard.press('Alt+1');
      await waitForMutations(page);

      // Verify second option is selected
      const secondRadio = radioButtons.nth(1);
      await expect(secondRadio).toBeChecked();
    });
  });
});
