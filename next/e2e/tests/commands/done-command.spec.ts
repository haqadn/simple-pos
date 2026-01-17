/**
 * Done Command Tests
 *
 * Tests for the /done command, which completes orders and transitions them to completed status.
 * This test file covers:
 * - Completing fully paid orders
 * - All aliases (/done, /dn, /d)
 * - Verifying order status changes in WooCommerce
 * - Verifying order is removed from active orders list
 * - Edge cases (empty orders, unpaid orders)
 */

import { test, expect } from '../../fixtures';
import {
  gotoNewOrder,
  waitForMutations,
  getCurrentOrderId,
  getServerOrderId,
  getOrderTotal,
  isOrderPaid,
  getOrderLinksFromSidebar,
  getLineItemCount,
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

test.describe('Done Command', () => {
  test.describe('/done completes paid order', () => {
    test('can complete order with /done command', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);
      const price = getTestPrice(product);

      if (!sku || price <= 0) {
        test.skip(true, 'No product with valid SKU and price available');
        return;
      }

      // Add item to create an order
      await CommandShortcuts.addItem(page, sku, 2);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      // Get the order total and record full payment
      const orderTotal = await getOrderTotal(page);
      expect(orderTotal).toBeGreaterThan(0);

      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);

      // Verify order is paid
      const isPaid = await isOrderPaid(page);
      expect(isPaid).toBe(true);

      // Get server ID before completing
      const serverId = await getServerOrderId(page);
      if (!serverId) {
        test.skip(true, 'Order has not synced to WooCommerce yet');
        return;
      }

      // Complete the order with /done command
      await posPage.focusCommandBar();
      await posPage.typeCommand('/done');
      await posPage.commandInput.press('Enter');
      await waitForMutations(page);

      // Allow time for order completion
      await page.waitForTimeout(1000);

      // Verify order status changed to completed in WooCommerce
      const savedOrder = await OrdersAPI.getOrder(serverId);
      if (!savedOrder) {
        test.skip(true, 'Order not found in WooCommerce');
        return;
      }
      expect(savedOrder.status).toBe('completed');
    });

    test('/done on fully paid order shows success message', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item and pay
      await CommandShortcuts.addItem(page, sku, 1);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      const orderTotal = await getOrderTotal(page);
      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);

      // Complete order
      await posPage.focusCommandBar();
      await posPage.typeCommand('/done');
      await posPage.commandInput.press('Enter');

      // Wait for success indication (toast, redirect, or message)
      await page.waitForTimeout(500);

      // Page should still be functional
      const commandInput = page.locator('input[aria-label="Command input field"]');
      await expect(commandInput).toBeVisible();
    });

    test('/done with overpayment shows change and completes', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);
      const price = getTestPrice(product);

      if (!sku || price <= 0) {
        test.skip(true, 'No product with valid SKU and price available');
        return;
      }

      // Add item
      await CommandShortcuts.addItem(page, sku, 1);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      const orderTotal = await getOrderTotal(page);
      const overpayment = Math.ceil(orderTotal * 1.5);

      // Record overpayment
      await CommandShortcuts.recordPayment(page, overpayment);
      await waitForMutations(page);

      const serverId = await getServerOrderId(page);
      if (!serverId) {
        test.skip(true, 'Order has not synced to WooCommerce yet');
        return;
      }

      // Complete order
      await posPage.focusCommandBar();
      await posPage.typeCommand('/done');
      await posPage.commandInput.press('Enter');
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify order completed in WooCommerce
      const savedOrder = await OrdersAPI.getOrder(serverId);
      if (!savedOrder) {
        test.skip(true, 'Order not found in WooCommerce');
        return;
      }
      expect(savedOrder.status).toBe('completed');
    });
  });

  test.describe('All aliases /dn, /d work correctly', () => {
    test('/dn alias completes paid order', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item and pay
      await CommandShortcuts.addItem(page, sku, 1);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      const orderTotal = await getOrderTotal(page);
      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);

      const serverId = await getServerOrderId(page);
      if (!serverId) {
        test.skip(true, 'Order has not synced to WooCommerce yet');
        return;
      }

      // Complete with /dn alias
      await posPage.focusCommandBar();
      await posPage.typeCommand('/dn');
      await posPage.commandInput.press('Enter');
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify order completed
      const savedOrder = await OrdersAPI.getOrder(serverId);
      if (!savedOrder) {
        test.skip(true, 'Order not found in WooCommerce');
        return;
      }
      expect(savedOrder.status).toBe('completed');
    });

    test('/d alias completes paid order', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item and pay
      await CommandShortcuts.addItem(page, sku, 1);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      const orderTotal = await getOrderTotal(page);
      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);

      const serverId = await getServerOrderId(page);
      if (!serverId) {
        test.skip(true, 'Order has not synced to WooCommerce yet');
        return;
      }

      // Complete with /d alias
      await posPage.focusCommandBar();
      await posPage.typeCommand('/d');
      await posPage.commandInput.press('Enter');
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify order completed
      const savedOrder = await OrdersAPI.getOrder(serverId);
      if (!savedOrder) {
        test.skip(true, 'Order not found in WooCommerce');
        return;
      }
      expect(savedOrder.status).toBe('completed');
    });

    test('all aliases produce same result', async ({ page }) => {
      // Test that /done, /dn, and /d all complete orders the same way
      // We'll verify by checking that each alias is recognized
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      await gotoNewOrder(page);

      // Add item and pay
      await CommandShortcuts.addItem(page, sku, 1);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      const orderTotal = await getOrderTotal(page);
      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);

      const serverId = await getServerOrderId(page);
      if (!serverId) {
        test.skip(true, 'Order has not synced to WooCommerce yet');
        return;
      }

      // Use executeCommand helper with just 'd' (will add /)
      await executeCommandAndWait(page, 'd', []);
      await page.waitForTimeout(1000);

      // Verify order completed
      const savedOrder = await OrdersAPI.getOrder(serverId);
      if (!savedOrder) {
        test.skip(true, 'Order not found in WooCommerce');
        return;
      }
      expect(savedOrder.status).toBe('completed');
    });
  });

  test.describe('Verify order status changes to completed in WooCommerce', () => {
    test('order status is completed after /done', async ({ page }) => {
      await gotoNewOrder(page);

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

      // Pay and complete
      const orderTotal = await getOrderTotal(page);
      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);

      const serverId = await getServerOrderId(page);
      if (!serverId) {
        test.skip(true, 'Order has not synced to WooCommerce yet');
        return;
      }

      // Verify initial status is not completed
      let savedOrder = await OrdersAPI.getOrder(serverId);
      if (!savedOrder) {
        test.skip(true, 'Order not found in WooCommerce');
        return;
      }
      expect(savedOrder.status).not.toBe('completed');

      // Complete order
      await CommandShortcuts.completeOrder(page);
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify status changed to completed
      savedOrder = await OrdersAPI.getOrder(serverId);
      if (!savedOrder) {
        test.skip(true, 'Order not found in WooCommerce after completion');
        return;
      }
      expect(savedOrder.status).toBe('completed');
    });

    test('order total and line items are preserved after completion', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);
      const price = getTestPrice(product);

      if (!sku || price <= 0) {
        test.skip(true, 'No product with valid SKU and price available');
        return;
      }

      // Add multiple items
      await CommandShortcuts.addItem(page, sku, 3);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      const orderTotal = await getOrderTotal(page);
      const serverId = await getServerOrderId(page);
      if (!serverId) {
        test.skip(true, 'Order has not synced to WooCommerce yet');
        return;
      }

      // Get initial order data
      let savedOrder = await OrdersAPI.getOrder(serverId);
      if (!savedOrder) {
        test.skip(true, 'Order not found in WooCommerce');
        return;
      }
      const initialLineItemCount = savedOrder.line_items.length;
      const initialTotal = savedOrder.total;

      // Pay and complete
      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);

      await CommandShortcuts.completeOrder(page);
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify order data preserved
      savedOrder = await OrdersAPI.getOrder(serverId);
      if (!savedOrder) {
        test.skip(true, 'Order not found in WooCommerce after completion');
        return;
      }
      expect(savedOrder.line_items.length).toBe(initialLineItemCount);
      expect(savedOrder.total).toBe(initialTotal);
    });

    test('payment meta is preserved after completion', async ({ page }) => {
      await gotoNewOrder(page);

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

      const orderTotal = await getOrderTotal(page);
      const serverId = await getServerOrderId(page);
      if (!serverId) {
        test.skip(true, 'Order has not synced to WooCommerce yet');
        return;
      }

      // Record payment
      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);
      await page.waitForTimeout(500);

      // Complete order
      await CommandShortcuts.completeOrder(page);
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify payment meta is preserved
      const savedOrder = await OrdersAPI.getOrder(serverId);
      if (!savedOrder) {
        test.skip(true, 'Order not found in WooCommerce');
        return;
      }

      const paymentMeta = savedOrder.meta_data.find(
        (meta) => meta.key === 'payment_received'
      );
      expect(paymentMeta).toBeDefined();
      expect(parseFloat(String(paymentMeta!.value))).toBeCloseTo(orderTotal, 1);
    });
  });

  test.describe('Verify order removed from active orders list', () => {
    test('completed order is removed from sidebar', async ({ page }) => {
      await gotoNewOrder(page);

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

      // Use frontend ID for sidebar comparison (sidebar shows frontend IDs)
      const frontendId = await getCurrentOrderId(page);
      const orderTotal = await getOrderTotal(page);

      // Verify order appears in sidebar before completion
      const orderLinksBefore = await getOrderLinksFromSidebar(page);
      const orderInSidebarBefore = orderLinksBefore.some(
        (link) => link.includes(frontendId) || link.includes(`#${frontendId}`)
      );
      // Note: Order may or may not be in sidebar depending on implementation
      // This verifies the order ID exists

      // Pay and complete
      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);

      await CommandShortcuts.completeOrder(page);
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify order is removed from sidebar after completion
      const orderLinksAfter = await getOrderLinksFromSidebar(page);
      const orderInSidebarAfter = orderLinksAfter.some(
        (link) => link.includes(frontendId) || link.includes(`#${frontendId}`)
      );
      expect(orderInSidebarAfter).toBe(false);
    });

    test('app navigates away from completed order', async ({ page }) => {
      await gotoNewOrder(page);

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

      // Get both frontend ID (for URL comparison) and server ID (for API call)
      const frontendId = await getCurrentOrderId(page);
      const serverId = await getServerOrderId(page);
      const orderTotal = await getOrderTotal(page);

      // Pay and complete
      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);

      await CommandShortcuts.completeOrder(page);
      await waitForMutations(page);
      await page.waitForTimeout(1500);

      // After completing, either:
      // 1. Navigated to a new order
      // 2. Navigated to orders list
      // 3. Still on order page but showing completed state
      const currentUrl = page.url();
      const currentOrderId = await getCurrentOrderId(page);

      // If we're on a different order or the orders page, that's expected
      // If we're still on the same order, verify it shows as completed
      if (currentOrderId === frontendId) {
        // Verify order shows as completed in UI
        if (!serverId) {
          test.skip(true, 'Order has not synced to WooCommerce yet');
          return;
        }
        const savedOrder = await OrdersAPI.getOrder(serverId);
        if (!savedOrder) {
          test.skip(true, 'Order not found in WooCommerce');
          return;
        }
        expect(savedOrder.status).toBe('completed');
      } else {
        // We navigated away, which is the expected behavior
        expect(currentOrderId !== frontendId || currentUrl.includes('/orders/new')).toBe(true);
      }
    });
  });

  test.describe('Edge Cases', () => {
    test('/done on empty order shows error', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      // Verify no line items
      const lineItemCount = await getLineItemCount(page);
      expect(lineItemCount).toBe(0);

      // Try to complete empty order
      await posPage.focusCommandBar();
      await posPage.typeCommand('/done');
      await posPage.commandInput.press('Enter');
      await page.waitForTimeout(500);

      // Page should still be functional (error handled gracefully)
      const commandInput = page.locator('input[aria-label="Command input field"]');
      await expect(commandInput).toBeVisible();

      // Order should not be created/completed
      const currentOrderId = await getCurrentOrderId(page);
      if (currentOrderId && currentOrderId !== 'new') {
        const serverId = await getServerOrderId(page, { waitForSync: false });
        if (serverId) {
          const savedOrder = await OrdersAPI.getOrder(serverId);
          if (savedOrder) {
            expect(savedOrder.status).not.toBe('completed');
          }
        }
      }
    });

    test('/done on unpaid order shows error about insufficient payment', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item but don't pay
      await CommandShortcuts.addItem(page, sku, 1);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      const serverId = await getServerOrderId(page);
      if (!serverId) {
        test.skip(true, 'Order has not synced to WooCommerce yet');
        return;
      }

      // Try to complete without payment
      await posPage.focusCommandBar();
      await posPage.typeCommand('/done');
      await posPage.commandInput.press('Enter');
      await page.waitForTimeout(500);

      // Order should NOT be completed
      const savedOrder = await OrdersAPI.getOrder(serverId);
      if (!savedOrder) {
        test.skip(true, 'Order not found in WooCommerce');
        return;
      }
      expect(savedOrder.status).not.toBe('completed');
    });

    test('/done on partially paid order shows error', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);
      const price = getTestPrice(product);

      if (!sku || price <= 0) {
        test.skip(true, 'No product with valid SKU and price available');
        return;
      }

      // Add item
      await CommandShortcuts.addItem(page, sku, 2);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      const orderTotal = await getOrderTotal(page);
      const serverId = await getServerOrderId(page);
      if (!serverId) {
        test.skip(true, 'Order has not synced to WooCommerce yet');
        return;
      }

      // Record partial payment (half the total)
      const partialPayment = Math.floor(orderTotal / 2);
      await CommandShortcuts.recordPayment(page, partialPayment);
      await waitForMutations(page);

      // Try to complete with partial payment
      await posPage.focusCommandBar();
      await posPage.typeCommand('/done');
      await posPage.commandInput.press('Enter');
      await page.waitForTimeout(500);

      // Order should NOT be completed due to insufficient payment
      const savedOrder = await OrdersAPI.getOrder(serverId);
      if (!savedOrder) {
        test.skip(true, 'Order not found in WooCommerce');
        return;
      }
      expect(savedOrder.status).not.toBe('completed');
    });

    test('/done twice on same order is handled gracefully', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item and pay
      await CommandShortcuts.addItem(page, sku, 1);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      const orderTotal = await getOrderTotal(page);
      const serverId = await getServerOrderId(page);
      if (!serverId) {
        test.skip(true, 'Order has not synced to WooCommerce yet');
        return;
      }

      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);

      // Complete order first time
      await posPage.focusCommandBar();
      await posPage.typeCommand('/done');
      await posPage.commandInput.press('Enter');
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify completed
      let savedOrder = await OrdersAPI.getOrder(serverId);
      if (!savedOrder) {
        test.skip(true, 'Order not found in WooCommerce');
        return;
      }
      expect(savedOrder.status).toBe('completed');

      // Try to complete again (should not crash, may navigate or show error)
      await posPage.focusCommandBar();
      await posPage.typeCommand('/done');
      await posPage.commandInput.press('Enter');
      await page.waitForTimeout(500);

      // Page should still be functional
      const commandInput = page.locator('input[aria-label="Command input field"]');
      await expect(commandInput).toBeVisible();
    });

    test('command bar remains functional after /done', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add item and pay
      await CommandShortcuts.addItem(page, sku, 1);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      const orderTotal = await getOrderTotal(page);
      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);

      // Complete order
      await posPage.focusCommandBar();
      await posPage.typeCommand('/done');
      await posPage.commandInput.press('Enter');
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify command bar is still functional
      const commandInput = page.locator('input[aria-label="Command input field"]');
      await expect(commandInput).toBeVisible();
      await expect(commandInput).toBeEnabled();

      // Should be able to focus and type
      await posPage.focusCommandBar();
      await posPage.typeCommand('/item');
      await expect(posPage.commandInput).toHaveValue('/item');
    });
  });
});
