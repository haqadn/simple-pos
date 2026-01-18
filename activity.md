# Activity Log

Last updated: 2026-01-18
Tasks completed: 3
Current task: None

---

## [2026-01-18] - Task 1: Fix sync timing - only sync orders when completed

### Changes Made
- `/Users/adnan/Projects/simple-pos/next/services/sync.ts`:
  - Added status check to `syncOrder()` function - only syncs orders with status 'completed' or 'processing'
  - Draft and pending orders now remain local-only until marked complete
  - Returns early with success if order status is not ready for sync

- `/Users/adnan/Projects/simple-pos/next/stores/orders.ts`:
  - Removed automatic `syncOrder()` calls from all frontend ID order mutations:
    - Line item updates (useLineItemQuery)
    - Service/shipping updates (useServiceQuery)
    - Note updates (useOrderNoteQuery)
    - Customer info updates (useCustomerInfoQuery)
    - Payment updates (usePaymentQuery)
  - Removed unused `syncOrder` import
  - Added comments explaining sync is not triggered on mutations

### Verification
- Build: `npm run build` completed successfully with no errors
- Lint: `npm run lint` passed with no warnings or errors
- The sync is now only triggered from `handleCompleteOrder()` in `command-bar.tsx` which is called when the done command completes an order

### Commit
- `fix: only sync orders when completed, not on every change`

---

## [2026-01-18] - Task 2: Fix item command after server sync - handle synced orders with serverId

### Changes Made
- `/Users/adnan/Projects/simple-pos/next/app/orders/[orderId]/components/order-page-client.tsx`:
  - Modified `handleAddProduct()` to handle synced orders that have a `serverId`
  - After saving to local Dexie database, checks if order has been synced (has `serverId`)
  - If synced, updates the WooCommerce server directly using `OrdersAPI.updateOrder()`
  - Uses proper WooCommerce line item update pattern (set quantity to 0 to delete, add new item)
  - Server update runs in background (async) to not block UI
  - Removed unused `syncOrder` import since direct API updates are now used for synced orders

### Verification
- Build: `npm run build` completed successfully with no errors
- Lint: `npm run lint` passed with no warnings or errors
- Logic verified: When adding items to a synced order (order with serverId), the change is:
  1. Saved to local Dexie database immediately for UI
  2. Sent to WooCommerce server via API update in background

### Commit
- `fix: handle item command for synced orders with serverId`

---

## [2026-01-18] - Task 3: Auto-fill short amount when selecting non-cash payment method

### Changes Made
- `/Users/adnan/Projects/simple-pos/next/app/orders/[orderId]/components/payment-card.tsx`:
  - Modified `handleAddMethod()` callback to auto-fill remaining balance when adding a non-cash payment method
  - Calculates remaining balance as `orderTotal - totalReceived`
  - When remaining > 0, automatically sets the new payment method's amount to the remaining balance
  - Saves the auto-filled payment immediately via `savePayments()`
  - Updated dependencies array to include `orderData?.total` and `totalReceived`

### Verification
- Build: `npm run build` completed successfully with no errors
- Lint: `npm run lint` passed with no warnings or errors
- Logic verified: When user selects a non-cash payment method (e.g., bKash, Nagad, Card):
  1. The method is added to active payment methods
  2. The remaining balance (total - totalReceived) is calculated
  3. If remaining > 0, the new method is auto-filled with that amount
  4. Payment is saved to order metadata

### Commit
- `feat: auto-fill remaining balance when selecting non-cash payment method`
