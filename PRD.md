# Product Requirements Document: Simple POS Enhancements

## Overview

This document outlines the requirements for four major enhancements to the Simple POS system:
1. **Configurable Payment Methods** - Replace hardcoded payment methods with user-configurable options
2. **Coupon Validation Card** - Add dedicated UI for coupon input with real-time validation feedback
3. **Offline-First Architecture** - Enable full offline operation with local-first data storage
4. **Development Environment Migration** - Replace docker-compose with wp-env

## Target Users
- POS operators in retail/restaurant environments
- Business owners configuring payment options
- Developers running E2E tests

---

## Feature 1: Configurable Payment Methods

### Current State
Payment methods are hardcoded in `payment-card.tsx`:
```typescript
const ADDITIONAL_METHODS = [
    { key: 'bkash', label: 'bKash' },
    { key: 'nagad', label: 'Nagad' },
    { key: 'card', label: 'Card' },
]
```

### Requirements

#### 1.1 Settings Tab
- Add new "Payment Methods" tab to the settings modal (`settings-modal.tsx`)
- Tab position: After "Printers" tab
- UI: List of payment method names with add/remove functionality

#### 1.2 Data Model
```typescript
interface PaymentMethodConfig {
  key: string;      // Unique identifier (auto-generated slug from label)
  label: string;    // Display name (user-provided)
}
```

#### 1.3 Storage
- Store in Zustand `useSettingsStore` under `paymentMethods` key
- Persist to localStorage with existing settings

#### 1.4 Payment Card Integration
- Replace hardcoded `ADDITIONAL_METHODS` with settings-derived list
- Update `PaymentAmounts` interface to use dynamic keys
- Update `split_payments` meta_data serialization to handle dynamic methods

#### 1.5 Acceptance Criteria
- [ ] User can add new payment method names in settings
- [ ] User can remove existing payment methods
- [ ] User can reorder payment methods (drag-drop or up/down arrows)
- [ ] Payment card shows configured methods in dropdown
- [ ] Existing orders with old payment methods continue to work
- [ ] Cash is always present (not configurable)

---

## Feature 2: Coupon Validation Card

### Current State
- Coupons applied via `/coupon <code>` command
- Validation happens server-side during order update
- Applied coupons display as chips in payment card
- No pre-validation feedback before applying

### Requirements

#### 2.1 New Component: CouponCard
Location: `app/orders/[orderId]/components/coupon-card.tsx`
Position: Below customer info card, above payment card

#### 2.2 UI Elements
- Input field for coupon code
- Apply button
- Validation status indicator:
  - Pending (gray): No code entered
  - Checking (yellow/spinner): Validating with server
  - Valid (green): Shows discount rule summary
  - Invalid (red): Shows error message

#### 2.3 Discount Rule Summary
Display human-readable discount description:
- "10% off entire order"
- "৳500 off orders over ৳2000"
- "Buy 2 Get 1 Free on Category X"
- "Free shipping"

#### 2.4 API Integration
- Use `GET /wp-json/wc/v3/coupons?code={code}` for validation
- Parse coupon response to extract:
  - `discount_type`: percent, fixed_cart, fixed_product
  - `amount`: discount value
  - `minimum_amount`: minimum order requirement
  - `maximum_amount`: maximum discount cap
  - `product_ids`, `product_categories`: applicable items
  - `usage_limit`, `usage_count`: availability

#### 2.5 Acceptance Criteria
- [ ] Coupon card displays below customer card
- [ ] Real-time validation as user types (debounced)
- [ ] Clear indication of valid/invalid status
- [ ] Summary line explains the discount rule
- [ ] Apply button adds coupon to order
- [ ] Applied coupons show in payment card (existing behavior)
- [ ] Multiple coupons support if WooCommerce allows

---

## Feature 3: Offline-First Architecture

### Current State
- Orders created directly on WooCommerce server
- Draft orders (id: 0) exist only in React state
- No persistence if browser refreshes before save
- App unusable when server unreachable

### Requirements

#### 3.1 Local Database (Dexie.js)
Schema:
```typescript
interface LocalOrder {
  frontendId: string;      // 6-char alphanumeric (e.g., "A3X9K2")
  serverId?: number;       // WooCommerce order ID (null until synced)
  status: 'draft' | 'pending' | 'processing' | 'completed' | 'failed';
  syncStatus: 'local' | 'syncing' | 'synced' | 'error';
  data: OrderSchema;       // Full order data
  createdAt: Date;
  updatedAt: Date;
  lastSyncAttempt?: Date;
  syncError?: string;
}
```

Database tables:
- `orders`: LocalOrder records
- `syncQueue`: Failed sync attempts for retry
- `settings`: Offline settings cache

#### 3.2 Frontend ID Generation
- Format: 6 alphanumeric characters (A-Z, 0-9)
- Example: `A3X9K2`, `B7M2P4`
- Generated client-side using `crypto.getRandomValues()`
- Collision check against local DB before use
- Stored in order `meta_data` as `pos_frontend_id`

#### 3.3 Order Lifecycle

**Create Order:**
1. Generate frontend ID
2. Create order in local Dexie DB with `syncStatus: 'local'`
3. Navigate to `/orders/{frontendId}` (URL uses frontend ID)
4. All edits save to local DB immediately

**Complete Order:**
1. User triggers `/done` command
2. Attempt to sync to WooCommerce:
   - Success: Update `serverId`, `syncStatus: 'synced'`
   - Failure: Keep `syncStatus: 'error'`, add to sync queue
3. Mark order as completed locally regardless of sync status

**Sync Logic:**
- Background sync attempts every 30 seconds when online
- Exponential backoff for failed syncs (30s, 1m, 2m, 5m, max 10m)
- Manual sync trigger via UI button
- Sync queue persists across browser sessions

#### 3.4 Server Order Import
When server returns orders not in local DB:
1. Assign new frontend ID
2. Store in local DB with `syncStatus: 'synced'`
3. Display in orders list with frontend ID

#### 3.5 Connectivity Detection
- Monitor `navigator.onLine` status
- Test actual API connectivity with heartbeat endpoint
- Visual indicator in UI: Online/Offline status
- Queue operations when offline, execute when online

#### 3.6 URL Routing Changes
- `/orders/new` -> `/orders/{frontendId}` (6-char ID)
- `/orders/{serverId}` -> Support for legacy deep links, redirect to frontend ID
- Order list shows frontend IDs

#### 3.7 Printing Updates
- KOT header: Show frontend ID (e.g., "Order: A3X9K2")
- Bill header: Show frontend ID
- Server ID shown only in small text if synced

#### 3.8 Acceptance Criteria
- [ ] Orders created locally without server connection
- [ ] All order edits persist to browser DB
- [ ] Browser refresh preserves order state
- [ ] Completed orders sync when server available
- [ ] Failed syncs retry automatically with backoff
- [ ] Server orders import with frontend IDs
- [ ] Print uses frontend ID, not server ID
- [ ] Offline indicator visible in UI
- [ ] Manual sync button available
- [ ] Works across browser sessions

---

## Feature 4: Development Environment Migration

### Current State
- `docker-compose.yml` with WordPress, MySQL, phpMyAdmin
- E2E tests expect `wp-env` but it's not configured
- Tests fail because `wp-env` package not found

### Requirements

#### 4.1 wp-env Configuration
Create `.wp-env.json` in project root:
```json
{
  "core": null,
  "phpVersion": "8.2",
  "plugins": ["."],
  "themes": [],
  "port": 8888,
  "testsPort": 8889,
  "config": {
    "WP_DEBUG": true,
    "SCRIPT_DEBUG": true
  },
  "mappings": {
    "wp-content/plugins/simple-pos": "."
  }
}
```

#### 4.2 Environment Split
- **Development** (port 8888): `http://localhost:8888`
  - Regular WordPress instance
  - Manual testing and development
- **Testing** (port 8889): `http://localhost:8889`
  - E2E test environment
  - Isolated from development data
  - Reset between test runs

#### 4.3 Package.json Scripts
```json
{
  "wp-env:start": "wp-env start",
  "wp-env:stop": "wp-env stop",
  "wp-env:clean": "wp-env clean",
  "wp-env:reset": "wp-env clean && wp-env start",
  "test:e2e": "wp-env start && node e2e/scripts/setup.js && playwright test"
}
```

#### 4.4 Docker Cleanup
- Remove `docker-compose.yml`
- Update `.gitignore` for wp-env directories
- Update `README.md` with new setup instructions
- Update `CLAUDE.md` development commands

#### 4.5 E2E Test Fixes
- Update test setup script to use correct wp-env commands
- Configure tests to use test environment (port 8889)
- Ensure test data seeding works with wp-env

#### 4.6 Acceptance Criteria
- [ ] `npm run wp-env:start` starts WordPress environment
- [ ] Development site accessible at localhost:8888
- [ ] Test site accessible at localhost:8889
- [ ] `npm run test:e2e` runs tests successfully
- [ ] Plugin auto-loads in wp-env
- [ ] docker-compose.yml removed
- [ ] Documentation updated

---

## Technical Architecture

### State Management Changes

```
┌─────────────────────────────────────────────────────────────┐
│                     Application State                        │
├─────────────────────────────────────────────────────────────┤
│  Zustand Stores                                              │
│  ├── useSettingsStore (paymentMethods, printers, etc.)      │
│  ├── useDraftOrderStore (current editing state)             │
│  └── useOfflineStore (sync status, queue)                   │
├─────────────────────────────────────────────────────────────┤
│  Dexie.js (IndexedDB)                                        │
│  ├── orders (LocalOrder[])                                   │
│  ├── syncQueue (FailedSync[])                               │
│  └── cache (products, customers)                            │
├─────────────────────────────────────────────────────────────┤
│  TanStack Query                                              │
│  ├── Server queries (products, customers, coupons)          │
│  └── Order queries (now read from Dexie first)              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow: Order Creation

```
User Action     Local State      Dexie DB        Server
     │               │               │              │
     │ Add Item      │               │              │
     ├──────────────>│ Update        │              │
     │               │ draft state   │              │
     │               ├──────────────>│ Persist      │
     │               │               │ locally      │
     │               │               │              │
     │ /done         │               │              │
     ├──────────────>│ Complete      │              │
     │               │ order         │              │
     │               ├──────────────>│ Mark         │
     │               │               │ completed    │
     │               │               ├─────────────>│ Sync
     │               │               │              │ attempt
     │               │               │<─────────────┤ Success/
     │               │               │ Update       │ Failure
     │               │               │ syncStatus   │
```

---

## Migration Strategy

### Phase 1: Settings & Coupon Card (No Breaking Changes)
1. Add payment methods settings tab
2. Add coupon validation card
3. Both features work with existing architecture

### Phase 2: Offline Foundation
1. Install Dexie.js
2. Create database schema
3. Implement frontend ID generation
4. Add offline indicator UI

### Phase 3: Order Migration
1. Modify order creation to use local DB
2. Update URL routing for frontend IDs
3. Implement sync logic
4. Update printing to use frontend IDs

### Phase 4: Development Environment
1. Create wp-env configuration
2. Remove docker-compose
3. Fix E2E tests
4. Update documentation

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during offline | High | Multiple sync retry attempts, clear sync status UI |
| ID collision | Medium | Cryptographic random + collision check |
| Sync conflicts | Medium | Server wins, notify user of conflicts |
| Browser storage limits | Low | IndexedDB has generous limits (50MB+) |
| wp-env compatibility | Low | Test on multiple OS before removing docker-compose |

---

## Success Metrics
- Zero data loss during offline operation
- < 100ms for local order operations
- E2E test pass rate > 95%
- Sync success rate > 99% when online
