/**
 * Order Manipulation Helpers
 *
 * Standalone utilities for order-related operations in E2E tests.
 * These helpers can be used independently or alongside POSPage methods.
 */

import { Page, Locator, expect } from '@playwright/test';

/**
 * Line item data structure
 */
export interface LineItem {
  name: string;
  quantity: number;
  sku?: string;
  price?: number;
  subtotal?: number;
}

/**
 * Order summary data structure
 */
export interface OrderSummary {
  id: string;
  status: 'draft' | 'pending' | 'completed' | 'cancelled' | string;
  total: number;
  lineItems: LineItem[];
  paymentAmount: number;
  balance: number;
  customer?: {
    id: number;
    name: string;
  };
}

/**
 * Order page selectors
 */
export const ORDER_SELECTORS = {
  orderTitle: 'h2:has-text("Order #")',
  lineItemsTable: 'table[aria-label="Order line items"]',
  lineItemRow: 'tbody tr',
  lineItemNameCell: 'td:first-child',
  lineItemQuantityInput: 'input[aria-label="Quantity of line item"]',
  paymentTable: 'table[aria-label="Payment details"]',
  totalRow: 'tr:has-text("Total")',
  cashInput: 'input[aria-label="Cash amount"]',
  changeRow: 'tr:has-text("Change"), tr:has-text("Short")',
  newOrderButton: 'button:has-text("New Order")',
  orderLinks: 'aside a[href^="/orders/"]',
  serviceCard: '#service-selection-card',
} as const;

/**
 * Navigate to the orders page
 */
export async function gotoOrders(page: Page): Promise<void> {
  await page.goto('/orders');
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to a specific order by ID
 */
export async function gotoOrder(page: Page, orderId: number | string): Promise<void> {
  await page.goto(`/orders/${orderId}`);
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to new order page
 */
export async function gotoNewOrder(page: Page): Promise<void> {
  await page.goto('/orders/new');
  await page.waitForLoadState('networkidle');
}

/**
 * Create a new order by clicking the New Order button
 *
 * @returns The order ID of the newly created order
 */
export async function createNewOrder(page: Page): Promise<string> {
  const newOrderButton = page.locator(ORDER_SELECTORS.newOrderButton);
  await newOrderButton.click();

  // Wait for navigation to new order page
  await page.waitForURL(/\/orders\/(new|\d+)/);
  await page.waitForLoadState('networkidle');

  // Return the order ID from URL
  return await getCurrentOrderId(page);
}

/**
 * Wait for order page to be fully loaded
 */
export async function waitForOrderPageReady(page: Page): Promise<void> {
  const commandInput = page.locator('input[aria-label="Command input field"]');
  const orderTitle = page.locator(ORDER_SELECTORS.orderTitle);

  // Wait for command bar to be ready (not disabled)
  await expect(commandInput).toBeEnabled({ timeout: 15000 });
  // Wait for order title to be visible
  await expect(orderTitle).toBeVisible({ timeout: 10000 });
}

/**
 * Get the current order ID from the URL
 */
export async function getCurrentOrderId(page: Page): Promise<string> {
  const url = page.url();
  const match = url.match(/\/orders\/(\d+|new)/);
  return match ? match[1] : '';
}

/**
 * Verify we're on an order page
 */
export async function verifyOnOrderPage(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/orders\/(\d+|new)/);
  const orderTitle = page.locator(ORDER_SELECTORS.orderTitle);
  await expect(orderTitle).toBeVisible();
}

/**
 * Get all line items from the order
 */
export async function getLineItems(page: Page): Promise<LineItem[]> {
  const table = page.locator(ORDER_SELECTORS.lineItemsTable);
  const rows = table.locator(ORDER_SELECTORS.lineItemRow);
  const count = await rows.count();
  const items: LineItem[] = [];

  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);
    const nameCell = row.locator(ORDER_SELECTORS.lineItemNameCell);
    const quantityInput = row.locator(ORDER_SELECTORS.lineItemQuantityInput);

    const name = await nameCell.textContent() || '';
    const quantityValue = await quantityInput.inputValue();
    const quantity = parseInt(quantityValue, 10) || 0;

    items.push({ name: name.trim(), quantity });
  }

  return items;
}

/**
 * Get line item count
 */
export async function getLineItemCount(page: Page): Promise<number> {
  const items = await getLineItems(page);
  return items.length;
}

/**
 * Get a specific line item by name (partial match)
 */
export async function getLineItem(
  page: Page,
  namePattern: string
): Promise<LineItem | null> {
  const items = await getLineItems(page);
  return items.find(
    item => item.name.toLowerCase().includes(namePattern.toLowerCase())
  ) || null;
}

/**
 * Check if a line item exists
 */
export async function hasLineItem(
  page: Page,
  namePattern: string
): Promise<boolean> {
  const item = await getLineItem(page, namePattern);
  return item !== null;
}

/**
 * Get the quantity input locator for a specific line item
 */
export function getLineItemQuantityInput(
  page: Page,
  namePattern: string
): Locator {
  return page.locator(ORDER_SELECTORS.lineItemsTable)
    .locator(ORDER_SELECTORS.lineItemRow)
    .filter({ hasText: new RegExp(namePattern, 'i') })
    .locator(ORDER_SELECTORS.lineItemQuantityInput);
}

/**
 * Update line item quantity via the UI input
 */
export async function updateLineItemQuantity(
  page: Page,
  namePattern: string,
  quantity: number
): Promise<void> {
  const input = getLineItemQuantityInput(page, namePattern);
  await input.fill(quantity.toString());
  await input.press('Tab'); // Trigger blur to save
  await page.waitForLoadState('networkidle');
}

/**
 * Get the order total
 */
export async function getOrderTotal(page: Page): Promise<number> {
  const table = page.locator(ORDER_SELECTORS.paymentTable);
  const totalRow = table.locator(ORDER_SELECTORS.totalRow);
  const totalInput = totalRow.locator('input');
  const value = await totalInput.inputValue();
  // Parse currency value (remove currency symbol and commas)
  const numericValue = value.replace(/[^0-9.-]/g, '');
  return parseFloat(numericValue) || 0;
}

/**
 * Get the current payment amount
 */
export async function getPaymentAmount(page: Page): Promise<number> {
  const cashInput = page.locator(ORDER_SELECTORS.cashInput);
  const value = await cashInput.inputValue();
  return parseFloat(value) || 0;
}

/**
 * Get the change/short amount
 */
export async function getChangeAmount(page: Page): Promise<number> {
  const table = page.locator(ORDER_SELECTORS.paymentTable);
  const changeRow = table.locator(ORDER_SELECTORS.changeRow);
  const changeInput = changeRow.locator('input');
  const value = await changeInput.inputValue();
  const numericValue = value.replace(/[^0-9.-]/g, '');
  return parseFloat(numericValue) || 0;
}

/**
 * Calculate the outstanding balance
 */
export async function getOrderBalance(page: Page): Promise<number> {
  const total = await getOrderTotal(page);
  const payment = await getPaymentAmount(page);
  return total - payment;
}

/**
 * Check if the order is fully paid
 */
export async function isOrderPaid(page: Page): Promise<boolean> {
  const total = await getOrderTotal(page);
  const payment = await getPaymentAmount(page);
  return payment >= total && total > 0;
}

/**
 * Enter payment amount via cash input
 */
export async function enterPayment(page: Page, amount: number): Promise<void> {
  const cashInput = page.locator(ORDER_SELECTORS.cashInput);
  await cashInput.fill(amount.toString());
  await cashInput.press('Tab');
  await page.waitForLoadState('networkidle');
}

/**
 * Click a quick payment button by label
 */
export async function clickQuickPayment(page: Page, label: string): Promise<void> {
  const quickPayButton = page.getByRole('button', { name: label });
  await quickPayButton.click();
  await page.waitForLoadState('networkidle');
}

/**
 * Get all order links from the sidebar
 */
export async function getOrderLinksFromSidebar(page: Page): Promise<string[]> {
  const links = page.locator(ORDER_SELECTORS.orderLinks);
  return await links.allTextContents();
}

/**
 * Click an order in the sidebar by order ID
 */
export async function clickOrderInSidebar(
  page: Page,
  orderId: number | string
): Promise<void> {
  const orderLink = page.locator(`aside a[href="/orders/${orderId}"]`);
  await orderLink.click();
  await page.waitForURL(`/orders/${orderId}`);
  await page.waitForLoadState('networkidle');
}

/**
 * Get order summary (combines multiple order info)
 */
export async function getOrderSummary(page: Page): Promise<Partial<OrderSummary>> {
  const id = await getCurrentOrderId(page);
  const total = await getOrderTotal(page);
  const lineItems = await getLineItems(page);
  const paymentAmount = await getPaymentAmount(page);
  const balance = await getOrderBalance(page);

  return {
    id,
    total,
    lineItems,
    paymentAmount,
    balance,
  };
}

/**
 * Verification helpers
 */
export const OrderVerify = {
  /**
   * Verify the order has a specific number of line items
   */
  async lineItemCount(page: Page, expectedCount: number): Promise<void> {
    const items = await getLineItems(page);
    expect(items.length).toBe(expectedCount);
  },

  /**
   * Verify a line item exists with specific quantity
   */
  async lineItem(
    page: Page,
    namePattern: string,
    expectedQuantity: number
  ): Promise<void> {
    const item = await getLineItem(page, namePattern);
    expect(item).not.toBeNull();
    expect(item?.quantity).toBe(expectedQuantity);
  },

  /**
   * Verify line item does NOT exist
   */
  async noLineItem(page: Page, namePattern: string): Promise<void> {
    const exists = await hasLineItem(page, namePattern);
    expect(exists).toBe(false);
  },

  /**
   * Verify order total matches expected value
   */
  async total(page: Page, expectedTotal: number, tolerance: number = 0.01): Promise<void> {
    const actual = await getOrderTotal(page);
    expect(Math.abs(actual - expectedTotal)).toBeLessThanOrEqual(tolerance);
  },

  /**
   * Verify order is fully paid
   */
  async isPaid(page: Page): Promise<void> {
    const paid = await isOrderPaid(page);
    expect(paid).toBe(true);
  },

  /**
   * Verify order is NOT fully paid
   */
  async isNotPaid(page: Page): Promise<void> {
    const paid = await isOrderPaid(page);
    expect(paid).toBe(false);
  },

  /**
   * Verify order balance matches expected value
   */
  async balance(page: Page, expectedBalance: number, tolerance: number = 0.01): Promise<void> {
    const actual = await getOrderBalance(page);
    expect(Math.abs(actual - expectedBalance)).toBeLessThanOrEqual(tolerance);
  },

  /**
   * Verify order is empty (no line items)
   */
  async isEmpty(page: Page): Promise<void> {
    await this.lineItemCount(page, 0);
  },

  /**
   * Verify we're on a specific order page
   */
  async onOrderPage(page: Page, orderId?: number | string): Promise<void> {
    if (orderId) {
      await expect(page).toHaveURL(`/orders/${orderId}`);
    } else {
      await expect(page).toHaveURL(/\/orders\/(\d+|new)/);
    }
    const orderTitle = page.locator(ORDER_SELECTORS.orderTitle);
    await expect(orderTitle).toBeVisible();
  },
} as const;

/**
 * Service/table selection helpers
 */
export const ServiceSelection = {
  /**
   * Select a table by name
   */
  async selectTable(page: Page, tableName: string): Promise<void> {
    const tableRadioGroup = page.getByLabel('Tables');
    const tableRadio = tableRadioGroup.getByLabel(new RegExp(tableName, 'i'));
    await tableRadio.click();
    await page.waitForLoadState('networkidle');
  },

  /**
   * Select a delivery zone by name
   */
  async selectDeliveryZone(page: Page, zoneName: string): Promise<void> {
    const deliveryRadioGroup = page.getByLabel('Delivery zones');
    const zoneRadio = deliveryRadioGroup.getByLabel(new RegExp(zoneName, 'i'));
    await zoneRadio.click();
    await page.waitForLoadState('networkidle');
  },

  /**
   * Get the currently selected service
   */
  async getSelectedService(page: Page): Promise<string | null> {
    // Check tables first
    const tableRadioGroup = page.getByLabel('Tables');
    if (await tableRadioGroup.isVisible().catch(() => false)) {
      const checkedTable = tableRadioGroup.locator('input[type="radio"]:checked');
      if (await checkedTable.count() > 0) {
        const label = await checkedTable.locator('..').locator('span').first().textContent();
        return label?.trim() || null;
      }
    }

    // Check delivery zones
    const deliveryRadioGroup = page.getByLabel('Delivery zones');
    if (await deliveryRadioGroup.isVisible().catch(() => false)) {
      const checkedZone = deliveryRadioGroup.locator('input[type="radio"]:checked');
      if (await checkedZone.count() > 0) {
        const label = await checkedZone.locator('..').locator('span').first().textContent();
        return label?.trim() || null;
      }
    }

    return null;
  },

  /**
   * Check if service selection card is visible
   */
  async isServiceCardVisible(page: Page): Promise<boolean> {
    const serviceCard = page.locator(ORDER_SELECTORS.serviceCard);
    return await serviceCard.isVisible().catch(() => false);
  },
} as const;

/**
 * Wait for API mutations to complete
 */
export async function waitForMutations(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  // Additional wait for optimistic updates to settle
  await page.waitForTimeout(200);
}

/**
 * Take a screenshot with a descriptive name
 */
export async function screenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `test-results/screenshots/${name}.png` });
}
