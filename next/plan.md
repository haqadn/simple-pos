# POS Application Bug Fix Plan

## Overview
Fix critical bugs in the Simple POS Next.js application affecting order management, command system, and UI state. Implement Today's Orders modal for viewing completed orders.

**Reference:** `PRD.md`, `activity.md`, `CLAUDE.md`
**Verification:** All tasks must be verified in browser before marking complete.

---

## Task List

```json
[
  {
    "id": 1,
    "category": "bug-fix",
    "description": "Fix sidebar order sorting - new orders should appear at the end (bottom)",
    "steps": [
      "BROWSER TEST: Create a new order via + New Order button",
      "BROWSER TEST: Verify the new order appears at the bottom of the sidebar list",
      "BROWSER TEST: Create another order and verify it also appears at bottom"
    ],
    "passes": true
  },
  {
    "id": 2,
    "category": "bug-fix",
    "description": "Fix local order total calculation - totals show 0 for offline orders",
    "steps": [
      "BROWSER TEST: Create a new local order",
      "BROWSER TEST: Click on a product to add it to the order",
      "BROWSER TEST: Verify the Total field updates to show the product price",
      "BROWSER TEST: Add multiple products and verify total sums correctly"
    ],
    "passes": true
  },
  {
    "id": 3,
    "category": "setup",
    "description": "Create test coupon in wp-env for coupon testing",
    "steps": [
      "Run npm run dev:setup to create test coupons",
      "BROWSER TEST: In coupon code field, type 'testcoupon' and verify it validates"
    ],
    "passes": true
  },
  {
    "id": 4,
    "category": "bug-fix",
    "description": "Fix coupon application for local orders - coupon disappears after adding",
    "steps": [
      "BROWSER TEST: Create a new local order and add items",
      "BROWSER TEST: Apply coupon code 'testcoupon'",
      "BROWSER TEST: Verify coupon persists and discount is applied to total"
    ],
    "passes": true
  },
  {
    "id": 5,
    "category": "feature",
    "description": "Implement complete CommandContext in pos-command-input.tsx",
    "steps": [
      "Implement all CommandContext functions for local orders",
      "BROWSER TEST: Verify commands work via command bar"
    ],
    "passes": true
  },
  {
    "id": 6,
    "category": "bug-fix",
    "description": "Fix /item command increment mode - doesn't increment existing quantities",
    "steps": [
      "BROWSER TEST: Type '/item TEST-SIMPLE-001' - verify quantity becomes 1",
      "BROWSER TEST: Type '/item TEST-SIMPLE-001' again - verify quantity increments to 2",
      "BROWSER TEST: Type '/item TEST-SIMPLE-001 5' - verify quantity is set to 5"
    ],
    "passes": true
  },
  {
    "id": 7,
    "category": "bug-fix",
    "description": "Fix /clear command - not removing line items from orders",
    "steps": [
      "BROWSER TEST: Add items to an order",
      "BROWSER TEST: Type '/clear' command",
      "BROWSER TEST: Verify all line items are removed from order"
    ],
    "passes": true
  },
  {
    "id": 8,
    "category": "bug-fix",
    "description": "Fix /pay command - payment amounts not persisting",
    "steps": [
      "BROWSER TEST: Add items to order (e.g. total = 25)",
      "BROWSER TEST: Type '/pay 100'",
      "BROWSER TEST: Verify Cash field shows 100 and Change shows 75"
    ],
    "passes": false
  },
  {
    "id": 9,
    "category": "enhancement",
    "description": "Enhance /done command to accept optional payment amount",
    "steps": [
      "BROWSER TEST: Add items to order with total = 25",
      "BROWSER TEST: Type '/done 100'",
      "BROWSER TEST: Verify order completes and shows change amount"
    ],
    "passes": false
  },
  {
    "id": 10,
    "category": "bug-fix",
    "description": "Remove completed orders from sidebar",
    "steps": [
      "BROWSER TEST: Complete an order using /done command",
      "BROWSER TEST: Verify the order disappears from the sidebar"
    ],
    "passes": false
  },
  {
    "id": 11,
    "category": "bug-fix",
    "description": "Fix New Order button navigation issues",
    "steps": [
      "BROWSER TEST: Click '+ New Order' button",
      "BROWSER TEST: Verify navigation to new order page with frontend ID in URL",
      "BROWSER TEST: Verify new order appears in sidebar"
    ],
    "passes": false
  },
  {
    "id": 12,
    "category": "bug-fix",
    "description": "Fix line item UI updates - verify race condition fix",
    "steps": [
      "BROWSER TEST: Rapidly click on a product multiple times",
      "BROWSER TEST: Verify quantity increments correctly without items disappearing",
      "BROWSER TEST: Click to set quantity to 0 and verify item is removed"
    ],
    "passes": false
  },
  {
    "id": 13,
    "category": "feature",
    "description": "Create Today's Orders modal component",
    "steps": [
      "Create TodaysOrdersModal.tsx component",
      "BROWSER TEST: Verify modal displays list of today's orders"
    ],
    "passes": false
  },
  {
    "id": 14,
    "category": "feature",
    "description": "Add receipt preview to Today's Orders modal",
    "steps": [
      "Add receipt preview panel to modal",
      "BROWSER TEST: Select an order and verify receipt preview appears"
    ],
    "passes": false
  },
  {
    "id": 15,
    "category": "feature",
    "description": "Connect OfflineIndicator to Today's Orders modal",
    "steps": [
      "BROWSER TEST: Click on the 'Online' indicator in sidebar",
      "BROWSER TEST: Verify Today's Orders modal opens"
    ],
    "passes": false
  },
  {
    "id": 16,
    "category": "testing",
    "description": "Final browser verification of all features",
    "steps": [
      "BROWSER TEST: Complete full order flow - create, add items, pay, complete",
      "BROWSER TEST: Verify all commands work correctly",
      "BROWSER TEST: Verify offline indicator and Today's Orders modal"
    ],
    "passes": false
  }
]
```
