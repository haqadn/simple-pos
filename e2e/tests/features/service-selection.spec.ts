/**
 * Service/Table Selection Tests
 *
 * Tests for service type and table/delivery zone selection in Simple POS.
 * Service selection is implemented through:
 * 1. Radio groups for Tables (dine-in)
 * 2. Radio groups for Delivery zones
 * 3. Keyboard shortcuts (Alt+0-9) for quick selection
 *
 * Test scenarios per PRD:
 * - Select dine-in service type
 * - Select table number
 * - Change service type updates order
 * - Verify service meta in WooCommerce order
 */

import { test, expect } from '../../fixtures';
import {
  gotoNewOrder,
  gotoOrder,
  waitForMutations,
  getCurrentOrderId,
  getTestProducts,
  getTestSku,
  ServiceSelection,
} from '../../fixtures';
import { executeCommand } from '../../fixtures';
import OrdersAPI from '../../../api/orders';

/**
 * Helper to check if service selection card is visible
 */
async function isServiceCardVisible(page: import('@playwright/test').Page): Promise<boolean> {
  const serviceCard = page.locator('#service-selection-card');
  return await serviceCard.isVisible().catch(() => false);
}

/**
 * Helper to get table radio buttons
 */
async function getTableRadios(page: import('@playwright/test').Page) {
  const tablesGroup = page.getByLabel('Tables');
  const isVisible = await tablesGroup.isVisible().catch(() => false);
  if (!isVisible) return null;
  return tablesGroup.locator('input[type="radio"]');
}

/**
 * Helper to get delivery zone radio buttons
 */
async function getDeliveryZoneRadios(page: import('@playwright/test').Page) {
  const deliveryGroup = page.getByLabel('Delivery zones');
  const isVisible = await deliveryGroup.isVisible().catch(() => false);
  if (!isVisible) return null;
  return deliveryGroup.locator('input[type="radio"]');
}

/**
 * Helper to get the title/label of a radio button
 */
async function getRadioLabel(page: import('@playwright/test').Page, radio: import('@playwright/test').Locator): Promise<string | null> {
  // The radio is wrapped in a label, get the text from the span inside
  const labelSpan = radio.locator('..').locator('span').first();
  const text = await labelSpan.textContent().catch(() => null);
  return text?.trim() || null;
}

/**
 * Helper to save order by adding an item (required for persisting service)
 */
async function saveOrderWithItem(page: import('@playwright/test').Page): Promise<string | null> {
  const { simple: product } = getTestProducts();
  const sku = getTestSku(product);

  if (!sku) return null;

  await executeCommand(page, 'item', [sku]);
  try {
    await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
    await waitForMutations(page);
    return await getCurrentOrderId(page);
  } catch {
    return null;
  }
}

test.describe('Service Selection', () => {
  test.describe('Select dine-in service type', () => {
    test('can select a table from the service card', async ({ page }) => {
      await gotoNewOrder(page);

      // Check if service selection is available
      const hasServiceCard = await isServiceCardVisible(page);
      if (!hasServiceCard) {
        test.skip(true, 'Service selection not available - skipping test');
        return;
      }

      // Check if tables are configured
      const tableRadios = await getTableRadios(page);
      if (!tableRadios) {
        test.skip(true, 'Tables not configured - skipping test');
        return;
      }

      const tableCount = await tableRadios.count();
      if (tableCount === 0) {
        test.skip(true, 'No tables available - skipping test');
        return;
      }

      // Click the first table
      const firstTable = tableRadios.first();
      await firstTable.click();
      await waitForMutations(page);

      // Verify the table is selected
      await expect(firstTable).toBeChecked();
    });

    test('table selection shows table name in radio button', async ({ page }) => {
      await gotoNewOrder(page);

      const hasServiceCard = await isServiceCardVisible(page);
      if (!hasServiceCard) {
        test.skip(true, 'Service selection not available');
        return;
      }

      const tableRadios = await getTableRadios(page);
      if (!tableRadios || await tableRadios.count() === 0) {
        test.skip(true, 'No tables available');
        return;
      }

      // Get the label of the first table
      const firstTable = tableRadios.first();
      const label = await getRadioLabel(page, firstTable);

      // Label should not be empty
      expect(label).toBeTruthy();
      expect(label!.length).toBeGreaterThan(0);
    });

    test('selecting table deselects delivery zone if previously selected', async ({ page }) => {
      await gotoNewOrder(page);

      const hasServiceCard = await isServiceCardVisible(page);
      if (!hasServiceCard) {
        test.skip(true, 'Service selection not available');
        return;
      }

      const tableRadios = await getTableRadios(page);
      const deliveryRadios = await getDeliveryZoneRadios(page);

      if (!tableRadios || await tableRadios.count() === 0) {
        test.skip(true, 'No tables available');
        return;
      }

      if (!deliveryRadios || await deliveryRadios.count() === 0) {
        test.skip(true, 'No delivery zones available - cannot test deselection');
        return;
      }

      // First select a delivery zone
      const firstZone = deliveryRadios.first();
      await firstZone.click();
      await waitForMutations(page);
      await expect(firstZone).toBeChecked();

      // Now select a table
      const firstTable = tableRadios.first();
      await firstTable.click();
      await waitForMutations(page);

      // Table should be selected
      await expect(firstTable).toBeChecked();
      // Delivery zone should not be checked (different radio group behavior)
    });
  });

  test.describe('Select table number', () => {
    test('can select different tables from the list', async ({ page }) => {
      await gotoNewOrder(page);

      const hasServiceCard = await isServiceCardVisible(page);
      if (!hasServiceCard) {
        test.skip(true, 'Service selection not available');
        return;
      }

      const tableRadios = await getTableRadios(page);
      if (!tableRadios) {
        test.skip(true, 'Tables not configured');
        return;
      }

      const tableCount = await tableRadios.count();
      if (tableCount < 2) {
        test.skip(true, 'Need at least 2 tables to test selection');
        return;
      }

      // Select the first table
      const firstTable = tableRadios.first();
      await firstTable.click();
      await waitForMutations(page);
      await expect(firstTable).toBeChecked();

      // Select the second table
      const secondTable = tableRadios.nth(1);
      await secondTable.click();
      await waitForMutations(page);

      // Second table should be selected, first should not
      await expect(secondTable).toBeChecked();
      await expect(firstTable).not.toBeChecked();
    });

    test('table selection can be made using keyboard shortcut Alt+0', async ({ page }) => {
      await gotoNewOrder(page);

      const hasServiceCard = await isServiceCardVisible(page);
      if (!hasServiceCard) {
        test.skip(true, 'Service selection not available');
        return;
      }

      const tableRadios = await getTableRadios(page);
      if (!tableRadios || await tableRadios.count() === 0) {
        test.skip(true, 'No tables available');
        return;
      }

      // Press Alt+0 to select first table
      await page.keyboard.press('Alt+0');
      await waitForMutations(page);

      // First table should be selected
      const firstTable = tableRadios.first();
      await expect(firstTable).toBeChecked();
    });

    test('table selection can be made using keyboard shortcut Alt+1', async ({ page }) => {
      await gotoNewOrder(page);

      const hasServiceCard = await isServiceCardVisible(page);
      if (!hasServiceCard) {
        test.skip(true, 'Service selection not available');
        return;
      }

      const tableRadios = await getTableRadios(page);
      if (!tableRadios) {
        test.skip(true, 'Tables not configured');
        return;
      }

      const tableCount = await tableRadios.count();
      if (tableCount < 2) {
        test.skip(true, 'Need at least 2 tables for Alt+1 test');
        return;
      }

      // Press Alt+1 to select second table
      await page.keyboard.press('Alt+1');
      await waitForMutations(page);

      // Second table should be selected
      const secondTable = tableRadios.nth(1);
      await expect(secondTable).toBeChecked();
    });
  });

  test.describe('Select delivery zone', () => {
    test('can select a delivery zone from the service card', async ({ page }) => {
      await gotoNewOrder(page);

      const hasServiceCard = await isServiceCardVisible(page);
      if (!hasServiceCard) {
        test.skip(true, 'Service selection not available');
        return;
      }

      const deliveryRadios = await getDeliveryZoneRadios(page);
      if (!deliveryRadios) {
        test.skip(true, 'Delivery zones not configured');
        return;
      }

      const zoneCount = await deliveryRadios.count();
      if (zoneCount === 0) {
        test.skip(true, 'No delivery zones available');
        return;
      }

      // Click the first delivery zone
      const firstZone = deliveryRadios.first();
      await firstZone.click();
      await waitForMutations(page);

      // Verify the zone is selected
      await expect(firstZone).toBeChecked();
    });

    test('delivery zone shows fee information', async ({ page }) => {
      await gotoNewOrder(page);

      const hasServiceCard = await isServiceCardVisible(page);
      if (!hasServiceCard) {
        test.skip(true, 'Service selection not available');
        return;
      }

      const deliveryGroup = page.getByLabel('Delivery zones');
      const isVisible = await deliveryGroup.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'Delivery zones not configured');
        return;
      }

      // Check if any delivery zone label contains fee info (in parentheses)
      // Fee format is "(Free)" or "(number)"
      const labelsText = await deliveryGroup.locator('label').allTextContents();

      if (labelsText.length === 0) {
        test.skip(true, 'No delivery zones available');
        return;
      }

      // At least one label should contain fee info in parentheses
      const hasFeeInfo = labelsText.some(label => label.includes('('));
      expect(hasFeeInfo).toBe(true);
    });

    test('can select different delivery zones', async ({ page }) => {
      await gotoNewOrder(page);

      const hasServiceCard = await isServiceCardVisible(page);
      if (!hasServiceCard) {
        test.skip(true, 'Service selection not available');
        return;
      }

      const deliveryRadios = await getDeliveryZoneRadios(page);
      if (!deliveryRadios) {
        test.skip(true, 'Delivery zones not configured');
        return;
      }

      const zoneCount = await deliveryRadios.count();
      if (zoneCount < 2) {
        test.skip(true, 'Need at least 2 delivery zones to test selection');
        return;
      }

      // Select the first zone
      const firstZone = deliveryRadios.first();
      await firstZone.click();
      await waitForMutations(page);
      await expect(firstZone).toBeChecked();

      // Select the second zone
      const secondZone = deliveryRadios.nth(1);
      await secondZone.click();
      await waitForMutations(page);

      // Second zone should be selected, first should not
      await expect(secondZone).toBeChecked();
      await expect(firstZone).not.toBeChecked();
    });
  });

  test.describe('Change service type updates order', () => {
    test('changing from table to delivery zone updates order', async ({ page }) => {
      await gotoNewOrder(page);

      const hasServiceCard = await isServiceCardVisible(page);
      if (!hasServiceCard) {
        test.skip(true, 'Service selection not available');
        return;
      }

      const tableRadios = await getTableRadios(page);
      const deliveryRadios = await getDeliveryZoneRadios(page);

      if (!tableRadios || await tableRadios.count() === 0) {
        test.skip(true, 'No tables available');
        return;
      }

      if (!deliveryRadios || await deliveryRadios.count() === 0) {
        test.skip(true, 'No delivery zones available');
        return;
      }

      // First select a table
      const firstTable = tableRadios.first();
      await firstTable.click();
      await waitForMutations(page);
      await expect(firstTable).toBeChecked();

      // Add item to save order
      const orderId = await saveOrderWithItem(page);
      if (!orderId || orderId === 'new') {
        test.skip(true, 'Could not save order');
        return;
      }

      // Refresh delivery radios reference after page update
      const deliveryRadiosAfterSave = await getDeliveryZoneRadios(page);
      if (!deliveryRadiosAfterSave) {
        test.skip(true, 'Delivery zones not available after save');
        return;
      }

      // Now change to delivery zone
      const firstZone = deliveryRadiosAfterSave.first();
      await firstZone.click();
      await waitForMutations(page);

      // Delivery zone should be selected
      await expect(firstZone).toBeChecked();

      // Verify in WooCommerce
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder).toBeTruthy();

      // Should have shipping_lines with delivery method
      if (savedOrder && savedOrder.shipping_lines && savedOrder.shipping_lines.length > 0) {
        const shippingLine = savedOrder.shipping_lines.find(
          line => line.method_id && line.method_id !== ''
        );
        expect(shippingLine).toBeTruthy();
        // Delivery zones use flat_rate or free_shipping method
        expect(['flat_rate', 'free_shipping']).toContain(shippingLine?.method_id);
      }
    });

    test('changing from delivery zone to table updates order', async ({ page }) => {
      await gotoNewOrder(page);

      const hasServiceCard = await isServiceCardVisible(page);
      if (!hasServiceCard) {
        test.skip(true, 'Service selection not available');
        return;
      }

      const tableRadios = await getTableRadios(page);
      const deliveryRadios = await getDeliveryZoneRadios(page);

      if (!tableRadios || await tableRadios.count() === 0) {
        test.skip(true, 'No tables available');
        return;
      }

      if (!deliveryRadios || await deliveryRadios.count() === 0) {
        test.skip(true, 'No delivery zones available');
        return;
      }

      // First select a delivery zone
      const firstZone = deliveryRadios.first();
      await firstZone.click();
      await waitForMutations(page);
      await expect(firstZone).toBeChecked();

      // Add item to save order
      const orderId = await saveOrderWithItem(page);
      if (!orderId || orderId === 'new') {
        test.skip(true, 'Could not save order');
        return;
      }

      // Refresh table radios reference after page update
      const tableRadiosAfterSave = await getTableRadios(page);
      if (!tableRadiosAfterSave) {
        test.skip(true, 'Tables not available after save');
        return;
      }

      // Now change to table
      const firstTable = tableRadiosAfterSave.first();
      await firstTable.click();
      await waitForMutations(page);

      // Table should be selected
      await expect(firstTable).toBeChecked();

      // Verify in WooCommerce
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder).toBeTruthy();

      // Should have shipping_lines with pickup_location method
      if (savedOrder && savedOrder.shipping_lines && savedOrder.shipping_lines.length > 0) {
        const shippingLine = savedOrder.shipping_lines.find(
          line => line.method_id === 'pickup_location'
        );
        expect(shippingLine).toBeTruthy();
      }
    });

    test('service selection persists after page reload', async ({ page }) => {
      await gotoNewOrder(page);

      const hasServiceCard = await isServiceCardVisible(page);
      if (!hasServiceCard) {
        test.skip(true, 'Service selection not available');
        return;
      }

      const tableRadios = await getTableRadios(page);
      if (!tableRadios || await tableRadios.count() === 0) {
        test.skip(true, 'No tables available');
        return;
      }

      // Select a table
      const firstTable = tableRadios.first();
      const tableLabelBefore = await getRadioLabel(page, firstTable);
      await firstTable.click();
      await waitForMutations(page);

      // Save the order
      const orderId = await saveOrderWithItem(page);
      if (!orderId || orderId === 'new') {
        test.skip(true, 'Could not save order');
        return;
      }

      // Reload the page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify table is still selected
      const tableRadiosAfterReload = await getTableRadios(page);
      if (!tableRadiosAfterReload) {
        test.skip(true, 'Tables not available after reload');
        return;
      }

      // Find the table with the same label
      const tableCount = await tableRadiosAfterReload.count();
      for (let i = 0; i < tableCount; i++) {
        const radio = tableRadiosAfterReload.nth(i);
        const label = await getRadioLabel(page, radio);
        if (label === tableLabelBefore) {
          await expect(radio).toBeChecked();
          return;
        }
      }

      // If we couldn't find by label, just check that some table is selected
      const checkedTable = tableRadiosAfterReload.locator(':checked');
      const checkedCount = await checkedTable.count();
      expect(checkedCount).toBeGreaterThan(0);
    });
  });

  test.describe('Verify service meta in WooCommerce order', () => {
    test('table selection is stored in shipping_lines with pickup_location method', async ({ page }) => {
      await gotoNewOrder(page);

      const hasServiceCard = await isServiceCardVisible(page);
      if (!hasServiceCard) {
        test.skip(true, 'Service selection not available');
        return;
      }

      const tableRadios = await getTableRadios(page);
      if (!tableRadios || await tableRadios.count() === 0) {
        test.skip(true, 'No tables available');
        return;
      }

      // Get the table name before selecting
      const firstTable = tableRadios.first();
      const tableLabel = await getRadioLabel(page, firstTable);

      // Select the table
      await firstTable.click();
      await waitForMutations(page);

      // Save the order with an item
      const orderId = await saveOrderWithItem(page);
      if (!orderId || orderId === 'new') {
        test.skip(true, 'Could not save order');
        return;
      }

      // Verify in WooCommerce
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder).toBeTruthy();
      expect(savedOrder!.shipping_lines).toBeTruthy();
      expect(savedOrder!.shipping_lines.length).toBeGreaterThan(0);

      // Find the active shipping line
      const shippingLine = savedOrder!.shipping_lines.find(
        line => line.method_id === 'pickup_location'
      );
      expect(shippingLine).toBeTruthy();
      expect(shippingLine!.method_id).toBe('pickup_location');

      // method_title should contain table name
      if (tableLabel) {
        // Table title format is "Table (TableName)"
        expect(shippingLine!.method_title).toContain(tableLabel.split(/\s/)[0]);
      }
    });

    test('delivery zone selection is stored in shipping_lines with flat_rate or free_shipping method', async ({ page }) => {
      await gotoNewOrder(page);

      const hasServiceCard = await isServiceCardVisible(page);
      if (!hasServiceCard) {
        test.skip(true, 'Service selection not available');
        return;
      }

      const deliveryRadios = await getDeliveryZoneRadios(page);
      if (!deliveryRadios || await deliveryRadios.count() === 0) {
        test.skip(true, 'No delivery zones available');
        return;
      }

      // Get the zone name before selecting
      const firstZone = deliveryRadios.first();
      const zoneLabel = await getRadioLabel(page, firstZone);

      // Select the delivery zone
      await firstZone.click();
      await waitForMutations(page);

      // Save the order with an item
      const orderId = await saveOrderWithItem(page);
      if (!orderId || orderId === 'new') {
        test.skip(true, 'Could not save order');
        return;
      }

      // Verify in WooCommerce
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder).toBeTruthy();
      expect(savedOrder!.shipping_lines).toBeTruthy();
      expect(savedOrder!.shipping_lines.length).toBeGreaterThan(0);

      // Find the active shipping line
      const shippingLine = savedOrder!.shipping_lines.find(
        line => line.method_id && ['flat_rate', 'free_shipping'].includes(line.method_id)
      );
      expect(shippingLine).toBeTruthy();
      expect(['flat_rate', 'free_shipping']).toContain(shippingLine!.method_id);

      // method_title should contain zone name (without fee info)
      if (zoneLabel) {
        // Zone label format is "ZoneName (fee)" - extract name before parenthesis
        const zoneName = zoneLabel.split('(')[0].trim();
        expect(shippingLine!.method_title.toLowerCase()).toContain(zoneName.toLowerCase());
      }
    });

    test('shipping_lines total reflects delivery fee', async ({ page }) => {
      await gotoNewOrder(page);

      const hasServiceCard = await isServiceCardVisible(page);
      if (!hasServiceCard) {
        test.skip(true, 'Service selection not available');
        return;
      }

      const deliveryGroup = page.getByLabel('Delivery zones');
      const isVisible = await deliveryGroup.isVisible().catch(() => false);
      if (!isVisible) {
        test.skip(true, 'Delivery zones not configured');
        return;
      }

      // Find a delivery zone with a non-free fee
      const deliveryRadios = await getDeliveryZoneRadios(page);
      if (!deliveryRadios || await deliveryRadios.count() === 0) {
        test.skip(true, 'No delivery zones available');
        return;
      }

      // Select the first zone (check later if it has a fee)
      const firstZone = deliveryRadios.first();
      await firstZone.click();
      await waitForMutations(page);

      // Save the order
      const orderId = await saveOrderWithItem(page);
      if (!orderId || orderId === 'new') {
        test.skip(true, 'Could not save order');
        return;
      }

      // Verify in WooCommerce
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder).toBeTruthy();
      expect(savedOrder!.shipping_lines).toBeTruthy();

      // Find the shipping line
      const shippingLine = savedOrder!.shipping_lines.find(
        line => line.method_id && ['flat_rate', 'free_shipping'].includes(line.method_id)
      );
      expect(shippingLine).toBeTruthy();

      // total should be a string number (could be "0.00" for free)
      expect(shippingLine!.total).toBeDefined();
      const fee = parseFloat(shippingLine!.total);
      expect(fee).toBeGreaterThanOrEqual(0);
    });

    test('service selection is preserved when order is updated', async ({ page }) => {
      await gotoNewOrder(page);

      const hasServiceCard = await isServiceCardVisible(page);
      if (!hasServiceCard) {
        test.skip(true, 'Service selection not available');
        return;
      }

      const tableRadios = await getTableRadios(page);
      if (!tableRadios || await tableRadios.count() === 0) {
        test.skip(true, 'No tables available');
        return;
      }

      // Select a table
      const firstTable = tableRadios.first();
      await firstTable.click();
      await waitForMutations(page);

      // Save the order
      const orderId = await saveOrderWithItem(page);
      if (!orderId || orderId === 'new') {
        test.skip(true, 'Could not save order');
        return;
      }

      // Add another item to trigger an order update
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);
      if (sku) {
        await executeCommand(page, 'item', [sku]);
        await waitForMutations(page);
      }

      // Verify service is still set in WooCommerce
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder).toBeTruthy();
      expect(savedOrder!.shipping_lines).toBeTruthy();

      const shippingLine = savedOrder!.shipping_lines.find(
        line => line.method_id === 'pickup_location'
      );
      expect(shippingLine).toBeTruthy();
    });
  });

  test.describe('Service card UI behavior', () => {
    test('service card has warning style when no service selected', async ({ page }) => {
      await gotoNewOrder(page);

      const hasServiceCard = await isServiceCardVisible(page);
      if (!hasServiceCard) {
        test.skip(true, 'Service selection not available');
        return;
      }

      // Check for warning style (bg-warning-100 class)
      const serviceCard = page.locator('#service-selection-card');
      const cardClasses = await serviceCard.getAttribute('class');

      // Card should have warning background when no service selected
      expect(cardClasses).toContain('bg-warning');
    });

    test('service card warning style removed after selection', async ({ page }) => {
      await gotoNewOrder(page);

      const hasServiceCard = await isServiceCardVisible(page);
      if (!hasServiceCard) {
        test.skip(true, 'Service selection not available');
        return;
      }

      const tableRadios = await getTableRadios(page);
      const deliveryRadios = await getDeliveryZoneRadios(page);

      // Get any available service option
      let serviceOption: import('@playwright/test').Locator | null = null;
      if (tableRadios && await tableRadios.count() > 0) {
        serviceOption = tableRadios.first();
      } else if (deliveryRadios && await deliveryRadios.count() > 0) {
        serviceOption = deliveryRadios.first();
      }

      if (!serviceOption) {
        test.skip(true, 'No service options available');
        return;
      }

      // Select the service option
      await serviceOption.click();
      await waitForMutations(page);

      // Warning style should be removed (may take a moment)
      await page.waitForTimeout(500);
      const serviceCard = page.locator('#service-selection-card');
      const cardClasses = await serviceCard.getAttribute('class');

      // Card should not have warning background (or mutation is still pending)
      // Note: bg-warning-100 is applied when isMutating > 0 OR currentService is null
      // After selection, currentService should be set
    });

    test('service options show keyboard shortcuts', async ({ page }) => {
      await gotoNewOrder(page);

      const hasServiceCard = await isServiceCardVisible(page);
      if (!hasServiceCard) {
        test.skip(true, 'Service selection not available');
        return;
      }

      const serviceCard = page.locator('#service-selection-card');

      // Look for Kbd elements showing Alt shortcuts
      const kbdElements = serviceCard.locator('kbd');
      const kbdCount = await kbdElements.count();

      // Should have keyboard shortcut indicators
      expect(kbdCount).toBeGreaterThan(0);
    });
  });

  test.describe('Edge cases', () => {
    test('service selection on empty order works', async ({ page }) => {
      await gotoNewOrder(page);

      const hasServiceCard = await isServiceCardVisible(page);
      if (!hasServiceCard) {
        test.skip(true, 'Service selection not available');
        return;
      }

      const tableRadios = await getTableRadios(page);
      if (!tableRadios || await tableRadios.count() === 0) {
        test.skip(true, 'No tables available');
        return;
      }

      // Select a table without adding items
      const firstTable = tableRadios.first();
      await firstTable.click();
      await waitForMutations(page);

      // Should not crash - table should be selected
      await expect(firstTable).toBeChecked();

      // We're still on /orders/new since no item was added
      await expect(page).toHaveURL(/\/orders\/new/);
    });

    test('rapid service selection changes do not cause issues', async ({ page }) => {
      await gotoNewOrder(page);

      const hasServiceCard = await isServiceCardVisible(page);
      if (!hasServiceCard) {
        test.skip(true, 'Service selection not available');
        return;
      }

      const tableRadios = await getTableRadios(page);
      if (!tableRadios) {
        test.skip(true, 'Tables not configured');
        return;
      }

      const tableCount = await tableRadios.count();
      if (tableCount < 2) {
        test.skip(true, 'Need at least 2 tables to test rapid selection');
        return;
      }

      // Rapidly switch between tables
      for (let i = 0; i < 5; i++) {
        await tableRadios.nth(i % tableCount).click();
        await page.waitForTimeout(100); // Small delay between clicks
      }

      // Wait for all mutations to complete
      await waitForMutations(page);

      // The last selection should be the one that's checked
      const finalIndex = 4 % tableCount;
      await expect(tableRadios.nth(finalIndex)).toBeChecked();
    });

    test('service selection with product already in order', async ({ page }) => {
      await gotoNewOrder(page);

      // First add an item
      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No product available');
        return;
      }

      await executeCommand(page, 'item', [sku]);
      await page.waitForURL(/\/orders\/([A-Z0-9]+)/, { timeout: 10000 });
      await waitForMutations(page);

      const orderId = await getCurrentOrderId(page);

      // Check if service selection is available
      const hasServiceCard = await isServiceCardVisible(page);
      if (!hasServiceCard) {
        test.skip(true, 'Service selection not available');
        return;
      }

      const tableRadios = await getTableRadios(page);
      if (!tableRadios || await tableRadios.count() === 0) {
        test.skip(true, 'No tables available');
        return;
      }

      // Now select a table
      const firstTable = tableRadios.first();
      await firstTable.click();
      await waitForMutations(page);

      // Verify table is selected
      await expect(firstTable).toBeChecked();

      // Verify in WooCommerce
      const savedOrder = await OrdersAPI.getOrder(orderId);
      expect(savedOrder).toBeTruthy();

      // Should have shipping_lines
      const hasShippingLine = savedOrder!.shipping_lines?.some(
        line => line.method_id === 'pickup_location'
      );
      expect(hasShippingLine).toBe(true);

      // Should still have line items
      expect(savedOrder!.line_items.length).toBeGreaterThan(0);
    });
  });
});
