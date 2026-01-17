# Activity Log

Last updated: 2026-01-17T10:00:00Z
Tasks completed: 10
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

---

## [2026-01-17] - Task 6: Configure Dexie.js for offline storage

### Changes Made
- `/next/db/index.ts`:
  - Created new Dexie database configuration file
  - Defined `SimplePOSDatabase` class extending Dexie with:
    - `orders` table with indexes: frontendId (primary), serverId, status, syncStatus, updatedAt
    - `syncQueue` table with indexes: id (auto-increment), frontendId, nextRetryAt
  - Created TypeScript interfaces:
    - `SyncStatus` type: "local" | "syncing" | "synced" | "error"
    - `OrderStatus` type: matching WooCommerce order statuses
    - `LocalOrder` interface: full local order structure with frontendId, serverId, status, syncStatus, data (OrderSchema), timestamps, and sync error tracking
    - `SyncQueueEntry` interface: for retry logic with exponential backoff
  - Created helper functions:
    - `createLocalOrder()`: factory function to create new local orders with defaults
    - `calculateNextRetryTime()`: implements exponential backoff (30s, 1m, 2m, 5m, 10m max)
  - Exported singleton `db` instance for use throughout application

### Verification
- `npm run build` - Completed successfully with no errors
- `npm run lint` - No ESLint warnings or errors

### Commit
- `chore: configure Dexie.js for offline storage`

---

## [2026-01-17] - Task 7: Implement frontend ID generation utility

### Changes Made
- `/next/lib/frontend-id.ts`:
  - Created new utility file for frontend ID generation
  - Implemented `generateFrontendId()` function:
    - Uses `crypto.getRandomValues()` for cryptographically secure random generation
    - Generates 6 alphanumeric characters (A-Z, 0-9 charset)
    - Example outputs: "A3X9K2", "B7M2P4"
  - Implemented `checkCollision()` function:
    - Checks if a frontend ID already exists in Dexie database
    - Returns boolean indicating collision status
  - Implemented `generateUniqueFrontendId()` function:
    - Combines generation and collision checking
    - Retries up to maxAttempts (default: 10) if collision detected
    - Throws error if unable to generate unique ID after max attempts
  - Implemented `isValidFrontendId()` function:
    - Validates ID format (exactly 6 chars, all alphanumeric A-Z, 0-9)
    - Returns boolean for format validation
  - Exports constants: CHARSET (36 chars), ID_LENGTH (6)

### Verification
- `npm run build` - Completed successfully with no errors
- `npm run lint` - No ESLint warnings or errors

### Commit
- `feat: implement frontend ID generation utility`

---

## [2026-01-17] - Task 8: Create offline order store with Dexie integration

### Changes Made
- `/next/stores/offline-orders.ts`:
  - Created new store module for offline order management with Dexie integration
  - Implemented `OrderNotFoundError` class for error handling
  - Implemented `createLocalOrder()` function:
    - Generates unique frontend ID using `generateUniqueFrontendId()`
    - Creates local order record with defaults using `createLocalOrderRecord()` from db/index.ts
    - Stores order in Dexie and returns the created LocalOrder
  - Implemented `updateLocalOrder()` function:
    - Updates existing order data in Dexie
    - Merges updates with existing data (handles line_items, shipping_lines, coupon_lines, billing separately)
    - Preserves frontend ID in meta_data
    - Updates `updatedAt` timestamp
  - Implemented `updateLocalOrderSyncStatus()` function:
    - Updates sync status (local, syncing, synced, error)
    - Optionally updates serverId, syncError, lastSyncAttempt
    - Clears syncError when status is not error
    - Updates server ID in order data meta_data when synced
  - Implemented `updateLocalOrderStatus()` function:
    - Updates order status (draft, pending, completed, etc.)
    - Updates both local status and data.status fields
  - Implemented `getLocalOrder()` function:
    - Retrieves order by frontend ID
  - Implemented `getLocalOrderByServerId()` function:
    - Retrieves order by WooCommerce server ID
  - Implemented `listLocalOrders()` function:
    - Lists all orders sorted by updatedAt descending
    - Supports filtering by status and/or syncStatus
    - Supports limit parameter
  - Implemented `listOrdersNeedingSync()` function:
    - Returns orders with local or error sync status
  - Implemented `deleteLocalOrder()` function:
    - Deletes order by frontend ID
  - Implemented `clearAllLocalOrders()` function:
    - Clears all orders from local database
  - Implemented `importServerOrder()` function:
    - Imports WooCommerce orders into local DB
    - Checks for existing orders by server ID
    - Generates frontend ID if not provided
    - Sets syncStatus to synced
  - Implemented `getOrderCountsBySyncStatus()` function:
    - Returns counts for each sync status
  - Implemented `hasPendingSyncOrders()` function:
    - Checks if any orders need syncing
  - Implemented `mergeMetaData()` helper function:
    - Merges meta_data arrays preserving frontend ID

### Verification
- `npm run build` - Completed successfully with no errors
- `npm run lint` - No ESLint warnings or errors

### Commit
- `feat: create offline order store with Dexie integration`

---

## [2026-01-17] - Task 9: Create sync service for order synchronization

### Changes Made
- `/next/services/sync.ts`:
  - Created new sync service module for order synchronization with WooCommerce
  - Implemented `SyncResult` interface with success, frontendId, serverId, and error fields
  - Implemented `SyncOptions` interface with force option
  - Implemented `syncOrder()` function:
    - Syncs a single order to WooCommerce server
    - Marks order as syncing during sync attempt
    - Creates new order (POST) or updates existing order (PUT) based on serverId presence
    - Updates syncStatus to synced on success with serverId
    - Updates syncStatus to error on failure with error message
    - Adds failed syncs to sync queue for retry
  - Implemented `prepareOrderForSync()` helper function:
    - Prepares order data for WooCommerce API
    - Extracts relevant fields: status, customer_id, line_items, shipping_lines, coupon_lines, customer_note, billing, meta_data
  - Implemented `addToSyncQueue()` function:
    - Adds or updates sync queue entry for failed syncs
    - Increments retry count on subsequent failures
    - Uses exponential backoff from db/index.ts
  - Implemented `removeFromSyncQueue()` function:
    - Removes order from sync queue after successful sync
  - Implemented `getQueuedOrdersReadyForRetry()` function:
    - Gets orders from sync queue where nextRetryAt <= now
  - Implemented `processSyncQueue()` function:
    - Processes all orders ready for retry from the queue
    - Also syncs orders with 'local' status not in queue
  - Implemented `syncAllPendingOrders()` function:
    - Syncs all orders that need syncing (local or error status)
  - Implemented `getSyncQueueCount()` and `getSyncQueueEntries()` functions:
    - Query sync queue for status monitoring
  - Implemented `clearSyncQueue()` function:
    - Clears entire sync queue
  - Implemented background sync interval management:
    - `startBackgroundSync()`: Starts 30-second interval, accepts callback for sync completion
    - `stopBackgroundSync()`: Stops interval and clears callbacks
    - `isBackgroundSyncRunning()`: Checks if background sync is active
    - `triggerImmediateSync()`: Triggers sync outside regular interval
    - `removeBackgroundSyncCallback()`: Removes specific callback
  - Background sync only runs when navigator.onLine is true
- `/next/services/index.ts`:
  - Created index file to export all services

### Verification
- `npm run build` - Completed successfully with no errors
- `npm run lint` - No ESLint warnings or errors

### Commit
- `feat: create sync service for order synchronization`

---

## [2026-01-17] - Task 10: Implement connectivity detection and offline indicator

### Changes Made
- `/next/hooks/useConnectivity.ts`:
  - Created new React hook for monitoring network connectivity
  - Monitors `navigator.onLine` status for browser-level connectivity
  - Implements heartbeat check to verify actual API connectivity (30s interval)
  - Uses lightweight API endpoints (/system_status, /products) for heartbeat
  - 5 second timeout on heartbeat requests
  - Tracks sync counts from Dexie database (local, syncing, synced, error)
  - Provides `triggerSync` function for manual sync
  - Provides `checkConnectivity` function for forced connectivity check
  - Returns: status, isOnline, isOffline, isChecking, pendingSyncCount, syncCounts, hasErrors, lastHeartbeat
  - Properly handles window event listeners (online/offline) with cleanup
  - Server-safe with typeof checks for navigator and window

- `/next/app/components/OfflineIndicator.tsx`:
  - Created new component for displaying connectivity status in sidebar
  - Shows status icon (Wifi/WifiDisconnected) with color-coded background:
    - Green (bg-green-50): Online
    - Yellow (bg-yellow-50): Checking connection
    - Red (bg-red-50): Offline
  - Displays pending sync count with Chip component
  - Shows sync button (ArrowReloadHorizontal icon) when orders pending
  - Sync button disabled when offline or syncing
  - Error indicator (Alert02Icon) when syncs have failed
  - Warning messages for offline state with pending orders
  - Uses HeroUI components: Button, Spinner, Tooltip, Chip
  - Uses Hugeicons: Wifi01Icon, WifiDisconnected01Icon, ArrowReloadHorizontalIcon, Alert02Icon

- `/next/app/components/sidebar.tsx`:
  - Added import for OfflineIndicator component
  - Restructured layout to flex column with h-full for proper positioning
  - Wrapped orders list in flex-1 overflow-y-auto for scrolling
  - Added OfflineIndicator at bottom of sidebar with mt-auto pt-4

- `/next/hooks/index.ts`:
  - Added export for useConnectivity hook and its types (ConnectivityStatus, SyncCounts, UseConnectivityReturn)

### Verification
- `npm run build` - Completed successfully with no errors
- `npm run lint` - No ESLint warnings or errors

### Commit
- `feat: implement connectivity detection and offline indicator`
