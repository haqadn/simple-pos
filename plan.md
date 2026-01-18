# Simple POS Bug Fix Plan

## Overview
Fix 10 issues in the Simple POS Next.js application related to command handling, payment auto-fill, sync timing, print formatting, and KOT behavior.

**Reference:** Issues reported by user testing

---

## Task List

```json
[
  {
    "id": 1,
    "category": "bugfix",
    "description": "Fix sync timing - only sync orders when completed, not on every change",
    "steps": [
      "In services/sync.ts, modify syncOrder() to check order status before syncing",
      "Only allow sync when order status is 'completed' or 'processing'",
      "Remove automatic syncOrder() calls from orders.ts after line item/note/service/payment updates for frontend ID orders",
      "Keep manual sync available for explicit user actions",
      "Verify: Create new order, add items, check no server order created until marked complete"
    ],
    "passes": true
  },
  {
    "id": 2,
    "category": "bugfix",
    "description": "Fix item command after server sync - handle synced orders with serverId",
    "steps": [
      "In order-page-client.tsx handleAddProduct(), check if order has serverId",
      "For synced orders (has serverId), update both local Dexie AND queue server update",
      "Ensure local order data reflects the change immediately via optimistic update",
      "Verify sync.ts updateOrder properly handles adding items to existing server orders",
      "Verify: Complete order (syncs), reopen it, add item via /item command, confirm item appears"
    ],
    "passes": false
  },
  {
    "id": 3,
    "category": "feature",
    "description": "Auto-fill short amount when selecting non-cash payment method",
    "steps": [
      "In payment-card.tsx handleAddMethod(), calculate remaining balance (total - totalReceived)",
      "When adding a non-cash payment method, auto-set its value to the remaining balance",
      "Call handlePaymentChange with the new method and calculated amount",
      "Update the payment input state to show the auto-filled amount",
      "Verify: Create order with items, select non-cash payment method, confirm amount auto-fills with total due"
    ],
    "passes": false
  },
  {
    "id": 4,
    "category": "bugfix",
    "description": "Print frontend ID instead of server ID on invoice and KOT",
    "steps": [
      "In buttons.tsx buildPrintData(), set frontendId from order data or URL param",
      "For server orders without frontendId, generate one and store in meta_data",
      "Ensure printData.frontendId is always set, not just orderReference",
      "Update TodaysOrdersModal getPrintJobData() to include frontendId",
      "Verify: Print bill and KOT, confirm they show 6-char frontend ID like 'A3X9K2'"
    ],
    "passes": false
  },
  {
    "id": 5,
    "category": "bugfix",
    "description": "Remove header and footer from receipt preview in orders modal",
    "steps": [
      "Add 'isPreview' prop to BillPrint component",
      "Conditionally render header section based on isPreview prop",
      "Conditionally render footer section based on isPreview prop",
      "In TodaysOrdersModal, pass isPreview={true} to BillPrint",
      "Verify: Open Today's Orders modal, click order, confirm preview shows only items/totals without header/footer"
    ],
    "passes": false
  },
  {
    "id": 6,
    "category": "bugfix",
    "description": "Add delivery fee to receipt preview in orders modal",
    "steps": [
      "In TodaysOrdersModal getPrintJobData(), calculate shippingTotal from shipping_lines",
      "Sum all shipping_lines costs like buttons.tsx does (lines 100-103)",
      "Include shippingTotal in the returned print job data object",
      "Verify: Create order with delivery fee, open modal preview, confirm delivery fee shows"
    ],
    "passes": false
  },
  {
    "id": 7,
    "category": "bugfix",
    "description": "Add delivery fee to printed bill",
    "steps": [
      "Verify buttons.tsx buildPrintData() correctly sums shipping_lines (should already work)",
      "Check bill-renderer.ts displays shippingTotal (lines 164-168)",
      "If issue persists, trace data flow from order to print",
      "Ensure shipping data is included when order has delivery service selected",
      "Verify: Create order with delivery, print bill, confirm delivery fee line appears"
    ],
    "passes": false
  },
  {
    "id": 8,
    "category": "bugfix",
    "description": "Clear payment info when reopening completed order",
    "steps": [
      "In TodaysOrdersModal handleReopenOrder(), clear payment metadata",
      "Reset meta_data keys: payment_received=0, split_payments={}",
      "Update the local order via updateLocalOrder() with cleared payment",
      "Ensure payment-card.tsx reads fresh state after reopen",
      "Verify: Complete order with payment, reopen from modal, confirm payment fields are empty"
    ],
    "passes": false
  },
  {
    "id": 9,
    "category": "bugfix",
    "description": "Fix KOT to include new items added after previous KOT print",
    "steps": [
      "In buttons.tsx KOT change detection, identify truly NEW items (not in last_kot_items)",
      "Track new items separately from quantity changes",
      "Show new items with full quantity, not as change from 0",
      "Update last_kot_items tracking to properly handle new item additions",
      "Verify: Print KOT, add new item, print KOT again, confirm new item appears with correct quantity"
    ],
    "passes": false
  },
  {
    "id": 10,
    "category": "bugfix",
    "description": "Remove hardcoded currency symbols - use dynamic currency from store settings",
    "steps": [
      "Search codebase for hardcoded currency symbols in components and renderers",
      "Create or use existing currency formatting utility that reads from WooCommerce store settings",
      "Replace hardcoded symbols in bill-renderer.ts with dynamic currency",
      "Replace hardcoded symbols in kot-renderer.ts with dynamic currency",
      "Replace hardcoded symbols in UI components (payment-card.tsx, BillPrint.tsx, etc.)",
      "Verify: Check bill preview, KOT, and payment UI show correct currency based on store settings"
    ],
    "passes": false
  }
]
```
