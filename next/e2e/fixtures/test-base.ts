import { test as base, expect, Page, Locator } from '@playwright/test';

/**
 * POSPage - Page Object Model for Simple POS application
 *
 * Provides helper methods for common POS operations:
 * - Command bar interactions
 * - Order navigation and verification
 * - Line item operations
 * - Payment operations
 */
export class POSPage {
  readonly page: Page;

  // Command bar selectors
  readonly commandInput: Locator;
  readonly commandPrompt: Locator;
  readonly autocompleteDropdown: Locator;
  readonly autocompleteSuggestions: Locator;

  // Order page selectors
  readonly orderTitle: Locator;
  readonly lineItemsTable: Locator;
  readonly paymentTable: Locator;
  readonly totalInput: Locator;
  readonly cashInput: Locator;
  readonly changeInput: Locator;

  // Sidebar selectors
  readonly newOrderButton: Locator;
  readonly orderLinks: Locator;

  // Service selection selectors
  readonly serviceCard: Locator;
  readonly tableRadioGroup: Locator;
  readonly deliveryRadioGroup: Locator;

  constructor(page: Page) {
    this.page = page;

    // Command bar - using aria-label for reliable selection
    this.commandInput = page.getByLabel('Command input field');
    this.commandPrompt = page.locator('.font-mono.text-gray-500');
    this.autocompleteDropdown = page.locator('.absolute.top-full');
    this.autocompleteSuggestions = this.autocompleteDropdown.locator('div[class*="cursor-pointer"]');

    // Order page
    this.orderTitle = page.locator('h2').filter({ hasText: /Order #/ });
    this.lineItemsTable = page.locator('table[aria-label="Order line items"]');
    this.paymentTable = page.locator('table[aria-label="Payment details"]');
    this.totalInput = page.locator('table[aria-label="Payment details"]').getByText('Total').locator('..').locator('input');
    this.cashInput = page.getByLabel('Cash amount');
    this.changeInput = page.locator('table[aria-label="Payment details"]').locator('tr').last().locator('input');

    // Sidebar
    this.newOrderButton = page.getByRole('button', { name: /New Order/ });
    this.orderLinks = page.locator('aside a[href^="/orders/"]');

    // Service selection
    this.serviceCard = page.locator('#service-selection-card');
    this.tableRadioGroup = page.getByLabel('Tables');
    this.deliveryRadioGroup = page.getByLabel('Delivery zones');
  }

  // ==========================================
  // Navigation Methods
  // ==========================================

  /**
   * Navigate to the orders page
   */
  async gotoOrders() {
    await this.page.goto('/orders');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to a specific order by ID
   */
  async gotoOrder(orderId: number | string) {
    await this.page.goto(`/orders/${orderId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to new order page
   */
  async gotoNewOrder() {
    await this.page.goto('/orders/new');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Create a new order by clicking the New Order button
   */
  async createNewOrder() {
    await this.newOrderButton.click();
    // Wait for navigation to new order page
    await this.page.waitForURL(/\/orders\/(new|\d+)/);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for order page to be fully loaded
   */
  async waitForOrderPageReady() {
    // Wait for command bar to be ready (not disabled)
    await expect(this.commandInput).toBeEnabled({ timeout: 15000 });
    // Wait for order title to be visible
    await expect(this.orderTitle).toBeVisible({ timeout: 10000 });
  }

  // ==========================================
  // Command Bar Methods
  // ==========================================

  /**
   * Focus the command bar input
   */
  async focusCommandBar() {
    await this.commandInput.click();
    await expect(this.commandInput).toBeFocused();
  }

  /**
   * Type a command in the command bar without executing
   */
  async typeCommand(command: string) {
    await this.focusCommandBar();
    await this.commandInput.fill(command);
  }

  /**
   * Execute a command by typing and pressing Enter
   */
  async executeCommand(command: string) {
    await this.typeCommand(command);
    await this.commandInput.press('Enter');
    // Wait for any optimistic updates to settle
    await this.page.waitForTimeout(100);
  }

  /**
   * Execute a command and wait for network activity to complete
   */
  async executeCommandAndWait(command: string) {
    await this.executeCommand(command);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Clear the command input
   */
  async clearCommandInput() {
    await this.focusCommandBar();
    await this.commandInput.fill('');
  }

  /**
   * Press Escape in the command bar
   */
  async escapeCommandBar() {
    await this.focusCommandBar();
    await this.commandInput.press('Escape');
  }

  /**
   * Get the current prompt text (e.g., ">", "item>")
   */
  async getPrompt(): Promise<string> {
    const promptElement = this.page.locator('input[aria-label="Command input field"]')
      .locator('..')
      .locator('.font-mono.text-gray-500');
    return await promptElement.textContent() || '>';
  }

  /**
   * Check if in multi-input mode by looking at the prompt
   */
  async isInMultiInputMode(): Promise<boolean> {
    const prompt = await this.getPrompt();
    return prompt.includes('>') && prompt !== '>';
  }

  /**
   * Wait for autocomplete suggestions to appear
   */
  async waitForAutocomplete() {
    await expect(this.autocompleteDropdown).toBeVisible({ timeout: 5000 });
  }

  /**
   * Get all autocomplete suggestions
   */
  async getAutocompleteSuggestions(): Promise<string[]> {
    await this.waitForAutocomplete();
    const suggestions = await this.autocompleteSuggestions.allTextContents();
    return suggestions;
  }

  /**
   * Select an autocomplete suggestion by index
   */
  async selectAutocompleteSuggestion(index: number) {
    await this.waitForAutocomplete();
    await this.autocompleteSuggestions.nth(index).click();
  }

  /**
   * Select an autocomplete suggestion by pressing Tab
   */
  async acceptAutocompleteSuggestion() {
    await this.commandInput.press('Tab');
  }

  /**
   * Navigate autocomplete with arrow keys
   */
  async navigateAutocomplete(direction: 'up' | 'down', times: number = 1) {
    const key = direction === 'up' ? 'ArrowUp' : 'ArrowDown';
    for (let i = 0; i < times; i++) {
      await this.commandInput.press(key);
    }
  }

  // ==========================================
  // Multi-Input Mode Methods
  // ==========================================

  /**
   * Enter multi-input mode for a command (e.g., /item with no args)
   */
  async enterMultiInputMode(command: string = 'item') {
    await this.executeCommand(`/${command}`);
    // Verify we're in multi-input mode
    const prompt = await this.getPrompt();
    if (!prompt.includes(`${command}>`)) {
      throw new Error(`Failed to enter multi-input mode for ${command}. Current prompt: ${prompt}`);
    }
  }

  /**
   * Exit multi-input mode by typing /
   */
  async exitMultiInputMode() {
    await this.executeCommand('/');
    // Verify we exited
    const isMulti = await this.isInMultiInputMode();
    if (isMulti) {
      throw new Error('Failed to exit multi-input mode');
    }
  }

  // ==========================================
  // Line Item Methods
  // ==========================================

  /**
   * Get all line items from the order
   */
  async getLineItems(): Promise<Array<{ name: string; quantity: number }>> {
    const rows = this.lineItemsTable.locator('tbody tr');
    const count = await rows.count();
    const items: Array<{ name: string; quantity: number }> = [];

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const nameCell = row.locator('td').first();
      const quantityInput = row.getByLabel('Quantity of line item');

      const name = await nameCell.textContent() || '';
      const quantityValue = await quantityInput.inputValue();
      const quantity = parseInt(quantityValue, 10) || 0;

      items.push({ name: name.trim(), quantity });
    }

    return items;
  }

  /**
   * Get a specific line item by name (partial match)
   */
  async getLineItem(namePattern: string): Promise<{ name: string; quantity: number } | null> {
    const items = await this.getLineItems();
    return items.find(item => item.name.toLowerCase().includes(namePattern.toLowerCase())) || null;
  }

  /**
   * Check if a line item exists
   */
  async hasLineItem(namePattern: string): Promise<boolean> {
    const item = await this.getLineItem(namePattern);
    return item !== null;
  }

  /**
   * Get the quantity input for a specific line item
   */
  getLineItemQuantityInput(namePattern: string): Locator {
    return this.lineItemsTable
      .locator('tbody tr')
      .filter({ hasText: new RegExp(namePattern, 'i') })
      .getByLabel('Quantity of line item');
  }

  /**
   * Update line item quantity via the UI input
   */
  async updateLineItemQuantity(namePattern: string, quantity: number) {
    const input = this.getLineItemQuantityInput(namePattern);
    await input.fill(quantity.toString());
    await input.press('Tab'); // Trigger blur to save
    await this.page.waitForLoadState('networkidle');
  }

  // ==========================================
  // Order Verification Methods
  // ==========================================

  /**
   * Get the current order ID from the URL
   */
  async getCurrentOrderId(): Promise<string> {
    const url = this.page.url();
    const match = url.match(/\/orders\/(\d+|new)/);
    return match ? match[1] : '';
  }

  /**
   * Verify we're on an order page
   */
  async verifyOnOrderPage() {
    await expect(this.page).toHaveURL(/\/orders\/(\d+|new)/);
    await expect(this.orderTitle).toBeVisible();
  }

  /**
   * Verify the order has specific number of line items
   */
  async verifyLineItemCount(expectedCount: number) {
    const items = await this.getLineItems();
    expect(items.length).toBe(expectedCount);
  }

  /**
   * Verify a line item exists with specific quantity
   */
  async verifyLineItem(namePattern: string, expectedQuantity: number) {
    const item = await this.getLineItem(namePattern);
    expect(item).not.toBeNull();
    expect(item?.quantity).toBe(expectedQuantity);
  }

  // ==========================================
  // Payment Methods
  // ==========================================

  /**
   * Get the order total
   */
  async getOrderTotal(): Promise<number> {
    // Find the Total row and get its value
    const totalRow = this.paymentTable.locator('tr').filter({ hasText: /^Total$/ });
    const totalInput = totalRow.locator('input');
    const value = await totalInput.inputValue();
    // Parse currency value (remove currency symbol and commas)
    const numericValue = value.replace(/[^0-9.-]/g, '');
    return parseFloat(numericValue) || 0;
  }

  /**
   * Get the current payment amount
   */
  async getPaymentAmount(): Promise<number> {
    const value = await this.cashInput.inputValue();
    return parseFloat(value) || 0;
  }

  /**
   * Get the change/short amount
   */
  async getChangeAmount(): Promise<number> {
    const changeRow = this.paymentTable.locator('tr').filter({ hasText: /Change|Short/ });
    const changeInput = changeRow.locator('input');
    const value = await changeInput.inputValue();
    const numericValue = value.replace(/[^0-9.-]/g, '');
    return parseFloat(numericValue) || 0;
  }

  /**
   * Check if the order is fully paid
   */
  async isOrderPaid(): Promise<boolean> {
    const total = await this.getOrderTotal();
    const payment = await this.getPaymentAmount();
    return payment >= total && total > 0;
  }

  /**
   * Enter payment amount via cash input
   */
  async enterPayment(amount: number) {
    await this.cashInput.fill(amount.toString());
    await this.cashInput.press('Tab');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click a quick payment button
   */
  async clickQuickPayment(label: string) {
    const quickPayButton = this.page.getByRole('button', { name: label });
    await quickPayButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ==========================================
  // Service Selection Methods
  // ==========================================

  /**
   * Select a table by name
   */
  async selectTable(tableName: string) {
    const tableRadio = this.tableRadioGroup.getByLabel(new RegExp(tableName, 'i'));
    await tableRadio.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Select a delivery zone by name
   */
  async selectDeliveryZone(zoneName: string) {
    const zoneRadio = this.deliveryRadioGroup.getByLabel(new RegExp(zoneName, 'i'));
    await zoneRadio.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get the currently selected service
   */
  async getSelectedService(): Promise<string | null> {
    // Check tables first
    if (await this.tableRadioGroup.isVisible().catch(() => false)) {
      const checkedTable = this.tableRadioGroup.locator('input[type="radio"]:checked');
      if (await checkedTable.count() > 0) {
        const label = await checkedTable.locator('..').locator('span').first().textContent();
        return label?.trim() || null;
      }
    }

    // Check delivery zones
    if (await this.deliveryRadioGroup.isVisible().catch(() => false)) {
      const checkedZone = this.deliveryRadioGroup.locator('input[type="radio"]:checked');
      if (await checkedZone.count() > 0) {
        const label = await checkedZone.locator('..').locator('span').first().textContent();
        return label?.trim() || null;
      }
    }

    return null;
  }

  // ==========================================
  // Sidebar Methods
  // ==========================================

  /**
   * Get all order links from the sidebar
   */
  async getOrderLinksFromSidebar(): Promise<string[]> {
    const links = await this.orderLinks.allTextContents();
    return links;
  }

  /**
   * Click an order in the sidebar by order ID
   */
  async clickOrderInSidebar(orderId: number | string) {
    const orderLink = this.page.locator(`aside a[href="/orders/${orderId}"]`);
    await orderLink.click();
    await this.page.waitForURL(`/orders/${orderId}`);
    await this.page.waitForLoadState('networkidle');
  }

  // ==========================================
  // Utility Methods
  // ==========================================

  /**
   * Wait for API mutations to complete
   */
  async waitForMutations() {
    await this.page.waitForLoadState('networkidle');
    // Additional wait for optimistic updates to settle
    await this.page.waitForTimeout(200);
  }

  /**
   * Take a screenshot with a descriptive name
   */
  async screenshot(name: string) {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png` });
  }
}

// ==========================================
// Extended Test Fixture
// ==========================================

/**
 * Extended test fixture that includes POSPage helper
 */
export const test = base.extend<{ posPage: POSPage }>({
  posPage: async ({ page }, use) => {
    const posPage = new POSPage(page);
    await use(posPage);
  },
});

// Re-export expect from Playwright
export { expect };
