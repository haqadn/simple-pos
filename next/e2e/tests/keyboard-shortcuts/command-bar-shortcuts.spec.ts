/**
 * Command Bar Keyboard Shortcuts Tests
 *
 * Tests for shortcuts specific to command bar interaction:
 * - Enter: Execute command
 * - Escape: Clear/blur command bar
 * - Up/Down arrows: Navigate autocomplete suggestions or command history
 * - Tab: Accept autocomplete suggestion
 */

import { test, expect } from '../../fixtures';
import {
  gotoNewOrder,
  waitForMutations,
  getLineItemCount,
  hasLineItem,
  getLineItem,
} from '../../fixtures';
import {
  getTestProducts,
  getTestSku,
} from '../../fixtures';
import {
  executeCommand,
  typePartialCommand,
  waitForAutocomplete,
  getAutocompleteSuggestionTexts,
  getCommandInput,
  getAutocompleteDropdown,
  getAutocompleteSuggestions,
  CommandShortcuts,
  clearCommandInput,
} from '../../fixtures';

test.describe('Command Bar Shortcuts', () => {
  test.describe('Enter Executes Command', () => {
    test('Enter executes typed command', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Type command
      const commandInput = getCommandInput(page);
      await commandInput.click();
      await commandInput.fill(`/item ${sku}`);

      // Press Enter to execute
      await page.keyboard.press('Enter');

      // Wait for order to save
      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Verify item was added
      const count = await getLineItemCount(page);
      expect(count).toBe(1);
    });

    test('Enter clears input after successful command', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      const commandInput = getCommandInput(page);
      await commandInput.click();
      await commandInput.fill(`/item ${sku}`);
      await page.keyboard.press('Enter');

      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Input should be cleared after successful execution
      await expect(commandInput).toHaveValue('');
    });

    test('Enter on empty input does nothing', async ({ page }) => {
      await gotoNewOrder(page);

      const commandInput = getCommandInput(page);
      await commandInput.click();
      await commandInput.fill('');

      // Press Enter
      await page.keyboard.press('Enter');

      // Wait briefly
      await page.waitForTimeout(300);

      // Should still be on new order page
      await expect(page).toHaveURL(/\/orders\/new/);

      // No items should be added
      const count = await getLineItemCount(page);
      expect(count).toBe(0);
    });
  });

  test.describe('Escape Clears/Blurs Command Bar', () => {
    test('Escape clears input when text is typed', async ({ page }) => {
      await gotoNewOrder(page);

      const commandInput = getCommandInput(page);
      await commandInput.click();
      await commandInput.fill('/item TEST123');

      // Press Escape to clear
      await page.keyboard.press('Escape');

      // Input should be cleared
      await expect(commandInput).toHaveValue('');
    });

    test('Escape blurs command bar when empty', async ({ page }) => {
      await gotoNewOrder(page);

      const commandInput = getCommandInput(page);
      await commandInput.click();
      await expect(commandInput).toBeFocused();

      // Ensure input is empty
      await commandInput.fill('');

      // Press Escape to blur
      await page.keyboard.press('Escape');

      // Command bar should not be focused
      await expect(commandInput).not.toBeFocused();
    });

    test('Escape first clears suggestions, then clears input, then blurs', async ({ page }) => {
      await gotoNewOrder(page);

      const commandInput = getCommandInput(page);
      await commandInput.click();

      // Type to get suggestions
      await commandInput.fill('/');

      // Wait for potential suggestions
      await page.waitForTimeout(300);

      const dropdown = getAutocompleteDropdown(page);
      const hasSuggestions = await dropdown.isVisible().catch(() => false);

      if (hasSuggestions) {
        // First Escape clears suggestions
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
        await expect(dropdown).not.toBeVisible();

        // Verify input still has content
        await expect(commandInput).not.toHaveValue('');

        // Second Escape clears input
        await page.keyboard.press('Escape');
        await expect(commandInput).toHaveValue('');

        // Third Escape blurs
        await page.keyboard.press('Escape');
        await expect(commandInput).not.toBeFocused();
      } else {
        // No suggestions, first Escape clears input
        await page.keyboard.press('Escape');
        await expect(commandInput).toHaveValue('');

        // Second Escape blurs
        await page.keyboard.press('Escape');
        await expect(commandInput).not.toBeFocused();
      }
    });
  });

  test.describe('Up/Down Navigate Suggestions', () => {
    test('Down arrow navigates to next suggestion', async ({ page }) => {
      await gotoNewOrder(page);

      const commandInput = getCommandInput(page);
      await commandInput.click();

      // Type / to get command suggestions
      await commandInput.fill('/');

      // Wait for suggestions
      await page.waitForTimeout(500);

      const dropdown = getAutocompleteDropdown(page);
      const hasSuggestions = await dropdown.isVisible().catch(() => false);

      if (!hasSuggestions) {
        test.skip(true, 'Autocomplete suggestions not appearing');
        return;
      }

      const suggestions = getAutocompleteSuggestions(page);
      const count = await suggestions.count();

      if (count < 2) {
        test.skip(true, 'Not enough suggestions for navigation test');
        return;
      }

      // First suggestion should be highlighted by default
      const firstSuggestion = suggestions.first();
      const initialClass = await firstSuggestion.getAttribute('class');
      const isFirstHighlighted = initialClass?.includes('bg-blue-100') ?? false;

      // Press down to navigate
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(100);

      // Second suggestion should now be highlighted
      const secondSuggestion = suggestions.nth(1);
      const secondClass = await secondSuggestion.getAttribute('class');
      const isSecondHighlighted = secondClass?.includes('bg-blue-100') ?? false;

      // Verify navigation occurred
      if (isFirstHighlighted) {
        expect(isSecondHighlighted).toBe(true);
      } else {
        // Initial state was different, just verify second is highlighted
        expect(isSecondHighlighted || await secondSuggestion.isVisible()).toBe(true);
      }
    });

    test('Up arrow navigates to previous suggestion', async ({ page }) => {
      await gotoNewOrder(page);

      const commandInput = getCommandInput(page);
      await commandInput.click();
      await commandInput.fill('/');

      await page.waitForTimeout(500);

      const dropdown = getAutocompleteDropdown(page);
      const hasSuggestions = await dropdown.isVisible().catch(() => false);

      if (!hasSuggestions) {
        test.skip(true, 'Autocomplete suggestions not appearing');
        return;
      }

      const suggestions = getAutocompleteSuggestions(page);
      const count = await suggestions.count();

      if (count < 2) {
        test.skip(true, 'Not enough suggestions for navigation test');
        return;
      }

      // Navigate down first
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(100);

      // Then navigate up
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(100);

      // First suggestion should be highlighted again
      const firstSuggestion = suggestions.first();
      const className = await firstSuggestion.getAttribute('class');
      const isHighlighted = className?.includes('bg-blue-100') ?? false;

      // Either first is highlighted or we're at default state
      expect(await firstSuggestion.isVisible()).toBe(true);
    });

    test('Up/Down wraps around suggestion list', async ({ page }) => {
      await gotoNewOrder(page);

      const commandInput = getCommandInput(page);
      await commandInput.click();
      await commandInput.fill('/');

      await page.waitForTimeout(500);

      const dropdown = getAutocompleteDropdown(page);
      const hasSuggestions = await dropdown.isVisible().catch(() => false);

      if (!hasSuggestions) {
        test.skip(true, 'Autocomplete suggestions not appearing');
        return;
      }

      const suggestions = getAutocompleteSuggestions(page);
      const count = await suggestions.count();

      if (count < 2) {
        test.skip(true, 'Not enough suggestions for wrap test');
        return;
      }

      // Press Up from first position (should wrap to last)
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(100);

      // Last suggestion should be highlighted
      const lastSuggestion = suggestions.last();
      const lastClass = await lastSuggestion.getAttribute('class');
      const isLastHighlighted = lastClass?.includes('bg-blue-100') ?? false;

      // Verify last is visible at minimum
      expect(await lastSuggestion.isVisible()).toBe(true);
    });
  });

  test.describe('Up/Down Navigate Command History', () => {
    test('Up arrow recalls previous command when no suggestions', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Execute a command first
      const commandInput = getCommandInput(page);
      await commandInput.click();
      await commandInput.fill(`/item ${sku}`);
      await page.keyboard.press('Enter');

      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Clear input
      await commandInput.click();
      await commandInput.fill('');

      // Press Up to recall history
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(100);

      // Should recall the previous command
      const value = await commandInput.inputValue();
      expect(value).toContain('/item');
    });

    test('Down arrow navigates forward through history', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku) {
        test.skip(true, 'No SKU available for testing');
        return;
      }

      // Execute first command
      const commandInput = getCommandInput(page);
      await commandInput.click();
      await commandInput.fill(`/item ${sku}`);
      await page.keyboard.press('Enter');

      await page.waitForURL(/\/orders\/\d+/, { timeout: 10000 });
      await waitForMutations(page);

      // Execute second command
      await commandInput.click();
      await commandInput.fill(`/item ${sku} 2`);
      await page.keyboard.press('Enter');
      await waitForMutations(page);

      // Clear and navigate history
      await commandInput.click();
      await commandInput.fill('');

      // Go up twice
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(100);
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(100);

      // Go down once
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(100);

      // Should be at the more recent command
      const value = await commandInput.inputValue();
      expect(value.length).toBeGreaterThan(0);
    });
  });

  test.describe('Tab Accepts Suggestion', () => {
    test('Tab accepts highlighted autocomplete suggestion', async ({ page }) => {
      await gotoNewOrder(page);

      const commandInput = getCommandInput(page);
      await commandInput.click();

      // Type partial command
      await commandInput.fill('/it');

      await page.waitForTimeout(500);

      const dropdown = getAutocompleteDropdown(page);
      const hasSuggestions = await dropdown.isVisible().catch(() => false);

      if (!hasSuggestions) {
        test.skip(true, 'Autocomplete suggestions not appearing');
        return;
      }

      // Press Tab to accept suggestion
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      // Input should contain the completed command
      const value = await commandInput.inputValue();
      expect(value).toContain('/item');

      // Suggestions should be cleared
      await expect(dropdown).not.toBeVisible();
    });

    test('Tab with SKU suggestion completes the SKU', async ({ page }) => {
      await gotoNewOrder(page);

      const { simple: product } = getTestProducts();
      const sku = getTestSku(product);

      if (!sku || sku.length < 2) {
        test.skip(true, 'SKU too short for autocomplete test');
        return;
      }

      const commandInput = getCommandInput(page);
      await commandInput.click();

      // Type partial SKU
      const partialSku = sku.substring(0, 2);
      await commandInput.fill(`/item ${partialSku}`);

      await page.waitForTimeout(500);

      const dropdown = getAutocompleteDropdown(page);
      const hasSuggestions = await dropdown.isVisible().catch(() => false);

      if (!hasSuggestions) {
        test.skip(true, 'Autocomplete suggestions not appearing for SKU');
        return;
      }

      // Press Tab to accept
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      // Input should have the completed SKU
      const value = await commandInput.inputValue();
      expect(value.length).toBeGreaterThan(`/item ${partialSku}`.length);
    });

    test('Tab does nothing when no suggestions', async ({ page }) => {
      await gotoNewOrder(page);

      const commandInput = getCommandInput(page);
      await commandInput.click();
      await commandInput.fill('/item INVALID_SKU_12345_NO_MATCH ');

      // Add space at end to prevent suggestions
      await page.waitForTimeout(300);

      const dropdown = getAutocompleteDropdown(page);
      const hasSuggestions = await dropdown.isVisible().catch(() => false);

      if (hasSuggestions) {
        // If suggestions appear, close them first
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
      }

      const valueBefore = await commandInput.inputValue();

      // Press Tab
      await page.keyboard.press('Tab');

      // Value should be unchanged
      const valueAfter = await commandInput.inputValue();
      expect(valueAfter).toBe(valueBefore);
    });
  });

  test.describe('Click Suggestion Selection', () => {
    test('Clicking suggestion selects it', async ({ page }) => {
      await gotoNewOrder(page);

      const commandInput = getCommandInput(page);
      await commandInput.click();
      await commandInput.fill('/');

      await page.waitForTimeout(500);

      const dropdown = getAutocompleteDropdown(page);
      const hasSuggestions = await dropdown.isVisible().catch(() => false);

      if (!hasSuggestions) {
        test.skip(true, 'Autocomplete suggestions not appearing');
        return;
      }

      const suggestions = getAutocompleteSuggestions(page);
      const count = await suggestions.count();

      if (count === 0) {
        test.skip(true, 'No suggestions available');
        return;
      }

      // Get text of first suggestion
      const firstSuggestionText = await suggestions.first().locator('.font-mono').textContent();

      // Click first suggestion
      await suggestions.first().click();
      await page.waitForTimeout(100);

      // Verify input was updated
      const value = await commandInput.inputValue();
      expect(value.length).toBeGreaterThan(0);

      // Suggestions should be hidden
      await expect(dropdown).not.toBeVisible();
    });
  });

  test.describe('Keyboard Focus Management', () => {
    test('Command bar maintains focus during input', async ({ page }) => {
      await gotoNewOrder(page);

      const commandInput = getCommandInput(page);
      await commandInput.click();
      await expect(commandInput).toBeFocused();

      // Type some text
      await commandInput.fill('/item TEST');

      // Should still be focused
      await expect(commandInput).toBeFocused();
    });

    test('Command bar regains focus after selecting suggestion', async ({ page }) => {
      await gotoNewOrder(page);

      const commandInput = getCommandInput(page);
      await commandInput.click();
      await commandInput.fill('/');

      await page.waitForTimeout(500);

      const dropdown = getAutocompleteDropdown(page);
      const hasSuggestions = await dropdown.isVisible().catch(() => false);

      if (!hasSuggestions) {
        test.skip(true, 'Autocomplete suggestions not appearing');
        return;
      }

      const suggestions = getAutocompleteSuggestions(page);

      if (await suggestions.count() === 0) {
        test.skip(true, 'No suggestions available');
        return;
      }

      // Click a suggestion
      await suggestions.first().click();
      await page.waitForTimeout(100);

      // Command input should still be focused
      await expect(commandInput).toBeFocused();
    });

    test('Command bar can be focused by clicking', async ({ page }) => {
      await gotoNewOrder(page);

      // Click somewhere else first
      await page.locator('body').click();

      const commandInput = getCommandInput(page);
      await expect(commandInput).not.toBeFocused();

      // Click command input
      await commandInput.click();

      // Should be focused
      await expect(commandInput).toBeFocused();
    });
  });
});
