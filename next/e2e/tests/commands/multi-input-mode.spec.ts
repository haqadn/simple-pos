/**
 * Multi-Input Mode Tests
 *
 * Tests for the multi-input mode functionality where commands can enter
 * a persistent input mode for rapid entry without repeating the command prefix.
 *
 * Multi-input mode:
 * - Entered by executing a command with no arguments (e.g., /item)
 * - Prompt changes to indicate the active command (e.g., "item>")
 * - Subsequent entries are processed as arguments to that command
 * - Exit by typing / alone
 */

import { test, expect } from '../../fixtures';
import {
  gotoNewOrder,
  waitForMutations,
  getCurrentOrderId,
  getLineItems,
  getLineItem,
  hasLineItem,
  getLineItemCount,
  OrderVerify,
} from '../../fixtures';
import {
  getTestProducts,
  getTestSku,
  getFirstInStockVariation,
} from '../../fixtures';
import {
  getCommandInput,
  getPromptText,
  enterMultiInputMode,
  exitMultiInputMode,
  isInMultiInputMode,
  executeMultiModeEntry,
  executeCommand,
  COMMAND_BAR_SELECTORS,
} from '../../fixtures';
import OrdersAPI from '../../../api/orders';

test.describe('Multi-Input Mode', () => {
  test.describe('Enter Multi-Input Mode', () => {
    test('/item with no args enters multi-input mode', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      // Execute /item with no arguments
      await posPage.focusCommandBar();
      await posPage.typeCommand('/item');
      await posPage.commandInput.press('Enter');

      // Wait for mode to change
      await page.waitForTimeout(300);

      // Verify we're in multi-input mode
      const isMulti = await isInMultiInputMode(page);
      expect(isMulti).toBe(true);
    });

    test('prompt changes to item> when entering item multi-input mode', async ({ page }) => {
      await gotoNewOrder(page);

      // Enter multi-input mode
      await enterMultiInputMode(page, 'item');

      // Verify prompt changed
      const prompt = await getPromptText(page);
      expect(prompt).toContain('item>');
    });

    test('/i alias also enters multi-input mode', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      // Execute /i with no arguments
      await posPage.focusCommandBar();
      await posPage.typeCommand('/i');
      await posPage.commandInput.press('Enter');

      // Wait for mode to change
      await page.waitForTimeout(300);

      // Verify we're in multi-input mode
      const isMulti = await isInMultiInputMode(page);
      expect(isMulti).toBe(true);

      // Verify prompt shows item> (not i>)
      const prompt = await getPromptText(page);
      expect(prompt).toContain('item>');
    });

    test('command bar remains focused after entering multi-input mode', async ({ page }) => {
      await gotoNewOrder(page);

      // Enter multi-input mode
      await enterMultiInputMode(page, 'item');

      // Verify command input is still focused
      const commandInput = getCommandInput(page);
      await expect(commandInput).toBeFocused();
    });
  });

  test.describe('Multi-Input Mode Entry', () => {
    test('can add item by typing SKU in multi-input mode', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Enter multi-input mode
      await enterMultiInputMode(page, 'item');

      // Type SKU directly (no /item prefix needed)
      await executeMultiModeEntry(page, sku, { waitForNetwork: true });

      // Wait for order to save
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify item was added
      await OrderVerify.lineItem(page, product.name, 1);
    });

    test('can add item with quantity in multi-input mode', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Enter multi-input mode
      await enterMultiInputMode(page, 'item');

      // Type SKU with quantity
      await executeMultiModeEntry(page, `${sku} 5`, { waitForNetwork: true });

      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify item was added with quantity 5
      await OrderVerify.lineItem(page, product.name, 5);
    });

    test('prompt remains as item> after adding item', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Enter multi-input mode
      await enterMultiInputMode(page, 'item');

      // Add an item
      await executeMultiModeEntry(page, sku, { waitForNetwork: true });

      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify still in multi-input mode
      const isMulti = await isInMultiInputMode(page);
      expect(isMulti).toBe(true);

      const prompt = await getPromptText(page);
      expect(prompt).toContain('item>');
    });
  });

  test.describe('Rapid Entry of Multiple SKUs', () => {
    test('can add multiple different items rapidly', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product, variable: variableProduct } = getTestProducts();
      const sku1 = getTestSku(product);
      const variation = variableProduct ? getFirstInStockVariation(variableProduct) : null;
      const sku2 = variation?.sku;

      if (!sku1) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Enter multi-input mode
      await enterMultiInputMode(page, 'item');

      // Add first item
      await executeMultiModeEntry(page, sku1, { waitForNetwork: true });
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify first item added
      const hasItem1 = await hasLineItem(page, product.name);
      expect(hasItem1).toBe(true);

      // If we have a second SKU, add it
      if (sku2) {
        await executeMultiModeEntry(page, sku2, { waitForNetwork: true });
        await waitForMutations(page);

        // Verify both items exist
        const count = await getLineItemCount(page);
        expect(count).toBe(2);
      }
    });

    test('can add same item multiple times to increment quantity', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Enter multi-input mode
      await enterMultiInputMode(page, 'item');

      // Add same SKU three times
      await executeMultiModeEntry(page, sku, { waitForNetwork: true });
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      await executeMultiModeEntry(page, sku, { waitForNetwork: true });
      await waitForMutations(page);

      await executeMultiModeEntry(page, sku, { waitForNetwork: true });
      await waitForMutations(page);

      // Verify quantity incremented to 3
      await OrderVerify.lineItem(page, product.name, 3);

      // Verify only 1 line item (not 3 separate entries)
      await OrderVerify.lineItemCount(page, 1);
    });

    test('rapid entry with mixed quantities', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Enter multi-input mode
      await enterMultiInputMode(page, 'item');

      // Add item with quantity 2
      await executeMultiModeEntry(page, `${sku} 2`, { waitForNetwork: true });
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify initial quantity
      await OrderVerify.lineItem(page, product.name, 2);

      // Set quantity to 5
      await executeMultiModeEntry(page, `${sku} 5`, { waitForNetwork: true });
      await waitForMutations(page);

      // Verify quantity set (not incremented)
      await OrderVerify.lineItem(page, product.name, 5);
    });

    test('stays in multi-input mode throughout rapid entry', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Enter multi-input mode
      await enterMultiInputMode(page, 'item');

      // Perform several entries
      await executeMultiModeEntry(page, sku, { waitForNetwork: true });
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Check still in multi-mode
      let isMulti = await isInMultiInputMode(page);
      expect(isMulti).toBe(true);

      await executeMultiModeEntry(page, sku, { waitForNetwork: true });
      await waitForMutations(page);

      // Check still in multi-mode
      isMulti = await isInMultiInputMode(page);
      expect(isMulti).toBe(true);

      await executeMultiModeEntry(page, `${sku} 5`, { waitForNetwork: true });
      await waitForMutations(page);

      // Still in multi-mode
      isMulti = await isInMultiInputMode(page);
      expect(isMulti).toBe(true);
    });
  });

  test.describe('Exit Multi-Input Mode', () => {
    test('/ exits multi-input mode', async ({ page }) => {
      await gotoNewOrder(page);

      // Enter multi-input mode
      await enterMultiInputMode(page, 'item');

      // Verify in multi-mode
      let isMulti = await isInMultiInputMode(page);
      expect(isMulti).toBe(true);

      // Exit by typing /
      await exitMultiInputMode(page);

      // Verify exited
      isMulti = await isInMultiInputMode(page);
      expect(isMulti).toBe(false);
    });

    test('prompt returns to > after exiting', async ({ page }) => {
      await gotoNewOrder(page);

      // Enter multi-input mode
      await enterMultiInputMode(page, 'item');

      // Verify prompt is item>
      let prompt = await getPromptText(page);
      expect(prompt).toContain('item>');

      // Exit
      await exitMultiInputMode(page);

      // Verify prompt is back to >
      prompt = await getPromptText(page);
      expect(prompt).toBe('>');
    });

    test('can exit after adding items', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Enter multi-input mode
      await enterMultiInputMode(page, 'item');

      // Add some items
      await executeMultiModeEntry(page, sku, { waitForNetwork: true });
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      await executeMultiModeEntry(page, sku, { waitForNetwork: true });
      await waitForMutations(page);

      // Exit multi-input mode
      await exitMultiInputMode(page);

      // Verify exited
      const isMulti = await isInMultiInputMode(page);
      expect(isMulti).toBe(false);

      // Verify items are still there
      await OrderVerify.lineItem(page, product.name, 2);
    });

    test('switching to another command exits multi-input mode', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      // Enter multi-input mode
      await enterMultiInputMode(page, 'item');

      // Verify in multi-mode
      let isMulti = await isInMultiInputMode(page);
      expect(isMulti).toBe(true);

      // Execute a different command (e.g., /clear)
      await posPage.focusCommandBar();
      await posPage.typeCommand('/clear');
      await posPage.commandInput.press('Enter');
      await page.waitForTimeout(300);

      // Verify exited multi-input mode (or in clear's mode if it has one)
      const prompt = await getPromptText(page);
      expect(prompt).not.toContain('item>');
    });
  });

  test.describe('Persistence to WooCommerce', () => {
    test('all items added in multi-input mode persist correctly', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Enter multi-input mode
      await enterMultiInputMode(page, 'item');

      // Add item with quantity 3
      await executeMultiModeEntry(page, `${sku} 3`, { waitForNetwork: true });
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Increment twice
      await executeMultiModeEntry(page, sku, { waitForNetwork: true });
      await waitForMutations(page);

      await executeMultiModeEntry(page, sku, { waitForNetwork: true });
      await waitForMutations(page);

      // Exit multi-input mode
      await exitMultiInputMode(page);

      // Get order ID and verify in WooCommerce
      const orderId = await getCurrentOrderId(page);
      const savedOrder = await OrdersAPI.getOrder(parseInt(orderId, 10));

      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.line_items.length).toBe(1);
      expect(savedOrder!.line_items[0].quantity).toBe(5); // 3 + 1 + 1
      expect(savedOrder!.line_items[0].product_id).toBe(product.id);
    });

    test('order total is correct after multi-input mode entries', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku || !product.price || parseFloat(product.price) <= 0) {
        test.skip(true, 'No product with valid SKU and price available');
        return;
      }

      // Enter multi-input mode
      await enterMultiInputMode(page, 'item');

      // Add item with quantity 4
      await executeMultiModeEntry(page, `${sku} 4`, { waitForNetwork: true });
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Exit multi-input mode
      await exitMultiInputMode(page);

      // Verify in WooCommerce
      const orderId = await getCurrentOrderId(page);
      const savedOrder = await OrdersAPI.getOrder(parseInt(orderId, 10));

      const expectedTotal = parseFloat(product.price) * 4;
      const actualTotal = parseFloat(savedOrder!.total);

      // Allow small tolerance for tax/rounding
      expect(Math.abs(actualTotal - expectedTotal)).toBeLessThan(1);
    });

    test('no duplicate line items after multiple multi-input operations', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Enter multi-input mode
      await enterMultiInputMode(page, 'item');

      // Perform many operations on the same SKU
      await executeMultiModeEntry(page, sku, { waitForNetwork: true });
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      await executeMultiModeEntry(page, sku, { waitForNetwork: true });
      await waitForMutations(page);

      await executeMultiModeEntry(page, `${sku} 5`, { waitForNetwork: true });
      await waitForMutations(page);

      await executeMultiModeEntry(page, sku, { waitForNetwork: true });
      await waitForMutations(page);

      // Exit multi-input mode
      await exitMultiInputMode(page);

      // Verify in WooCommerce - should be exactly 1 line item
      const orderId = await getCurrentOrderId(page);
      const savedOrder = await OrdersAPI.getOrder(parseInt(orderId, 10));

      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.line_items.length).toBe(1);
      expect(savedOrder!.line_items[0].quantity).toBe(6); // 1 + 1 (set to 5) + 1
    });
  });

  test.describe('Edge Cases', () => {
    test('invalid SKU in multi-input mode shows error but stays in mode', async ({ page }) => {
      await gotoNewOrder(page);

      // Enter multi-input mode
      await enterMultiInputMode(page, 'item');

      // Try an invalid SKU
      await executeMultiModeEntry(page, 'INVALID_SKU_XYZ_12345', { waitForNetwork: true });
      await page.waitForTimeout(500);

      // Should still be in multi-input mode
      const isMulti = await isInMultiInputMode(page);
      expect(isMulti).toBe(true);

      // No items should be added
      const count = await getLineItemCount(page);
      expect(count).toBe(0);
    });

    test('empty entry in multi-input mode does not crash', async ({ page }) => {
      await gotoNewOrder(page);

      // Enter multi-input mode
      await enterMultiInputMode(page, 'item');

      const commandInput = getCommandInput(page);

      // Press Enter with empty input
      await commandInput.fill('');
      await commandInput.press('Enter');
      await page.waitForTimeout(300);

      // Should still be in multi-input mode (or back to normal, either is acceptable)
      // The key is that it doesn't crash
      const input = getCommandInput(page);
      await expect(input).toBeVisible();
    });

    test('can re-enter multi-input mode after exiting', async ({ page }) => {
      await gotoNewOrder(page);

      // Enter multi-input mode
      await enterMultiInputMode(page, 'item');

      // Verify in multi-mode
      let isMulti = await isInMultiInputMode(page);
      expect(isMulti).toBe(true);

      // Exit
      await exitMultiInputMode(page);

      // Verify exited
      isMulti = await isInMultiInputMode(page);
      expect(isMulti).toBe(false);

      // Re-enter
      await enterMultiInputMode(page, 'item');

      // Verify in multi-mode again
      isMulti = await isInMultiInputMode(page);
      expect(isMulti).toBe(true);
    });

    test('multi-input mode works with products added before entering mode', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item via regular command first
      await executeCommand(page, 'item', [sku, '2']);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify item exists
      await OrderVerify.lineItem(page, product.name, 2);

      // Enter multi-input mode
      await enterMultiInputMode(page, 'item');

      // Increment the existing item
      await executeMultiModeEntry(page, sku, { waitForNetwork: true });
      await waitForMutations(page);

      // Verify quantity incremented
      await OrderVerify.lineItem(page, product.name, 3);

      // Exit and verify
      await exitMultiInputMode(page);
      await OrderVerify.lineItem(page, product.name, 3);
    });
  });
});
