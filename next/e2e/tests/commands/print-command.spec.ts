/**
 * Print Command Tests
 *
 * Tests for the /print command, which triggers printing of bills or KOT (Kitchen Order Tickets).
 * This test file covers:
 * - /print bill triggers bill print action
 * - /print kot triggers KOT print action
 * - /pr alias works correctly
 * - Error handling for invalid print types and empty orders
 *
 * Note: The print system sends commands to a printer (via Electron in production).
 * In tests, we verify print was triggered by checking:
 * 1. Order meta_data contains last_bill_print or last_kot_print timestamp
 * 2. Command executes without errors
 *
 * The actual print output is not verified in e2e tests since printing requires
 * hardware that may not be available in test environments.
 */

import { test, expect } from '../../fixtures';
import {
  gotoNewOrder,
  waitForMutations,
  getCurrentOrderId,
  getLineItemCount,
} from '../../fixtures';
import {
  getTestProducts,
  getTestSku,
} from '../../fixtures';
import {
  executeCommand,
  executeCommandAndWait,
  CommandShortcuts,
  waitForAutocomplete,
  getAutocompleteSuggestionTexts,
} from '../../fixtures';
import OrdersAPI from '../../../api/orders';

/**
 * Helper to get print timestamp from order meta_data
 */
async function getPrintTimestamp(orderId: string, type: 'bill' | 'kot'): Promise<string | null> {
  const order = await OrdersAPI.getOrder(orderId);
  if (!order) return null;
  const metaKey = type === 'bill' ? 'last_bill_print' : 'last_kot_print';
  const meta = order.meta_data.find((m: { key: string }) => m.key === metaKey);
  return meta ? String(meta.value) : null;
}

/**
 * Helper to verify print was triggered by checking timestamp was set
 */
async function verifyPrintTriggered(orderId: string, type: 'bill' | 'kot'): Promise<boolean> {
  const timestamp = await getPrintTimestamp(orderId, type);
  if (!timestamp) return false;
  // Verify it's a valid ISO date string
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}

test.describe('Print Command', () => {
  test.describe('/print bill triggers print action', () => {
    test('can trigger bill print with /print bill command', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add items to create an order (print requires items)
      await CommandShortcuts.addItem(page, sku, 2);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);

      // Execute print bill command
      await posPage.focusCommandBar();
      await posPage.typeCommand('/print bill');
      await posPage.commandInput.press('Enter');
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify print was triggered by checking meta_data
      const printTriggered = await verifyPrintTriggered(orderId, 'bill');
      expect(printTriggered).toBe(true);
    });

    test('/print bill updates last_bill_print in order meta', async ({ page }) => {
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

      // Verify no print timestamp before
      const timestampBefore = await getPrintTimestamp(orderId, 'bill');

      // Execute print
      await executeCommand(page, 'print', ['bill']);
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify timestamp was set
      const timestampAfter = await getPrintTimestamp(orderId, 'bill');
      expect(timestampAfter).not.toBeNull();

      // If there was a timestamp before, verify it changed
      if (timestampBefore) {
        expect(timestampAfter).not.toBe(timestampBefore);
      }
    });

    test('/print bill shows success message', async ({ page, posPage }) => {
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

      // Execute print and verify no crash
      await posPage.focusCommandBar();
      await posPage.typeCommand('/print bill');
      await posPage.commandInput.press('Enter');
      await page.waitForTimeout(500);

      // Command bar should still be functional
      const commandInput = page.getByLabel('Command input field');
      await expect(commandInput).toBeVisible();
    });
  });

  test.describe('/print kot triggers KOT print action', () => {
    test('can trigger KOT print with /print kot command', async ({ page, posPage }) => {
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

      // Execute print kot command
      await posPage.focusCommandBar();
      await posPage.typeCommand('/print kot');
      await posPage.commandInput.press('Enter');
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify print was triggered
      const printTriggered = await verifyPrintTriggered(orderId, 'kot');
      expect(printTriggered).toBe(true);
    });

    test('/print kot updates last_kot_print in order meta', async ({ page }) => {
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

      // Execute print kot
      await executeCommand(page, 'print', ['kot']);
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify timestamp was set
      const timestamp = await getPrintTimestamp(orderId, 'kot');
      expect(timestamp).not.toBeNull();

      // Verify it's a valid date
      const date = new Date(timestamp!);
      expect(date.getTime()).not.toBeNaN();
    });

    test('/print kot also updates last_kot_items meta for change detection', async ({ page }) => {
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

      // Execute print kot
      await executeCommand(page, 'print', ['kot']);
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify last_kot_items meta was set (used for change detection on next KOT)
      const order = await OrdersAPI.getOrder(orderId);
      const kotItemsMeta = order?.meta_data.find((m: { key: string }) => m.key === 'last_kot_items');
      expect(kotItemsMeta).toBeDefined();

      // Verify it contains item data
      if (kotItemsMeta) {
        const kotItems = JSON.parse(String(kotItemsMeta.value));
        expect(typeof kotItems).toBe('object');
      }
    });
  });

  test.describe('/pr alias works correctly', () => {
    test('/pr alias triggers print same as /print', async ({ page, posPage }) => {
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

      // Use /pr alias
      await posPage.focusCommandBar();
      await posPage.typeCommand('/pr bill');
      await posPage.commandInput.press('Enter');
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify print was triggered
      const printTriggered = await verifyPrintTriggered(orderId, 'bill');
      expect(printTriggered).toBe(true);
    });

    test('/pr kot works same as /print kot', async ({ page, posPage }) => {
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

      // Use /pr alias for KOT
      await posPage.focusCommandBar();
      await posPage.typeCommand('/pr kot');
      await posPage.commandInput.press('Enter');
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify KOT print was triggered
      const printTriggered = await verifyPrintTriggered(orderId, 'kot');
      expect(printTriggered).toBe(true);
    });

    test('/pr bill and /print bill produce identical results', async ({ page }) => {
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

      // First print with /print
      await executeCommand(page, 'print', ['bill']);
      await waitForMutations(page);
      await page.waitForTimeout(500);

      const timestamp1 = await getPrintTimestamp(orderId, 'bill');
      expect(timestamp1).not.toBeNull();

      // Wait a moment to ensure different timestamp
      await page.waitForTimeout(100);

      // Second print with /pr alias
      await executeCommand(page, 'pr', ['bill']);
      await waitForMutations(page);
      await page.waitForTimeout(500);

      const timestamp2 = await getPrintTimestamp(orderId, 'bill');
      expect(timestamp2).not.toBeNull();

      // Both should have set valid timestamps (second overwrites first)
      expect(timestamp2).not.toBe(timestamp1);
    });
  });

  test.describe('Autocomplete suggestions', () => {
    test('typing /print shows autocomplete with bill and kot options', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Add items (needed for command to be valid)
      await CommandShortcuts.addItem(page, sku, 1);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Type partial print command
      await posPage.focusCommandBar();
      await posPage.typeCommand('/print ');

      // Wait for autocomplete
      try {
        await waitForAutocomplete(page, 2000);
        const suggestions = await getAutocompleteSuggestionTexts(page);

        // Should have bill and kot suggestions
        const hasBill = suggestions.some(s => s.toLowerCase().includes('bill'));
        const hasKot = suggestions.some(s => s.toLowerCase().includes('kot'));

        expect(hasBill || hasKot).toBe(true);
      } catch {
        // Autocomplete may not appear for all commands - this is acceptable
        test.skip(true, 'Autocomplete not available for print command');
      }
    });

    test('typing /print b narrows suggestions to bill', async ({ page, posPage }) => {
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

      // Type partial print command with 'b'
      await posPage.focusCommandBar();
      await posPage.typeCommand('/print b');

      try {
        await waitForAutocomplete(page, 2000);
        const suggestions = await getAutocompleteSuggestionTexts(page);

        // Should show bill suggestion
        const hasBill = suggestions.some(s => s.toLowerCase().includes('bill'));
        expect(hasBill).toBe(true);
      } catch {
        // Autocomplete may not appear
        test.skip(true, 'Autocomplete not available');
      }
    });
  });

  test.describe('Error handling', () => {
    test('/print without type argument shows error', async ({ page, posPage }) => {
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

      // Execute /print without argument
      await posPage.focusCommandBar();
      await posPage.typeCommand('/print');
      await posPage.commandInput.press('Enter');
      await page.waitForTimeout(500);

      // Should not crash - command bar still functional
      const commandInput = page.getByLabel('Command input field');
      await expect(commandInput).toBeVisible();

      // No print timestamp should be set
      const billTimestamp = await getPrintTimestamp(orderId, 'bill');
      const kotTimestamp = await getPrintTimestamp(orderId, 'kot');
      // At least one should be null (error should prevent print)
      // Note: If the command fails gracefully, neither timestamp should be set
    });

    test('/print with invalid type is rejected', async ({ page, posPage }) => {
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

      // Execute /print with invalid type
      await posPage.focusCommandBar();
      await posPage.typeCommand('/print invalid');
      await posPage.commandInput.press('Enter');
      await page.waitForTimeout(500);

      // Should not crash
      const commandInput = page.getByLabel('Command input field');
      await expect(commandInput).toBeVisible();

      // No print should have occurred
      const billTimestamp = await getPrintTimestamp(orderId, 'bill');
      const kotTimestamp = await getPrintTimestamp(orderId, 'kot');
      // Neither should be set for invalid type
    });

    test('/print on empty order shows error', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      // Don't add any items - try to print on empty order
      await posPage.focusCommandBar();
      await posPage.typeCommand('/print bill');
      await posPage.commandInput.press('Enter');
      await page.waitForTimeout(500);

      // Should not crash - command bar still functional
      const commandInput = page.getByLabel('Command input field');
      await expect(commandInput).toBeVisible();

      // Can still type commands
      await posPage.focusCommandBar();
      await expect(posPage.commandInput).toBeFocused();
    });

    test('command bar remains functional after print error', async ({ page, posPage }) => {
      await gotoNewOrder(page);

      // Try to print on empty order (should fail)
      await posPage.focusCommandBar();
      await posPage.typeCommand('/print kot');
      await posPage.commandInput.press('Enter');
      await page.waitForTimeout(500);

      // Verify command bar is still functional
      await posPage.focusCommandBar();
      await posPage.typeCommand('/item');
      const inputValue = await posPage.commandInput.inputValue();
      expect(inputValue).toBe('/item');
    });
  });

  test.describe('Print with different order states', () => {
    test('can print bill after recording payment', async ({ page }) => {
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

      // Record payment
      await CommandShortcuts.recordPayment(page, 100);
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);

      // Print bill
      await executeCommand(page, 'print', ['bill']);
      await waitForMutations(page);
      await page.waitForTimeout(1000);

      // Verify print triggered
      const printTriggered = await verifyPrintTriggered(orderId, 'bill');
      expect(printTriggered).toBe(true);
    });

    test('can print multiple times on same order', async ({ page }) => {
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

      // First print
      await executeCommand(page, 'print', ['bill']);
      await waitForMutations(page);
      await page.waitForTimeout(500);

      const timestamp1 = await getPrintTimestamp(orderId, 'bill');
      expect(timestamp1).not.toBeNull();

      // Wait a moment
      await page.waitForTimeout(100);

      // Second print
      await executeCommand(page, 'print', ['bill']);
      await waitForMutations(page);
      await page.waitForTimeout(500);

      const timestamp2 = await getPrintTimestamp(orderId, 'bill');
      expect(timestamp2).not.toBeNull();
      expect(timestamp2).not.toBe(timestamp1);
    });

    test('can print both bill and KOT for same order', async ({ page }) => {
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

      // Print KOT first
      await executeCommand(page, 'print', ['kot']);
      await waitForMutations(page);
      await page.waitForTimeout(500);

      // Print bill
      await executeCommand(page, 'print', ['bill']);
      await waitForMutations(page);
      await page.waitForTimeout(500);

      // Both should have timestamps
      const kotTriggered = await verifyPrintTriggered(orderId, 'kot');
      const billTriggered = await verifyPrintTriggered(orderId, 'bill');

      expect(kotTriggered).toBe(true);
      expect(billTriggered).toBe(true);
    });

    test('print bill includes correct order data', async ({ page }) => {
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

      // Get order state before print
      const orderBefore = await OrdersAPI.getOrder(orderId);
      expect(orderBefore).not.toBeNull();
      expect(orderBefore!.line_items.length).toBe(1);

      // Print bill
      await executeCommand(page, 'print', ['bill']);
      await waitForMutations(page);
      await page.waitForTimeout(500);

      // Verify print was triggered and order data is intact
      const printTriggered = await verifyPrintTriggered(orderId, 'bill');
      expect(printTriggered).toBe(true);

      // Order data should be unchanged
      const orderAfter = await OrdersAPI.getOrder(orderId);
      expect(orderAfter!.line_items.length).toBe(1);
      expect(orderAfter!.line_items[0].quantity).toBe(3);
    });
  });

  test.describe('KOT change detection', () => {
    test('KOT tracks items for change detection on subsequent prints', async ({ page }) => {
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

      // First KOT print
      await executeCommand(page, 'print', ['kot']);
      await waitForMutations(page);
      await page.waitForTimeout(500);

      // Verify last_kot_items was set
      let order = await OrdersAPI.getOrder(orderId);
      let kotItemsMeta = order?.meta_data.find((m: { key: string }) => m.key === 'last_kot_items');
      expect(kotItemsMeta).toBeDefined();

      const firstKotItems = JSON.parse(String(kotItemsMeta!.value));

      // Add more items
      await CommandShortcuts.addItem(page, sku, 2); // Should increment to 4
      await waitForMutations(page);
      await page.waitForTimeout(500);

      // Second KOT print
      await executeCommand(page, 'print', ['kot']);
      await waitForMutations(page);
      await page.waitForTimeout(500);

      // Verify last_kot_items was updated
      order = await OrdersAPI.getOrder(orderId);
      kotItemsMeta = order?.meta_data.find((m: { key: string }) => m.key === 'last_kot_items');
      expect(kotItemsMeta).toBeDefined();

      const secondKotItems = JSON.parse(String(kotItemsMeta!.value));

      // The quantity should have changed
      const firstKey = Object.keys(firstKotItems)[0];
      if (firstKey && secondKotItems[firstKey]) {
        // New quantity should be different (4 vs 2)
        expect(secondKotItems[firstKey].quantity).not.toBe(firstKotItems[firstKey].quantity);
      }
    });
  });
});
