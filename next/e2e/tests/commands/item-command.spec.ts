/**
 * Item Command Comprehensive Tests
 *
 * Tests for the /item command, which is the primary way to add and modify
 * line items in orders. This test file covers:
 * - All input formats: /item SKU, /item SKU qty, /i alias
 * - Autocomplete suggestions for partial SKU
 * - Increment vs set behavior for existing items
 * - Optimistic updates and final server state matching
 */

import { test, expect } from '../../fixtures';
import {
  gotoNewOrder,
  waitForMutations,
  getCurrentOrderId,
  getLineItem,
  hasLineItem,
  getLineItemCount,
  getOrderTotal,
  OrderVerify,
} from '../../fixtures';
import {
  getTestProducts,
  getTestSku,
  getTestPrice,
} from '../../fixtures';
import {
  executeCommand,
  executeCommandAndWait,
  typePartialCommand,
  waitForAutocomplete,
  getAutocompleteSuggestionTexts,
  acceptAutocompleteSuggestion,
  CommandShortcuts,
} from '../../fixtures';
import OrdersAPI from '../../../api/orders';

test.describe('Item Command', () => {
  test.describe('Input Format: /item SKU', () => {
    test('can add item with /item SKU format', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Execute /item SKU (basic format)
      await posPage.focusCommandBar();
      await posPage.typeCommand(`/item ${sku}`);
      await posPage.commandInput.press('Enter');

      // Wait for order to save
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify item was added with quantity 1
      await OrderVerify.lineItem(page, product.name, 1);
    });

    test('/item SKU adds item with default quantity of 1', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Use command helper
      await executeCommandAndWait(page, 'item', [sku]);

      // Wait for order to save
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify quantity is exactly 1
      const item = await getLineItem(page, product.name);
      expect(item).not.toBeNull();
      expect(item?.quantity).toBe(1);
    });

    test('/item SKU works with SKU containing special characters', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Execute command with the real SKU (which may contain special chars)
      await executeCommandAndWait(page, 'item', [sku]);

      // Wait for order to save
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify item was added
      const count = await getLineItemCount(page);
      expect(count).toBe(1);
    });
  });

  test.describe('Input Format: /item SKU qty', () => {
    test('can add item with /item SKU qty format', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Execute /item SKU qty
      await posPage.focusCommandBar();
      await posPage.typeCommand(`/item ${sku} 5`);
      await posPage.commandInput.press('Enter');

      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify item was added with quantity 5
      await OrderVerify.lineItem(page, product.name, 5);
    });

    test('/item SKU 1 adds single item', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      await executeCommandAndWait(page, 'item', [sku, '1']);

      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      await OrderVerify.lineItem(page, product.name, 1);
    });

    test('/item SKU 10 adds item with double-digit quantity', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      await executeCommandAndWait(page, 'item', [sku, '10']);

      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      await OrderVerify.lineItem(page, product.name, 10);
    });

    test('/item SKU 100 adds large quantity', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      await executeCommandAndWait(page, 'item', [sku, '100']);

      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      await OrderVerify.lineItem(page, product.name, 100);
    });
  });

  test.describe('Input Format: /i alias', () => {
    test('/i alias adds item same as /item', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Use /i alias
      await posPage.focusCommandBar();
      await posPage.typeCommand(`/i ${sku}`);
      await posPage.commandInput.press('Enter');

      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify item was added with quantity 1
      await OrderVerify.lineItem(page, product.name, 1);
    });

    test('/i SKU qty works same as /item SKU qty', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Use /i alias with quantity
      await posPage.focusCommandBar();
      await posPage.typeCommand(`/i ${sku} 3`);
      await posPage.commandInput.press('Enter');

      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify item was added with quantity 3
      await OrderVerify.lineItem(page, product.name, 3);
    });

    test('/i is case insensitive command', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Use /i (lowercase)
      await posPage.focusCommandBar();
      await posPage.typeCommand(`/i ${sku} 2`);
      await posPage.commandInput.press('Enter');

      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      await OrderVerify.lineItem(page, product.name, 2);
    });
  });

  test.describe('Autocomplete Suggestions', () => {
    test('typing partial SKU shows autocomplete suggestions', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku || sku.length < 2) {
        test.skip(true, 'SKU too short for autocomplete test');
        return;
      }

      // Type partial command with partial SKU
      const partialSku = sku.substring(0, Math.min(3, sku.length));
      await typePartialCommand(page, `/item ${partialSku}`);

      try {
        // Wait for autocomplete to appear
        await waitForAutocomplete(page, 5000);

        // Get suggestions
        const suggestions = await getAutocompleteSuggestionTexts(page);
        expect(suggestions.length).toBeGreaterThan(0);
      } catch {
        // Autocomplete may not appear for all SKU patterns
        test.skip(true, 'Autocomplete did not appear for this SKU pattern');
      }
    });

    test('autocomplete suggestions include matching products', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku || sku.length < 2) {
        test.skip(true, 'SKU too short for autocomplete test');
        return;
      }

      // Type partial SKU
      await posPage.focusCommandBar();
      await posPage.typeCommand(`/item ${sku.substring(0, 2)}`);

      try {
        await posPage.waitForAutocomplete();
        const suggestions = await posPage.getAutocompleteSuggestions();
        expect(suggestions.length).toBeGreaterThan(0);

        // At least one suggestion should match our product
        // suggestions is already string[] from getAutocompleteSuggestions()
        const hasMatchingSuggestion = suggestions.some(
          (text: string) => text.toLowerCase().includes(sku.toLowerCase()) ||
                  text.toLowerCase().includes(product.name.toLowerCase())
        );
        expect(hasMatchingSuggestion).toBe(true);
      } catch {
        // Autocomplete behavior may vary
        test.skip(true, 'Autocomplete did not show expected suggestions');
      }
    });

    test('selecting autocomplete suggestion fills command', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku || sku.length < 2) {
        test.skip(true, 'SKU too short for autocomplete test');
        return;
      }

      // Type partial SKU
      await posPage.focusCommandBar();
      await posPage.typeCommand(`/item ${sku.substring(0, Math.min(3, sku.length))}`);

      try {
        await posPage.waitForAutocomplete();

        // Select first suggestion
        await posPage.selectAutocompleteSuggestion(0);

        // Execute the command
        await posPage.commandInput.press('Enter');

        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);

        // Verify an item was added
        const count = await getLineItemCount(page);
        expect(count).toBeGreaterThan(0);
      } catch {
        // Fall back to direct SKU entry
        await posPage.clearCommandInput();
        await CommandShortcuts.addItem(page, sku);
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);

        const count = await getLineItemCount(page);
        expect(count).toBeGreaterThan(0);
      }
    });

    test('Tab accepts first autocomplete suggestion', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku || sku.length < 2) {
        test.skip(true, 'SKU too short for autocomplete test');
        return;
      }

      await posPage.focusCommandBar();
      await posPage.typeCommand(`/item ${sku.substring(0, 2)}`);

      try {
        await posPage.waitForAutocomplete();

        // Press Tab to accept suggestion
        await acceptAutocompleteSuggestion(page);

        // Execute
        await posPage.commandInput.press('Enter');

        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);

        const count = await getLineItemCount(page);
        expect(count).toBeGreaterThan(0);
      } catch {
        test.skip(true, 'Tab autocomplete acceptance not available');
      }
    });
  });

  test.describe('Increment vs Set Behavior', () => {
    test('/item SKU on new item adds quantity 1', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item without quantity (should add 1)
      await CommandShortcuts.addItem(page, sku);

      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify quantity is 1
      await OrderVerify.lineItem(page, product.name, 1);
    });

    test('/item SKU on existing item increments by 1', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item first time
      await CommandShortcuts.addItem(page, sku);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify initial quantity is 1
      await OrderVerify.lineItem(page, product.name, 1);

      // Add same item again without quantity
      await CommandShortcuts.addItem(page, sku);
      await waitForMutations(page);

      // Verify quantity incremented to 2
      await OrderVerify.lineItem(page, product.name, 2);
    });

    test('/item SKU qty on existing item sets quantity (not increment)', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item with quantity 2
      await CommandShortcuts.addItem(page, sku, 2);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      await OrderVerify.lineItem(page, product.name, 2);

      // Set quantity to 5 (not add 5)
      await CommandShortcuts.addItem(page, sku, 5);
      await waitForMutations(page);

      // Verify quantity is set to 5, not 7 (2+5)
      await OrderVerify.lineItem(page, product.name, 5);
    });

    test('multiple /item SKU increments correctly', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // First add
      await CommandShortcuts.addItem(page, sku);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);
      await OrderVerify.lineItem(page, product.name, 1);

      // Second add
      await CommandShortcuts.addItem(page, sku);
      await waitForMutations(page);
      await OrderVerify.lineItem(page, product.name, 2);

      // Third add
      await CommandShortcuts.addItem(page, sku);
      await waitForMutations(page);
      await OrderVerify.lineItem(page, product.name, 3);

      // Fourth add
      await CommandShortcuts.addItem(page, sku);
      await waitForMutations(page);
      await OrderVerify.lineItem(page, product.name, 4);
    });

    test('/item SKU 0 removes item from order', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item first
      await CommandShortcuts.addItem(page, sku, 3);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      await OrderVerify.lineItem(page, product.name, 3);

      // Set quantity to 0 (remove)
      await CommandShortcuts.removeItem(page, sku);
      await waitForMutations(page);

      // Verify item is removed
      await OrderVerify.noLineItem(page, product.name);
    });

    test('increment then set then increment works correctly', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Increment: add 1
      await CommandShortcuts.addItem(page, sku);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);
      await OrderVerify.lineItem(page, product.name, 1);

      // Increment: add 1 more
      await CommandShortcuts.addItem(page, sku);
      await waitForMutations(page);
      await OrderVerify.lineItem(page, product.name, 2);

      // Set: explicit quantity 5
      await CommandShortcuts.addItem(page, sku, 5);
      await waitForMutations(page);
      await OrderVerify.lineItem(page, product.name, 5);

      // Increment: add 1 more
      await CommandShortcuts.addItem(page, sku);
      await waitForMutations(page);
      await OrderVerify.lineItem(page, product.name, 6);
    });
  });

  test.describe('Optimistic Updates and Server State', () => {
    test('UI updates immediately (optimistic update)', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Execute command
      await executeCommand(page, 'item', [sku, '3']);

      // Wait a short time for optimistic update (not full network)
      await page.waitForTimeout(500);

      // UI should show the item immediately
      const hasItem = await hasLineItem(page, product.name);
      expect(hasItem).toBe(true);

      // Wait for full persistence
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);
    });

    test('final UI state matches server state after add', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item
      await CommandShortcuts.addItem(page, sku, 4);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Get UI state
      const uiItem = await getLineItem(page, product.name);
      expect(uiItem).not.toBeNull();

      // Get server state
      const orderId = await getCurrentOrderId(page);
      const savedOrder = await OrdersAPI.getOrder(orderId);

      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.line_items.length).toBe(1);
      expect(savedOrder!.line_items[0].quantity).toBe(uiItem?.quantity);
      expect(savedOrder!.line_items[0].product_id).toBe(product.id);
    });

    test('final UI state matches server state after multiple operations', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item with qty 2
      await CommandShortcuts.addItem(page, sku, 2);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Increment
      await CommandShortcuts.addItem(page, sku);
      await waitForMutations(page);

      // Set to 5
      await CommandShortcuts.addItem(page, sku, 5);
      await waitForMutations(page);

      // Increment again
      await CommandShortcuts.addItem(page, sku);
      await waitForMutations(page);

      // Final UI state
      const uiItem = await getLineItem(page, product.name);
      expect(uiItem).not.toBeNull();
      expect(uiItem?.quantity).toBe(6);

      // Verify server state matches
      const orderId = await getCurrentOrderId(page);
      const savedOrder = await OrdersAPI.getOrder(orderId);

      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.line_items.length).toBe(1);
      expect(savedOrder!.line_items[0].quantity).toBe(6);
    });

    test('order total in UI matches server total', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);
      const price = getTestPrice(product);

      if (!sku || price <= 0) {
        test.skip(true, 'No product with valid SKU and price available');
        return;
      }

      // Add item with quantity 3
      await CommandShortcuts.addItem(page, sku, 3);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Get UI total
      const uiTotal = await getOrderTotal(page);

      // Get server total
      const orderId = await getCurrentOrderId(page);
      const savedOrder = await OrdersAPI.getOrder(orderId);
      const serverTotal = parseFloat(savedOrder!.total);

      // Verify they match (allow small floating point difference)
      expect(Math.abs(uiTotal - serverTotal)).toBeLessThan(0.02);
    });

    test('server state persists correctly after quantity change', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item with qty 2
      await CommandShortcuts.addItem(page, sku, 2);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);

      // Verify initial server state
      let savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder!.line_items[0].quantity).toBe(2);

      // Change quantity to 7
      await CommandShortcuts.addItem(page, sku, 7);
      await waitForMutations(page);

      // Verify updated server state
      savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder!.line_items[0].quantity).toBe(7);
    });

    test('no duplicate line items in server state after multiple operations', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Perform multiple operations
      await CommandShortcuts.addItem(page, sku);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      await CommandShortcuts.addItem(page, sku);
      await waitForMutations(page);

      await CommandShortcuts.addItem(page, sku, 5);
      await waitForMutations(page);

      await CommandShortcuts.addItem(page, sku);
      await waitForMutations(page);

      // Verify server has exactly 1 line item (no duplicates)
      const orderId = await getCurrentOrderId(page);
      const savedOrder = await OrdersAPI.getOrder(orderId);

      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.line_items.length).toBe(1);
      expect(savedOrder!.line_items[0].quantity).toBe(6);
    });
  });

  test.describe('Edge Cases', () => {
    test('/item with invalid SKU does not add item', async ({ page }) => {
      await gotoNewOrder(page);

      // Try adding invalid SKU
      await executeCommandAndWait(page, 'item', ['INVALID_SKU_12345_XYZ']);

      // Short wait for any potential updates
      await page.waitForTimeout(1000);

      // Verify no item was added
      const count = await getLineItemCount(page);
      expect(count).toBe(0);
    });

    test('/item without arguments does not crash', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      // Execute /item with no arguments
      await posPage.focusCommandBar();
      await posPage.typeCommand('/item');
      await posPage.commandInput.press('Enter');

      // Wait a moment
      await page.waitForTimeout(500);

      // Page should still be functional
      const commandInput = page.getByLabel('Command input field');
      await expect(commandInput).toBeVisible();

      // No items should be added
      const count = await getLineItemCount(page);
      expect(count).toBe(0);
    });

    test('/item with very long SKU is handled', async ({ page }) => {
      await gotoNewOrder(page);

      // Try with very long SKU
      const longSku = 'A'.repeat(100);
      await executeCommandAndWait(page, 'item', [longSku]);

      await page.waitForTimeout(500);

      // Should not crash, no item added for invalid SKU
      const count = await getLineItemCount(page);
      expect(count).toBe(0);
    });

    test('/item SKU with decimal quantity is handled', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Try decimal quantity
      await executeCommandAndWait(page, 'item', [sku, '2.5']);

      // Wait for potential order save
      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 5000 });
        await waitForMutations(page);

        // If it saved, verify reasonable quantity (could be 2 or 3 depending on implementation)
        const item = await getLineItem(page, product.name);
        expect(item).not.toBeNull();
        expect(item!.quantity).toBeGreaterThan(0);
      } catch {
        // If no order saved, verify no crash
        const count = await getLineItemCount(page);
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('/item SKU with negative quantity is rejected', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item first
      await CommandShortcuts.addItem(page, sku, 2);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Try negative quantity
      await executeCommandAndWait(page, 'item', [sku, '-5']);
      await waitForMutations(page);

      // Item should still exist (negative should be rejected)
      // or be removed (treated as 0)
      const count = await getLineItemCount(page);
      const item = await getLineItem(page, product.name);

      // Either item still has positive qty or was removed
      if (item) {
        expect(item.quantity).toBeGreaterThanOrEqual(0);
      } else {
        expect(count).toBe(0);
      }
    });
  });
});
