# PRD: Make the POS Production-Ready

## Overview

Fix critical bugs in the Simple POS application and add essential features for production use. The app uses an offline-first architecture with local IndexedDB storage (Dexie) and background sync to WooCommerce.

**Goals:**
1. Fix command system (all POS commands working correctly)
2. Fix order totals calculation for offline orders
3. Remove completed orders from sidebar, add Today's Orders modal
4. Ensure reliable order management workflow

## Target Audience

- **End Users**: Restaurant/retail operators using Simple POS with WooCommerce
- **Developers**: Contributors maintaining and extending the application

---

## Bug Fixes

### 1. Sidebar Order Sorting

**Current State:** New orders appear at random positions in the sidebar.

**Target State:** New orders appear at the bottom of the sidebar list (most recent last).

**Acceptance Criteria:**
- [ ] Orders sorted by `createdAt` ascending (oldest first, newest at bottom)
- [ ] New order appears at bottom of list immediately after creation

---

### 2. Local Order Total Calculation

**Current State:** Totals show as $0 for offline orders because WooCommerce calculates totals server-side.

**Target State:** Totals calculated client-side for local orders.

**Calculation:**
```
subtotal = sum(line_items.map(item => item.price * item.quantity))
total = subtotal - discount_total + shipping_total
```

**Acceptance Criteria:**
- [ ] Total updates immediately when line items are added/removed
- [ ] Discount applied correctly when coupon is used
- [ ] Shipping fee included in total

---

### 3. Coupon Application for Local Orders

**Current State:** Coupon disappears from UI after adding because it tries to update via server API.

**Target State:** Coupons persist locally for frontend ID orders.

**Acceptance Criteria:**
- [ ] Coupon appears in UI after adding to local order
- [ ] Coupon persists after page refresh
- [ ] Coupon syncs to server when order syncs

---

### 4. Command System - Complete CommandContext

**Current State:** `pos-command-input.tsx` has incomplete `CommandContext` - only `updateLineItem`, `showMessage`, `showError` implemented.

**Target State:** All `CommandContext` methods implemented.

**Required Methods:**
| Method | Purpose |
|--------|---------|
| `updateLineItem(productId, variationId, quantity, mode)` | Add/update line items with 'set' or 'increment' mode |
| `clearOrder()` | Remove all line items |
| `completeOrder()` | Mark order as completed |
| `setPayment(amount)` | Record payment amount |
| `getPaymentReceived()` | Get current payment amount |
| `applyCoupon(code)` | Apply coupon to order |
| `removeCoupon()` | Remove coupon from order |
| `setNote(note)` | Set customer note |
| `setCustomer(customer)` | Set billing/customer info |
| `print(type)` | Print bill or KOT |
| `openDrawer()` | Open cash drawer |
| `navigateToNextOrder()` | Navigate after order completion |

---

### 5. /done Command Enhancement

**Current Behavior:** `/done` only completes order if fully paid.

**New Behavior:** `/done [amount]` accepts optional payment amount.

**Examples:**
- `/done` - Complete if already paid
- `/done 500` - Add 500 payment, then complete if total covered

**Acceptance Criteria:**
- [ ] `/done` without amount works as before (requires existing payment)
- [ ] `/done 500` adds payment of 500, then completes if sufficient
- [ ] Shows change if overpaid
- [ ] Navigates away after completion
- [ ] Completed order removed from sidebar

---

### 6. Remove Completed Orders from Sidebar

**Current State:** Completed orders may still appear in sidebar.

**Target State:** Only pending/processing/on-hold/draft orders in sidebar.

**Acceptance Criteria:**
- [ ] Completed orders filtered out of sidebar query
- [ ] Order disappears from sidebar immediately after `/done`

---

## New Feature: Today's Orders Modal

### Overview

Click the connectivity indicator (online/offline status) to open a modal showing all orders from today. Provides quick access to view receipts and reopen orders for editing.

### UI Design

```
┌─────────────────────────────────────────────────────────────────┐
│  Today's Orders                                            [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────┐  ┌──────────────────┐ │
│  │ Order ID │ Server │ Status │ Total  │  │                  │ │
│  ├──────────┼────────┼────────┼────────┤  │   Receipt        │ │
│  │ A3X9K2   │ #1234  │ ✓ Sync │ 45  │  │   Preview        │ │
│  │ B7Y2M4   │ #1235  │ ✓ Sync │ 32.50  │  │                  │ │
│  │ C9Z1P8   │ --     │ ⏳ Pend│ 28     │  │   (Select order  │ │
│  │ D4W6Q3   │ #1236  │ ✓ Sync │ 67.25 │  │    to preview)   │ │
│  │ ...      │        │        │        │  │                  │ │
│  └─────────────────────────────────────┘  │                  │ │
│                                           │  [Reopen Order]  │ │
│  Showing 15 orders • 523.75 total        └──────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Behavior

**Trigger:** Click on `OfflineIndicator` component in sidebar.

**Order List (Left Panel):**
- Shows all orders created today (any status)
- Columns: Frontend ID, Server ID (or "--" if not synced), Sync Status, Total
- Sorted by creation time (newest first)
- Selected row highlighted
- Summary footer: order count, total revenue

**Receipt Preview (Right Panel):**
- Shows when an order is selected
- Uses existing `BillPrint` component for consistent formatting
- "Reopen Order" button at bottom

**Reopen Order:**
- Navigates to `/orders/{frontendId}`
- If order was completed, changes status back to "pending"
- Closes the modal

### Acceptance Criteria

- [ ] Click on OfflineIndicator opens Today's Orders modal
- [ ] Modal shows all orders from today (all statuses)
- [ ] Order list shows frontend ID, server ID, sync status, total
- [ ] Clicking an order shows receipt preview on right
- [ ] "Reopen Order" button navigates to order and sets status to pending if needed
- [ ] Summary shows order count and total revenue
- [ ] Modal can be closed (X button, Escape key, backdrop click)

---

## Technical Implementation

### File Changes

| File | Change |
|------|--------|
| `components/pos-command-input.tsx` | Implement complete CommandContext |
| `commands/done.ts` | Add optional payment amount parameter |
| `stores/offline-orders.ts` | Add `listTodaysOrders()` function |
| `stores/orders.ts` | Fix sidebar query to exclude completed, fix sorting |
| `lib/order-utils.ts` | **New file** - Order total calculation |
| `app/components/OfflineIndicator.tsx` | Add click handler to open modal |
| `app/components/TodaysOrdersModal.tsx` | **New file** - Today's orders modal |
| `app/orders/[orderId]/components/coupon-card.tsx` | Handle local order updates |

### Order Total Calculation

```typescript
// lib/order-utils.ts
export function calculateOrderTotal(order: OrderSchema): string {
  const subtotal = order.line_items.reduce((sum, item) => {
    const price = parseFloat(item.price || '0');
    return sum + (price * item.quantity);
  }, 0);

  const discount = parseFloat(order.discount_total || '0');
  const shipping = order.shipping_lines?.reduce((sum, line) => {
    return sum + parseFloat(line.total || '0');
  }, 0) || 0;

  return (subtotal - discount + shipping).toFixed(2);
}
```

---

## Success Metrics

1. All POS commands work correctly (/item, /pay, /done, /clear, /coupon)
2. Order totals display correctly for offline orders
3. Coupons persist for local orders
4. Completed orders removed from sidebar
5. Today's Orders modal accessible and functional
6. E2E test pass rate improves from 64% to 85%+
