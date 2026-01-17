# Project Plan

## Overview
Fix 11 failing E2E tests identified in the Playwright test suite. These are application bugs affecting item commands, multi-input mode, KOT tracking, customer info, order notes, product clicks, and order error handling.

**Reference:** Test failures from `npx playwright test`

---

## Task List

```json
[
  {
    "id": 0,
    "category": "setup",
    "description": "Start up and prepare the E2E test environment",
    "steps": [
      "Check if wp-env is running: npm run wp-env -- run cli wp option get siteurl",
      "If not running, start wp-env: npm run wp-env:start",
      "Check if .env.test exists with API credentials",
      "If not, generate credentials: npm run test:e2e:credentials",
      "Check if test products are seeded by fetching TEST-SIMPLE-001",
      "If not seeded, run: npm run test:e2e:seed",
      "Start Next.js dev server in background: npm run dev &",
      "Wait for Next.js to be ready on localhost:3000",
      "Verify environment by running: npx playwright test --list"
    ],
    "passes": true
  },
  {
    "id": 1,
    "category": "fix",
    "description": "Fix /item SKU 0 to remove items from order",
    "steps": [
      "Open commands/item.ts",
      "Find the quantity validation that rejects quantity <= 0",
      "Change condition to allow quantity === 0 (reject only negative)",
      "Ensure quantity=0 triggers the removal logic in stores/orders.ts",
      "Run test and verify it passes: npx playwright test item-command.spec.ts:511",
      "If test fails, debug and fix until it passes"
    ],
    "passes": true
  },
  {
    "id": 2,
    "category": "fix",
    "description": "Fix multi-input mode exit when switching commands",
    "steps": [
      "Open commands/command-registry.ts",
      "Find executeCommand() and multi-mode exit logic",
      "Ensure state.mode changes from 'multi' to 'normal' when switching commands",
      "Run test and verify it passes: npx playwright test multi-input-mode.spec.ts:390",
      "If test fails, debug and fix until it passes"
    ],
    "passes": true
  },
  {
    "id": 3,
    "category": "fix",
    "description": "Fix KOT change detection on subsequent prints",
    "steps": [
      "Open print-related files and find KOT print logic",
      "Verify last_kot_items meta is updated with fresh order data after print",
      "Ensure quantity changes are captured using fresh data, not cached",
      "Run test and verify it passes: npx playwright test print-command.spec.ts:684",
      "If test fails, debug and fix until it passes"
    ],
    "passes": true
  },
  {
    "id": 4,
    "category": "fix",
    "description": "Fix customer clearing when name is emptied",
    "steps": [
      "Open app/orders/[orderId]/components/customer-info.tsx",
      "Find handleNameChange() function",
      "When empty string is passed, explicitly clear first_name and last_name",
      "Run test and verify it passes: npx playwright test customer-assignment.spec.ts:306",
      "If test fails, debug and fix until it passes"
    ],
    "passes": false
  },
  {
    "id": 5,
    "category": "fix",
    "description": "Fix customer phone input editability",
    "steps": [
      "Open app/orders/[orderId]/components/customer-info.tsx",
      "Find the phone Input component",
      "Verify it has onValueChange handler connected properly",
      "Check if there's any disabled or readOnly prop blocking input",
      "Run test and verify it passes: npx playwright test customer-assignment.spec.ts:561",
      "If test fails, debug and fix until it passes"
    ],
    "passes": false
  },
  {
    "id": 6,
    "category": "fix",
    "description": "Fix order notes via UI textarea (add/edit/clear)",
    "steps": [
      "Open app/orders/[orderId]/components/order-note.tsx",
      "Verify handleChange is called on textarea value change",
      "Ensure mutation.mutate is being called with correct params",
      "Verify localValue state syncs with query data on mount/change",
      "Run tests and verify they pass: npx playwright test notes.spec.ts:131 notes.spec.ts:211 notes.spec.ts:255",
      "If any test fails, debug and fix until all pass"
    ],
    "passes": false
  },
  {
    "id": 7,
    "category": "fix",
    "description": "Fix product click to increment quantity and persist",
    "steps": [
      "Open app/orders/components/products.tsx",
      "Find addToOrder() function and onPress handler",
      "Verify currentQuantity is reading from correct query",
      "Ensure mutation completes and persists to WooCommerce",
      "Run tests and verify they pass: npx playwright test product-search.spec.ts:267 product-search.spec.ts:320",
      "If any test fails, debug and fix until all pass"
    ],
    "passes": false
  },
  {
    "id": 8,
    "category": "fix",
    "description": "Fix invalid order ID error handling",
    "steps": [
      "Open app/orders/[orderId]/page.tsx",
      "Add error handling for when order fetch returns null/error",
      "Show appropriate error message or redirect to orders list",
      "Run test and verify it passes: npx playwright test multi-order.spec.ts:962",
      "If test fails, debug and fix until it passes"
    ],
    "passes": false
  },
  {
    "id": 9,
    "category": "verification",
    "description": "Run full E2E test suite to verify all fixes and no regressions",
    "steps": [
      "Run full test suite: npx playwright test --reporter=list",
      "Verify all 11 previously failing tests now pass",
      "Check for any regressions in other tests",
      "If any failures, document them and fix",
      "Final verification: all tests should pass"
    ],
    "passes": false
  }
]
```
