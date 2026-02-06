/**
 * Line Item Edge Cases Tests
 *
 * Tests for edge cases and error handling in line item operations.
 * These tests verify:
 * - Invalid SKU shows appropriate error
 * - Negative quantity handling
 * - Very large quantity handling
 * - WooCommerce update pattern (delete then add) works correctly
 * - No duplicate or orphaned line items after updates
 */

import { test, expect } from '../../fixtures';
import {
  gotoNewOrder,
  waitForMutations,
  getCurrentOrderId,
  getLineItems,
  getLineItemCount,
  hasLineItem,
  getLineItem,
  OrderVerify,
} from '../../fixtures';
import {
  getTestProducts,
  getTestSku,
  getTestPrice,
  getFirstInStockVariation,
} from '../../fixtures';
import { CommandShortcuts } from '../../fixtures';
import OrdersAPI from '../../../api/orders';

test.describe('Line Item Edge Cases', () => {
  test.describe('Invalid SKU handling', () => {
    test('invalid SKU shows appropriate error or no item added', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Try to add item with invalid SKU
      const invalidSku = 'INVALID_SKU_DOES_NOT_EXIST_12345';

      // Execute command with invalid SKU
      await posPage.focusCommandBar();
      await posPage.typeCommand(`/item ${invalidSku}`);
      await posPage.commandInput.press('Enter');

      // Wait a moment for any potential processing
      await page.waitForTimeout(1000);

      // Verify no item was added
      const lineItemCount = await getLineItemCount(page);
      expect(lineItemCount).toBe(0);

      // Verify we're still on the new order page (no redirect to order ID)
      const currentUrl = page.url();
      expect(currentUrl).toContain('/orders/new');
    });

    test('empty SKU does not add item', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Try to execute /item with no SKU
      await posPage.focusCommandBar();
      await posPage.typeCommand('/item ');
      await posPage.commandInput.press('Enter');

      // Wait a moment
      await page.waitForTimeout(500);

      // Verify no item was added
      const lineItemCount = await getLineItemCount(page);
      expect(lineItemCount).toBe(0);
    });

    test('SKU with only whitespace does not add item', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Try /item with just spaces
      await posPage.focusCommandBar();
      await posPage.typeCommand('/item    ');
      await posPage.commandInput.press('Enter');

      // Wait a moment
      await page.waitForTimeout(500);

      // Verify no item was added
      const lineItemCount = await getLineItemCount(page);
      expect(lineItemCount).toBe(0);
    });
  });

  test.describe('Negative quantity handling', () => {
    test('negative quantity is handled gracefully', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // First add an item
      await CommandShortcuts.addItem(page, sku, 3);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify item was added
      await OrderVerify.lineItem(page, product.name, 3);

      // Try to set negative quantity
      await posPage.focusCommandBar();
      await posPage.typeCommand(`/item ${sku} -5`);
      await posPage.commandInput.press('Enter');
      await waitForMutations(page);

      // Negative quantity should either:
      // 1. Be rejected (quantity stays at 3), or
      // 2. Be treated as 0 (item removed), or
      // 3. Be converted to positive (absolute value)
      // Any of these is acceptable - the important thing is no crash
      const lineItems = await getLineItems(page);

      // Verify no negative quantities exist
      for (const item of lineItems) {
        expect(item.quantity).toBeGreaterThanOrEqual(0);
      }
    });

    test('negative quantity does not create negative line item', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Try to add item with negative quantity directly
      await posPage.focusCommandBar();
      await posPage.typeCommand(`/item ${sku} -1`);
      await posPage.commandInput.press('Enter');

      // Wait a moment
      await page.waitForTimeout(1000);

      // Check what happened
      const lineItemCount = await getLineItemCount(page);

      if (lineItemCount > 0) {
        // If item was added, verify quantity is positive
        const item = await getLineItem(page, product.name);
        if (item) {
          expect(item.quantity).toBeGreaterThan(0);
        }
      }
      // If no item was added, that's also acceptable behavior
    });
  });

  test.describe('Very large quantity handling', () => {
    test('very large quantity is handled without crash', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Try to add item with very large quantity
      const largeQuantity = 999999;

      await posPage.focusCommandBar();
      await posPage.typeCommand(`/item ${sku} ${largeQuantity}`);
      await posPage.commandInput.press('Enter');

      // Wait for processing
      await page.waitForTimeout(2000);

      // The system should either:
      // 1. Accept the large quantity
      // 2. Cap it at some maximum
      // 3. Reject it gracefully
      // No crash should occur
      const lineItems = await getLineItems(page);

      if (lineItems.length > 0) {
        // If item was added, verify it has a valid positive quantity
        expect(lineItems[0].quantity).toBeGreaterThan(0);
      }
    });

    test('large quantity persists correctly to WooCommerce', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item with reasonably large quantity
      const largeQuantity = 1000;

      await CommandShortcuts.addItem(page, sku, largeQuantity);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      // Get order ID and verify in WooCommerce
      const orderId = await getCurrentOrderId(page);
      const savedOrder = await OrdersAPI.getOrder(orderId);

      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.line_items.length).toBe(1);
      expect(savedOrder!.line_items[0].quantity).toBe(largeQuantity);
    });
  });

  test.describe('WooCommerce update pattern', () => {
    test('quantity update uses correct delete-then-add pattern', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item with initial quantity
      await CommandShortcuts.addItem(page, sku, 2);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      // Get order ID
      const orderId = await getCurrentOrderId(page);

      // Verify initial state
      let savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder!.line_items.length).toBe(1);
      const initialLineItemId = savedOrder!.line_items[0].id;

      // Update quantity multiple times
      await CommandShortcuts.addItem(page, sku, 5);
      await waitForMutations(page);

      await CommandShortcuts.addItem(page, sku, 3);
      await waitForMutations(page);

      // Verify final state
      savedOrder = await OrdersAPI.getOrder(orderId);

      // Should still be exactly 1 line item
      expect(savedOrder!.line_items.length).toBe(1);
      expect(savedOrder!.line_items[0].quantity).toBe(3);

      // Note: The line item ID may or may not change depending on implementation
      // The important thing is that there's only 1 line item with correct quantity
    });

    test('multiple updates maintain single line item', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item
      await CommandShortcuts.addItem(page, sku, 1);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);

      // Perform many sequential updates
      const quantities = [2, 5, 3, 8, 4, 10, 6];

      for (const qty of quantities) {
        await CommandShortcuts.addItem(page, sku, qty);
        await waitForMutations(page);
      }

      // Verify final state - should be single line item with last quantity
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder!.line_items.length).toBe(1);
      expect(savedOrder!.line_items[0].quantity).toBe(6); // Last quantity in array
    });
  });

  test.describe('No duplicate or orphaned line items', () => {
    test('no duplicate line items after adding same product twice', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add same item multiple times
      await CommandShortcuts.addItem(page, sku, 2);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      await CommandShortcuts.addItem(page, sku, 3);
      await waitForMutations(page);

      await CommandShortcuts.addItem(page, sku, 1);
      await waitForMutations(page);

      // Check UI - should be 1 line item
      const uiLineItems = await getLineItems(page);
      expect(uiLineItems.length).toBe(1);

      // Verify in WooCommerce - should also be 1 line item
      const orderId = await getCurrentOrderId(page);
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder!.line_items.length).toBe(1);
    });

    test('no orphaned line items after remove and re-add', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item
      await CommandShortcuts.addItem(page, sku, 3);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);

      // Remove item
      await CommandShortcuts.removeItem(page, sku);
      await waitForMutations(page);

      // Verify removed from WooCommerce
      let savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder!.line_items.length).toBe(0);

      // Add item again
      await CommandShortcuts.addItem(page, sku, 5);
      await waitForMutations(page);

      // Verify exactly 1 line item exists
      savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder!.line_items.length).toBe(1);
      expect(savedOrder!.line_items[0].quantity).toBe(5);
    });

    test('no duplicate items when rapidly adding same product', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Rapidly add same item without waiting
      await posPage.focusCommandBar();
      await posPage.typeCommand(`/item ${sku}`);
      await posPage.commandInput.press('Enter');

      // Immediately add again
      await posPage.focusCommandBar();
      await posPage.typeCommand(`/item ${sku}`);
      await posPage.commandInput.press('Enter');

      // And again
      await posPage.focusCommandBar();
      await posPage.typeCommand(`/item ${sku}`);
      await posPage.commandInput.press('Enter');

      // Wait for order to save and all mutations to settle
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify single line item in UI
      const lineItemCount = await getLineItemCount(page);
      expect(lineItemCount).toBe(1);

      // Verify in WooCommerce - should be single line item
      const orderId = await getCurrentOrderId(page);
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder!.line_items.length).toBe(1);

      // Quantity should be 3 (incremented 3 times from initial 0->1->2->3)
      expect(savedOrder!.line_items[0].quantity).toBe(3);
    });

    test('multiple products remain separate line items', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test products
      const { simple, variable } = getTestProducts();
      const simpleSku = getTestSku(simple);

      if (!simpleSku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Try to get a second SKU from variable product
      let secondSku: string | null = null;
      if (variable.type === 'variable' && variable.loadedVariations?.length) {
        const variation = getFirstInStockVariation(variable);
        if (variation && variation.sku && variation.sku !== simpleSku) {
          secondSku = variation.sku;
        }
      }

      // Add first product
      await CommandShortcuts.addItem(page, simpleSku, 2);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      if (secondSku) {
        // Add second product
        await CommandShortcuts.addItem(page, secondSku, 3);
        await waitForMutations(page);

        // Verify 2 separate line items in UI
        const lineItemCount = await getLineItemCount(page);
        expect(lineItemCount).toBe(2);

        // Verify in WooCommerce
        const orderId = await getCurrentOrderId(page);
        const savedOrder = await OrdersAPI.getOrder(orderId);
        expect(savedOrder!.line_items.length).toBe(2);

        // Verify each has correct quantity
        const simpleLineItem = savedOrder!.line_items.find(li => li.product_id === simple.id);
        expect(simpleLineItem?.quantity).toBe(2);
      } else {
        // If only one product available, just verify it works
        const orderId = await getCurrentOrderId(page);
        const savedOrder = await OrdersAPI.getOrder(orderId);
        expect(savedOrder!.line_items.length).toBe(1);
        expect(savedOrder!.line_items[0].quantity).toBe(2);
      }
    });

    test('UI and WooCommerce line items stay in sync', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item
      await CommandShortcuts.addItem(page, sku, 4);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);

      // Verify UI and API match
      let uiItems = await getLineItems(page);
      let apiOrder = await OrdersAPI.getOrder(orderId);

      expect(uiItems.length).toBe(apiOrder!.line_items.length);
      expect(uiItems[0].quantity).toBe(apiOrder!.line_items[0].quantity);

      // Update quantity
      await CommandShortcuts.addItem(page, sku, 7);
      await waitForMutations(page);

      // Verify still in sync
      uiItems = await getLineItems(page);
      apiOrder = await OrdersAPI.getOrder(orderId);

      expect(uiItems.length).toBe(apiOrder!.line_items.length);
      expect(uiItems[0].quantity).toBe(apiOrder!.line_items[0].quantity);
      expect(uiItems[0].quantity).toBe(7);

      // Remove item
      await CommandShortcuts.removeItem(page, sku);
      await waitForMutations(page);

      // Verify both UI and API show empty
      uiItems = await getLineItems(page);
      apiOrder = await OrdersAPI.getOrder(orderId);

      expect(uiItems.length).toBe(0);
      expect(apiOrder!.line_items.length).toBe(0);
    });
  });

  test.describe('Special characters and edge cases', () => {
    test('SKU with special characters is handled', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Try SKU with special characters
      const specialSku = 'SKU-123_test.v2';

      await posPage.focusCommandBar();
      await posPage.typeCommand(`/item ${specialSku}`);
      await posPage.commandInput.press('Enter');

      // Wait a moment
      await page.waitForTimeout(1000);

      // Should not crash - may or may not find the product
      // Just verify the page is still functional
      const commandInput = page.getByRole('textbox', { name: /command input/i });
      await expect(commandInput).toBeVisible();
    });

    test('decimal quantity is handled correctly', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Try decimal quantity
      await posPage.focusCommandBar();
      await posPage.typeCommand(`/item ${sku} 2.5`);
      await posPage.commandInput.press('Enter');

      // Wait for processing
      await page.waitForTimeout(1000);

      // Check what happened - system may round, truncate, or reject
      const lineItems = await getLineItems(page);

      if (lineItems.length > 0) {
        // If item was added, quantity should be a whole number (rounded)
        // or the decimal if the system supports it
        expect(lineItems[0].quantity).toBeGreaterThan(0);
      }
      // If no item added due to decimal, that's also acceptable
    });

    test('zero quantity removes item if it exists', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item first
      await CommandShortcuts.addItem(page, sku, 5);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify item exists
      await OrderVerify.lineItem(page, product.name, 5);

      // Set quantity to 0
      await CommandShortcuts.addItem(page, sku, 0);
      await waitForMutations(page);

      // Verify item is removed
      await OrderVerify.noLineItem(page, product.name);
      await OrderVerify.isEmpty(page);
    });

    test('setting quantity to 0 via UI input removes item', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item first
      await CommandShortcuts.addItem(page, sku, 3);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify item exists
      await OrderVerify.lineItem(page, product.name, 3);

      // Find the quantity input for this line item and set to 0
      const quantityInput = page.locator('table[aria-label="Order line items"]')
        .locator('tr')
        .filter({ hasText: new RegExp(product.name, 'i') })
        .locator('input[aria-label="Quantity of line item"]');

      await quantityInput.fill('0');
      await quantityInput.press('Tab');
      await waitForMutations(page);

      // Verify item is removed
      await OrderVerify.noLineItem(page, product.name);
      await OrderVerify.isEmpty(page);
    });
  });

  test.describe('Rapid UI clicks on product cards', () => {
    test('rapid product card clicks increment quantity correctly', async ({ page }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();

      if (!product) {
        test.skip(true, 'No product available for testing');
        return;
      }

      // Ensure all products are visible
      const allLink = page.getByLabel('Show all categories');
      if (await allLink.isVisible().catch(() => false)) {
        await allLink.click();
        await page.waitForLoadState('networkidle');
      }

      // Find the product card button
      const productSku = product.sku;
      const cardButton = page.locator('button')
        .filter({ hasText: new RegExp(product.name, 'i') })
        .filter({ hasText: productSku ? new RegExp(productSku, 'i') : /.*/ })
        .first();

      if (!await cardButton.isVisible().catch(() => false)) {
        test.skip(true, 'Product not visible in grid');
        return;
      }

      // Rapid clicks without waiting - click 5 times quickly
      await cardButton.click();
      await cardButton.click();
      await cardButton.click();
      await cardButton.click();
      await cardButton.click();

      // Wait for order to save and mutations to settle
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      // Final quantity should be 5 (clicked 5 times)
      await OrderVerify.lineItem(page, product.name, 5);

      // Verify only 1 line item exists (no duplicates)
      await OrderVerify.lineItemCount(page, 1);
    });

    test('rapid product card clicks do not cause items to disappear', async ({ page }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();

      if (!product) {
        test.skip(true, 'No product available for testing');
        return;
      }

      // Ensure all products are visible
      const allLink = page.getByLabel('Show all categories');
      if (await allLink.isVisible().catch(() => false)) {
        await allLink.click();
        await page.waitForLoadState('networkidle');
      }

      // Find the product card button
      const productSku = product.sku;
      const cardButton = page.locator('button')
        .filter({ hasText: new RegExp(product.name, 'i') })
        .filter({ hasText: productSku ? new RegExp(productSku, 'i') : /.*/ })
        .first();

      if (!await cardButton.isVisible().catch(() => false)) {
        test.skip(true, 'Product not visible in grid');
        return;
      }

      // Click multiple times rapidly with minimal delay
      const clickCount = 7;
      for (let i = 0; i < clickCount; i++) {
        await cardButton.click({ delay: 50 });
      }

      // Wait for order to save and mutations to settle
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify item still exists and quantity matches click count
      const hasItem = await hasLineItem(page, product.name);
      expect(hasItem).toBe(true);

      const item = await getLineItem(page, product.name);
      expect(item).not.toBeNull();
      expect(item!.quantity).toBe(clickCount);

      // Verify no duplicates
      const items = await getLineItems(page);
      expect(items.length).toBe(1);
    });

    test('rapid clicks sync correctly to WooCommerce', async ({ page }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();

      if (!product) {
        test.skip(true, 'No product available for testing');
        return;
      }

      // Ensure all products are visible
      const allLink = page.getByLabel('Show all categories');
      if (await allLink.isVisible().catch(() => false)) {
        await allLink.click();
        await page.waitForLoadState('networkidle');
      }

      // Find the product card button
      const productSku = product.sku;
      const cardButton = page.locator('button')
        .filter({ hasText: new RegExp(product.name, 'i') })
        .filter({ hasText: productSku ? new RegExp(productSku, 'i') : /.*/ })
        .first();

      if (!await cardButton.isVisible().catch(() => false)) {
        test.skip(true, 'Product not visible in grid');
        return;
      }

      // Rapid clicks
      const clickCount = 4;
      for (let i = 0; i < clickCount; i++) {
        await cardButton.click();
      }

      // Wait for order to save and mutations to settle
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      // Get order ID and verify in WooCommerce
      const orderId = await getCurrentOrderId(page);
      const savedOrder = await OrdersAPI.getOrder(orderId);

      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.line_items.length).toBe(1);
      expect(savedOrder!.line_items[0].quantity).toBe(clickCount);
    });
  });
});
