# Project Plan

## Overview
Implement comprehensive Playwright E2E testing for Simple POS to prevent regressions, validate features, and catch edge cases. Tests use a hybrid approach: real WooCommerce API for order mutations, mocked responses for read-only operations.

**Reference:** `PRD.md`

---

## Task List

```json
[
  {
    "id": 1,
    "category": "setup",
    "description": "Initialize Playwright and configure for Next.js",
    "steps": [
      "Install @playwright/test as dev dependency",
      "Create playwright.config.ts with baseURL localhost:3000, Chromium browser, reasonable timeouts",
      "Add e2e test scripts to package.json (test:e2e, test:e2e:ui, test:e2e:debug)",
      "Create e2e/ directory structure: fixtures/, helpers/, tests/",
      "Verify Playwright runs with a minimal smoke test"
    ],
    "passes": true
  },
  {
    "id": 2,
    "category": "setup",
    "description": "Create test fixtures and base test configuration",
    "steps": [
      "Create e2e/fixtures/test-base.ts with extended test fixture",
      "Add POSPage helper class with common selectors and actions",
      "Include command bar interaction methods (type command, execute, wait for result)",
      "Add order page navigation and verification helpers",
      "Export extended test and expect from fixtures"
    ],
    "passes": true
  },
  {
    "id": 3,
    "category": "setup",
    "description": "Implement dynamic test data fetching from WooCommerce",
    "steps": [
      "Create e2e/fixtures/test-data.ts for fetching real products",
      "Implement getTestProducts() that fetches products with variations from WooCommerce API",
      "Store simple product and variable product for test use",
      "Add product SKU and variation ID extraction helpers",
      "Use globalSetup to fetch and cache test data"
    ],
    "passes": true
  },
  {
    "id": 4,
    "category": "setup",
    "description": "Create API mock factories for read-only endpoints",
    "steps": [
      "Create e2e/fixtures/api-mocks.ts with mock response factories",
      "Implement mockProducts() with realistic product data",
      "Implement mockCustomers() with sample customer data",
      "Implement mockCoupons() with valid and invalid coupon scenarios",
      "Add route interception setup helper for tests"
    ],
    "passes": true
  },
  {
    "id": 5,
    "category": "setup",
    "description": "Create command and order helper utilities",
    "steps": [
      "Create e2e/helpers/commands.ts with command input helpers",
      "Add executeCommand(command, args) helper",
      "Add enterMultiInputMode() and exitMultiInputMode() helpers",
      "Create e2e/helpers/orders.ts with order manipulation helpers",
      "Add createNewOrder(), getOrderTotal(), getLineItems() helpers"
    ],
    "passes": true
  },
  {
    "id": 6,
    "category": "feature",
    "description": "Implement order creation tests",
    "steps": [
      "Create e2e/tests/order-management/create-order.spec.ts",
      "Test: Navigate to /orders and create new draft order",
      "Verify: Draft order exists, URL contains order ID, status is draft",
      "Test: Create order with service/table selection",
      "Verify: Order meta contains correct service data"
    ],
    "passes": true
  },
  {
    "id": 7,
    "category": "feature",
    "description": "Implement line item add tests",
    "steps": [
      "Create e2e/tests/line-items/add-item.spec.ts",
      "Test: Add item by SKU via /item command",
      "Test: Add item with specific quantity /item SKU 5",
      "Test: Add same item twice increments quantity",
      "Test: Add variable product shows variation selector",
      "Verify all scenarios persist to WooCommerce"
    ],
    "passes": true
  },
  {
    "id": 8,
    "category": "feature",
    "description": "Implement line item remove and update tests",
    "steps": [
      "Create e2e/tests/line-items/remove-item.spec.ts",
      "Test: Remove item via /item SKU 0",
      "Test: Remove last item leaves order empty",
      "Create e2e/tests/line-items/update-quantity.spec.ts",
      "Test: Update quantity via command and UI input",
      "Test: Rapid quantity changes result in correct final value"
    ],
    "passes": true
  },
  {
    "id": 9,
    "category": "feature",
    "description": "Implement line item edge case tests",
    "steps": [
      "Create e2e/tests/line-items/edge-cases.spec.ts",
      "Test: Invalid SKU shows appropriate error",
      "Test: Negative quantity handling",
      "Test: Very large quantity handling",
      "Test: WooCommerce update pattern (delete then add) works correctly",
      "Test: No duplicate or orphaned line items after updates"
    ],
    "passes": true
  },
  {
    "id": 10,
    "category": "feature",
    "description": "Implement item command comprehensive tests",
    "steps": [
      "Create e2e/tests/commands/item-command.spec.ts",
      "Test all input formats: /item SKU, /item SKU qty, /i alias",
      "Test autocomplete suggestions appear for partial SKU",
      "Test increment vs set behavior for existing items",
      "Verify optimistic updates and final server state match"
    ],
    "passes": true
  },
  {
    "id": 11,
    "category": "feature",
    "description": "Implement multi-input mode tests",
    "steps": [
      "Create e2e/tests/commands/multi-input-mode.spec.ts",
      "Test: /item with no args enters multi-input mode",
      "Verify prompt changes to item>",
      "Test: Rapid entry of multiple SKUs works correctly",
      "Test: / exits multi-input mode",
      "Verify all items added persist correctly"
    ],
    "passes": true
  },
  {
    "id": 12,
    "category": "feature",
    "description": "Implement pay command tests",
    "steps": [
      "Create e2e/tests/commands/pay-command.spec.ts",
      "Test: Record exact payment /pay 50.00",
      "Test: Record partial payment shows balance",
      "Test: Record overpayment shows change amount",
      "Test: /p alias works correctly",
      "Verify payment stored in order meta"
    ],
    "passes": true
  },
  {
    "id": 13,
    "category": "feature",
    "description": "Implement done command tests",
    "steps": [
      "Create e2e/tests/commands/done-command.spec.ts",
      "Test: /done completes paid order",
      "Test: All aliases /dn, /d work correctly",
      "Verify order status changes to completed in WooCommerce",
      "Verify order removed from active orders list"
    ],
    "passes": true
  },
  {
    "id": 14,
    "category": "feature",
    "description": "Implement coupon command tests",
    "steps": [
      "Create e2e/tests/commands/coupon-command.spec.ts",
      "Test: Apply valid coupon updates totals",
      "Test: Apply invalid coupon shows error",
      "Test: Toggle coupon (apply then remove)",
      "Test: Autocomplete shows matching coupons",
      "Test: /c and /discount aliases work"
    ],
    "passes": true
  },
  {
    "id": 15,
    "category": "feature",
    "description": "Implement clear command tests",
    "steps": [
      "Create e2e/tests/commands/clear-command.spec.ts",
      "Test: /clear removes all line items",
      "Test: /clear on empty order does not error",
      "Test: /cl alias works correctly",
      "Verify order remains as draft with zero total"
    ],
    "passes": true
  },
  {
    "id": 16,
    "category": "feature",
    "description": "Implement print command tests",
    "steps": [
      "Create e2e/tests/commands/print-command.spec.ts",
      "Add testability hook to app if needed (emit event or expose state)",
      "Test: /print triggers print action",
      "Test: /print kot triggers KOT print",
      "Test: /pr alias works correctly"
    ],
    "passes": true
  },
  {
    "id": 17,
    "category": "feature",
    "description": "Implement keyboard shortcuts tests",
    "steps": [
      "Create e2e/tests/keyboard-shortcuts/global-shortcuts.spec.ts",
      "Test: Shortcut focuses command bar",
      "Test: Shortcut creates new order",
      "Create e2e/tests/keyboard-shortcuts/command-bar-shortcuts.spec.ts",
      "Test: Enter executes, Escape clears, Up/Down navigate, Tab accepts"
    ],
    "passes": true
  },
  {
    "id": 18,
    "category": "feature",
    "description": "Implement product search tests",
    "steps": [
      "Create e2e/tests/features/product-search.spec.ts",
      "Test: Search by product name shows results",
      "Test: Search by SKU shows matching product",
      "Test: Click product adds to order",
      "Test: No results shows empty state"
    ],
    "passes": true
  },
  {
    "id": 19,
    "category": "feature",
    "description": "Implement customer assignment tests",
    "steps": [
      "Create e2e/tests/features/customer-assignment.spec.ts",
      "Test: Search customer by name/email",
      "Test: Select customer assigns to order",
      "Test: Clear customer makes order guest",
      "Verify customer_id in WooCommerce order"
    ],
    "passes": true
  },
  {
    "id": 20,
    "category": "feature",
    "description": "Implement service/table selection tests",
    "steps": [
      "Create e2e/tests/features/service-selection.spec.ts",
      "Test: Select dine-in service type",
      "Test: Select table number",
      "Test: Change service type updates order",
      "Verify service meta in WooCommerce order"
    ],
    "passes": true
  },
  {
    "id": 21,
    "category": "feature",
    "description": "Implement order notes tests",
    "steps": [
      "Create e2e/tests/features/notes.spec.ts",
      "Test: Add order note",
      "Test: Edit existing note",
      "Test: Customer note vs order note distinction",
      "Verify notes saved correctly in WooCommerce"
    ],
    "passes": true
  },
  {
    "id": 22,
    "category": "feature",
    "description": "Implement multi-order management tests",
    "steps": [
      "Create e2e/tests/order-management/multi-order.spec.ts",
      "Test: Create and switch between multiple orders",
      "Test: Each order maintains independent state",
      "Test: URL-based routing loads correct order",
      "Test: Create order while another is open"
    ],
    "passes": true
  },
  {
    "id": 23,
    "category": "feature",
    "description": "Implement order completion flow tests",
    "steps": [
      "Create e2e/tests/order-management/order-completion.spec.ts",
      "Test: Complete fully paid order",
      "Test: Handle partial payment scenario",
      "Verify payment recorded correctly",
      "Verify order removed from active list"
    ],
    "passes": true
  },
  {
    "id": 24,
    "category": "integration",
    "description": "Implement full order flow integration test",
    "steps": [
      "Create e2e/tests/integration/full-order-flow.spec.ts",
      "Test complete flow: service > create > customer > items > modify > remove > coupon > note > pay > done",
      "Verify final order in WooCommerce matches all inputs",
      "Assert no console errors throughout flow",
      "Document as the primary smoke test for CI"
    ],
    "passes": false
  },
  {
    "id": 25,
    "category": "testing",
    "description": "Add custom assertions and improve test reliability",
    "steps": [
      "Create e2e/helpers/assertions.ts with custom matchers",
      "Add toHaveLineItem(), toHaveTotal(), toHavePayment() assertions",
      "Review all tests for proper waiting strategies",
      "Replace any arbitrary waits with proper element/network waits",
      "Run full test suite and fix any flaky tests"
    ],
    "passes": false
  },
  {
    "id": 26,
    "category": "documentation",
    "description": "Document test suite and add debugging support",
    "steps": [
      "Update next/README.md with E2E testing instructions",
      "Configure screenshot on failure",
      "Configure trace recording for debugging",
      "Add console log capture to test reports",
      "Document how to run specific test files and debug failures"
    ],
    "passes": false
  }
]
```
