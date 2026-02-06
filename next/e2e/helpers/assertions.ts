/**
 * Custom Assertions for E2E Tests
 *
 * Provides custom assertion helpers for verifying POS order state.
 * These assertions combine UI state verification with proper waiting strategies,
 * eliminating the need for arbitrary waits and improving test reliability.
 *
 * Usage:
 *   import { POSAssert } from '../helpers/assertions';
 *
 *   await POSAssert.toHaveLineItem(page, 'Product Name', 2);
 *   await POSAssert.toHaveTotal(page, 50.00);
 *   await POSAssert.toHavePayment(page, 50.00);
 */

import { Page, expect, Locator } from '@playwright/test';
import {
  getLineItems,
  getLineItem,
  hasLineItem,
  getLineItemCount,
  getOrderTotal,
  getPaymentAmount,
  getChangeAmount,
  getOrderBalance,
  isOrderPaid,
  ORDER_SELECTORS,
  type LineItem,
} from './orders';

/**
 * Assertion options for configurable behavior
 */
export interface AssertionOptions {
  /** Timeout for the assertion in milliseconds (default: 10000) */
  timeout?: number;
  /** Tolerance for numeric comparisons (default: 0.01) */
  tolerance?: number;
  /** Custom message to include on failure */
  message?: string;
}

const DEFAULT_TIMEOUT = 10000;
const DEFAULT_TOLERANCE = 0.01;

/**
 * Wait for a condition to be true, with retry
 */
async function waitForCondition(
  condition: () => Promise<boolean>,
  options: { timeout?: number; message?: string } = {}
): Promise<void> {
  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const startTime = Date.now();
  let lastError: Error | null = null;

  while (Date.now() - startTime < timeout) {
    try {
      if (await condition()) {
        return;
      }
    } catch (error) {
      lastError = error as Error;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(
    options.message ||
      `Condition not met within ${timeout}ms` +
        (lastError ? `: ${lastError.message}` : '')
  );
}

/**
 * Custom POS assertions with proper waiting strategies
 */
export const POSAssert = {
  /**
   * Assert that an order has a specific line item with a given quantity.
   * Uses polling to wait for the UI to update.
   *
   * @param page - Playwright Page object
   * @param namePattern - Product name or partial match pattern
   * @param expectedQuantity - Expected quantity of the item
   * @param options - Assertion options
   *
   * @example
   * await POSAssert.toHaveLineItem(page, 'Coffee', 2);
   * await POSAssert.toHaveLineItem(page, 'coffee', 2, { timeout: 5000 });
   */
  async toHaveLineItem(
    page: Page,
    namePattern: string,
    expectedQuantity: number,
    options: AssertionOptions = {}
  ): Promise<void> {
    const { timeout = DEFAULT_TIMEOUT, message } = options;

    await waitForCondition(
      async () => {
        const item = await getLineItem(page, namePattern);
        return item !== null && item.quantity === expectedQuantity;
      },
      {
        timeout,
        message:
          message ||
          `Expected line item "${namePattern}" with quantity ${expectedQuantity}`,
      }
    );

    // Final verification with expect for better error messages
    const item = await getLineItem(page, namePattern);
    expect(item, `Line item "${namePattern}" not found`).not.toBeNull();
    expect(
      item?.quantity,
      `Line item "${namePattern}" quantity mismatch`
    ).toBe(expectedQuantity);
  },

  /**
   * Assert that an order has a specific number of line items.
   *
   * @param page - Playwright Page object
   * @param expectedCount - Expected number of line items
   * @param options - Assertion options
   *
   * @example
   * await POSAssert.toHaveLineItemCount(page, 3);
   */
  async toHaveLineItemCount(
    page: Page,
    expectedCount: number,
    options: AssertionOptions = {}
  ): Promise<void> {
    const { timeout = DEFAULT_TIMEOUT, message } = options;

    await waitForCondition(
      async () => {
        const count = await getLineItemCount(page);
        return count === expectedCount;
      },
      {
        timeout,
        message:
          message || `Expected ${expectedCount} line items`,
      }
    );

    const finalCount = await getLineItemCount(page);
    expect(finalCount, message).toBe(expectedCount);
  },

  /**
   * Assert that an order does NOT have a specific line item.
   *
   * @param page - Playwright Page object
   * @param namePattern - Product name or partial match pattern
   * @param options - Assertion options
   *
   * @example
   * await POSAssert.toNotHaveLineItem(page, 'Removed Product');
   */
  async toNotHaveLineItem(
    page: Page,
    namePattern: string,
    options: AssertionOptions = {}
  ): Promise<void> {
    const { timeout = DEFAULT_TIMEOUT, message } = options;

    await waitForCondition(
      async () => {
        const exists = await hasLineItem(page, namePattern);
        return !exists;
      },
      {
        timeout,
        message:
          message ||
          `Expected line item "${namePattern}" to NOT exist`,
      }
    );

    const exists = await hasLineItem(page, namePattern);
    expect(exists, message).toBe(false);
  },

  /**
   * Assert that an order has a specific total amount.
   *
   * @param page - Playwright Page object
   * @param expectedTotal - Expected total amount
   * @param options - Assertion options (includes tolerance)
   *
   * @example
   * await POSAssert.toHaveTotal(page, 50.00);
   * await POSAssert.toHaveTotal(page, 49.99, { tolerance: 0.02 });
   */
  async toHaveTotal(
    page: Page,
    expectedTotal: number,
    options: AssertionOptions = {}
  ): Promise<void> {
    const {
      timeout = DEFAULT_TIMEOUT,
      tolerance = DEFAULT_TOLERANCE,
      message,
    } = options;

    await waitForCondition(
      async () => {
        const actual = await getOrderTotal(page);
        return Math.abs(actual - expectedTotal) <= tolerance;
      },
      {
        timeout,
        message:
          message ||
          `Expected order total to be ${expectedTotal}`,
      }
    );

    const actualTotal = await getOrderTotal(page);
    expect(
      Math.abs(actualTotal - expectedTotal),
      message || `Order total mismatch: expected ${expectedTotal}, got ${actualTotal}`
    ).toBeLessThanOrEqual(tolerance);
  },

  /**
   * Assert that an order has a specific payment amount recorded.
   *
   * @param page - Playwright Page object
   * @param expectedPayment - Expected payment amount
   * @param options - Assertion options (includes tolerance)
   *
   * @example
   * await POSAssert.toHavePayment(page, 50.00);
   */
  async toHavePayment(
    page: Page,
    expectedPayment: number,
    options: AssertionOptions = {}
  ): Promise<void> {
    const {
      timeout = DEFAULT_TIMEOUT,
      tolerance = DEFAULT_TOLERANCE,
      message,
    } = options;

    await waitForCondition(
      async () => {
        const actual = await getPaymentAmount(page);
        return Math.abs(actual - expectedPayment) <= tolerance;
      },
      {
        timeout,
        message:
          message ||
          `Expected payment amount to be ${expectedPayment}`,
      }
    );

    const actualPayment = await getPaymentAmount(page);
    expect(
      Math.abs(actualPayment - expectedPayment),
      message || `Payment amount mismatch: expected ${expectedPayment}, got ${actualPayment}`
    ).toBeLessThanOrEqual(tolerance);
  },

  /**
   * Assert that an order is fully paid (payment >= total).
   *
   * @param page - Playwright Page object
   * @param options - Assertion options
   *
   * @example
   * await POSAssert.toBePaid(page);
   */
  async toBePaid(
    page: Page,
    options: AssertionOptions = {}
  ): Promise<void> {
    const { timeout = DEFAULT_TIMEOUT, message } = options;

    await waitForCondition(
      async () => {
        return await isOrderPaid(page);
      },
      {
        timeout,
        message: message || 'Expected order to be fully paid',
      }
    );

    const paid = await isOrderPaid(page);
    expect(paid, message).toBe(true);
  },

  /**
   * Assert that an order is NOT fully paid.
   *
   * @param page - Playwright Page object
   * @param options - Assertion options
   *
   * @example
   * await POSAssert.toNotBePaid(page);
   */
  async toNotBePaid(
    page: Page,
    options: AssertionOptions = {}
  ): Promise<void> {
    const { timeout = DEFAULT_TIMEOUT, message } = options;

    await waitForCondition(
      async () => {
        const paid = await isOrderPaid(page);
        return !paid;
      },
      {
        timeout,
        message: message || 'Expected order to NOT be fully paid',
      }
    );

    const paid = await isOrderPaid(page);
    expect(paid, message).toBe(false);
  },

  /**
   * Assert that an order has a specific balance (total - payment).
   *
   * @param page - Playwright Page object
   * @param expectedBalance - Expected balance amount
   * @param options - Assertion options (includes tolerance)
   *
   * @example
   * await POSAssert.toHaveBalance(page, 25.00);
   */
  async toHaveBalance(
    page: Page,
    expectedBalance: number,
    options: AssertionOptions = {}
  ): Promise<void> {
    const {
      timeout = DEFAULT_TIMEOUT,
      tolerance = DEFAULT_TOLERANCE,
      message,
    } = options;

    await waitForCondition(
      async () => {
        const actual = await getOrderBalance(page);
        return Math.abs(actual - expectedBalance) <= tolerance;
      },
      {
        timeout,
        message:
          message ||
          `Expected order balance to be ${expectedBalance}`,
      }
    );

    const actualBalance = await getOrderBalance(page);
    expect(
      Math.abs(actualBalance - expectedBalance),
      message || `Balance mismatch: expected ${expectedBalance}, got ${actualBalance}`
    ).toBeLessThanOrEqual(tolerance);
  },

  /**
   * Assert that an order has change to give (negative balance / overpayment).
   *
   * @param page - Playwright Page object
   * @param expectedChange - Expected change amount
   * @param options - Assertion options (includes tolerance)
   *
   * @example
   * await POSAssert.toHaveChange(page, 10.00);
   */
  async toHaveChange(
    page: Page,
    expectedChange: number,
    options: AssertionOptions = {}
  ): Promise<void> {
    const {
      timeout = DEFAULT_TIMEOUT,
      tolerance = DEFAULT_TOLERANCE,
      message,
    } = options;

    await waitForCondition(
      async () => {
        const actual = await getChangeAmount(page);
        return Math.abs(actual - expectedChange) <= tolerance;
      },
      {
        timeout,
        message:
          message ||
          `Expected change amount to be ${expectedChange}`,
      }
    );

    const actualChange = await getChangeAmount(page);
    expect(
      Math.abs(actualChange - expectedChange),
      message || `Change mismatch: expected ${expectedChange}, got ${actualChange}`
    ).toBeLessThanOrEqual(tolerance);
  },

  /**
   * Assert that an order is empty (has no line items).
   *
   * @param page - Playwright Page object
   * @param options - Assertion options
   *
   * @example
   * await POSAssert.toBeEmpty(page);
   */
  async toBeEmpty(
    page: Page,
    options: AssertionOptions = {}
  ): Promise<void> {
    await this.toHaveLineItemCount(page, 0, {
      ...options,
      message: options.message || 'Expected order to be empty',
    });
  },

  /**
   * Assert that an order has a zero total.
   *
   * @param page - Playwright Page object
   * @param options - Assertion options
   *
   * @example
   * await POSAssert.toHaveZeroTotal(page);
   */
  async toHaveZeroTotal(
    page: Page,
    options: AssertionOptions = {}
  ): Promise<void> {
    await this.toHaveTotal(page, 0, {
      ...options,
      message: options.message || 'Expected order total to be zero',
    });
  },

  /**
   * Assert that we are on an order page.
   *
   * @param page - Playwright Page object
   * @param orderId - Optional specific order ID to verify
   * @param options - Assertion options
   *
   * @example
   * await POSAssert.toBeOnOrderPage(page);
   * await POSAssert.toBeOnOrderPage(page, '12345');
   */
  async toBeOnOrderPage(
    page: Page,
    orderId?: string | number,
    options: AssertionOptions = {}
  ): Promise<void> {
    const { timeout = DEFAULT_TIMEOUT, message } = options;

    if (orderId) {
      await expect(page).toHaveURL(`/orders/${orderId}`, { timeout });
    } else {
      await expect(page).toHaveURL(/\/orders\/([A-Z0-9]+|new)/, { timeout });
    }

    const orderTitle = page.locator(ORDER_SELECTORS.orderTitle);
    await expect(
      orderTitle,
      message || 'Order page not fully loaded'
    ).toBeVisible({ timeout });
  },

  /**
   * Assert that an order has specific line items (batch verification).
   *
   * @param page - Playwright Page object
   * @param expectedItems - Array of expected items with name and quantity
   * @param options - Assertion options
   *
   * @example
   * await POSAssert.toHaveLineItems(page, [
   *   { name: 'Coffee', quantity: 2 },
   *   { name: 'Tea', quantity: 1 },
   * ]);
   */
  async toHaveLineItems(
    page: Page,
    expectedItems: Array<{ name: string; quantity: number }>,
    options: AssertionOptions = {}
  ): Promise<void> {
    const { timeout = DEFAULT_TIMEOUT } = options;

    // First verify count
    await this.toHaveLineItemCount(page, expectedItems.length, { timeout });

    // Then verify each item
    for (const expected of expectedItems) {
      await this.toHaveLineItem(page, expected.name, expected.quantity, options);
    }
  },

  /**
   * Assert that the command bar is focused.
   *
   * @param page - Playwright Page object
   * @param options - Assertion options
   *
   * @example
   * await POSAssert.commandBarIsFocused(page);
   */
  async commandBarIsFocused(
    page: Page,
    options: AssertionOptions = {}
  ): Promise<void> {
    const { timeout = DEFAULT_TIMEOUT, message } = options;
    const commandInput = page.locator('input[aria-label="Command input field"]');
    await expect(
      commandInput,
      message || 'Expected command bar to be focused'
    ).toBeFocused({ timeout });
  },

  /**
   * Assert that the command bar is not focused.
   *
   * @param page - Playwright Page object
   * @param options - Assertion options
   *
   * @example
   * await POSAssert.commandBarIsNotFocused(page);
   */
  async commandBarIsNotFocused(
    page: Page,
    options: AssertionOptions = {}
  ): Promise<void> {
    const { timeout = DEFAULT_TIMEOUT, message } = options;
    const commandInput = page.locator('input[aria-label="Command input field"]');
    await expect(
      commandInput,
      message || 'Expected command bar to NOT be focused'
    ).not.toBeFocused({ timeout });
  },

  /**
   * Assert that an order in the sidebar exists.
   *
   * @param page - Playwright Page object
   * @param orderId - Order ID to find in sidebar
   * @param options - Assertion options
   *
   * @example
   * await POSAssert.orderInSidebar(page, '12345');
   */
  async orderInSidebar(
    page: Page,
    orderId: string | number,
    options: AssertionOptions = {}
  ): Promise<void> {
    const { timeout = DEFAULT_TIMEOUT, message } = options;
    const orderLink = page.locator(`aside a[href="/orders/${orderId}"]`);
    await expect(
      orderLink,
      message || `Expected order ${orderId} to be in sidebar`
    ).toBeVisible({ timeout });
  },

  /**
   * Assert that an order is NOT in the sidebar.
   *
   * @param page - Playwright Page object
   * @param orderId - Order ID to verify is not in sidebar
   * @param options - Assertion options
   *
   * @example
   * await POSAssert.orderNotInSidebar(page, '12345');
   */
  async orderNotInSidebar(
    page: Page,
    orderId: string | number,
    options: AssertionOptions = {}
  ): Promise<void> {
    const { timeout = DEFAULT_TIMEOUT, message } = options;
    const orderLink = page.locator(`aside a[href="/orders/${orderId}"]`);
    await expect(
      orderLink,
      message || `Expected order ${orderId} to NOT be in sidebar`
    ).not.toBeVisible({ timeout });
  },
};

/**
 * Fluent assertion builder for chaining multiple assertions
 *
 * @example
 * await assertOrder(page)
 *   .hasLineItem('Coffee', 2)
 *   .hasTotal(25.00)
 *   .isPaid()
 *   .verify();
 */
export function assertOrder(page: Page) {
  const assertions: Array<() => Promise<void>> = [];
  const options: AssertionOptions = {};

  const builder = {
    withTimeout(timeout: number) {
      options.timeout = timeout;
      return builder;
    },

    withTolerance(tolerance: number) {
      options.tolerance = tolerance;
      return builder;
    },

    hasLineItem(name: string, quantity: number) {
      assertions.push(() => POSAssert.toHaveLineItem(page, name, quantity, options));
      return builder;
    },

    hasLineItemCount(count: number) {
      assertions.push(() => POSAssert.toHaveLineItemCount(page, count, options));
      return builder;
    },

    hasNoLineItem(name: string) {
      assertions.push(() => POSAssert.toNotHaveLineItem(page, name, options));
      return builder;
    },

    hasTotal(total: number) {
      assertions.push(() => POSAssert.toHaveTotal(page, total, options));
      return builder;
    },

    hasPayment(payment: number) {
      assertions.push(() => POSAssert.toHavePayment(page, payment, options));
      return builder;
    },

    hasBalance(balance: number) {
      assertions.push(() => POSAssert.toHaveBalance(page, balance, options));
      return builder;
    },

    hasChange(change: number) {
      assertions.push(() => POSAssert.toHaveChange(page, change, options));
      return builder;
    },

    isPaid() {
      assertions.push(() => POSAssert.toBePaid(page, options));
      return builder;
    },

    isNotPaid() {
      assertions.push(() => POSAssert.toNotBePaid(page, options));
      return builder;
    },

    isEmpty() {
      assertions.push(() => POSAssert.toBeEmpty(page, options));
      return builder;
    },

    hasZeroTotal() {
      assertions.push(() => POSAssert.toHaveZeroTotal(page, options));
      return builder;
    },

    async verify() {
      for (const assertion of assertions) {
        await assertion();
      }
    },
  };

  return builder;
}

/**
 * Wait for an element to be stable (not changing) before proceeding.
 * Useful for waiting for animations or loading states to complete.
 *
 * @param locator - Element to wait for
 * @param options - Wait options
 *
 * @example
 * await waitForStable(page.locator('.order-total'));
 */
export async function waitForStable(
  locator: Locator,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();
  let lastText = '';
  let stableCount = 0;

  while (Date.now() - startTime < timeout) {
    try {
      const currentText = await locator.textContent({ timeout: 1000 });
      if (currentText === lastText) {
        stableCount++;
        if (stableCount >= 3) {
          return; // Stable for 3 intervals
        }
      } else {
        stableCount = 0;
        lastText = currentText || '';
      }
    } catch {
      // Element not ready yet
      stableCount = 0;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

/**
 * Wait for network requests to settle and UI to stabilize.
 * Combines network idle with a brief stability check.
 *
 * @param page - Playwright Page object
 * @param options - Wait options
 *
 * @example
 * await waitForSettled(page);
 */
export async function waitForSettled(
  page: Page,
  options: { networkTimeout?: number; stabilityDelay?: number } = {}
): Promise<void> {
  const { networkTimeout = 10000, stabilityDelay = 100 } = options;

  // Wait for network to be idle
  await page.waitForLoadState('networkidle', { timeout: networkTimeout });

  // Brief additional wait for any final UI updates
  await page.waitForTimeout(stabilityDelay);
}
