# Activity Log

Last updated: 2026-01-17
Tasks completed: 12
---

## [2026-01-17] - Task 1: Fix sidebar order sorting - new orders should appear at the end (bottom)

### Changes Made
- Modified `/Users/adnan/Projects/simple-pos/next/stores/orders.ts`:
  - Added sorting logic to `useCombinedOrdersStore` queryFn
  - Combined orders are now sorted by `date_created` ascending (oldest first, newest at bottom)
  - This ensures new orders appear at the bottom of the sidebar list

### Technical Details
- The `useCombinedOrdersStore` hook combines server orders with local orders
- Previously, orders were not explicitly sorted after combination
- Added sort: `combinedOrders.sort((a, b) => dateA - dateB)` where dates are parsed from `date_created`
- Orders without `date_created` default to timestamp 0 (appear first)

### Verification
- Build passes: `npm run build` completes successfully
- TypeScript compilation passes without errors
- The sorting logic handles null/undefined `date_created` values gracefully

### Commit
- fix: sort sidebar orders by createdAt ascending (newest at bottom)

---

## [2026-01-17] - Task 2: Fix local order total calculation - totals show 0 for offline orders

### Changes Made
- Created `/Users/adnan/Projects/simple-pos/next/lib/order-utils.ts`:
  - `calculateOrderTotal(order)` - Calculates total from line_items, discount_total, and shipping_lines
  - `calculateSubtotal(lineItems)` - Calculates subtotal before discounts and shipping
  - `calculateDiscountTotal(couponLines)` - Sums discounts from coupon lines
  - `calculateShippingTotal(shippingLines)` - Sums totals from shipping lines
  - Formula: total = subtotal - discount_total + shipping_total

- Modified `/Users/adnan/Projects/simple-pos/next/stores/offline-orders.ts`:
  - Added import for `calculateOrderTotal` and `calculateSubtotal` from `lib/order-utils`
  - Added logic in `updateLocalOrder()` to recalculate totals when:
    - `line_items` are updated
    - `shipping_lines` are updated
    - `coupon_lines` are updated
    - `discount_total` is updated
  - Automatically sets both `subtotal` and `total` fields on the order data

### Technical Details
- WooCommerce calculates totals server-side, so local orders were showing $0.00
- Now when any price-affecting field is updated, totals are recalculated client-side
- Price values are parsed as floats and converted to strings with 2 decimal places
- Handles edge cases: null/undefined prices default to 0

### Verification
- Build passes: `npm run build` completes successfully
- TypeScript compilation passes: `npx tsc --noEmit` with no errors
- E2E tests could not be run (Docker not running) but code logic verified manually

### Commit
- fix: calculate order totals client-side for local offline orders

---

## [2026-01-17] - Task 3: Create test coupons in wp-env for coupon testing

### Changes Made
- Modified `/Users/adnan/Projects/simple-pos/next/scripts/dev-setup.js`:
  - Added `TEST_COUPONS` constant array defining two test coupons:
    - `testcoupon`: 10% percentage discount
    - `fixedcoupon`: $50 fixed cart discount
  - Added `couponExists()` function to check if a coupon already exists via WooCommerce REST API
  - Added `createCoupon()` function to create a coupon via WooCommerce REST API POST request
  - Added `setupTestCoupons()` function that iterates through TEST_COUPONS and creates them if they don't exist (idempotent)
  - Added Step 5 to main() function that calls setupTestCoupons after credentials are saved
  - Updated script header comment to document the new coupon creation step

### Technical Details
- Coupons are created using WooCommerce REST API `/wp-json/wc/v3/coupons`
- The script is idempotent: it checks if each coupon exists before creating
- Uses the same HTTP authentication pattern as existing credential testing functions
- Coupon creation is non-fatal: if it fails, setup continues and logs the error
- Created coupons match the codes expected by E2E tests in `coupon-command.spec.ts`

### Verification
- Syntax check passes: `node --check scripts/dev-setup.js`
- Build passes: `npm run build` completes successfully
- Docker not running, so wp-env verification could not be performed
- Code follows existing patterns in the script for HTTP requests

### Commit
- chore: add test coupon creation to dev-setup script
