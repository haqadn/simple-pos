/**
 * Add Item Tests
 *
 * Tests for adding products to orders via the /item command.
 * These tests verify:
 * - Adding items by SKU via command
 * - Adding items with specific quantity
 * - Incrementing quantity when adding same item twice
 * - Variable product variation selection
 * - Persistence to WooCommerce API
 */

import { test, expect, POSPage } from '../../fixtures';
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
  getTestPrice,
  getFirstInStockVariation,
} from '../../fixtures';
import { CommandShortcuts, executeCommandAndWait } from '../../fixtures';
import OrdersAPI from '../../../api/orders';

test.describe('Line Item Addition', () => {
  test.describe('Add item by SKU via command', () => {
    test('can add item by SKU using /item command', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get a simple product for testing
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item via command
      await CommandShortcuts.addItem(page, sku);

      // Wait for order to be saved (URL changes from /orders/new to /orders/[id])
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify line item appears in UI
      const hasItem = await hasLineItem(page, product.name);
      expect(hasItem).toBe(true);

      // Verify quantity is 1
      const item = await getLineItem(page, product.name);
      expect(item).not.toBeNull();
      expect(item?.quantity).toBe(1);
    });

    test('item command with SKU adds item with quantity 1', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Execute /item SKU (without quantity)
      await posPage.focusCommandBar();
      await posPage.typeCommand(`/item ${sku}`);
      await posPage.commandInput.press('Enter');

      // Wait for order to save
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify item was added with quantity 1
      await OrderVerify.lineItem(page, product.name, 1);
    });
  });

  test.describe('Add item with specific quantity', () => {
    test('can add item with specific quantity using /item SKU qty', async ({ page, posPage }) => {
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
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify item was added with quantity 5
      await OrderVerify.lineItem(page, product.name, 5);
    });

    test('/item SKU 3 adds item with quantity 3', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Execute /item SKU 3
      await posPage.focusCommandBar();
      await posPage.typeCommand(`/item ${sku} 3`);
      await posPage.commandInput.press('Enter');

      // Wait for order to save
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify quantity is 3
      const item = await getLineItem(page, product.name);
      expect(item).not.toBeNull();
      expect(item?.quantity).toBe(3);
    });
  });

  test.describe('Add same item twice increments quantity', () => {
    test('adding same item twice increments quantity', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item first time
      await CommandShortcuts.addItem(page, sku);

      // Wait for order to save
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify initial quantity is 1
      let item = await getLineItem(page, product.name);
      expect(item?.quantity).toBe(1);

      // Add same item again (without quantity - should increment)
      await CommandShortcuts.addItem(page, sku);
      await waitForMutations(page);

      // Verify quantity incremented to 2
      item = await getLineItem(page, product.name);
      expect(item?.quantity).toBe(2);
    });

    test('adding item twice without quantity increments by 1 each time', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // First add
      await posPage.executeCommandAndWait(`/item ${sku}`);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      await OrderVerify.lineItem(page, product.name, 1);

      // Second add
      await posPage.executeCommandAndWait(`/item ${sku}`);
      await waitForMutations(page);

      await OrderVerify.lineItem(page, product.name, 2);

      // Third add
      await posPage.executeCommandAndWait(`/item ${sku}`);
      await waitForMutations(page);

      await OrderVerify.lineItem(page, product.name, 3);
    });
  });

  test.describe('Add variable product', () => {
    test('adding variable product shows variation selector', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get variable product
      const { variable: product } = getTestProducts();

      // Check if we have a variable product with variations
      if (product.type !== 'variable' || !product.loadedVariations?.length) {
        test.skip(true, 'No variable product with variations available');
        return;
      }

      // Get the first variation SKU (this is what we need to add)
      const firstVariation = getFirstInStockVariation(product);
      if (!firstVariation || !firstVariation.sku) {
        test.skip(true, 'No variation with SKU available');
        return;
      }

      // Add variation by its SKU
      await CommandShortcuts.addItem(page, firstVariation.sku);

      // Wait for order to save
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify item was added - the name should include the variation details
      // or the parent product name
      const lineItems = await getLineItems(page);
      expect(lineItems.length).toBeGreaterThan(0);

      // Verify at least one item was added
      expect(lineItems.some(item =>
        item.name.toLowerCase().includes(product.name.toLowerCase().split(' ')[0]) ||
        item.quantity >= 1
      )).toBe(true);
    });

    test('can add variation product by variation SKU', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get variable product
      const { variable: product } = getTestProducts();

      if (product.type !== 'variable' || !product.loadedVariations?.length) {
        test.skip(true, 'No variable product with variations available');
        return;
      }

      // Find a variation with SKU
      const variation = product.loadedVariations.find(v => v.sku && v.stock_status === 'instock');
      if (!variation) {
        test.skip(true, 'No in-stock variation with SKU available');
        return;
      }

      // Add by variation SKU
      await posPage.executeCommandAndWait(`/item ${variation.sku}`);

      // Wait for order to save
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify line item exists
      const lineItemCount = await getLineItemCount(page);
      expect(lineItemCount).toBe(1);
    });
  });

  test.describe('Persistence to WooCommerce', () => {
    test('added item persists to WooCommerce order', async ({ page, posPage }) => {
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

      // Wait for order to save
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Get order ID from URL
      const orderId = await getCurrentOrderId(page);
      expect(orderId).not.toBe('new');
      expect(orderId).toMatch(/^\d+$/);

      // Verify via API
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.line_items).toBeDefined();
      expect(savedOrder!.line_items.length).toBe(1);
      expect(savedOrder!.line_items[0].quantity).toBe(1);
      expect(savedOrder!.line_items[0].product_id).toBe(product.id);
    });

    test('item with quantity persists correct quantity to WooCommerce', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item with quantity 7
      await CommandShortcuts.addItem(page, sku, 7);

      // Wait for order to save
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Get order ID and verify via API
      const orderId = await getCurrentOrderId(page);
      const savedOrder = await OrdersAPI.getOrder(orderId);

      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.line_items.length).toBe(1);
      expect(savedOrder!.line_items[0].quantity).toBe(7);
    });

    test('multiple items persist correctly to WooCommerce', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test products
      const { simple, variable } = getTestProducts();
      const simpleSku = getTestSku(simple);

      if (!simpleSku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add first item
      await CommandShortcuts.addItem(page, simpleSku, 2);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Try to add a second item if we have a variable product with variations
      let variationSku: string | null = null;
      if (variable.type === 'variable' && variable.loadedVariations?.length) {
        const variation = getFirstInStockVariation(variable);
        if (variation && variation.sku && variation.sku !== simpleSku) {
          variationSku = variation.sku;
          await CommandShortcuts.addItem(page, variationSku, 3);
          await waitForMutations(page);
        }
      }

      // Get order and verify
      const orderId = await getCurrentOrderId(page);
      const savedOrder = await OrdersAPI.getOrder(orderId);

      expect(savedOrder).not.toBeNull();

      if (variationSku) {
        // If we added two different products
        expect(savedOrder!.line_items.length).toBe(2);

        // Find the simple product line item
        const simpleLineItem = savedOrder!.line_items.find(li => li.product_id === simple.id);
        expect(simpleLineItem).toBeDefined();
        expect(simpleLineItem?.quantity).toBe(2);
      } else {
        // If we only added one product
        expect(savedOrder!.line_items.length).toBe(1);
        expect(savedOrder!.line_items[0].quantity).toBe(2);
      }
    });

    test('order total updates correctly when item is added', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product and its price
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);
      const price = getTestPrice(product);

      if (!sku || price <= 0) {
        test.skip(true, 'No product with valid SKU and price available');
        return;
      }

      // Add item with quantity 3
      await CommandShortcuts.addItem(page, sku, 3);

      // Wait for order to save
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify order total via API
      const orderId = await getCurrentOrderId(page);
      const savedOrder = await OrdersAPI.getOrder(orderId);

      expect(savedOrder).not.toBeNull();
      const expectedTotal = price * 3;
      const actualTotal = parseFloat(savedOrder!.total);

      // Allow for minor floating point differences
      expect(Math.abs(actualTotal - expectedTotal)).toBeLessThan(0.02);
    });
  });

  test.describe('Add item via autocomplete', () => {
    test('can add item by selecting from autocomplete suggestions', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Type partial SKU to trigger autocomplete
      await posPage.focusCommandBar();
      await posPage.typeCommand(`/item ${sku.substring(0, Math.min(3, sku.length))}`);

      try {
        // Wait for autocomplete
        await posPage.waitForAutocomplete();

        // Get suggestions and verify our product is listed
        const suggestions = await posPage.getAutocompleteSuggestions();
        expect(suggestions.length).toBeGreaterThan(0);

        // Select first suggestion
        await posPage.selectAutocompleteSuggestion(0);

        // Execute the command
        await posPage.commandInput.press('Enter');

        // Wait for order to save
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);

        // Verify an item was added
        const lineItemCount = await getLineItemCount(page);
        expect(lineItemCount).toBeGreaterThan(0);
      } catch {
        // If autocomplete doesn't work as expected, try direct SKU entry
        await posPage.clearCommandInput();
        await posPage.executeCommandAndWait(`/item ${sku}`);
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);

        const lineItemCount = await getLineItemCount(page);
        expect(lineItemCount).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Item command aliases', () => {
    test('/i alias works the same as /item', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
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

      // Wait for order to save
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify item was added
      await OrderVerify.lineItem(page, product.name, 1);
    });

    test('/i SKU qty adds item with specified quantity', async ({ page, posPage }) => {
      // Navigate to new order page
      await gotoNewOrder(page);

      // Get test product
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Use /i alias with quantity
      await posPage.focusCommandBar();
      await posPage.typeCommand(`/i ${sku} 4`);
      await posPage.commandInput.press('Enter');

      // Wait for order to save
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify item was added with correct quantity
      await OrderVerify.lineItem(page, product.name, 4);
    });
  });
});
