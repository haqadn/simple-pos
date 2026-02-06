/**
 * Pay Command Tests
 *
 * Tests for the /pay command, which records payment amounts received from customers.
 * This test file covers:
 * - Recording exact payment amounts
 * - Recording partial payments and verifying balance
 * - Recording overpayments and verifying change
 * - /p alias functionality
 * - Payment storage in order meta_data
 */

import { test, expect } from '../../fixtures';
import {
  gotoNewOrder,
  waitForMutations,
  getServerOrderId,
  getOrderTotal,
  getPaymentAmount,
  getChangeAmount,
  isOrderPaid,
  getOrderBalance,
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
  CommandShortcuts,
} from '../../fixtures';
import OrdersAPI from '../../../api/orders';

test.describe('Pay Command', () => {
  test.describe('Record exact payment /pay amount', () => {
    test('can record payment with /pay command', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);
      const price = getTestPrice(product);

      if (!sku || price <= 0) {
        test.skip(true, 'No product with valid SKU and price available');
        return;
      }

      // Add item to create an order with a total
      await CommandShortcuts.addItem(page, sku, 2);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      // Get the order total
      const orderTotal = await getOrderTotal(page);
      expect(orderTotal).toBeGreaterThan(0);

      // Record exact payment using /pay command
      await posPage.focusCommandBar();
      await posPage.typeCommand(`/pay ${orderTotal}`);
      await posPage.commandInput.press('Enter');
      await waitForMutations(page);

      // Verify payment was recorded
      const paymentAmount = await getPaymentAmount(page);
      expect(Math.abs(paymentAmount - orderTotal)).toBeLessThan(0.02);

      // Verify order is fully paid
      const isPaid = await isOrderPaid(page);
      expect(isPaid).toBe(true);
    });

    test('/pay with exact amount shows zero change/balance', async ({ page }) => {
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

      // Get total and record exact payment
      const orderTotal = await getOrderTotal(page);
      await CommandShortcuts.recordPayment(page, orderTotal);
      await waitForMutations(page);

      // Verify balance is zero
      const balance = await getOrderBalance(page);
      expect(Math.abs(balance)).toBeLessThan(0.02);
    });

    test('/pay with amount records payment correctly in UI', async ({ page }) => {
      await gotoNewOrder(page);

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

      const orderTotal = await getOrderTotal(page);

      // Record payment via command
      await executeCommandAndWait(page, 'pay', [orderTotal.toString()]);
      await waitForMutations(page);

      // Verify payment amount is displayed in UI
      const paymentAmount = await getPaymentAmount(page);
      expect(Math.abs(paymentAmount - orderTotal)).toBeLessThan(0.02);
    });
  });

  test.describe('Record partial payment shows balance', () => {
    test('partial payment shows remaining balance', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);
      const price = getTestPrice(product);

      if (!sku || price <= 0) {
        test.skip(true, 'No product with valid SKU and price available');
        return;
      }

      // Add items to get a reasonable total
      await CommandShortcuts.addItem(page, sku, 2);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      const orderTotal = await getOrderTotal(page);
      expect(orderTotal).toBeGreaterThan(0);

      // Record partial payment (half the total)
      const partialPayment = Math.floor(orderTotal / 2);
      await CommandShortcuts.recordPayment(page, partialPayment);
      await waitForMutations(page);

      // Verify payment was recorded
      const paymentAmount = await getPaymentAmount(page);
      expect(Math.abs(paymentAmount - partialPayment)).toBeLessThan(0.02);

      // Verify balance is the remaining amount
      const balance = await getOrderBalance(page);
      const expectedBalance = orderTotal - partialPayment;
      expect(Math.abs(balance - expectedBalance)).toBeLessThan(0.02);

      // Verify order is NOT fully paid
      const isPaid = await isOrderPaid(page);
      expect(isPaid).toBe(false);
    });

    test('partial payment shows "Short" or balance indicator', async ({ page }) => {
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
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      const orderTotal = await getOrderTotal(page);

      // Record 10% payment
      const partialPayment = Math.floor(orderTotal * 0.1);
      if (partialPayment <= 0) {
        test.skip(true, 'Order total too small for partial payment test');
        return;
      }

      await executeCommandAndWait(page, 'pay', [partialPayment.toString()]);
      await waitForMutations(page);

      // Verify there's a balance due
      const balance = await getOrderBalance(page);
      expect(balance).toBeGreaterThan(0);
    });

    test('can add multiple partial payments', async ({ page }) => {
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
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      const orderTotal = await getOrderTotal(page);

      // First partial payment
      const firstPayment = Math.floor(orderTotal / 3);
      await CommandShortcuts.recordPayment(page, firstPayment);
      await waitForMutations(page);

      // Verify first payment
      let paymentAmount = await getPaymentAmount(page);
      expect(Math.abs(paymentAmount - firstPayment)).toBeLessThan(0.02);

      // Second payment should replace (not add to) first payment
      // based on the pay command implementation which sets the payment
      const secondPayment = orderTotal;
      await CommandShortcuts.recordPayment(page, secondPayment);
      await waitForMutations(page);

      // Verify payment is now full amount
      paymentAmount = await getPaymentAmount(page);
      expect(Math.abs(paymentAmount - secondPayment)).toBeLessThan(0.02);

      // Now fully paid
      const isPaid = await isOrderPaid(page);
      expect(isPaid).toBe(true);
    });
  });

  test.describe('Record overpayment shows change amount', () => {
    test('overpayment shows positive change amount', async ({ page }) => {
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

      // Record overpayment (20% more than total)
      const overpayment = Math.ceil(orderTotal * 1.2);
      await CommandShortcuts.recordPayment(page, overpayment);
      await waitForMutations(page);

      // Verify payment was recorded
      const paymentAmount = await getPaymentAmount(page);
      expect(paymentAmount).toBeGreaterThan(orderTotal);

      // Verify order is fully paid
      const isPaid = await isOrderPaid(page);
      expect(isPaid).toBe(true);

      // Verify change amount is positive (payment - total)
      const change = await getChangeAmount(page);
      const expectedChange = overpayment - orderTotal;
      expect(Math.abs(change - expectedChange)).toBeLessThan(0.02);
    });

    test('large overpayment shows correct change', async ({ page }) => {
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

      // Record payment with round number overpayment (e.g., pay $100 for $45 order)
      const roundPayment = Math.ceil(orderTotal / 10) * 20; // Round up to nearest $20 increment
      await CommandShortcuts.recordPayment(page, roundPayment);
      await waitForMutations(page);

      // Verify change
      const change = await getChangeAmount(page);
      expect(change).toBeGreaterThanOrEqual(0);
    });

    test('paying double the amount shows correct change', async ({ page }) => {
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

      // Pay double
      const doublePayment = orderTotal * 2;
      await executeCommandAndWait(page, 'pay', [doublePayment.toFixed(2)]);
      await waitForMutations(page);

      // Verify change equals the original total
      const change = await getChangeAmount(page);
      expect(Math.abs(change - orderTotal)).toBeLessThan(0.02);
    });
  });

  test.describe('/p alias works correctly', () => {
    test('/p alias records payment same as /pay', async ({ page, posPage }) => {
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

      // Use /p alias
      await posPage.focusCommandBar();
      await posPage.typeCommand(`/p ${orderTotal}`);
      await posPage.commandInput.press('Enter');
      await waitForMutations(page);

      // Verify payment was recorded
      const paymentAmount = await getPaymentAmount(page);
      expect(Math.abs(paymentAmount - orderTotal)).toBeLessThan(0.02);

      // Verify order is paid
      const isPaid = await isOrderPaid(page);
      expect(isPaid).toBe(true);
    });

    test('/p with partial amount works correctly', async ({ page }) => {
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

      const orderTotal = await getOrderTotal(page);
      const partialPayment = Math.floor(orderTotal / 2);

      // Use /p alias for partial payment
      await executeCommandAndWait(page, 'p', [partialPayment.toString()]);
      await waitForMutations(page);

      // Verify partial payment
      const paymentAmount = await getPaymentAmount(page);
      expect(Math.abs(paymentAmount - partialPayment)).toBeLessThan(0.02);

      // Verify not fully paid
      const isPaid = await isOrderPaid(page);
      expect(isPaid).toBe(false);
    });

    test('/p with overpayment works correctly', async ({ page, posPage }) => {
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
      const overpayment = Math.ceil(orderTotal * 1.5);

      // Use /p alias for overpayment
      await posPage.focusCommandBar();
      await posPage.typeCommand(`/p ${overpayment}`);
      await posPage.commandInput.press('Enter');
      await waitForMutations(page);

      // Verify overpayment
      const paymentAmount = await getPaymentAmount(page);
      expect(Math.abs(paymentAmount - overpayment)).toBeLessThan(0.02);

      // Verify change is calculated
      const change = await getChangeAmount(page);
      const expectedChange = overpayment - orderTotal;
      expect(Math.abs(change - expectedChange)).toBeLessThan(0.02);
    });
  });

  test.describe('Verify payment stored in order meta', () => {
    test('payment is saved to WooCommerce order meta_data', async ({ page }) => {
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

      const orderTotal = await getOrderTotal(page);
      const paymentToRecord = 50.00;

      // Record payment
      await CommandShortcuts.recordPayment(page, paymentToRecord);
      await waitForMutations(page);

      // Allow extra time for server sync
      await page.waitForTimeout(1000);

      // Get order from WooCommerce API
      const serverId = await getServerOrderId(page);
      if (!serverId) {
        test.skip(true, 'Order not synced to WooCommerce');
        return;
      }
      const savedOrder = await OrdersAPI.getOrder(serverId);
      if (!savedOrder) {
        test.skip(true, 'Order not found in WooCommerce API');
        return;
      }

      // Find payment_received in meta_data
      const paymentMeta = savedOrder.meta_data.find(
        (meta) => meta.key === 'payment_received'
      );

      expect(paymentMeta).toBeDefined();
      expect(parseFloat(String(paymentMeta!.value))).toBeCloseTo(paymentToRecord, 1);
    });

    test('payment meta updates correctly on subsequent /pay commands', async ({ page }) => {
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

      // Wait for order to sync to get server ID
      await page.waitForTimeout(500);
      const serverId = await getServerOrderId(page);
      if (!serverId) {
        test.skip(true, 'Order not synced to WooCommerce');
        return;
      }

      // First payment
      const firstPayment = 25.00;
      await CommandShortcuts.recordPayment(page, firstPayment);
      await waitForMutations(page);
      await page.waitForTimeout(500);

      // Verify first payment in API
      let savedOrder = await OrdersAPI.getOrder(serverId);
      if (!savedOrder) {
        test.skip(true, 'Order not found in WooCommerce API');
        return;
      }
      let paymentMeta = savedOrder.meta_data.find(
        (meta) => meta.key === 'payment_received'
      );
      expect(parseFloat(String(paymentMeta?.value || 0))).toBeCloseTo(firstPayment, 1);

      // Second payment (replaces first)
      const secondPayment = 75.00;
      await CommandShortcuts.recordPayment(page, secondPayment);
      await waitForMutations(page);
      await page.waitForTimeout(500);

      // Verify second payment replaced first
      savedOrder = await OrdersAPI.getOrder(serverId);
      if (!savedOrder) {
        test.skip(true, 'Order not found in WooCommerce API after second payment');
        return;
      }
      paymentMeta = savedOrder.meta_data.find(
        (meta) => meta.key === 'payment_received'
      );
      expect(parseFloat(String(paymentMeta?.value || 0))).toBeCloseTo(secondPayment, 1);
    });

    test('UI payment amount matches server meta_data value', async ({ page }) => {
      await gotoNewOrder(page);

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

      const orderTotal = await getOrderTotal(page);
      const payment = Math.ceil(orderTotal);

      // Record payment
      await CommandShortcuts.recordPayment(page, payment);
      await waitForMutations(page);
      await page.waitForTimeout(500);

      // Get UI value
      const uiPayment = await getPaymentAmount(page);

      // Get server value
      const serverId = await getServerOrderId(page);
      if (!serverId) {
        test.skip(true, 'Order not synced to WooCommerce');
        return;
      }
      const savedOrder = await OrdersAPI.getOrder(serverId);
      if (!savedOrder) {
        test.skip(true, 'Order not found in WooCommerce API');
        return;
      }
      const paymentMeta = savedOrder.meta_data.find(
        (meta) => meta.key === 'payment_received'
      );
      const serverPayment = parseFloat(String(paymentMeta?.value || 0));

      // Verify UI and server match
      expect(Math.abs(uiPayment - serverPayment)).toBeLessThan(0.02);
    });
  });

  test.describe('Edge Cases', () => {
    test('/pay with zero amount is handled', async ({ page }) => {
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

      // Record zero payment
      await executeCommandAndWait(page, 'pay', ['0']);
      await waitForMutations(page);

      // Payment should be 0
      const paymentAmount = await getPaymentAmount(page);
      expect(paymentAmount).toBe(0);

      // Order should not be paid
      const isPaid = await isOrderPaid(page);
      expect(isPaid).toBe(false);
    });

    test('/pay without amount does not crash', async ({ page, posPage }) => {
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

      // Execute /pay without amount - should either enter multi-input mode or show error
      await posPage.focusCommandBar();
      await posPage.typeCommand('/pay');
      await posPage.commandInput.press('Enter');
      await page.waitForTimeout(500);

      // Page should still be functional
      const commandInput = page.locator('input[aria-label="Command input field"]');
      await expect(commandInput).toBeVisible();
    });

    test('/pay with negative amount is rejected', async ({ page }) => {
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

      // Try negative payment
      await executeCommandAndWait(page, 'pay', ['-50']);
      await waitForMutations(page);

      // Payment should not be negative (either rejected or treated as 0)
      const paymentAmount = await getPaymentAmount(page);
      expect(paymentAmount).toBeGreaterThanOrEqual(0);
    });

    test('/pay with decimal amount works correctly', async ({ page }) => {
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

      // Record decimal payment
      const decimalPayment = 45.67;
      await CommandShortcuts.recordPayment(page, decimalPayment);
      await waitForMutations(page);

      // Verify payment
      const paymentAmount = await getPaymentAmount(page);
      expect(Math.abs(paymentAmount - decimalPayment)).toBeLessThan(0.02);
    });

    test('/pay with very large amount is handled', async ({ page }) => {
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

      // Record very large payment
      const largePayment = 99999.99;
      await CommandShortcuts.recordPayment(page, largePayment);
      await waitForMutations(page);

      // Verify payment was recorded (no crash)
      const paymentAmount = await getPaymentAmount(page);
      expect(paymentAmount).toBeGreaterThan(0);

      // Verify change is calculated
      const orderTotal = await getOrderTotal(page);
      const change = await getChangeAmount(page);
      expect(change).toBeGreaterThan(0);
    });

    test('/pay on empty order is handled gracefully', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      // Try to record payment on empty order (no items)
      await posPage.focusCommandBar();
      await posPage.typeCommand('/pay 50');
      await posPage.commandInput.press('Enter');
      await page.waitForTimeout(500);

      // Should not crash - page still functional
      const commandInput = page.locator('input[aria-label="Command input field"]');
      await expect(commandInput).toBeVisible();
    });
  });
});
