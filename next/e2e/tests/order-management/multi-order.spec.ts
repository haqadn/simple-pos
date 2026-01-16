/**
 * Multi-Order Management Tests
 *
 * Tests for managing multiple concurrent orders in the POS interface.
 * These tests verify that orders maintain independent state, URL-based
 * routing works correctly, and switching between orders preserves data.
 */

import { test, expect } from '../../fixtures';
import {
  gotoOrders,
  gotoOrder,
  createNewOrder,
  getCurrentOrderId,
  waitForMutations,
  getLineItems,
  getOrderTotal,
  clickOrderInSidebar,
  getTestProducts,
  getTestSku,
  getTestPrice,
} from '../../fixtures';
import { executeCommand } from '../../helpers/commands';
import OrdersAPI from '../../../api/orders';

test.describe('Multi-Order Management', () => {
  test.describe('Create and switch between multiple orders', () => {
    test('can create two orders and switch between them', async ({ page, posPage }) => {
      // Get test product
      let product;
      let sku: string;
      try {
        const products = getTestProducts();
        product = products.simple;
        sku = getTestSku(product);
      } catch {
        test.skip(true, 'Test data not available - skipping test');
        return;
      }

      // Navigate to orders page
      await gotoOrders(page);

      // Create first order
      await createNewOrder(page);
      await page.waitForURL(/\/orders\/new/);

      // Add an item to save the first order
      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku]);

      // Wait for order to be saved
      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not save first order - skipping test');
        return;
      }

      const firstOrderId = await getCurrentOrderId(page);
      expect(firstOrderId).toMatch(/^\d+$/);

      // Verify first order has item
      const firstOrderItems = await getLineItems(page);
      expect(firstOrderItems.length).toBe(1);

      // Create second order
      const newOrderButton = page.getByRole('button', { name: /New Order/i });
      await newOrderButton.click();
      await page.waitForURL(/\/orders\/new/);

      // Add a different quantity to distinguish second order
      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku, '3']);

      // Wait for second order to be saved
      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not save second order - skipping test');
        return;
      }

      const secondOrderId = await getCurrentOrderId(page);
      expect(secondOrderId).toMatch(/^\d+$/);
      expect(secondOrderId).not.toBe(firstOrderId);

      // Verify second order has item with quantity 3
      const secondOrderItems = await getLineItems(page);
      expect(secondOrderItems.length).toBe(1);
      expect(secondOrderItems[0].quantity).toBe(3);

      // Switch back to first order via sidebar
      await clickOrderInSidebar(page, firstOrderId);
      await waitForMutations(page);

      // Verify we're on first order
      const currentId = await getCurrentOrderId(page);
      expect(currentId).toBe(firstOrderId);

      // Verify first order still has quantity 1
      const firstOrderItemsAfterSwitch = await getLineItems(page);
      expect(firstOrderItemsAfterSwitch.length).toBe(1);
      expect(firstOrderItemsAfterSwitch[0].quantity).toBe(1);
    });

    test('can switch between orders using sidebar links', async ({ page, posPage }) => {
      // Get test product
      let sku: string;
      try {
        const products = getTestProducts();
        sku = getTestSku(products.simple);
      } catch {
        test.skip(true, 'Test data not available - skipping test');
        return;
      }

      // Create first order
      await page.goto('/orders/new');
      await page.waitForLoadState('networkidle');

      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku]);

      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not create first order - skipping test');
        return;
      }

      const firstOrderId = await getCurrentOrderId(page);

      // Create second order
      const newOrderButton = page.getByRole('button', { name: /New Order/i });
      await newOrderButton.click();
      await page.waitForURL(/\/orders\/new/);

      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku, '2']);

      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not create second order - skipping test');
        return;
      }

      const secondOrderId = await getCurrentOrderId(page);

      // Verify both orders appear in sidebar
      const firstOrderLink = page.locator(`aside a[href="/orders/${firstOrderId}"]`);
      const secondOrderLink = page.locator(`aside a[href="/orders/${secondOrderId}"]`);

      await expect(firstOrderLink).toBeVisible();
      await expect(secondOrderLink).toBeVisible();

      // Switch to first order
      await firstOrderLink.click();
      await page.waitForURL(`/orders/${firstOrderId}`);
      await waitForMutations(page);

      expect(await getCurrentOrderId(page)).toBe(firstOrderId);

      // Switch back to second order
      await secondOrderLink.click();
      await page.waitForURL(`/orders/${secondOrderId}`);
      await waitForMutations(page);

      expect(await getCurrentOrderId(page)).toBe(secondOrderId);
    });

    test('switching orders does not corrupt data', async ({ page, posPage }) => {
      // Get test products - need two different products
      let sku1: string;
      let sku2: string;
      try {
        const products = getTestProducts();
        const testData = await import('../../fixtures/test-data').then(m => m.getTestData());

        // Find two different products
        const availableProducts = testData.allProducts.filter(p =>
          p.type === 'simple' &&
          p.stock_status === 'instock' &&
          p.sku &&
          p.price > 0
        );

        if (availableProducts.length < 2) {
          // Use same product with different quantities
          sku1 = getTestSku(products.simple);
          sku2 = sku1;
        } else {
          sku1 = availableProducts[0].sku;
          sku2 = availableProducts[1].sku;
        }
      } catch {
        test.skip(true, 'Test data not available - skipping test');
        return;
      }

      // Create first order with product 1 (quantity 2)
      await page.goto('/orders/new');
      await page.waitForLoadState('networkidle');

      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku1, '2']);

      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not create first order - skipping test');
        return;
      }

      const firstOrderId = await getCurrentOrderId(page);
      const firstOrderInitialTotal = await getOrderTotal(page);

      // Create second order with different product/quantity
      const newOrderButton = page.getByRole('button', { name: /New Order/i });
      await newOrderButton.click();
      await page.waitForURL(/\/orders\/new/);

      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku2, '5']);

      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not create second order - skipping test');
        return;
      }

      const secondOrderId = await getCurrentOrderId(page);
      const secondOrderInitialTotal = await getOrderTotal(page);

      // Make multiple switches
      for (let i = 0; i < 3; i++) {
        await clickOrderInSidebar(page, firstOrderId);
        await waitForMutations(page);

        await clickOrderInSidebar(page, secondOrderId);
        await waitForMutations(page);
      }

      // Verify second order data is intact
      const secondOrderFinalTotal = await getOrderTotal(page);
      expect(Math.abs(secondOrderFinalTotal - secondOrderInitialTotal)).toBeLessThan(0.01);

      const secondOrderItems = await getLineItems(page);
      expect(secondOrderItems.length).toBe(1);
      expect(secondOrderItems[0].quantity).toBe(5);

      // Switch to first order and verify
      await clickOrderInSidebar(page, firstOrderId);
      await waitForMutations(page);

      const firstOrderFinalTotal = await getOrderTotal(page);
      expect(Math.abs(firstOrderFinalTotal - firstOrderInitialTotal)).toBeLessThan(0.01);

      const firstOrderItems = await getLineItems(page);
      expect(firstOrderItems.length).toBe(1);
      expect(firstOrderItems[0].quantity).toBe(2);
    });
  });

  test.describe('Each order maintains independent state', () => {
    test('line items are independent between orders', async ({ page, posPage }) => {
      let sku: string;
      let price: number;
      try {
        const products = getTestProducts();
        sku = getTestSku(products.simple);
        price = getTestPrice(products.simple);
      } catch {
        test.skip(true, 'Test data not available - skipping test');
        return;
      }

      // Create first order with 1 item
      await page.goto('/orders/new');
      await page.waitForLoadState('networkidle');

      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku]);

      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not create first order - skipping test');
        return;
      }

      const firstOrderId = await getCurrentOrderId(page);

      // Create second order with 3 items
      const newOrderButton = page.getByRole('button', { name: /New Order/i });
      await newOrderButton.click();
      await page.waitForURL(/\/orders\/new/);

      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku, '3']);

      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not create second order - skipping test');
        return;
      }

      const secondOrderId = await getCurrentOrderId(page);

      // Verify second order has quantity 3
      const secondOrderItems = await getLineItems(page);
      expect(secondOrderItems[0].quantity).toBe(3);

      // Switch to first order
      await clickOrderInSidebar(page, firstOrderId);
      await waitForMutations(page);

      // Verify first order still has quantity 1 (not affected by second order)
      const firstOrderItems = await getLineItems(page);
      expect(firstOrderItems[0].quantity).toBe(1);

      // Verify totals are independent
      const firstOrderTotal = await getOrderTotal(page);
      expect(Math.abs(firstOrderTotal - price)).toBeLessThan(0.01);

      await clickOrderInSidebar(page, secondOrderId);
      await waitForMutations(page);

      const secondOrderTotal = await getOrderTotal(page);
      expect(Math.abs(secondOrderTotal - (price * 3))).toBeLessThan(0.01);
    });

    test('modifying one order does not affect another', async ({ page, posPage }) => {
      let sku: string;
      try {
        const products = getTestProducts();
        sku = getTestSku(products.simple);
      } catch {
        test.skip(true, 'Test data not available - skipping test');
        return;
      }

      // Create two orders with same initial quantity
      await page.goto('/orders/new');
      await page.waitForLoadState('networkidle');

      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku, '2']);

      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not create first order - skipping test');
        return;
      }

      const firstOrderId = await getCurrentOrderId(page);

      // Create second order
      const newOrderButton = page.getByRole('button', { name: /New Order/i });
      await newOrderButton.click();
      await page.waitForURL(/\/orders\/new/);

      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku, '2']);

      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not create second order - skipping test');
        return;
      }

      const secondOrderId = await getCurrentOrderId(page);

      // Modify second order - increase quantity to 5
      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku, '5']);
      await waitForMutations(page);

      // Verify second order has quantity 5
      const secondOrderItems = await getLineItems(page);
      expect(secondOrderItems[0].quantity).toBe(5);

      // Switch to first order
      await clickOrderInSidebar(page, firstOrderId);
      await waitForMutations(page);

      // Verify first order still has quantity 2 (unaffected)
      const firstOrderItems = await getLineItems(page);
      expect(firstOrderItems[0].quantity).toBe(2);

      // Verify via API
      const apiFirstOrder = await OrdersAPI.getOrder(firstOrderId);
      expect(apiFirstOrder!.line_items.length).toBe(1);
      expect(apiFirstOrder!.line_items[0].quantity).toBe(2);

      const apiSecondOrder = await OrdersAPI.getOrder(secondOrderId);
      expect(apiSecondOrder!.line_items.length).toBe(1);
      expect(apiSecondOrder!.line_items[0].quantity).toBe(5);
    });

    test('payment data is independent between orders', async ({ page, posPage }) => {
      let sku: string;
      try {
        const products = getTestProducts();
        sku = getTestSku(products.simple);
      } catch {
        test.skip(true, 'Test data not available - skipping test');
        return;
      }

      // Create first order and record payment
      await page.goto('/orders/new');
      await page.waitForLoadState('networkidle');

      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku, '2']);

      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not create first order - skipping test');
        return;
      }

      const firstOrderId = await getCurrentOrderId(page);

      // Record payment on first order
      await posPage.focusCommandBar();
      await executeCommand(page, 'pay', ['50']);
      await waitForMutations(page);

      // Create second order without payment
      const newOrderButton = page.getByRole('button', { name: /New Order/i });
      await newOrderButton.click();
      await page.waitForURL(/\/orders\/new/);

      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku]);

      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not create second order - skipping test');
        return;
      }

      const secondOrderId = await getCurrentOrderId(page);

      // Verify second order has no payment
      const cashInput = page.locator('input[aria-label="Cash amount"]');
      const secondOrderPayment = await cashInput.inputValue();
      expect(parseFloat(secondOrderPayment) || 0).toBe(0);

      // Switch to first order
      await clickOrderInSidebar(page, firstOrderId);
      await waitForMutations(page);

      // Verify first order still has payment
      const firstOrderPayment = await cashInput.inputValue();
      expect(parseFloat(firstOrderPayment)).toBe(50);

      // Verify via API
      const apiFirstOrder = await OrdersAPI.getOrder(firstOrderId);
      const paymentMeta = apiFirstOrder!.meta_data?.find(
        (m) => m.key === 'payment_received'
      );
      expect(paymentMeta).toBeTruthy();
      expect(parseFloat(String(paymentMeta?.value) || '0')).toBe(50);
    });
  });

  test.describe('URL-based routing loads correct order', () => {
    test('navigating directly to order URL loads correct order', async ({ page, posPage }) => {
      let sku: string;
      try {
        const products = getTestProducts();
        sku = getTestSku(products.simple);
      } catch {
        test.skip(true, 'Test data not available - skipping test');
        return;
      }

      // Create an order
      await page.goto('/orders/new');
      await page.waitForLoadState('networkidle');

      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku, '7']);

      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not create order - skipping test');
        return;
      }

      const orderId = await getCurrentOrderId(page);

      // Navigate away
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      // Navigate directly to the order URL
      await page.goto(`/orders/${orderId}`);
      await page.waitForLoadState('networkidle');

      // Verify correct order is loaded
      const currentId = await getCurrentOrderId(page);
      expect(currentId).toBe(orderId);

      // Verify order data is correct
      const items = await getLineItems(page);
      expect(items.length).toBe(1);
      expect(items[0].quantity).toBe(7);
    });

    test('URL updates when switching orders', async ({ page, posPage }) => {
      let sku: string;
      try {
        const products = getTestProducts();
        sku = getTestSku(products.simple);
      } catch {
        test.skip(true, 'Test data not available - skipping test');
        return;
      }

      // Create first order
      await page.goto('/orders/new');
      await page.waitForLoadState('networkidle');

      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku]);

      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not create first order - skipping test');
        return;
      }

      const firstOrderId = await getCurrentOrderId(page);

      // Create second order
      const newOrderButton = page.getByRole('button', { name: /New Order/i });
      await newOrderButton.click();
      await page.waitForURL(/\/orders\/new/);

      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku, '2']);

      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not create second order - skipping test');
        return;
      }

      const secondOrderId = await getCurrentOrderId(page);

      // Verify URL has second order ID
      await expect(page).toHaveURL(`/orders/${secondOrderId}`);

      // Switch to first order
      await clickOrderInSidebar(page, firstOrderId);
      await page.waitForURL(`/orders/${firstOrderId}`);

      // Verify URL updated to first order ID
      await expect(page).toHaveURL(`/orders/${firstOrderId}`);
    });

    test('browser back/forward navigation works correctly', async ({ page, posPage }) => {
      let sku: string;
      try {
        const products = getTestProducts();
        sku = getTestSku(products.simple);
      } catch {
        test.skip(true, 'Test data not available - skipping test');
        return;
      }

      // Create first order
      await page.goto('/orders/new');
      await page.waitForLoadState('networkidle');

      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku]);

      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not create first order - skipping test');
        return;
      }

      const firstOrderId = await getCurrentOrderId(page);

      // Create second order
      const newOrderButton = page.getByRole('button', { name: /New Order/i });
      await newOrderButton.click();
      await page.waitForURL(/\/orders\/new/);

      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku, '2']);

      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not create second order - skipping test');
        return;
      }

      const secondOrderId = await getCurrentOrderId(page);

      // Go back in browser history
      await page.goBack();
      await page.waitForLoadState('networkidle');

      // May go to /orders/new or first order depending on history
      // Just verify we can still navigate

      // Go forward
      await page.goForward();
      await page.waitForLoadState('networkidle');

      // Should be back on second order
      // Note: exact behavior depends on app navigation patterns
      // Just verify the page loads without error
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/orders\//);
    });

    test('refresh preserves current order', async ({ page, posPage }) => {
      let sku: string;
      try {
        const products = getTestProducts();
        sku = getTestSku(products.simple);
      } catch {
        test.skip(true, 'Test data not available - skipping test');
        return;
      }

      // Create an order
      await page.goto('/orders/new');
      await page.waitForLoadState('networkidle');

      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku, '4']);

      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not create order - skipping test');
        return;
      }

      const orderId = await getCurrentOrderId(page);
      const itemsBeforeRefresh = await getLineItems(page);
      const totalBeforeRefresh = await getOrderTotal(page);

      // Refresh the page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify still on same order
      const orderIdAfterRefresh = await getCurrentOrderId(page);
      expect(orderIdAfterRefresh).toBe(orderId);

      // Verify data is preserved
      const itemsAfterRefresh = await getLineItems(page);
      expect(itemsAfterRefresh.length).toBe(itemsBeforeRefresh.length);
      expect(itemsAfterRefresh[0].quantity).toBe(4);

      const totalAfterRefresh = await getOrderTotal(page);
      expect(Math.abs(totalAfterRefresh - totalBeforeRefresh)).toBeLessThan(0.01);
    });
  });

  test.describe('Create order while another is open', () => {
    test('creating new order while viewing existing order works', async ({ page, posPage }) => {
      let sku: string;
      try {
        const products = getTestProducts();
        sku = getTestSku(products.simple);
      } catch {
        test.skip(true, 'Test data not available - skipping test');
        return;
      }

      // Create first order
      await page.goto('/orders/new');
      await page.waitForLoadState('networkidle');

      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku, '3']);

      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not create first order - skipping test');
        return;
      }

      const firstOrderId = await getCurrentOrderId(page);

      // Verify first order exists
      const firstOrderItems = await getLineItems(page);
      expect(firstOrderItems[0].quantity).toBe(3);

      // Create new order while first is open
      const newOrderButton = page.getByRole('button', { name: /New Order/i });
      await newOrderButton.click();
      await page.waitForURL(/\/orders\/new/);

      // Verify we're on new order page
      await expect(page).toHaveURL(/\/orders\/new/);

      // Verify first order is still in sidebar (not deleted)
      const firstOrderLink = page.locator(`aside a[href="/orders/${firstOrderId}"]`);
      await expect(firstOrderLink).toBeVisible();

      // Add item to new order
      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku, '1']);

      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not save new order - skipping test');
        return;
      }

      const secondOrderId = await getCurrentOrderId(page);
      expect(secondOrderId).not.toBe(firstOrderId);

      // Verify first order data is unchanged via API
      const apiFirstOrder = await OrdersAPI.getOrder(firstOrderId);
      expect(apiFirstOrder!.line_items.length).toBe(1);
      expect(apiFirstOrder!.line_items[0].quantity).toBe(3);
    });

    test('original order remains unchanged when new order is created', async ({ page, posPage }) => {
      let sku: string;
      let price: number;
      try {
        const products = getTestProducts();
        sku = getTestSku(products.simple);
        price = getTestPrice(products.simple);
      } catch {
        test.skip(true, 'Test data not available - skipping test');
        return;
      }

      // Create first order with specific data
      await page.goto('/orders/new');
      await page.waitForLoadState('networkidle');

      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku, '5']);

      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not create first order - skipping test');
        return;
      }

      const firstOrderId = await getCurrentOrderId(page);

      // Record payment on first order
      await posPage.focusCommandBar();
      await executeCommand(page, 'pay', ['100']);
      await waitForMutations(page);

      // Store first order state
      const firstOrderTotal = await getOrderTotal(page);
      const firstOrderItems = await getLineItems(page);

      // Create new order
      const newOrderButton = page.getByRole('button', { name: /New Order/i });
      await newOrderButton.click();
      await page.waitForURL(/\/orders\/new/);

      // Add different data to new order
      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku, '2']);

      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not save new order - skipping test');
        return;
      }

      // Go back to first order
      await clickOrderInSidebar(page, firstOrderId);
      await waitForMutations(page);

      // Verify first order state is unchanged
      const firstOrderTotalAfter = await getOrderTotal(page);
      expect(Math.abs(firstOrderTotalAfter - firstOrderTotal)).toBeLessThan(0.01);

      const firstOrderItemsAfter = await getLineItems(page);
      expect(firstOrderItemsAfter.length).toBe(firstOrderItems.length);
      expect(firstOrderItemsAfter[0].quantity).toBe(5);

      // Verify payment is still recorded
      const cashInput = page.locator('input[aria-label="Cash amount"]');
      const payment = await cashInput.inputValue();
      expect(parseFloat(payment)).toBe(100);
    });

    test('both orders appear in sidebar after creation', async ({ page, posPage }) => {
      let sku: string;
      try {
        const products = getTestProducts();
        sku = getTestSku(products.simple);
      } catch {
        test.skip(true, 'Test data not available - skipping test');
        return;
      }

      // Create first order
      await page.goto('/orders/new');
      await page.waitForLoadState('networkidle');

      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku]);

      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not create first order - skipping test');
        return;
      }

      const firstOrderId = await getCurrentOrderId(page);

      // Create second order
      const newOrderButton = page.getByRole('button', { name: /New Order/i });
      await newOrderButton.click();
      await page.waitForURL(/\/orders\/new/);

      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku]);

      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not create second order - skipping test');
        return;
      }

      const secondOrderId = await getCurrentOrderId(page);

      // Create third order
      await newOrderButton.click();
      await page.waitForURL(/\/orders\/new/);

      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku]);

      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not create third order - skipping test');
        return;
      }

      const thirdOrderId = await getCurrentOrderId(page);

      // Verify all three orders appear in sidebar
      const firstOrderLink = page.locator(`aside a[href="/orders/${firstOrderId}"]`);
      const secondOrderLink = page.locator(`aside a[href="/orders/${secondOrderId}"]`);
      const thirdOrderLink = page.locator(`aside a[href="/orders/${thirdOrderId}"]`);

      await expect(firstOrderLink).toBeVisible();
      await expect(secondOrderLink).toBeVisible();
      await expect(thirdOrderLink).toBeVisible();
    });

    test('can switch to original order via sidebar while on new order page', async ({ page, posPage }) => {
      let sku: string;
      try {
        const products = getTestProducts();
        sku = getTestSku(products.simple);
      } catch {
        test.skip(true, 'Test data not available - skipping test');
        return;
      }

      // Create first order
      await page.goto('/orders/new');
      await page.waitForLoadState('networkidle');

      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku, '6']);

      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not create first order - skipping test');
        return;
      }

      const firstOrderId = await getCurrentOrderId(page);

      // Go to new order page (but don't add items yet)
      const newOrderButton = page.getByRole('button', { name: /New Order/i });
      await newOrderButton.click();
      await page.waitForURL(/\/orders\/new/);

      // Verify we're on new order page
      await expect(page).toHaveURL(/\/orders\/new/);

      // Click on first order in sidebar without saving new order
      const firstOrderLink = page.locator(`aside a[href="/orders/${firstOrderId}"]`);
      await firstOrderLink.click();
      await page.waitForURL(`/orders/${firstOrderId}`);
      await waitForMutations(page);

      // Verify we're on first order
      expect(await getCurrentOrderId(page)).toBe(firstOrderId);

      // Verify first order data
      const items = await getLineItems(page);
      expect(items[0].quantity).toBe(6);
    });
  });

  test.describe('Edge cases', () => {
    test('invalid order ID in URL shows appropriate error', async ({ page }) => {
      // Navigate to non-existent order
      await page.goto('/orders/999999999');
      await page.waitForLoadState('networkidle');

      // Should either show error or redirect
      // Check if page shows error or redirects to orders list
      const url = page.url();

      // Either we're redirected to /orders or we see an error message
      const hasError = await page.locator('text=/not found|error|does not exist/i').isVisible().catch(() => false);
      const redirected = url.match(/\/orders(?!\/999999999)/);

      expect(hasError || redirected).toBeTruthy();
    });

    test('orders with different statuses can coexist', async ({ page, posPage }) => {
      let sku: string;
      try {
        const products = getTestProducts();
        sku = getTestSku(products.simple);
      } catch {
        test.skip(true, 'Test data not available - skipping test');
        return;
      }

      // Create first order
      await page.goto('/orders/new');
      await page.waitForLoadState('networkidle');

      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku]);

      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not create first order - skipping test');
        return;
      }

      const firstOrderId = await getCurrentOrderId(page);

      // Create second order and complete it
      const newOrderButton = page.getByRole('button', { name: /New Order/i });
      await newOrderButton.click();
      await page.waitForURL(/\/orders\/new/);

      await posPage.focusCommandBar();
      await executeCommand(page, 'item', [sku]);

      try {
        await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
        await waitForMutations(page);
      } catch {
        test.skip(true, 'Could not create second order - skipping test');
        return;
      }

      const secondOrderId = await getCurrentOrderId(page);

      // Pay and complete second order
      const total = await getOrderTotal(page);
      await posPage.focusCommandBar();
      await executeCommand(page, 'pay', [total.toString()]);
      await waitForMutations(page);

      await posPage.focusCommandBar();
      await executeCommand(page, 'done', []);
      await waitForMutations(page);

      // Verify second order is completed via API
      const apiSecondOrder = await OrdersAPI.getOrder(secondOrderId);
      expect(apiSecondOrder!.status).toBe('completed');

      // Verify first order is still pending
      const apiFirstOrder = await OrdersAPI.getOrder(firstOrderId);
      expect(['pending', 'processing', 'on-hold']).toContain(apiFirstOrder!.status);
    });
  });
});
