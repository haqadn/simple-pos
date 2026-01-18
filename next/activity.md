# Activity Log

Last updated: 2026-01-18
Tasks completed: 3
Current task: None

---

## [2026-01-18] - Task 3: Create test coupon in wp-env for coupon testing

### Changes Made

**Created test coupons on both WordPress instances:**

1. Development instance (port 8888):
   - Ran `npm run dev:setup` which already has coupon creation logic
   - `testcoupon` - 10% off entire order
   - `fixedcoupon` - $50 off cart

2. Test instance (port 8889):
   - Created coupons via WooCommerce REST API
   - `testcoupon` - 10% off entire order (ID: 1424)
   - `fixedcoupon` - $50 off cart (ID: 1425)

**The dev-setup.js script already contains coupon creation logic:**
- File: `/next/scripts/dev-setup.js` (lines 261-391)
- Creates `testcoupon` (10% discount) and `fixedcoupon` ($50 fixed discount)
- Automatically runs as part of Step 5 in the setup process

### Verification

1. API verification (port 8889):
   ```bash
   curl "http://localhost:8889/wp-json/wc/v3/coupons?code=testcoupon" -u "..."
   # Returns: {"code":"testcoupon","amount":"10.00","discount_type":"percent"...}
   ```

2. API verification (port 8888):
   ```bash
   curl "http://localhost:8888/wp-json/wc/v3/coupons?code=testcoupon" -u "..."
   # Returns: {"code":"testcoupon","amount":"10.00","discount_type":"percent"...}
   ```

3. E2E test verification:
   - Test: "can apply coupon with /coupon command" - PASSED
   - Test: "applied coupon shows discount in UI" - PASSED

### Commit
- chore: verify test coupons exist for coupon testing

---

## [2026-01-18] - Task 2: Fix local order total calculation - totals show 0 for offline orders

### Problem
When adding products to local orders, the Total field showed 0 even though line items were added correctly.

### Root Cause Analysis
1. Line items were created WITHOUT the `price` field in multiple places
2. The `calculateOrderTotal` function uses `item.price` but it was never being set
3. The optimistic update in `onMutate` wasn't recalculating totals

### Changes Made

**File: `/next/stores/orders.ts`**
1. Added import for `calculateOrderTotal` and `calculateSubtotal` from `lib/order-utils`
2. Added `price: product.price` to all line item creation locations:
   - Line 469: Frontend ID orders path
   - Line 580: patchLineItems for server orders
   - Line 607: newLineItem in onMutate optimistic update
   - Line 624: existing line item update in onMutate
3. Added total recalculation to optimistic update (lines 629-631):
   ```typescript
   newOrderQueryData.subtotal = calculateSubtotal(newOrderQueryData.line_items);
   newOrderQueryData.total = calculateOrderTotal(newOrderQueryData);
   ```

**File: `/next/app/orders/[orderId]/components/coupon-card.tsx`**
- Removed unused imports (updateLocalOrder, syncOrder, LocalOrder)
- Suppressed unused variable warning for isFrontendIdOrder (needed for Task 4)

### Browser Verification
- Created new order FZQ92T
- Added "Test Simple Product" (price 25) - Total updated to 25
- Added "Test Variable Product Small" (price 30) - Total updated to 55
- Total correctly sums all line items

### Build Status
- `npm run build` passes successfully

---

## [2026-01-18] - Task 1: Fix sidebar order sorting (pre-existing fix)

### Status
Code was already implemented by previous worker. Sorting by `date_created` ascending ensures new orders appear at bottom.

---
