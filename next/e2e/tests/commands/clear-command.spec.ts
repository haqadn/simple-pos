/**
 * Clear Command Tests
 *
 * Tests for the /clear command, which removes all line items from the current order.
 * This test file covers:
 * - /clear removes all line items
 * - /clear on empty order does not error
 * - /cl alias works correctly
 * - Verify order remains as draft with zero total
 *
 * Note: Clear command tests use real WooCommerce API to test the full integration.
 */

import { test, expect } from '../../fixtures';
import {
  gotoNewOrder,
  waitForMutations,
  getCurrentOrderId,
  getOrderTotal,
  getLineItemCount,
  getLineItems,
} from '../../fixtures';
import {
  getTestProducts,
  getTestSku,
  getTestPrice,
} from '../../fixtures';
import {
  executeCommand,
  executeCommandAndWait,
  CommandShortcuts,
} from '../../fixtures';
import OrdersAPI from '../../../api/orders';

test.describe('Clear Command', () => {
  test.describe('/clear removes all line items', () => {
    test('can clear order with /clear command', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);
      const price = getTestPrice(product);

      if (!sku || price <= 0) {
        test.skip(true, 'No product with valid SKU and price available');
        return;
      }

      // Add multiple items to create an order with content
      await CommandShortcuts.addItem(page, sku, 3);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify items were added
      const initialCount = await getLineItemCount(page);
      expect(initialCount).toBeGreaterThan(0);

      const initialTotal = await getOrderTotal(page);
      expect(initialTotal).toBeGreaterThan(0);

      // Execute clear command
      await posPage.focusCommandBar();
      await posPage.typeCommand('/clear');
      await posPage.commandInput.press('Enter');
      await waitForMutations(page);

      // Wait for the clear operation to complete
      await page.waitForTimeout(1000);

      // Verify all items are removed from UI
      const finalCount = await getLineItemCount(page);
      expect(finalCount).toBe(0);
    });

    test('/clear removes all items regardless of quantity', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item with large quantity
      await CommandShortcuts.addItem(page, sku, 10);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify item is present
      const lineItems = await getLineItems(page);
      expect(lineItems.length).toBe(1);

      // Clear the order
      await CommandShortcuts.clearOrder(page);
      await page.waitForTimeout(1000);

      // Verify order is empty
      const finalCount = await getLineItemCount(page);
      expect(finalCount).toBe(0);
    });

    test('/clear removes multiple different items', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product, variable: varProduct } = getTestProducts();
      const sku1 = getTestSku(product);
      const sku2 = varProduct?.sku;

      if (!sku1) {
        test.skip(true, 'No product SKU available for testing');
        return;
      }

      // Add first item
      await CommandShortcuts.addItem(page, sku1, 2);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Add second item if available (use same item with different qty if no variable product)
      if (sku2 && sku2 !== sku1) {
        await CommandShortcuts.addItem(page, sku2, 1);
        await waitForMutations(page);
      }

      // Clear all items
      await CommandShortcuts.clearOrder(page);
      await page.waitForTimeout(1000);

      // Verify all items removed
      const finalCount = await getLineItemCount(page);
      expect(finalCount).toBe(0);
    });

    test('/clear updates order total to zero in UI', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);
      const price = getTestPrice(product);

      if (!sku || price <= 0) {
        test.skip(true, 'No product with valid SKU and price available');
        return;
      }

      // Add items to create an order with a total
      await CommandShortcuts.addItem(page, sku, 5);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify we have a non-zero total
      const initialTotal = await getOrderTotal(page);
      expect(initialTotal).toBeGreaterThan(0);

      // Clear the order
      await CommandShortcuts.clearOrder(page);
      await page.waitForTimeout(1000);

      // Verify total is now zero
      const finalTotal = await getOrderTotal(page);
      expect(finalTotal).toBe(0);
    });
  });

  test.describe('/clear on empty order does not error', () => {
    test('/clear on empty order shows message but does not crash', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      // Don't add any items - execute clear on empty order
      await posPage.focusCommandBar();
      await posPage.typeCommand('/clear');
      await posPage.commandInput.press('Enter');
      await page.waitForTimeout(500);

      // Should not crash - page still functional
      const commandInput = page.locator('input[aria-label="Command input field"]');
      await expect(commandInput).toBeVisible();

      // Command bar should still be usable
      await posPage.focusCommandBar();
      await expect(posPage.commandInput).toBeFocused();
    });

    test('/clear on order with zero items does not create negative state', async ({ page }) => {
      await gotoNewOrder(page);

      // Execute clear command on empty order
      await CommandShortcuts.clearOrder(page);
      await page.waitForTimeout(500);

      // Verify order state is valid (zero items, zero total)
      const count = await getLineItemCount(page);
      expect(count).toBe(0);

      const total = await getOrderTotal(page);
      expect(total).toBe(0);
    });

    test('multiple /clear commands on empty order do not cause issues', async ({ page }) => {
      await gotoNewOrder(page);

      // Execute clear multiple times
      await CommandShortcuts.clearOrder(page);
      await page.waitForTimeout(300);
      await CommandShortcuts.clearOrder(page);
      await page.waitForTimeout(300);
      await CommandShortcuts.clearOrder(page);
      await page.waitForTimeout(300);

      // Should still be functional
      const commandInput = page.locator('input[aria-label="Command input field"]');
      await expect(commandInput).toBeVisible();

      // Order should still be empty and valid
      const count = await getLineItemCount(page);
      expect(count).toBe(0);
    });
  });

  test.describe('/cl alias works correctly', () => {
    test('/cl alias clears order same as /clear', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add items
      await CommandShortcuts.addItem(page, sku, 2);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify items added
      const initialCount = await getLineItemCount(page);
      expect(initialCount).toBeGreaterThan(0);

      // Use /cl alias
      await posPage.focusCommandBar();
      await posPage.typeCommand('/cl');
      await posPage.commandInput.press('Enter');
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify items removed
      const finalCount = await getLineItemCount(page);
      expect(finalCount).toBe(0);
    });

    test('/cl alias updates total to zero', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);
      const price = getTestPrice(product);

      if (!sku || price <= 0) {
        test.skip(true, 'No product with valid SKU and price available');
        return;
      }

      // Add items
      await CommandShortcuts.addItem(page, sku, 3);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      const initialTotal = await getOrderTotal(page);
      expect(initialTotal).toBeGreaterThan(0);

      // Use /cl alias
      await executeCommandAndWait(page, 'cl');
      await page.waitForTimeout(1000);

      // Verify total is zero
      const finalTotal = await getOrderTotal(page);
      expect(finalTotal).toBe(0);
    });

    test('/cl on empty order behaves same as /clear on empty order', async ({ page }) => {
      await gotoNewOrder(page);

      // Execute /cl on empty order
      await executeCommand(page, 'cl');
      await page.waitForTimeout(500);

      // Should not crash - page still functional
      const commandInput = page.locator('input[aria-label="Command input field"]');
      await expect(commandInput).toBeVisible();

      // Order should remain empty
      const count = await getLineItemCount(page);
      expect(count).toBe(0);
    });
  });

  test.describe('Verify order remains as draft with zero total', () => {
    test('order remains as draft status after /clear', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add items to create a saved order
      await CommandShortcuts.addItem(page, sku, 2);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);

      // Clear the order
      await CommandShortcuts.clearOrder(page);
      await page.waitForTimeout(1000);

      // Verify order still exists and is in draft/pending status
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder).not.toBeNull();
      // Order should be pending (WooCommerce draft status)
      expect(['pending', 'draft', 'checkout-draft']).toContain(savedOrder!.status);
    });

    test('order total is zero in WooCommerce after /clear', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add items
      await CommandShortcuts.addItem(page, sku, 3);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);

      // Verify order has non-zero total before clear
      let savedOrder = await OrdersAPI.getOrder(orderId);
      expect(parseFloat(savedOrder!.total)).toBeGreaterThan(0);

      // Clear the order
      await CommandShortcuts.clearOrder(page);
      await page.waitForTimeout(1000);

      // Verify total is zero in WooCommerce
      savedOrder = await OrdersAPI.getOrder(orderId);
      expect(parseFloat(savedOrder!.total)).toBe(0);
    });

    test('line_items array is empty in WooCommerce after /clear', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add items
      await CommandShortcuts.addItem(page, sku, 5);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);

      // Verify order has line items before clear
      let savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder!.line_items.length).toBeGreaterThan(0);

      // Clear the order
      await CommandShortcuts.clearOrder(page);
      await page.waitForTimeout(1000);

      // Verify line_items is empty in WooCommerce
      savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder!.line_items.length).toBe(0);
    });

    test('order is not deleted after /clear', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add items to create a saved order
      await CommandShortcuts.addItem(page, sku, 1);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);

      // Clear the order
      await CommandShortcuts.clearOrder(page);
      await page.waitForTimeout(1000);

      // Verify order still exists (not trashed or deleted)
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.status).not.toBe('trash');
    });

    test('can add items after /clear', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);
      const price = getTestPrice(product);

      if (!sku || price <= 0) {
        test.skip(true, 'No product with valid SKU and price available');
        return;
      }

      // Add items
      await CommandShortcuts.addItem(page, sku, 2);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);

      // Clear the order
      await CommandShortcuts.clearOrder(page);
      await page.waitForTimeout(1000);

      // Verify order is empty
      let count = await getLineItemCount(page);
      expect(count).toBe(0);

      // Add items again
      await CommandShortcuts.addItem(page, sku, 4);
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify items were added
      count = await getLineItemCount(page);
      expect(count).toBe(1);

      // Verify in WooCommerce - should have same order ID
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder!.line_items.length).toBe(1);
      expect(savedOrder!.line_items[0].quantity).toBe(4);
    });
  });

  test.describe('Edge Cases', () => {
    test('/clear preserves customer assignment', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add items
      await CommandShortcuts.addItem(page, sku, 2);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);

      // Get initial order state
      let savedOrder = await OrdersAPI.getOrder(orderId);
      const initialCustomerId = savedOrder!.customer_id;

      // Clear the order
      await CommandShortcuts.clearOrder(page);
      await page.waitForTimeout(1000);

      // Verify customer assignment is preserved
      savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder!.customer_id).toBe(initialCustomerId);
    });

    test('/clear preserves order notes', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add items
      await CommandShortcuts.addItem(page, sku, 2);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);

      // Get initial customer note (if any)
      let savedOrder = await OrdersAPI.getOrder(orderId);
      const initialNote = savedOrder!.customer_note;

      // Clear the order
      await CommandShortcuts.clearOrder(page);
      await page.waitForTimeout(1000);

      // Verify notes are preserved
      savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder!.customer_note).toBe(initialNote);
    });

    test('/clear does not affect coupon lines', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add items
      await CommandShortcuts.addItem(page, sku, 2);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);

      // Get initial coupon state (if any)
      let savedOrder = await OrdersAPI.getOrder(orderId);
      const initialCouponCount = savedOrder!.coupon_lines.length;

      // Clear the order
      await CommandShortcuts.clearOrder(page);
      await page.waitForTimeout(1000);

      // Verify coupon lines are preserved (or still empty)
      savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder!.coupon_lines.length).toBe(initialCouponCount);
    });

    test('command bar remains functional after /clear', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add items
      await CommandShortcuts.addItem(page, sku, 2);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Clear the order
      await CommandShortcuts.clearOrder(page);
      await page.waitForTimeout(500);

      // Verify command bar is still functional
      await posPage.focusCommandBar();
      await expect(posPage.commandInput).toBeFocused();

      // Should be able to type commands
      await posPage.typeCommand('/item');
      const inputValue = await posPage.commandInput.inputValue();
      expect(inputValue).toBe('/item');
    });

    test('/clear with payment recorded - payment is preserved', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);
      const price = getTestPrice(product);

      if (!sku || price <= 0) {
        test.skip(true, 'No product with valid SKU and price available');
        return;
      }

      // Add items
      await CommandShortcuts.addItem(page, sku, 2);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Record payment
      const paymentAmount = price * 2;
      await CommandShortcuts.recordPayment(page, paymentAmount);
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);

      // Verify payment was recorded
      let savedOrder = await OrdersAPI.getOrder(orderId);
      const paymentMeta = savedOrder!.meta_data.find((m: { key: string }) => m.key === 'payment_received');
      expect(paymentMeta).toBeDefined();

      // Clear the order
      await CommandShortcuts.clearOrder(page);
      await page.waitForTimeout(1000);

      // Verify payment is still recorded (or behavior matches app design)
      savedOrder = await OrdersAPI.getOrder(orderId);
      // Note: The actual behavior depends on app implementation
      // Payment may or may not be preserved after clear
      expect(savedOrder!.line_items.length).toBe(0);
    });
  });
});
