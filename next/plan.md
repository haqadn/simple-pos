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
    "description": "Verify test artifacts are gitignored and clean up any tracked files",
    "steps": [
      "Check .gitignore includes /test-results/, /playwright-report/, /playwright/.cache/",
      "Run: git status test-results/ playwright-report/ to check for tracked files",
      "If any test artifacts are tracked, run: git rm -r --cached test-results/ playwright-report/",
      "Clean up any local test artifacts: rm -rf test-results/ playwright-report/",
      "Verify with: git status --porcelain | grep -E 'test-results|playwright-report' (should be empty)"
    ],
    "passes": true
  },
  {
    "id": 1,
    "category": "fix",
    "description": "Fix /item SKU 0 to remove items from order",
    "steps": [
      "Open commands/item.ts",
      "Find the quantity validation on line ~62 that rejects quantity <= 0",
      "Change condition to allow quantity === 0 (reject only negative)",
      "Ensure quantity=0 triggers the removal logic in stores/orders.ts",
      "Run test: npx playwright test item-command.spec.ts:511"
    ],
    "passes": false
  },
  {
    "id": 2,
    "category": "fix",
    "description": "Fix multi-input mode exit when switching commands",
    "steps": [
      "Open commands/command-registry.ts",
      "Find executeCommand() and multi-mode exit logic around lines 150-160",
      "Verify exitCurrentMultiMode() is called before executing new command",
      "Check if the prompt state is being reset properly after exit",
      "Ensure the state.mode changes from 'multi' to 'normal' before new command",
      "Run test: npx playwright test multi-input-mode.spec.ts:390"
    ],
    "passes": false
  },
  {
    "id": 3,
    "category": "fix",
    "description": "Fix KOT change detection on subsequent prints",
    "steps": [
      "Open commands/print.ts and find KOT print logic",
      "Verify last_kot_items meta is updated with current line items after print",
      "Check if quantity changes are being captured in the meta data",
      "Ensure meta_data update uses the actual current quantities, not cached",
      "Run test: npx playwright test print-command.spec.ts:684"
    ],
    "passes": false
  },
  {
    "id": 4,
    "category": "fix",
    "description": "Fix customer clearing when name is emptied",
    "steps": [
      "Open app/orders/[orderId]/components/customer-info.tsx",
      "Find handleNameChange() function",
      "When empty string is passed, should clear first_name and last_name",
      "May need to also clear customer_id if applicable",
      "Run test: npx playwright test customer-assignment.spec.ts:306"
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
      "Check if there's any disabled or readOnly prop",
      "Ensure the input value is bound to localValues.phone",
      "Run test: npx playwright test customer-assignment.spec.ts:561"
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
      "Check if mutation.mutate is being called with correct params",
      "Ensure empty string clears the note properly",
      "Verify localValue state syncs with query data on mount/change",
      "Run tests: npx playwright test notes.spec.ts:131 notes.spec.ts:211 notes.spec.ts:255"
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
      "Check if mutation.mutate is being called with quantity+1",
      "Ensure mutation completes and persists to WooCommerce",
      "May need to check useLineItemQuery hook in stores/orders.ts",
      "Run tests: npx playwright test product-search.spec.ts:267 product-search.spec.ts:320"
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
      "Consider adding a 404-style component for non-existent orders",
      "Run test: npx playwright test multi-order.spec.ts:962"
    ],
    "passes": false
  },
  {
    "id": 9,
    "category": "verification",
    "description": "Run full E2E test suite to verify all fixes",
    "steps": [
      "Run: npx playwright test --reporter=list",
      "Verify all 11 previously failing tests now pass",
      "Check for any regressions in other tests",
      "Document any remaining issues"
    ],
    "passes": false
  }
]
```
