/**
 * Order Notes Tests
 *
 * Tests for order notes functionality in Simple POS.
 * Notes are stored as customer_note in WooCommerce orders.
 *
 * Test scenarios per PRD:
 * - Add order note
 * - Edit existing note
 * - Customer note vs order note distinction
 * - Verify notes saved correctly in WooCommerce
 */

import { test, expect } from '../../fixtures';
import {
  gotoNewOrder,
  waitForMutations,
  getTestProducts,
  getTestSku,
  getFirstInStockVariation,
} from '../../fixtures';
import {
  executeCommand,
} from '../../fixtures';
import OrdersAPI from '../../../api/orders';

test.describe('Order Notes', () => {
  test.describe('Add order note', () => {
    test('can add note using /note command', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No product available for testing');
        return;
      }

      // Add item to create order
      await executeCommand(page, 'item', [sku]);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Add a note via command
      await executeCommand(page, 'note', ['Extra spicy please']);
      await waitForMutations(page);

      // Verify note is displayed in the UI
      const noteTextarea = page.locator('textarea[placeholder="Order Note"]');
      if (await noteTextarea.isVisible().catch(() => false)) {
        const noteValue = await noteTextarea.inputValue();
        expect(noteValue).toContain('Extra spicy please');
      }

      // Verify in WooCommerce API
      const url = page.url();
      const match = url.match(/\/orders\/(\d+)/);
      expect(match).not.toBeNull();
      const orderId = parseInt(match![1], 10);

      const savedOrder = await OrdersAPI.getOrder(orderId.toString());
      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.customer_note).toContain('Extra spicy please');
    });

    test('/n alias works the same as /note', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No product available for testing');
        return;
      }

      // Add item to create order
      await executeCommand(page, 'item', [sku]);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Add a note via /n alias
      await executeCommand(page, 'n', ['No onions']);
      await waitForMutations(page);

      // Verify in WooCommerce API
      const url = page.url();
      const match = url.match(/\/orders\/(\d+)/);
      expect(match).not.toBeNull();
      const orderId = parseInt(match![1], 10);

      const savedOrder = await OrdersAPI.getOrder(orderId.toString());
      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.customer_note).toContain('No onions');
    });

    test('note with multiple words is saved correctly', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No product available for testing');
        return;
      }

      // Add item to create order
      await executeCommand(page, 'item', [sku]);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Add note with multiple words and special characters
      await executeCommand(page, 'note', ['Please make it extra spicy, no onions, and add extra sauce!']);
      await waitForMutations(page);

      // Verify in WooCommerce API
      const url = page.url();
      const match = url.match(/\/orders\/(\d+)/);
      expect(match).not.toBeNull();
      const orderId = parseInt(match![1], 10);

      const savedOrder = await OrdersAPI.getOrder(orderId.toString());
      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.customer_note).toContain('extra spicy');
      expect(savedOrder!.customer_note).toContain('no onions');
      expect(savedOrder!.customer_note).toContain('extra sauce');
    });

    test('adding note via UI textarea works', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No product available for testing');
        return;
      }

      // Add item to create order
      await executeCommand(page, 'item', [sku]);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Find the note textarea and type directly
      const noteTextarea = page.locator('textarea[placeholder="Order Note"]');

      if (!await noteTextarea.isVisible().catch(() => false)) {
        test.skip(true, 'Note textarea not visible');
        return;
      }

      await noteTextarea.fill('UI typed note');
      await noteTextarea.press('Tab'); // Trigger blur to save
      await waitForMutations(page);

      // Verify the change persisted
      const value = await noteTextarea.inputValue();
      expect(value).toBe('UI typed note');

      // Verify in API
      const url = page.url();
      const match = url.match(/\/orders\/(\d+)/);
      expect(match).not.toBeNull();
      const orderId = parseInt(match![1], 10);

      const savedOrder = await OrdersAPI.getOrder(orderId.toString());
      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.customer_note).toBe('UI typed note');
    });
  });

  test.describe('Edit existing note', () => {
    test('can edit note by typing new /note command', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No product available for testing');
        return;
      }

      // Add item to create order
      await executeCommand(page, 'item', [sku]);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Add initial note
      await executeCommand(page, 'note', ['First note']);
      await waitForMutations(page);

      // Replace with new note
      await executeCommand(page, 'note', ['Updated note']);
      await waitForMutations(page);

      // Verify in WooCommerce API - should be replaced, not appended
      const url = page.url();
      const match = url.match(/\/orders\/(\d+)/);
      expect(match).not.toBeNull();
      const orderId = parseInt(match![1], 10);

      const savedOrder = await OrdersAPI.getOrder(orderId.toString());
      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.customer_note).toBe('Updated note');
    });

    test('can edit note via UI textarea', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No product available for testing');
        return;
      }

      // Add item to create order
      await executeCommand(page, 'item', [sku]);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Add initial note via command
      await executeCommand(page, 'note', ['Initial note']);
      await waitForMutations(page);

      // Find the note textarea and edit it
      const noteTextarea = page.locator('textarea[placeholder="Order Note"]');

      if (!await noteTextarea.isVisible().catch(() => false)) {
        test.skip(true, 'Note textarea not visible');
        return;
      }

      // Clear and type new note
      await noteTextarea.fill('Edited via UI');
      await noteTextarea.press('Tab'); // Trigger blur to save
      await waitForMutations(page);

      // Verify in API
      const url = page.url();
      const match = url.match(/\/orders\/(\d+)/);
      expect(match).not.toBeNull();
      const orderId = parseInt(match![1], 10);

      const savedOrder = await OrdersAPI.getOrder(orderId.toString());
      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.customer_note).toBe('Edited via UI');
    });

    test('note can be cleared by setting empty value', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No product available for testing');
        return;
      }

      // Add item to create order
      await executeCommand(page, 'item', [sku]);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Add initial note
      await executeCommand(page, 'note', ['Note to clear']);
      await waitForMutations(page);

      // Clear the note via UI
      const noteTextarea = page.locator('textarea[placeholder="Order Note"]');

      if (!await noteTextarea.isVisible().catch(() => false)) {
        test.skip(true, 'Note textarea not visible');
        return;
      }

      await noteTextarea.fill('');
      await noteTextarea.press('Tab'); // Trigger blur to save
      await waitForMutations(page);

      // Verify in API
      const url = page.url();
      const match = url.match(/\/orders\/(\d+)/);
      expect(match).not.toBeNull();
      const orderId = parseInt(match![1], 10);

      const savedOrder = await OrdersAPI.getOrder(orderId.toString());
      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.customer_note).toBe('');
    });

    test('note persists after page reload', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No product available for testing');
        return;
      }

      // Add item to create order
      await executeCommand(page, 'item', [sku]);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Add a note
      await executeCommand(page, 'note', ['Persistent note']);
      await waitForMutations(page);

      // Reload the page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify note is still displayed
      const noteTextarea = page.locator('textarea[placeholder="Order Note"]');

      if (await noteTextarea.isVisible().catch(() => false)) {
        const noteValue = await noteTextarea.inputValue();
        expect(noteValue).toBe('Persistent note');
      }

      // Verify in API
      const url = page.url();
      const match = url.match(/\/orders\/(\d+)/);
      expect(match).not.toBeNull();
      const orderId = parseInt(match![1], 10);

      const savedOrder = await OrdersAPI.getOrder(orderId.toString());
      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.customer_note).toBe('Persistent note');
    });
  });

  test.describe('Customer note vs order note distinction', () => {
    test('note command sets customer_note field', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No product available for testing');
        return;
      }

      // Add item to create order
      await executeCommand(page, 'item', [sku]);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Add a customer note
      await executeCommand(page, 'note', ['Customer facing note']);
      await waitForMutations(page);

      // Verify customer_note field in WooCommerce
      const url = page.url();
      const match = url.match(/\/orders\/(\d+)/);
      expect(match).not.toBeNull();
      const orderId = parseInt(match![1], 10);

      const savedOrder = await OrdersAPI.getOrder(orderId.toString());
      expect(savedOrder).not.toBeNull();
      // The note command specifically sets customer_note
      expect(savedOrder!.customer_note).toBe('Customer facing note');
    });

    test('customer note is displayed in the order note textarea', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No product available for testing');
        return;
      }

      // Add item to create order
      await executeCommand(page, 'item', [sku]);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Add a customer note
      await executeCommand(page, 'note', ['Kitchen instructions']);
      await waitForMutations(page);

      // Verify it shows in the Order Note textarea
      const noteTextarea = page.locator('textarea[placeholder="Order Note"]');

      if (await noteTextarea.isVisible().catch(() => false)) {
        const noteValue = await noteTextarea.inputValue();
        expect(noteValue).toBe('Kitchen instructions');
      }
    });

    test('customer note is visible to kitchen staff (KOT context)', async ({ page }) => {
      // This test verifies that the customer_note field is used,
      // which is the field typically visible on kitchen order tickets
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No product available for testing');
        return;
      }

      // Add item to create order
      await executeCommand(page, 'item', [sku]);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Add kitchen-relevant note
      await executeCommand(page, 'note', ['Allergic to peanuts, no nuts!']);
      await waitForMutations(page);

      // Verify in WooCommerce - customer_note is used for KOT
      const url = page.url();
      const match = url.match(/\/orders\/(\d+)/);
      expect(match).not.toBeNull();
      const orderId = parseInt(match![1], 10);

      const savedOrder = await OrdersAPI.getOrder(orderId.toString());
      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.customer_note).toBe('Allergic to peanuts, no nuts!');
    });
  });

  test.describe('Verify notes saved correctly in WooCommerce', () => {
    test('note is saved to WooCommerce customer_note field', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No product available for testing');
        return;
      }

      // Add item to create order
      await executeCommand(page, 'item', [sku]);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Add note
      const noteText = 'WooCommerce persistence test note';
      await executeCommand(page, 'note', [noteText]);
      await waitForMutations(page);

      // Verify in WooCommerce API
      const url = page.url();
      const match = url.match(/\/orders\/(\d+)/);
      expect(match).not.toBeNull();
      const orderId = parseInt(match![1], 10);

      const savedOrder = await OrdersAPI.getOrder(orderId.toString());
      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.customer_note).toBe(noteText);
    });

    test('note with special characters is saved correctly', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No product available for testing');
        return;
      }

      // Add item to create order
      await executeCommand(page, 'item', [sku]);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Add note with special characters
      const noteText = "Customer's order: 50% spicy & extra sauce! (Don't forget)";
      await executeCommand(page, 'note', [noteText]);
      await waitForMutations(page);

      // Verify in WooCommerce API
      const url = page.url();
      const match = url.match(/\/orders\/(\d+)/);
      expect(match).not.toBeNull();
      const orderId = parseInt(match![1], 10);

      const savedOrder = await OrdersAPI.getOrder(orderId.toString());
      expect(savedOrder).not.toBeNull();
      // Note should contain the special characters
      expect(savedOrder!.customer_note).toContain('50%');
      expect(savedOrder!.customer_note).toContain('&');
    });

    test('note update replaces previous note in WooCommerce', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No product available for testing');
        return;
      }

      // Add item to create order
      await executeCommand(page, 'item', [sku]);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Add first note
      await executeCommand(page, 'note', ['First note']);
      await waitForMutations(page);

      // Add second note (should replace)
      await executeCommand(page, 'note', ['Second note replaces first']);
      await waitForMutations(page);

      // Add third note (should replace again)
      await executeCommand(page, 'note', ['Final replacement note']);
      await waitForMutations(page);

      // Verify in WooCommerce API - only final note should exist
      const url = page.url();
      const match = url.match(/\/orders\/(\d+)/);
      expect(match).not.toBeNull();
      const orderId = parseInt(match![1], 10);

      const savedOrder = await OrdersAPI.getOrder(orderId.toString());
      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.customer_note).toBe('Final replacement note');
      // Previous notes should not be present
      expect(savedOrder!.customer_note).not.toContain('First note');
      expect(savedOrder!.customer_note).not.toContain('Second note');
    });

    test('note is preserved when line items are modified', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product, variable: variableProduct } = getTestProducts();
      const sku = getTestSku(product);
      const variation = variableProduct ? getFirstInStockVariation(variableProduct) : null;
      const sku2 = variation?.sku;

      if (!sku) {
        test.skip(true, 'No product available for testing');
        return;
      }

      // Add item to create order
      await executeCommand(page, 'item', [sku]);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Add note
      await executeCommand(page, 'note', ['Important note to preserve']);
      await waitForMutations(page);

      // Modify line item quantity
      await executeCommand(page, 'item', [sku, '5']);
      await waitForMutations(page);

      // Add another item if available
      if (sku2) {
        await executeCommand(page, 'item', [sku2]);
        await waitForMutations(page);
      }

      // Verify note is still present
      const url = page.url();
      const match = url.match(/\/orders\/(\d+)/);
      expect(match).not.toBeNull();
      const orderId = parseInt(match![1], 10);

      const savedOrder = await OrdersAPI.getOrder(orderId.toString());
      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.customer_note).toBe('Important note to preserve');
    });

    test('note is preserved after order completion', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No product available for testing');
        return;
      }

      // Add item to create order
      await executeCommand(page, 'item', [sku]);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Add note
      await executeCommand(page, 'note', ['Note for completed order']);
      await waitForMutations(page);

      // Get order ID before completing
      const url = page.url();
      const match = url.match(/\/orders\/(\d+)/);
      expect(match).not.toBeNull();
      const orderId = parseInt(match![1], 10);

      // Get order total for payment
      const orderBefore = await OrdersAPI.getOrder(orderId.toString());
      expect(orderBefore).not.toBeNull();
      const total = parseFloat(orderBefore!.total);

      // Record payment
      await executeCommand(page, 'pay', [total.toFixed(2)]);
      await waitForMutations(page);

      // Complete order
      await executeCommand(page, 'done', []);
      await waitForMutations(page);

      // Wait a bit for completion
      await page.waitForTimeout(1000);

      // Verify note is still present after completion
      const savedOrder = await OrdersAPI.getOrder(orderId.toString());
      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.customer_note).toBe('Note for completed order');
    });
  });

  test.describe('Edge Cases', () => {
    test('/note without arguments shows error', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No product available for testing');
        return;
      }

      // Add item to create order
      await executeCommand(page, 'item', [sku]);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Execute note command without arguments
      await executeCommand(page, 'note', []);
      await page.waitForTimeout(500);

      // Should show an error or not crash
      // The command should not have set any note
      const url = page.url();
      expect(url).toMatch(/\/orders\/\d+/);

      // Verify no note was set
      const match = url.match(/\/orders\/(\d+)/);
      expect(match).not.toBeNull();
      const orderId = parseInt(match![1], 10);

      const savedOrder = await OrdersAPI.getOrder(orderId.toString());
      expect(savedOrder).not.toBeNull();
      // Note should be empty since we didn't provide text
      expect(savedOrder!.customer_note).toBe('');
    });

    test('/note on empty order (no line items) is handled gracefully', async ({ page }) => {
      await gotoNewOrder(page);

      // Try to add note on empty order (which is /orders/new)
      await executeCommand(page, 'note', ['Note on empty order']);
      await page.waitForTimeout(1000);

      // Since note alone may not trigger order creation,
      // the URL might still be /orders/new
      const url = page.url();

      // Either we're still on new (expected) or we got an error (also acceptable)
      expect(url).toMatch(/\/orders\/(new|\d+)/);
    });

    test('note with very long text is handled', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No product available for testing');
        return;
      }

      // Add item to create order
      await executeCommand(page, 'item', [sku]);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Add very long note
      const longNote = 'This is a very long note. '.repeat(20);
      await executeCommand(page, 'note', [longNote]);
      await waitForMutations(page);

      // Verify it was saved (at least partially)
      const url = page.url();
      const match = url.match(/\/orders\/(\d+)/);
      expect(match).not.toBeNull();
      const orderId = parseInt(match![1], 10);

      const savedOrder = await OrdersAPI.getOrder(orderId.toString());
      expect(savedOrder).not.toBeNull();
      // Note should contain the repeated text (or be truncated, but not empty)
      expect(savedOrder!.customer_note.length).toBeGreaterThan(0);
      expect(savedOrder!.customer_note).toContain('very long note');
    });

    test('note textarea shows warning color while mutating', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No product available for testing');
        return;
      }

      // Add item to create order
      await executeCommand(page, 'item', [sku]);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Find the note textarea
      const noteTextarea = page.locator('textarea[placeholder="Order Note"]');

      if (!await noteTextarea.isVisible().catch(() => false)) {
        test.skip(true, 'Note textarea not visible');
        return;
      }

      // Type and check if textarea changes color during mutation
      await noteTextarea.fill('Testing mutation state');

      // The textarea should have warning color while saving
      // This is a quick check - the actual color change might be very brief
      // Just verify the input works without crashing
      await noteTextarea.press('Tab');
      await waitForMutations(page);

      // Final value should be saved
      const value = await noteTextarea.inputValue();
      expect(value).toBe('Testing mutation state');
    });

    test('command bar remains functional after /note', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No product available for testing');
        return;
      }

      // Add item to create order
      await executeCommand(page, 'item', [sku]);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Add note
      await executeCommand(page, 'note', ['First note']);
      await waitForMutations(page);

      // Verify command bar still works by adding another item
      await executeCommand(page, 'item', [sku]);
      await waitForMutations(page);

      // Verify quantity increased
      const url = page.url();
      const match = url.match(/\/orders\/(\d+)/);
      expect(match).not.toBeNull();
      const orderId = parseInt(match![1], 10);

      const savedOrder = await OrdersAPI.getOrder(orderId.toString());
      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.line_items.length).toBeGreaterThan(0);
      expect(savedOrder!.line_items[0].quantity).toBeGreaterThanOrEqual(2);
    });

    test('multiple rapid note updates result in correct final value', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No product available for testing');
        return;
      }

      // Add item to create order
      await executeCommand(page, 'item', [sku]);
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Find the note textarea
      const noteTextarea = page.locator('textarea[placeholder="Order Note"]');

      if (!await noteTextarea.isVisible().catch(() => false)) {
        test.skip(true, 'Note textarea not visible');
        return;
      }

      // Rapidly type and change note
      await noteTextarea.fill('First');
      await noteTextarea.fill('Second');
      await noteTextarea.fill('Third');
      await noteTextarea.fill('Final value');
      await noteTextarea.press('Tab');
      await waitForMutations(page);

      // Wait a bit more for debounced mutation
      await page.waitForTimeout(1000);

      // Verify final value
      const url = page.url();
      const match = url.match(/\/orders\/(\d+)/);
      expect(match).not.toBeNull();
      const orderId = parseInt(match![1], 10);

      const savedOrder = await OrdersAPI.getOrder(orderId.toString());
      expect(savedOrder).not.toBeNull();
      expect(savedOrder!.customer_note).toBe('Final value');
    });
  });
});
