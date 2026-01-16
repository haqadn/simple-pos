/**
 * E2E Test Helpers
 *
 * Export all helper utilities from a single entry point.
 *
 * Usage:
 *   import { executeCommand, createNewOrder, getOrderTotal } from '../helpers';
 */

// Command helpers
export {
  // Core command functions
  executeCommand,
  executeCommandAndWait,
  typePartialCommand,
  clearCommandInput,
  escapeCommandBar,
  getPromptText,
  // Multi-input mode functions
  enterMultiInputMode,
  exitMultiInputMode,
  isInMultiInputMode,
  executeMultiModeEntry,
  // Autocomplete functions
  waitForAutocomplete,
  getAutocompleteSuggestionTexts,
  selectAutocompleteSuggestionByIndex,
  acceptAutocompleteSuggestion,
  navigateAutocomplete,
  // Locator helpers
  getCommandInput,
  getAutocompleteDropdown,
  getAutocompleteSuggestions,
  // String utilities
  buildCommandString,
  parseCommandString,
  // Shorthand helpers
  CommandShortcuts,
  // Selectors
  COMMAND_BAR_SELECTORS,
  // Types
  type CommandResult,
} from './commands';

// Order helpers
export {
  // Navigation functions
  gotoOrders,
  gotoOrder,
  gotoNewOrder,
  createNewOrder,
  waitForOrderPageReady,
  getCurrentOrderId,
  verifyOnOrderPage,
  // Line item functions
  getLineItems,
  getLineItemCount,
  getLineItem,
  hasLineItem,
  getLineItemQuantityInput,
  updateLineItemQuantity,
  // Payment functions
  getOrderTotal,
  getPaymentAmount,
  getChangeAmount,
  getOrderBalance,
  isOrderPaid,
  enterPayment,
  clickQuickPayment,
  // Sidebar functions
  getOrderLinksFromSidebar,
  clickOrderInSidebar,
  // Summary function
  getOrderSummary,
  // Verification helpers
  OrderVerify,
  // Service selection helpers
  ServiceSelection,
  // Utility functions
  waitForMutations,
  screenshot,
  // Selectors
  ORDER_SELECTORS,
  // Types
  type LineItem,
  type OrderSummary,
} from './orders';
