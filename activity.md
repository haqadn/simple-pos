# Activity Log

Last updated: 2026-01-17T02:00:00Z
Tasks completed: 5
Current task: None

---

## [2026-01-17] - Task 1: Remove docker-compose.yml and update documentation for wp-env

### Changes Made
- Removed `/docker-compose.yml` from project root
- Updated `/CLAUDE.md` to replace docker-compose instructions with wp-env commands
- Verified `/next/.wp-env.json` already exists with proper configuration:
  - Installs WooCommerce latest stable
  - Loads Simple POS plugin from parent directory
  - Configures WooCommerce settings via lifecycle scripts

### Verification
- Confirmed docker-compose.yml no longer exists in project root
- Verified CLAUDE.md correctly documents wp-env commands (npm run wp-env:start/stop)
- Confirmed .wp-env.json has complete configuration with WooCommerce and plugin loading

### Commit
- `chore: migrate from docker-compose to wp-env`

---

## [2026-01-17] - Task 2: Add Payment Methods tab to settings modal

### Changes Made
- `/next/stores/settings.ts`:
  - Added `PaymentMethodConfig` interface with `key` and `label` fields
  - Added `paymentMethods` array to `Settings` interface
  - Added default payment methods: bKash, Nagad, Card (matching original hardcoded values)
  - Added store functions: `addPaymentMethod`, `updatePaymentMethod`, `removePaymentMethod`, `reorderPaymentMethods`
  - All changes persist to localStorage automatically
- `/next/app/components/settings/PaymentMethodsTab.tsx`:
  - Created new component for managing payment methods
  - Features: add new methods, edit labels, remove methods, reorder with up/down arrows
  - Key is auto-generated from label (lowercase, underscores, alphanumeric only)
  - Prevents duplicate keys
- `/next/app/components/settings-modal.tsx`:
  - Imported `PaymentMethodConfig` type and `PaymentMethodsTab` component
  - Added `localPaymentMethods` state for editing
  - Added save logic to sync payment methods with store
  - Added "Payment Methods" tab after "Printers" tab

### Verification
- `npm run build` - Completed successfully with no errors
- `npm run lint` - No ESLint warnings or errors

### Commit
- `feat: add Payment Methods tab to settings modal`

---

## [2026-01-17] - Task 3: Update payment-card.tsx to use configurable payment methods

### Changes Made
- `/next/app/orders/[orderId]/components/payment-card.tsx`:
  - Imported `useSettingsStore` from settings store
  - Removed hardcoded `ADDITIONAL_METHODS` array
  - Added `paymentMethods` from settings store: `useSettingsStore(state => state.paymentMethods)`
  - Changed `PaymentAmounts` from fixed interface to dynamic type: `{ cash: number } & Record<string, number>`
  - Updated `activeAdditionalMethods` to use `Set<string>` instead of `Set<PaymentMethodKey>`
  - Refactored `storedPayments` parsing to dynamically detect active methods from any key
  - Updated `totalReceived` calculation to use `Object.values(payments).reduce()` for dynamic summing
  - Updated `savePayments` total calculation to dynamically sum all payment amounts
  - Changed handler functions (`handlePaymentChange`, `handleAddMethod`, `handleRemoveMethod`) to use `string` type
  - Updated `availableMethods` to filter from `paymentMethods` instead of `ADDITIONAL_METHODS`
  - Refactored additional payment methods rendering to iterate over `activeAdditionalMethods` with fallback for legacy methods

### Verification
- `npm run build` - Completed successfully with no errors
- `npm run lint` - No ESLint warnings or errors

### Commit
- `feat: update payment-card to use configurable payment methods`

---

## [2026-01-17] - Task 4: Create coupon validation API hook

### Changes Made
- `/next/api/coupons.ts`:
  - Added `CouponSchema` Zod schema with all WooCommerce coupon fields (id, code, amount, discount_type, minimum_amount, maximum_amount, product_ids, product_categories, usage_limit, usage_count, free_shipping, etc.)
  - Added `CouponValidationResult` interface with isValid, coupon, summary, and error fields
  - Added `generateCouponSummary()` function that creates human-readable discount descriptions:
    - Handles percent, fixed_cart, and fixed_product discount types
    - Shows scope (entire order, selected products, selected categories)
    - Shows minimum order requirements and maximum discount caps
    - Shows free shipping and usage limit information
  - Added `validateCoupon()` function that checks coupon validity (status, expiration, usage limits)
  - Added `getCouponByCode()` static method to fetch and validate coupons from WooCommerce API
- `/next/stores/coupons.ts`:
  - Created `CouponValidationStatus` type (idle, validating, valid, invalid, error)
  - Created `UseCouponValidationReturn` interface for hook return type
  - Created `useCouponValidation()` hook with:
    - Debounced validation (default 500ms delay)
    - TanStack Query for caching (30 second stale time)
    - Status tracking (idle, validating, valid, invalid, error)
    - Error handling for network errors and invalid coupons
    - Methods: setCode, clear, validate
    - Returns: code, status, result, coupon, summary, error, isLoading
  - Created `generateCouponQueryKey()` helper function

### Verification
- `npm run build` - Completed successfully with no errors
- `npm run lint` - No ESLint warnings or errors

### Commit
- `feat: add coupon validation API hook`

---

## [2026-01-17] - Task 5: Create CouponCard component and add to order page

### Changes Made
- `/next/app/orders/[orderId]/components/coupon-card.tsx`:
  - Created new CouponCard component with:
    - Input field for coupon code entry
    - Real-time validation using `useCouponValidation` hook (debounced 500ms)
    - Status indicator showing validation state (spinner for validating, checkmark for valid, X for invalid, warning for error)
    - Color-coded input border based on status (success/danger/warning)
    - Description field showing discount summary when valid or error message when invalid
    - Apply button that adds coupon to the order via WooCommerce API
    - Support for Enter key to apply valid coupons
    - Info text showing count of already applied coupons
  - Uses HugeiconsIcon components (CheckmarkCircle02Icon, Cancel01Icon, Alert02Icon)
  - Follows existing card styling patterns (Card with border, CardBody, underlined inputs)
  - Uses useMemo to optimize appliedCoupons dependency
  - Proper TypeScript types with CouponLineSchema

- `/next/app/orders/[orderId]/page.tsx`:
  - Added import for CouponCard component
  - Positioned CouponCard below CustomerInfo in the right column layout

### Verification
- `npm run build` - Completed successfully with no errors
- `npm run lint` - No ESLint warnings or errors

### Commit
- `feat: add CouponCard component to order page`
