/**
 * Update Quantity Tests
 *
 * Tests for updating line item quantities.
 * These tests verify:
 * - Updating quantity via command
 * - Updating quantity via UI input
 * - Rapid quantity changes result in correct final value
 * - Persistence to WooCommerce API
 */

import { test, expect } from '../../fixtures';
import {
  gotoNewOrder,
  waitForMutations,
  getCurrentOrderId,
  getLineItem,
  updateLineItemQuantity,
  OrderVerify,
} from '../../fixtures';
import {
  getTestProducts,
  getTestSku,
  getTestPrice,
} from '../../fixtures';
import { CommandShortcuts } from '../../fixtures';
import OrdersAPI from '../../../api/orders';

test.describe('Line Item Quantity Updates', () => {
  test.describe('Update quantity via command', () => {
    test('can increase quantity using /item SKU qty command', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
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

      // Verify initial quantity
      await OrderVerify.lineItem(page, product.name, 2);

      // Increase quantity to 5
      await CommandShortcuts.addItem(page, sku, 5);
      await waitForMutations(page);

      // Verify quantity updated
      await OrderVerify.lineItem(page, product.name, 5);
    });

    test('can decrease quantity using /item SKU qty command', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item with quantity 5
      await CommandShortcuts.addItem(page, sku, 5);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify initial quantity
      await OrderVerify.lineItem(page, product.name, 5);

      // Decrease quantity to 2
      await CommandShortcuts.addItem(page, sku, 2);
      await waitForMutations(page);

      // Verify quantity updated
      await OrderVerify.lineItem(page, product.name, 2);
    });

    test('setting quantity to 1 works correctly', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item with quantity 10
      await CommandShortcuts.addItem(page, sku, 10);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify initial quantity
      await OrderVerify.lineItem(page, product.name, 10);

      // Set quantity to 1
      await CommandShortcuts.addItem(page, sku, 1);
      await waitForMutations(page);

      // Verify quantity updated
      await OrderVerify.lineItem(page, product.name, 1);
    });
  });

  test.describe('Update quantity via UI input', () => {
    test('can update quantity via line item input field', async ({ page, posPage }) => {
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
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify initial quantity
      await OrderVerify.lineItem(page, product.name, 3);

      // Update quantity via UI
      await updateLineItemQuantity(page, product.name, 7);
      await waitForMutations(page);

      // Verify quantity updated
      await OrderVerify.lineItem(page, product.name, 7);
    });

    test('UI quantity update persists to WooCommerce', async ({ page, posPage }) => {
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
      await CommandShortcuts.addItem(page, sku, 2);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Get order ID
      const orderId = await getCurrentOrderId(page);

      // Update quantity via UI
      await updateLineItemQuantity(page, product.name, 8);
      await waitForMutations(page);

      // Verify in WooCommerce
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.line_items.length).toBe(1);
      expect(savedOrder!.line_items[0].quantity).toBe(8);
    });
  });

  test.describe('Rapid quantity changes', () => {
    test('rapid quantity changes result in correct final value', async ({ page, posPage }) => {
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
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Rapid quantity changes - don't wait between commands
      await posPage.focusCommandBar();
      await posPage.typeCommand(`/item ${sku} 3`);
      await posPage.commandInput.press('Enter');

      await posPage.focusCommandBar();
      await posPage.typeCommand(`/item ${sku} 5`);
      await posPage.commandInput.press('Enter');

      await posPage.focusCommandBar();
      await posPage.typeCommand(`/item ${sku} 7`);
      await posPage.commandInput.press('Enter');

      // Wait for all mutations to settle
      await waitForMutations(page);

      // Final quantity should be 7 (the last value set)
      await OrderVerify.lineItem(page, product.name, 7);
    });

    test('rapid quantity changes sync correctly to WooCommerce', async ({ page, posPage }) => {
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
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Get order ID
      const orderId = await getCurrentOrderId(page);

      // Rapid changes
      await CommandShortcuts.addItem(page, sku, 2);
      await CommandShortcuts.addItem(page, sku, 4);
      await CommandShortcuts.addItem(page, sku, 6);

      // Wait for mutations
      await waitForMutations(page);

      // Verify final state in WooCommerce
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.line_items.length).toBe(1);
      expect(savedOrder!.line_items[0].quantity).toBe(6);
    });
  });

  test.describe('Order total recalculation', () => {
    test('order total updates when quantity changes', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product and price
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);
      const price = getTestPrice(product);

      if (!sku || price <= 0) {
        test.skip(true, 'No product with valid SKU and price available');
        return;
      }

      // Add item with quantity 2
      await CommandShortcuts.addItem(page, sku, 2);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Get order ID
      const orderId = await getCurrentOrderId(page);

      // Verify initial total
      let savedOrder = await OrdersAPI.getOrder(orderId);
      const initialTotal = parseFloat(savedOrder!.total);
      expect(Math.abs(initialTotal - price * 2)).toBeLessThan(0.02);

      // Change quantity to 5
      await CommandShortcuts.addItem(page, sku, 5);
      await waitForMutations(page);

      // Verify updated total
      savedOrder = await OrdersAPI.getOrder(orderId);
      const updatedTotal = parseFloat(savedOrder!.total);
      expect(Math.abs(updatedTotal - price * 5)).toBeLessThan(0.02);
    });

    test('decreasing quantity decreases total', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product and price
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);
      const price = getTestPrice(product);

      if (!sku || price <= 0) {
        test.skip(true, 'No product with valid SKU and price available');
        return;
      }

      // Add item with quantity 10
      await CommandShortcuts.addItem(page, sku, 10);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Get order ID
      const orderId = await getCurrentOrderId(page);

      // Verify initial total
      let savedOrder = await OrdersAPI.getOrder(orderId);
      const initialTotal = parseFloat(savedOrder!.total);
      expect(Math.abs(initialTotal - price * 10)).toBeLessThan(0.02);

      // Decrease quantity to 3
      await CommandShortcuts.addItem(page, sku, 3);
      await waitForMutations(page);

      // Verify decreased total
      savedOrder = await OrdersAPI.getOrder(orderId);
      const updatedTotal = parseFloat(savedOrder!.total);
      expect(Math.abs(updatedTotal - price * 3)).toBeLessThan(0.02);
      expect(updatedTotal).toBeLessThan(initialTotal);
    });
  });

  test.describe('Increment behavior', () => {
    test('using /item SKU without quantity increments by 1', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item with quantity 3
      await CommandShortcuts.addItem(page, sku, 3);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify initial quantity
      await OrderVerify.lineItem(page, product.name, 3);

      // Use /item SKU without quantity - should increment
      await posPage.focusCommandBar();
      await posPage.typeCommand(`/item ${sku}`);
      await posPage.commandInput.press('Enter');
      await waitForMutations(page);

      // Verify quantity incremented to 4
      await OrderVerify.lineItem(page, product.name, 4);
    });

    test('multiple increments work correctly', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item with quantity 1
      await posPage.executeCommandAndWait(`/item ${sku}`);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify quantity is 1
      await OrderVerify.lineItem(page, product.name, 1);

      // Increment 3 more times
      await posPage.executeCommandAndWait(`/item ${sku}`);
      await waitForMutations(page);
      await OrderVerify.lineItem(page, product.name, 2);

      await posPage.executeCommandAndWait(`/item ${sku}`);
      await waitForMutations(page);
      await OrderVerify.lineItem(page, product.name, 3);

      await posPage.executeCommandAndWait(`/item ${sku}`);
      await waitForMutations(page);
      await OrderVerify.lineItem(page, product.name, 4);
    });
  });

  test.describe('WooCommerce persistence', () => {
    test('quantity changes persist correctly via command', async ({ page, posPage }) => {
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
      await CommandShortcuts.addItem(page, sku, 4);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Get order ID
      const orderId = await getCurrentOrderId(page);

      // Verify initial state in WooCommerce
      let savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder!.line_items[0].quantity).toBe(4);

      // Update quantity
      await CommandShortcuts.addItem(page, sku, 9);
      await waitForMutations(page);

      // Verify updated state in WooCommerce
      savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder!.line_items[0].quantity).toBe(9);
    });

    test('quantity changes persist correctly via UI', async ({ page, posPage }) => {
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
      await CommandShortcuts.addItem(page, sku, 5);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Get order ID
      const orderId = await getCurrentOrderId(page);

      // Update via UI
      await updateLineItemQuantity(page, product.name, 12);
      await waitForMutations(page);

      // Verify in WooCommerce
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder!.line_items[0].quantity).toBe(12);
    });
  });
});
