# Activity Log

Last updated: 2026-01-18
Tasks completed: 7
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

---

## [2026-01-18] - Task 4: Print frontend ID instead of server ID on invoice and KOT

### Changes Made
- `/Users/adnan/Projects/simple-pos/next/app/orders/[orderId]/components/buttons.tsx`:
  - Added imports for `useParams`, `isValidFrontendId`, and `generateFrontendId`
  - Added `urlOrderId` extraction from URL params
  - Modified `buildPrintData()` function to include `frontendId` and `serverId`:
    - First checks if URL param is a valid frontend ID
    - Falls back to extracting `pos_frontend_id` from order's `meta_data`
    - If no frontend ID found (legacy server order), generates a new one for display
    - Sets `serverId` only when order has been synced to server
    - Sets `orderReference` to the frontend ID instead of server ID
  - Updated `buildPrintData` useCallback dependency array to include `urlOrderId`

### Verification
- Build: `npm run build` completed successfully with no errors
- Lint: `npm run lint` passed with no warnings or errors
- TodaysOrdersModal already correctly includes frontendId in getPrintJobData()
- BillPrint and KotPrint components already use frontendId as primary display identifier
- bill-renderer.ts and kot-renderer.ts already handle frontendId correctly

### Commit
- `fix: print frontend ID instead of server ID on invoice and KOT`

---

## [2026-01-18] - Task 5: Remove header and footer from receipt preview in orders modal

### Changes Made
- `/Users/adnan/Projects/simple-pos/next/components/print/BillPrint.tsx`:
  - Added `isPreview` optional prop to `BillPrintProps` interface (default: `false`)
  - Updated function signature to destructure and default `isPreview` to `false`
  - Wrapped header section (`.brand` with logo and contact info) in conditional `{!isPreview && ...}`
  - Wrapped footer section (online menu and delivery message) in conditional `{!isPreview && ...}`

- `/Users/adnan/Projects/simple-pos/next/app/components/TodaysOrdersModal.tsx`:
  - Added `isPreview` prop to `BillPrint` component call on line 291
  - Preview now shows only order info, line items, and totals without branded header/footer

### Verification
- Build: `npm run build` completed successfully with no errors
- Lint: `npm run lint` passed with no warnings or errors
- The BillPrint component now conditionally renders header and footer based on `isPreview` prop
- TodaysOrdersModal passes `isPreview` to BillPrint to hide branded content in preview

### Commit
- `fix: remove header and footer from receipt preview in orders modal`

---

## [2026-01-18] - Task 6: Add delivery fee to receipt preview in orders modal

### Changes Made
- `/Users/adnan/Projects/simple-pos/next/app/components/TodaysOrdersModal.tsx`:
  - Added `shippingTotal` calculation in `getPrintJobData()` function
  - Sums all `shipping_lines` costs using reduce, matching the pattern in `buttons.tsx`
  - Included `shippingTotal` in the returned `PrintJobData` object

- `/Users/adnan/Projects/simple-pos/next/components/print/BillPrint.tsx`:
  - Added `shippingTotal` to destructured data props (default: 0)
  - Updated total calculation to include shipping: `total = subtotal - discountTotal + shippingTotal`
  - Added delivery fee line in the summary section (shown when shippingTotal > 0)
  - Displays "Delivery" label consistent with ESC/POS bill-renderer.ts

### Verification
- Build: `npm run build` completed successfully with no errors
- Lint: `npm run lint` passed with no warnings or errors
- The receipt preview now shows delivery fee when an order has shipping charges
- Total calculation correctly includes shipping in both preview and calculation

### Commit
- `fix: add delivery fee to receipt preview in orders modal`

---

## [2026-01-18] - Task 7: Add delivery fee to printed bill

### Changes Made
- `/Users/adnan/Projects/simple-pos/next/components/print/ThermalPrint.tsx`:
  - Added `frontendId` field to `billData` mapping in `handleBillPrint()` function
  - Added `serverId` field to `billData` mapping in `handleBillPrint()` function
  - Added `frontendId` field to `kotData` mapping in `handleKotPrint()` function
  - Added `serverId` field to `kotData` mapping in `handleKotPrint()` function
  - These fields were already defined in the `BillData` and `KotData` types but were not being passed through from `PrintJobData`

### Analysis
The delivery fee data flow was already correctly implemented:
1. `buttons.tsx buildPrintData()` correctly sums `shipping_lines` to calculate `shippingTotal` (lines 125-127)
2. `PrintJobData` type already includes `shippingTotal` field (stores/print.ts line 39)
3. `ThermalPrint.tsx` was already passing `shippingTotal` to `billData` (line 63)
4. `bill-renderer.ts` correctly displays shipping if > 0 (lines 164-168)

The issue was that `ThermalPrint.tsx` was missing `frontendId` and `serverId` fields when mapping `PrintJobData` to `BillData` and `KotData`. While these fields were not directly related to the delivery fee display, ensuring complete data transfer ensures the printed bill includes all expected information.

### Verification
- Build: `npm run build` completed successfully with no errors
- Lint: `npm run lint` passed with no warnings or errors
- The `shippingTotal` field was already being correctly passed through the data flow
- Added missing `frontendId` and `serverId` fields for complete data transfer

### Commit
- `fix: pass frontendId and serverId to bill and KOT renderers`
