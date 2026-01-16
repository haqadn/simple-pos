/**
 * Command Input Helpers
 *
 * Standalone utilities for command-related operations in E2E tests.
 * These helpers can be used independently or alongside POSPage methods.
 */

import { Page, Locator, expect } from '@playwright/test';

/**
 * Command execution result
 */
export interface CommandResult {
  success: boolean;
  message?: string;
}

/**
 * Command bar selectors
 */
export const COMMAND_BAR_SELECTORS = {
  input: 'input[aria-label="Command input field"]',
  prompt: '.font-mono.text-gray-500',
  autocompleteDropdown: '.absolute.top-full',
  autocompleteSuggestion: 'div[class*="cursor-pointer"]',
} as const;

/**
 * Get the command input locator
 */
export function getCommandInput(page: Page): Locator {
  return page.locator(COMMAND_BAR_SELECTORS.input);
}

/**
 * Get the autocomplete dropdown locator
 */
export function getAutocompleteDropdown(page: Page): Locator {
  return page.locator(COMMAND_BAR_SELECTORS.autocompleteDropdown);
}

/**
 * Get autocomplete suggestion locators
 */
export function getAutocompleteSuggestions(page: Page): Locator {
  return getAutocompleteDropdown(page).locator(COMMAND_BAR_SELECTORS.autocompleteSuggestion);
}

/**
 * Execute a command with optional arguments
 *
 * @param page - Playwright page object
 * @param command - Command name (without leading /)
 * @param args - Optional arguments to pass to the command
 * @param options - Execution options
 *
 * @example
 * await executeCommand(page, 'item', ['SKU123', '5']);
 * await executeCommand(page, 'pay', ['50.00']);
 * await executeCommand(page, 'done');
 */
export async function executeCommand(
  page: Page,
  command: string,
  args: string[] = [],
  options: { waitForNetwork?: boolean } = {}
): Promise<void> {
  const input = getCommandInput(page);

  // Focus the command bar
  await input.click();
  await expect(input).toBeFocused();

  // Build the full command string
  const commandPrefix = command.startsWith('/') ? '' : '/';
  const fullCommand = args.length > 0
    ? `${commandPrefix}${command} ${args.join(' ')}`
    : `${commandPrefix}${command}`;

  // Type and execute the command
  await input.fill(fullCommand);
  await input.press('Enter');

  // Wait for optimistic updates
  await page.waitForTimeout(100);

  // Optionally wait for network activity to complete
  if (options.waitForNetwork) {
    await page.waitForLoadState('networkidle');
  }
}

/**
 * Execute a command and wait for network to settle
 *
 * Convenience wrapper around executeCommand with waitForNetwork enabled.
 */
export async function executeCommandAndWait(
  page: Page,
  command: string,
  args: string[] = []
): Promise<void> {
  await executeCommand(page, command, args, { waitForNetwork: true });
}

/**
 * Type a command without executing (for testing autocomplete)
 *
 * @param page - Playwright page object
 * @param partialCommand - Partial command to type
 */
export async function typePartialCommand(
  page: Page,
  partialCommand: string
): Promise<void> {
  const input = getCommandInput(page);
  await input.click();
  await expect(input).toBeFocused();
  await input.fill(partialCommand);
}

/**
 * Clear the command input
 */
export async function clearCommandInput(page: Page): Promise<void> {
  const input = getCommandInput(page);
  await input.click();
  await input.fill('');
}

/**
 * Press Escape in the command bar
 */
export async function escapeCommandBar(page: Page): Promise<void> {
  const input = getCommandInput(page);
  await input.click();
  await input.press('Escape');
}

/**
 * Get the current prompt text (e.g., ">", "item>")
 */
export async function getPromptText(page: Page): Promise<string> {
  const promptElement = page.locator(COMMAND_BAR_SELECTORS.input)
    .locator('..')
    .locator(COMMAND_BAR_SELECTORS.prompt);
  return await promptElement.textContent() || '>';
}

/**
 * Enter multi-input mode for a command
 *
 * @param page - Playwright page object
 * @param command - Command that supports multi-input mode (default: 'item')
 *
 * @example
 * await enterMultiInputMode(page, 'item');
 * // Now type entries without command prefix
 * await executeMultiModeEntry(page, 'SKU123');
 * await executeMultiModeEntry(page, 'SKU456 2');
 * await exitMultiInputMode(page);
 */
export async function enterMultiInputMode(
  page: Page,
  command: string = 'item'
): Promise<void> {
  // Execute command with no arguments to enter multi-input mode
  await executeCommand(page, command);

  // Verify we're in multi-input mode
  const prompt = await getPromptText(page);
  if (!prompt.includes(`${command}>`)) {
    throw new Error(`Failed to enter multi-input mode for ${command}. Current prompt: ${prompt}`);
  }
}

/**
 * Exit multi-input mode by typing /
 */
export async function exitMultiInputMode(page: Page): Promise<void> {
  const input = getCommandInput(page);
  await input.click();
  await input.fill('/');
  await input.press('Enter');

  // Wait for mode to exit
  await page.waitForTimeout(100);

  // Verify we exited
  const isMulti = await isInMultiInputMode(page);
  if (isMulti) {
    throw new Error('Failed to exit multi-input mode');
  }
}

/**
 * Check if currently in multi-input mode
 */
export async function isInMultiInputMode(page: Page): Promise<boolean> {
  const prompt = await getPromptText(page);
  // Multi-input mode has prompts like "item>", not just ">"
  return prompt.includes('>') && prompt !== '>' && prompt.trim() !== '>';
}

/**
 * Execute an entry in multi-input mode
 *
 * In multi-input mode, entries don't need the command prefix.
 *
 * @example
 * await enterMultiInputMode(page, 'item');
 * await executeMultiModeEntry(page, 'SKU123');     // Adds item with qty 1
 * await executeMultiModeEntry(page, 'SKU456 3');   // Adds item with qty 3
 */
export async function executeMultiModeEntry(
  page: Page,
  entry: string,
  options: { waitForNetwork?: boolean } = {}
): Promise<void> {
  const input = getCommandInput(page);
  await input.click();
  await input.fill(entry);
  await input.press('Enter');

  await page.waitForTimeout(100);

  if (options.waitForNetwork) {
    await page.waitForLoadState('networkidle');
  }
}

/**
 * Wait for autocomplete suggestions to appear
 */
export async function waitForAutocomplete(
  page: Page,
  timeout: number = 5000
): Promise<void> {
  const dropdown = getAutocompleteDropdown(page);
  await expect(dropdown).toBeVisible({ timeout });
}

/**
 * Get all autocomplete suggestion texts
 */
export async function getAutocompleteSuggestionTexts(page: Page): Promise<string[]> {
  await waitForAutocomplete(page);
  const suggestions = getAutocompleteSuggestions(page);
  return await suggestions.allTextContents();
}

/**
 * Select an autocomplete suggestion by index
 */
export async function selectAutocompleteSuggestionByIndex(
  page: Page,
  index: number
): Promise<void> {
  await waitForAutocomplete(page);
  const suggestions = getAutocompleteSuggestions(page);
  await suggestions.nth(index).click();
}

/**
 * Select autocomplete by pressing Tab (accepts first suggestion)
 */
export async function acceptAutocompleteSuggestion(page: Page): Promise<void> {
  const input = getCommandInput(page);
  await input.press('Tab');
}

/**
 * Navigate autocomplete suggestions with arrow keys
 */
export async function navigateAutocomplete(
  page: Page,
  direction: 'up' | 'down',
  times: number = 1
): Promise<void> {
  const input = getCommandInput(page);
  const key = direction === 'up' ? 'ArrowUp' : 'ArrowDown';
  for (let i = 0; i < times; i++) {
    await input.press(key);
  }
}

/**
 * Build a command string from name and arguments
 *
 * @example
 * buildCommandString('item', ['SKU123', '5']); // Returns '/item SKU123 5'
 */
export function buildCommandString(command: string, args: string[] = []): string {
  const prefix = command.startsWith('/') ? '' : '/';
  return args.length > 0
    ? `${prefix}${command} ${args.join(' ')}`
    : `${prefix}${command}`;
}

/**
 * Parse a command string into command name and arguments
 *
 * @example
 * parseCommandString('/item SKU123 5'); // Returns { command: 'item', args: ['SKU123', '5'] }
 */
export function parseCommandString(input: string): { command: string; args: string[] } {
  const trimmed = input.trim();
  const withoutSlash = trimmed.startsWith('/') ? trimmed.substring(1) : trimmed;
  const parts = withoutSlash.split(/\s+/);
  return {
    command: parts[0] || '',
    args: parts.slice(1),
  };
}

/**
 * Shorthand command helpers for common operations
 */
export const CommandShortcuts = {
  /**
   * Add item by SKU
   */
  async addItem(page: Page, sku: string, quantity?: number): Promise<void> {
    const args = quantity !== undefined ? [sku, quantity.toString()] : [sku];
    await executeCommandAndWait(page, 'item', args);
  },

  /**
   * Remove item by setting quantity to 0
   */
  async removeItem(page: Page, sku: string): Promise<void> {
    await executeCommandAndWait(page, 'item', [sku, '0']);
  },

  /**
   * Record payment amount
   */
  async recordPayment(page: Page, amount: number): Promise<void> {
    await executeCommandAndWait(page, 'pay', [amount.toString()]);
  },

  /**
   * Complete the order
   */
  async completeOrder(page: Page): Promise<void> {
    await executeCommandAndWait(page, 'done');
  },

  /**
   * Clear all items from order
   */
  async clearOrder(page: Page): Promise<void> {
    await executeCommandAndWait(page, 'clear');
  },

  /**
   * Apply a coupon code
   */
  async applyCoupon(page: Page, code: string): Promise<void> {
    await executeCommandAndWait(page, 'coupon', [code]);
  },

  /**
   * Trigger print action
   * @param type - 'bill' for customer receipt or 'kot' for kitchen order ticket
   */
  async print(page: Page, type: 'bill' | 'kot'): Promise<void> {
    await executeCommand(page, 'print', [type]);
  },
} as const;
