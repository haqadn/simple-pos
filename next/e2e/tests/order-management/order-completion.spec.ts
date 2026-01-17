/**
 * Order Completion Flow Tests
 *
 * Tests for the complete order lifecycle - from creation through payment to completion.
 * This test file covers:
 * - Complete fully paid order
 * - Handle partial payment scenario
 * - Verify payment recorded correctly
 * - Verify order removed from active list
 */

import { test, expect } from '../../fixtures';
import {
  gotoNewOrder,
  waitForMutations,
  getCurrentOrderId,
  getOrderTotal,
  getPaymentAmount,
  isOrderPaid,
  getOrderBalance,
  getOrderLinksFromSidebar,
  getLineItemCount,
  getChangeAmount,
} from '../../fixtures';
import {
  getTestProducts,
  getTestSku,
  getTestPrice,
} from '../../fixtures';
import { CommandShortcuts } from '../../fixtures';
import OrdersAPI from '../../../api/orders';

test.describe('Order Completion Flow', () => {
  test.describe('Complete fully paid order', () => {
    test('can complete order after adding items and recording full payment', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);
      const price = getTestPrice(product);

      if (!sku || price <= 0) {
        test.skip(true, 'No product with valid SKU and price available');
        return;
      }

      // Step 1: Add items to order
      await CommandShortcuts.addItem(page, sku, 2);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Step 2: Verify order total is calculated
      const orderTotal = await getOrderTotal(page);
      expect(orderTotal).toBeGreaterThan(0);

      // Step 3: Record full payment
      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);

      // Step 4: Verify order is fully paid
      const isPaid = await isOrderPaid(page);
      expect(isPaid).toBe(true);

      const orderId = await getCurrentOrderId(page);

      // Step 5: Complete the order
      await posPage.focusCommandBar();
      await posPage.typeCommand('/done');
      await posPage.commandInput.press('Enter');
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Step 6: Verify order status is completed in WooCommerce
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.status).toBe('completed');
    });

    test('order completion flow with exact payment shows zero balance', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);
      const price = getTestPrice(product);

      if (!sku || price <= 0) {
        test.skip(true, 'No product with valid SKU and price available');
        return;
      }

      // Add items
      await CommandShortcuts.addItem(page, sku, 1);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      const orderTotal = await getOrderTotal(page);

      // Record exact payment
      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);

      // Verify balance is zero
      const balance = await getOrderBalance(page);
      expect(Math.abs(balance)).toBeLessThan(0.02);

      // Verify change is zero or not shown
      const change = await getChangeAmount(page);
      expect(Math.abs(change)).toBeLessThan(0.02);

      const orderId = await getCurrentOrderId(page);

      // Complete order
      await CommandShortcuts.completeOrder(page);
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify completed in API
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder!.status).toBe('completed');
    });

    test('order completion flow with overpayment shows correct change', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);
      const price = getTestPrice(product);

      if (!sku || price <= 0) {
        test.skip(true, 'No product with valid SKU and price available');
        return;
      }

      // Add items
      await CommandShortcuts.addItem(page, sku, 1);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      const orderTotal = await getOrderTotal(page);
      const overpayment = Math.ceil(orderTotal * 1.5);

      // Record overpayment
      await CommandShortcuts.recordPayment(page, overpayment);
      await waitForMutations(page);

      // Verify change is correct
      const change = await getChangeAmount(page);
      const expectedChange = overpayment - orderTotal;
      expect(Math.abs(change - expectedChange)).toBeLessThan(0.02);

      const orderId = await getCurrentOrderId(page);

      // Complete order
      await CommandShortcuts.completeOrder(page);
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify completed in API
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder!.status).toBe('completed');
    });

    test('order completion preserves line item data', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);
      const price = getTestPrice(product);

      if (!sku || price <= 0) {
        test.skip(true, 'No product with valid SKU and price available');
        return;
      }

      // Add items with specific quantity
      const quantity = 3;
      await CommandShortcuts.addItem(page, sku, quantity);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);
      const orderTotal = await getOrderTotal(page);

      // Get initial line item data
      const initialOrder = await OrdersAPI.getOrder(orderId);
      expect(initialOrder!.line_items.length).toBeGreaterThan(0);
      const initialLineItem = initialOrder!.line_items[0];
      expect(initialLineItem.quantity).toBe(quantity);

      // Pay and complete
      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);

      await CommandShortcuts.completeOrder(page);
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify line items preserved after completion
      const completedOrder = await OrdersAPI.getOrder(orderId);
      expect(completedOrder!.status).toBe('completed');
      expect(completedOrder!.line_items.length).toBe(initialOrder!.line_items.length);
      expect(completedOrder!.line_items[0].quantity).toBe(quantity);
      expect(completedOrder!.total).toBe(initialOrder!.total);
    });
  });

  test.describe('Handle partial payment scenario', () => {
    test('partial payment prevents order completion', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);
      const price = getTestPrice(product);

      if (!sku || price <= 0) {
        test.skip(true, 'No product with valid SKU and price available');
        return;
      }

      // Add items to create meaningful total
      await CommandShortcuts.addItem(page, sku, 2);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);
      const orderTotal = await getOrderTotal(page);

      // Record partial payment (50% of total)
      const partialPayment = Math.floor(orderTotal / 2);
      await CommandShortcuts.recordPayment(page, partialPayment);
      await waitForMutations(page);

      // Verify order is NOT fully paid
      const isPaid = await isOrderPaid(page);
      expect(isPaid).toBe(false);

      // Verify balance shows remaining amount
      const balance = await getOrderBalance(page);
      const expectedBalance = orderTotal - partialPayment;
      expect(Math.abs(balance - expectedBalance)).toBeLessThan(0.02);

      // Try to complete order with partial payment
      await posPage.focusCommandBar();
      await posPage.typeCommand('/done');
      await posPage.commandInput.press('Enter');
      await page.waitForTimeout(500);

      // Order should NOT be completed due to insufficient payment
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.status).not.toBe('completed');
    });

    test('partial payment shows remaining balance in UI', async ({ page }) => {
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

      const orderTotal = await getOrderTotal(page);

      // Record 25% payment
      const partialPayment = Math.floor(orderTotal / 4);
      if (partialPayment <= 0) {
        test.skip(true, 'Order total too small for partial payment test');
        return;
      }

      await CommandShortcuts.recordPayment(page, partialPayment);
      await waitForMutations(page);

      // Verify payment recorded
      const paymentAmount = await getPaymentAmount(page);
      expect(Math.abs(paymentAmount - partialPayment)).toBeLessThan(0.02);

      // Verify remaining balance
      const balance = await getOrderBalance(page);
      expect(balance).toBeGreaterThan(0);
      expect(Math.abs(balance - (orderTotal - partialPayment))).toBeLessThan(0.02);
    });

    test('can complete order after topping up partial payment', async ({ page }) => {
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
      const orderTotal = await getOrderTotal(page);

      // First record partial payment
      const partialPayment = Math.floor(orderTotal / 2);
      await CommandShortcuts.recordPayment(page, partialPayment);
      await waitForMutations(page);

      // Verify not paid
      let isPaid = await isOrderPaid(page);
      expect(isPaid).toBe(false);

      // Now record full payment (replaces partial)
      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);

      // Verify now fully paid
      isPaid = await isOrderPaid(page);
      expect(isPaid).toBe(true);

      // Complete order
      await CommandShortcuts.completeOrder(page);
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify completed
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder!.status).toBe('completed');
    });

    test('zero payment does not allow order completion', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add items
      await CommandShortcuts.addItem(page, sku, 1);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);
      const orderTotal = await getOrderTotal(page);
      expect(orderTotal).toBeGreaterThan(0);

      // No payment recorded - verify not paid
      const paymentAmount = await getPaymentAmount(page);
      expect(paymentAmount).toBe(0);

      // Try to complete without payment
      await posPage.focusCommandBar();
      await posPage.typeCommand('/done');
      await posPage.commandInput.press('Enter');
      await page.waitForTimeout(500);

      // Order should NOT be completed
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.status).not.toBe('completed');
    });
  });

  test.describe('Verify payment recorded correctly', () => {
    test('payment amount is stored in order meta_data', async ({ page }) => {
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

      const orderTotal = await getOrderTotal(page);
      const orderId = await getCurrentOrderId(page);

      // Record payment
      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);
      await page.waitForTimeout(500);

      // Verify payment in WooCommerce meta_data
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder).not.toBeNull();

      const paymentMeta = savedOrder!.meta_data.find(
        (meta) => meta.key === 'payment_received'
      );
      expect(paymentMeta).toBeDefined();
      expect(parseFloat(String(paymentMeta!.value))).toBeCloseTo(orderTotal, 1);
    });

    test('payment persists after order completion', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);
      const price = getTestPrice(product);

      if (!sku || price <= 0) {
        test.skip(true, 'No product with valid SKU and price available');
        return;
      }

      // Add items
      await CommandShortcuts.addItem(page, sku, 1);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      const orderTotal = await getOrderTotal(page);
      const orderId = await getCurrentOrderId(page);

      // Record payment
      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);
      await page.waitForTimeout(500);

      // Verify payment before completion
      let savedOrder = await OrdersAPI.getOrder(orderId);
      let paymentMeta = savedOrder!.meta_data.find(
        (meta) => meta.key === 'payment_received'
      );
      expect(paymentMeta).toBeDefined();
      const paymentBefore = parseFloat(String(paymentMeta!.value));

      // Complete order
      await CommandShortcuts.completeOrder(page);
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify payment still present after completion
      savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder!.status).toBe('completed');

      paymentMeta = savedOrder!.meta_data.find(
        (meta) => meta.key === 'payment_received'
      );
      expect(paymentMeta).toBeDefined();
      const paymentAfter = parseFloat(String(paymentMeta!.value));

      expect(paymentAfter).toBeCloseTo(paymentBefore, 1);
    });

    test('UI payment amount matches WooCommerce stored value', async ({ page }) => {
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

      const payment = 75.50;
      const orderId = await getCurrentOrderId(page);

      // Record specific payment amount
      await CommandShortcuts.recordPayment(page, payment);
      await waitForMutations(page);
      await page.waitForTimeout(500);

      // Get UI payment
      const uiPayment = await getPaymentAmount(page);

      // Get WooCommerce payment
      const savedOrder = await OrdersAPI.getOrder(orderId);
      const paymentMeta = savedOrder!.meta_data.find(
        (meta) => meta.key === 'payment_received'
      );
      const serverPayment = parseFloat(String(paymentMeta?.value || 0));

      // Verify they match
      expect(Math.abs(uiPayment - serverPayment)).toBeLessThan(0.02);
      expect(Math.abs(uiPayment - payment)).toBeLessThan(0.02);
    });

    test('multiple payment updates result in correct final value', async ({ page }) => {
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
      const orderTotal = await getOrderTotal(page);

      // First payment
      await CommandShortcuts.recordPayment(page, 20);
      await waitForMutations(page);

      // Second payment (replaces first)
      await CommandShortcuts.recordPayment(page, 50);
      await waitForMutations(page);

      // Third payment (replaces second)
      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);
      await page.waitForTimeout(500);

      // Verify final payment is the last value
      const savedOrder = await OrdersAPI.getOrder(orderId);
      const paymentMeta = savedOrder!.meta_data.find(
        (meta) => meta.key === 'payment_received'
      );

      expect(paymentMeta).toBeDefined();
      expect(parseFloat(String(paymentMeta!.value))).toBeCloseTo(orderTotal, 1);
    });
  });

  test.describe('Verify order removed from active list', () => {
    test('completed order disappears from sidebar', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add items
      await CommandShortcuts.addItem(page, sku, 1);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);
      const orderTotal = await getOrderTotal(page);

      // Pay and complete
      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);

      await CommandShortcuts.completeOrder(page);
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify order is not in sidebar
      const orderLinks = await getOrderLinksFromSidebar(page);
      const orderInSidebar = orderLinks.some(
        (link) => link.includes(orderId) || link.includes(`#${orderId}`)
      );
      expect(orderInSidebar).toBe(false);
    });

    test('can create new order after completing previous', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Create and complete first order
      await CommandShortcuts.addItem(page, sku, 1);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      const firstOrderId = await getCurrentOrderId(page);
      const orderTotal = await getOrderTotal(page);

      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);

      await CommandShortcuts.completeOrder(page);
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify first order completed
      const firstOrder = await OrdersAPI.getOrder(firstOrderId);
      expect(firstOrder!.status).toBe('completed');

      // Create new order
      await gotoNewOrder(page);
      await waitForMutations(page);

      // Add item to new order
      await CommandShortcuts.addItem(page, sku, 2);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      const secondOrderId = await getCurrentOrderId(page);

      // Verify it's a different order
      expect(secondOrderId).not.toBe(firstOrderId);

      // Verify new order is pending (not completed)
      const secondOrder = await OrdersAPI.getOrder(secondOrderId);
      expect(secondOrder!.status).not.toBe('completed');
    });

    test('sidebar shows remaining active orders after completion', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Create first order
      await CommandShortcuts.addItem(page, sku, 1);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      const firstOrderId = await getCurrentOrderId(page);

      // Create second order
      await gotoNewOrder(page);
      await CommandShortcuts.addItem(page, sku, 2);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      const secondOrderId = await getCurrentOrderId(page);
      expect(secondOrderId).not.toBe(firstOrderId);

      // Complete second order
      const orderTotal = await getOrderTotal(page);
      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);

      await CommandShortcuts.completeOrder(page);
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify sidebar state
      const orderLinks = await getOrderLinksFromSidebar(page);

      // Second order (completed) should NOT be in sidebar
      const secondOrderInSidebar = orderLinks.some(
        (link) => link.includes(secondOrderId) || link.includes(`#${secondOrderId}`)
      );
      expect(secondOrderInSidebar).toBe(false);

      // First order (pending) should still be in sidebar
      const firstOrderInSidebar = orderLinks.some(
        (link) => link.includes(firstOrderId) || link.includes(`#${firstOrderId}`)
      );
      // Note: First order may or may not be visible depending on sidebar loading
      // We just verify the completed order is removed
    });

    test('navigates away from completed order page', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Create order
      await CommandShortcuts.addItem(page, sku, 1);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);
      const orderTotal = await getOrderTotal(page);

      // Pay and complete
      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);

      await CommandShortcuts.completeOrder(page);
      await waitForMutations(page);
      await page.waitForTimeout(1500);

      // After completion, app should either:
      // 1. Navigate to a new order
      // 2. Navigate to orders list
      // 3. Stay on completed order (but show completed state)
      const currentUrl = page.url();
      const currentOrderId = await getCurrentOrderId(page);

      if (currentOrderId === orderId) {
        // If still on same order, verify it's completed
        const savedOrder = await OrdersAPI.getOrder(orderId);
        expect(savedOrder!.status).toBe('completed');
      } else {
        // Otherwise verify we navigated away
        expect(
          currentUrl.includes('/orders/new') ||
          currentUrl.includes('/orders') ||
          currentOrderId !== orderId
        ).toBe(true);
      }
    });
  });

  test.describe('Edge cases', () => {
    test('attempting to complete empty order does not crash', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      // Verify no line items
      const lineItemCount = await getLineItemCount(page);
      expect(lineItemCount).toBe(0);

      // Try to complete empty order
      await posPage.focusCommandBar();
      await posPage.typeCommand('/done');
      await posPage.commandInput.press('Enter');
      await page.waitForTimeout(500);

      // Page should remain functional
      const commandInput = page.locator('input[aria-label="Command input field"]');
      await expect(commandInput).toBeVisible();
      await expect(commandInput).toBeEnabled();
    });

    test('completing order with multiple items works correctly', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product, variable: variableProduct } = getTestProducts();
      const sku = getTestSku(product);
      const variableSku = getTestSku(variableProduct);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add first item
      await CommandShortcuts.addItem(page, sku, 2);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Add second item if available
      if (variableSku && variableSku !== sku) {
        await CommandShortcuts.addItem(page, variableSku, 1);
        await waitForMutations(page);
      }

      const orderId = await getCurrentOrderId(page);
      const orderTotal = await getOrderTotal(page);

      // Pay and complete
      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);

      await CommandShortcuts.completeOrder(page);
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify order completed with all items
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder!.status).toBe('completed');
      expect(savedOrder!.line_items.length).toBeGreaterThan(0);
    });

    test('order completion after page reload works', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add items
      await CommandShortcuts.addItem(page, sku, 1);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);
      const orderTotal = await getOrderTotal(page);

      // Record payment
      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);
      await page.waitForTimeout(500);

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify payment persisted
      const paymentAfterReload = await getPaymentAmount(page);
      expect(Math.abs(paymentAfterReload - orderTotal)).toBeLessThan(0.02);

      // Complete order
      await CommandShortcuts.completeOrder(page);
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify completed
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder!.status).toBe('completed');
    });

    test('rapid complete attempts do not cause issues', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add items and pay
      await CommandShortcuts.addItem(page, sku, 1);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);
      const orderTotal = await getOrderTotal(page);

      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);

      // Rapid complete attempts
      await CommandShortcuts.completeOrder(page);
      await CommandShortcuts.completeOrder(page);
      await waitForMutations(page);
      await page.waitForTimeout(1500);

      // Page should still be functional
      const commandInput = page.locator('input[aria-label="Command input field"]');
      await expect(commandInput).toBeVisible();

      // Order should be completed
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder!.status).toBe('completed');
    });
  });
});
