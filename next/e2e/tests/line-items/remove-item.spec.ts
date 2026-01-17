/**
 * Remove Item Tests
 *
 * Tests for removing products from orders.
 * These tests verify:
 * - Removing items via /item SKU 0 command
 * - Removing the last item leaves order empty
 * - Persistence to WooCommerce API
 */

import { test, expect } from '../../fixtures';
import {
  gotoNewOrder,
  waitForMutations,
  getCurrentOrderId,
  getLineItems,
  getLineItemCount,
  hasLineItem,
  OrderVerify,
} from '../../fixtures';
import {
  getTestProducts,
  getTestSku,
  getFirstInStockVariation,
} from '../../fixtures';
import { CommandShortcuts } from '../../fixtures';
import OrdersAPI from '../../../api/orders';

test.describe('Line Item Removal', () => {
  test.describe('Remove item via command', () => {
    test('can remove item via /item SKU 0 command', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get a simple product for testing
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item first
      await CommandShortcuts.addItem(page, sku);

      // Wait for order to be saved (URL changes from /orders/new to /orders/[id])
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify item is in order
      const hasItemBefore = await hasLineItem(page, product.name);
      expect(hasItemBefore).toBe(true);

      // Remove item via /item SKU 0
      await CommandShortcuts.removeItem(page, sku);
      await waitForMutations(page);

      // Verify item is removed
      const hasItemAfter = await hasLineItem(page, product.name);
      expect(hasItemAfter).toBe(false);
    });

    test('/item SKU 0 removes item from order', async ({ page, posPage }) => {
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

      // Wait for order to save
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify item was added
      await OrderVerify.lineItem(page, product.name, 5);

      // Remove item by setting quantity to 0
      await posPage.focusCommandBar();
      await posPage.typeCommand(`/item ${sku} 0`);
      await posPage.commandInput.press('Enter');
      await waitForMutations(page);

      // Verify item is gone
      await OrderVerify.noLineItem(page, product.name);
    });

    test('removing item with /i SKU 0 alias works', async ({ page, posPage }) => {
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
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify item exists
      const hasItemBefore = await hasLineItem(page, product.name);
      expect(hasItemBefore).toBe(true);

      // Remove using /i alias
      await posPage.focusCommandBar();
      await posPage.typeCommand(`/i ${sku} 0`);
      await posPage.commandInput.press('Enter');
      await waitForMutations(page);

      // Verify item is removed
      await OrderVerify.noLineItem(page, product.name);
    });
  });

  test.describe('Remove last item', () => {
    test('removing last item leaves order empty', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add single item
      await CommandShortcuts.addItem(page, sku);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify order has 1 item
      await OrderVerify.lineItemCount(page, 1);

      // Remove the item
      await CommandShortcuts.removeItem(page, sku);
      await waitForMutations(page);

      // Verify order is empty
      await OrderVerify.isEmpty(page);
    });

    test('order with no items has zero total', async ({ page, posPage }) => {
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
      await CommandShortcuts.addItem(page, sku);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      // Remove the item
      await CommandShortcuts.removeItem(page, sku);
      await waitForMutations(page);

      // Verify total is zero
      await OrderVerify.total(page, 0);
    });
  });

  test.describe('Remove one of multiple items', () => {
    test('can remove one item while keeping others', async ({ page, posPage }) => {
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

      // Add first item
      await CommandShortcuts.addItem(page, simpleSku, 2);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      if (secondSku) {
        // Add second item if available
        await CommandShortcuts.addItem(page, secondSku, 3);
        await waitForMutations(page);

        // Verify both items exist
        const lineItems = await getLineItems(page);
        expect(lineItems.length).toBe(2);

        // Remove first item
        await CommandShortcuts.removeItem(page, simpleSku);
        await waitForMutations(page);

        // Verify first item is gone, second remains
        await OrderVerify.noLineItem(page, simple.name);
        const remainingItems = await getLineItems(page);
        expect(remainingItems.length).toBe(1);
      } else {
        // If only one product available, just verify we can remove it
        await OrderVerify.lineItem(page, simple.name, 2);

        // Remove item
        await CommandShortcuts.removeItem(page, simpleSku);
        await waitForMutations(page);

        // Verify empty
        await OrderVerify.isEmpty(page);
      }
    });
  });

  test.describe('Persistence to WooCommerce', () => {
    test('removed item is deleted from WooCommerce order', async ({ page, posPage }) => {
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

      // Get order ID
      const orderId = await getCurrentOrderId(page);
      expect(orderId).not.toBe('new');

      // Verify item exists in WooCommerce
      let savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.line_items.length).toBe(1);

      // Remove item
      await CommandShortcuts.removeItem(page, sku);
      await waitForMutations(page);

      // Verify item is removed from WooCommerce
      savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.line_items.length).toBe(0);
    });

    test('order total updates to zero after all items removed', async ({ page, posPage }) => {
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
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      // Get order ID
      const orderId = await getCurrentOrderId(page);

      // Verify non-zero total in WooCommerce
      let savedOrder = await OrdersAPI.getOrder(orderId);
      expect(parseFloat(savedOrder!.total)).toBeGreaterThan(0);

      // Remove item
      await CommandShortcuts.removeItem(page, sku);
      await waitForMutations(page);

      // Verify total is zero in WooCommerce
      savedOrder = await OrdersAPI.getOrder(orderId);
      expect(parseFloat(savedOrder!.total)).toBe(0);
    });
  });
});
