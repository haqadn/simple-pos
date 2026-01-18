# POS Application Bug Fix Plan

## Overview
Fix critical bugs in the Simple POS Next.js application affecting order management, command system, and UI state. Implement Today's Orders modal for viewing completed orders.

**Reference:** `PRD.md`, `activity.md`, `CLAUDE.md`

---

## Task List

```json
[
  {
    "id": 1,
    "category": "bug-fix",
    "description": "Fix sidebar order sorting - new orders should appear at the end (bottom)",
    "steps": [
      "Review useCombinedOrdersStore in stores/orders.ts - understand how orders are combined",
      "Review listLocalOrders in stores/offline-orders.ts - currently sorts by updatedAt descending",
      "Modify useCombinedOrdersStore to sort combined orders by createdAt ascending",
      "This ensures newer orders appear at the bottom of the sidebar list",
      "Test by creating multiple orders and verifying consistent ordering"
    ],
    "passes": true
  },
  {
    "id": 2,
    "category": "bug-fix",
    "description": "Fix local order total calculation - totals show 0 for offline orders",
    "steps": [
      "Create calculateOrderTotal utility function in lib/order-utils.ts",
      "Calculate subtotal from line_items: sum of (price * quantity) for each item",
      "Handle discount_total if coupon applied",
      "Handle shipping_total from shipping_lines",
      "Call calculateOrderTotal in updateLocalOrder when line_items change",
      "Update the order.total field with calculated value",
      "Test by adding items to a local order and verifying total updates correctly"
    ],
    "passes": true
  },
  {
    "id": 3,
    "category": "setup",
    "description": "Create test coupon in wp-env for coupon testing",
    "steps": [
      "Add coupon creation to scripts/dev-setup.js using WP-CLI or WooCommerce REST API",
      "Create a percentage coupon: code='testcoupon', discount_type='percent', amount='10'",
      "Create a fixed amount coupon: code='fixedcoupon', discount_type='fixed_cart', amount='50'",
      "Verify coupons exist by calling GET /wp-json/wc/v3/coupons",
      "Update dev-setup to be idempotent (skip if coupons already exist)"
    ],
    "passes": false
  },
  {
    "id": 4,
    "category": "bug-fix",
    "description": "Fix coupon application for local orders - coupon disappears after adding",
    "steps": [
      "Review coupon-card.tsx - it calls OrdersAPI.updateOrder() which needs server ID",
      "Detect if order is local (frontend ID) using isValidFrontendId",
      "For local orders, use updateLocalOrder instead of OrdersAPI.updateOrder",
      "Update the correct React Query cache key after local update",
      "Queue sync operation after local coupon update",
      "Test by adding a coupon to a local order and verifying it persists"
    ],
    "passes": false
  },
  {
    "id": 5,
    "category": "feature",
    "description": "Implement complete CommandContext in pos-command-input.tsx",
    "steps": [
      "Review CommandContext interface in command-manager.ts for required functions",
      "Currently only updateLineItem, showMessage, showError are implemented",
      "Import necessary functions: updateLocalOrder, updateLocalOrderStatus from offline-orders",
      "Implement clearOrder: set line_items to empty array via updateLocalOrder",
      "Implement completeOrder: update status to 'completed', navigate to /orders",
      "Implement setPayment: update meta_data with payment_received and split_payments",
      "Implement getPaymentReceived: read from order meta_data",
      "Implement applyCoupon/removeCoupon: update coupon_lines via updateLocalOrder",
      "Implement setNote: update customer_note via updateLocalOrder",
      "Implement setCustomer: update billing info via updateLocalOrder",
      "Implement print/openDrawer: show 'not implemented' or use existing print system",
      "Implement navigateToNextOrder: router.push to /orders"
    ],
    "passes": false
  },
  {
    "id": 6,
    "category": "bug-fix",
    "description": "Fix /item command increment mode - doesn't increment existing quantities",
    "steps": [
      "Review item.ts - passes mode 'increment' or 'set' to updateLineItem",
      "Current updateLineItem in pos-command-input.tsx ignores mode parameter",
      "Update updateLineItem signature to accept (productId, variationId, quantity, mode)",
      "When mode is 'increment': find existing line item, add quantity to current",
      "When mode is 'set': use the provided quantity directly",
      "Test: /item SKU increments by 1, /item SKU 5 sets to 5"
    ],
    "passes": false
  },
  {
    "id": 7,
    "category": "bug-fix",
    "description": "Fix /clear command - not removing line items from orders",
    "steps": [
      "Review clear.ts - calls context.clearOrder()",
      "Ensure clearOrder is implemented in CommandContext (task 5)",
      "For local orders: set line_items to [] via updateLocalOrder",
      "Update React Query cache with empty line items",
      "Invalidate localOrder query to refresh UI",
      "Test: /clear removes all items from current order"
    ],
    "passes": false
  },
  {
    "id": 8,
    "category": "bug-fix",
    "description": "Fix /pay command - payment amounts not persisting",
    "steps": [
      "Review pay.ts - calls context.setPayment(amount)",
      "Ensure setPayment is implemented in CommandContext (task 5)",
      "Update meta_data with payment_received and split_payments keys",
      "For local orders: use updateLocalOrder to persist",
      "Update React Query cache with new meta_data",
      "Ensure payment-card.tsx reads the stored values correctly",
      "Test: /pay 100 stores payment, verify in UI"
    ],
    "passes": false
  },
  {
    "id": 9,
    "category": "enhancement",
    "description": "Enhance /done command to accept optional payment amount",
    "steps": [
      "Review done.ts - currently only checks if order is paid",
      "Modify execute() to parse optional amount argument: /done [amount]",
      "If amount provided: call setPayment(amount) first",
      "Then check if total payment >= order total",
      "If sufficient: complete order, show change, navigate away",
      "If not: show error with remaining amount due",
      "Update command metadata to document new usage: /done [amount]",
      "Test: /done 500 adds payment and completes order"
    ],
    "passes": false
  },
  {
    "id": 10,
    "category": "bug-fix",
    "description": "Remove completed orders from sidebar",
    "steps": [
      "Review useLocalOrdersQuery in stores/orders.ts",
      "Currently filters by status: pending, processing, on-hold, draft",
      "Verify 'completed' is not in the filter list",
      "Review useCombinedOrdersStore to ensure completed orders excluded",
      "Ensure sidebar re-renders when order status changes to completed",
      "Invalidate localOrders query after order completion",
      "Test: complete an order with /done and verify it disappears from sidebar"
    ],
    "passes": false
  },
  {
    "id": 11,
    "category": "bug-fix",
    "description": "Fix New Order button navigation issues",
    "steps": [
      "Review sidebar.tsx newOrder function",
      "Verify createLocalOrder completes before router.push",
      "Add error handling for failed order creation",
      "Ensure frontend ID is correctly passed to URL",
      "Check for race conditions between order creation and navigation",
      "Test: click New Order, verify navigation to new order page"
    ],
    "passes": false
  },
  {
    "id": 12,
    "category": "bug-fix",
    "description": "Fix line item UI updates - verify race condition fix",
    "steps": [
      "Review recent race condition fix (removed debounce, use setQueryData)",
      "Verify optimistic updates in onMutate preserve all items",
      "Ensure setQueryData updates preserve other pending changes",
      "Test rapid quantity changes don't cause items to disappear",
      "Test quantity change from 1->2, 2->0 (removal) works correctly"
    ],
    "passes": false
  },
  {
    "id": 13,
    "category": "feature",
    "description": "Create Today's Orders modal component",
    "steps": [
      "Create app/components/TodaysOrdersModal.tsx",
      "Use HeroUI Modal component for container",
      "Create two-panel layout: order list (left), receipt preview (right)",
      "Add listTodaysOrders function to stores/offline-orders.ts",
      "Query orders where createdAt >= start of today (all statuses)",
      "Display columns: Frontend ID, Server ID, Sync Status, Total",
      "Add summary footer showing order count and total revenue",
      "Style selected row with highlight"
    ],
    "passes": false
  },
  {
    "id": 14,
    "category": "feature",
    "description": "Add receipt preview to Today's Orders modal",
    "steps": [
      "Import BillPrint component for receipt rendering",
      "When order selected, display receipt preview in right panel",
      "Add 'Reopen Order' button below receipt",
      "Reopen navigates to /orders/{frontendId}",
      "If order was completed, change status back to 'pending'",
      "Close modal after navigation"
    ],
    "passes": false
  },
  {
    "id": 15,
    "category": "feature",
    "description": "Connect OfflineIndicator to Today's Orders modal",
    "steps": [
      "Modify app/components/OfflineIndicator.tsx",
      "Add onClick handler to the indicator component",
      "Use useDisclosure hook from HeroUI for modal state",
      "Import and render TodaysOrdersModal",
      "Pass isOpen and onClose props to modal",
      "Test: click offline indicator opens Today's Orders modal"
    ],
    "passes": false
  },
  {
    "id": 16,
    "category": "testing",
    "description": "Run E2E tests to verify all fixes",
    "steps": [
      "Run npm run test:e2e to execute full test suite",
      "Compare results to baseline: 268 passing, 109 failing",
      "Document improvements in each test category",
      "Identify remaining failures needing additional fixes",
      "Update activity.md with final test results"
    ],
    "passes": false
  }
]
```
