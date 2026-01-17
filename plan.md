# Project Plan

## Overview
Enhance Simple POS with configurable payment methods, coupon validation card, offline-first architecture using Dexie.js, and migrate development environment from docker-compose to wp-env.

**Reference:** `PRD.md`

---

## Task List

```json
[
  {
    "id": 1,
    "category": "setup",
    "description": "Remove docker-compose.yml and update documentation for wp-env",
    "steps": [
      "Remove docker-compose.yml from project root",
      "Update CLAUDE.md to document wp-env commands instead of docker-compose",
      "Verify .wp-env.json exists or create minimal config if needed"
    ],
    "passes": true
  },
  {
    "id": 2,
    "category": "feature",
    "description": "Add Payment Methods tab to settings modal",
    "steps": [
      "Add paymentMethods array to useSettingsStore with default values",
      "Create PaymentMethodsTab component with add/remove functionality",
      "Add tab to settings-modal.tsx after Printers tab",
      "Implement localStorage persistence for payment methods"
    ],
    "passes": true
  },
  {
    "id": 3,
    "category": "feature",
    "description": "Update payment-card.tsx to use configurable payment methods",
    "steps": [
      "Import payment methods from useSettingsStore",
      "Replace hardcoded ADDITIONAL_METHODS with settings-derived list",
      "Update PaymentAmounts interface to use dynamic keys",
      "Update split_payments serialization for dynamic methods"
    ],
    "passes": true
  },
  {
    "id": 4,
    "category": "feature",
    "description": "Create coupon validation API hook",
    "steps": [
      "Add getCouponByCode function to api/coupons.ts",
      "Create Zod schema for coupon validation response",
      "Create useCouponValidation hook with debounced validation",
      "Parse coupon to generate human-readable discount summary",
      "Handle API errors gracefully (invalid code, network error)"
    ],
    "passes": true
  },
  {
    "id": 5,
    "category": "feature",
    "description": "Create CouponCard component and add to order page",
    "steps": [
      "Create coupon-card.tsx in app/orders/[orderId]/components/",
      "Add input field with validation status indicator",
      "Display discount rule summary when valid",
      "Add Apply button to add coupon to order",
      "Position below customer info card in order page layout"
    ],
    "passes": true
  },
  {
    "id": 6,
    "category": "setup",
    "description": "Configure Dexie.js for offline storage (dexie already installed)",
    "steps": [
      "Create db/index.ts with Dexie database configuration",
      "Define orders, syncQueue tables schema",
      "Create TypeScript interfaces for LocalOrder"
    ],
    "passes": true
  },
  {
    "id": 7,
    "category": "feature",
    "description": "Implement frontend ID generation utility",
    "steps": [
      "Create lib/frontend-id.ts with ID generation function",
      "Use crypto.getRandomValues for secure random generation",
      "Format as 6 alphanumeric characters (A-Z, 0-9)",
      "Add collision check function against Dexie DB"
    ],
    "passes": true
  },
  {
    "id": 8,
    "category": "feature",
    "description": "Create offline order store with Dexie integration",
    "steps": [
      "Create stores/offline-orders.ts",
      "Implement createLocalOrder function",
      "Implement updateLocalOrder function",
      "Implement getLocalOrder and listLocalOrders functions",
      "Add sync status tracking (local, syncing, synced, error)"
    ],
    "passes": true
  },
  {
    "id": 9,
    "category": "feature",
    "description": "Create sync service for order synchronization",
    "steps": [
      "Create services/sync.ts with sync logic",
      "Implement syncOrder function to push local order to server",
      "Implement sync queue with retry logic",
      "Add exponential backoff (30s, 1m, 2m, 5m, max 10m)",
      "Create background sync interval (every 30s when online)"
    ],
    "passes": true
  },
  {
    "id": 10,
    "category": "feature",
    "description": "Implement connectivity detection and offline indicator",
    "steps": [
      "Create hooks/useConnectivity.ts",
      "Monitor navigator.onLine status",
      "Add heartbeat check to verify actual API connectivity",
      "Create OfflineIndicator component for header/sidebar",
      "Display pending sync count and manual sync button"
    ],
    "passes": true
  },
  {
    "id": 11,
    "category": "feature",
    "description": "Migrate order creation to use local-first approach",
    "steps": [
      "Update useDraftOrderState to create local order with frontend ID",
      "Modify order creation flow to save to Dexie first",
      "Update URL routing to use frontend ID (/orders/{frontendId})",
      "Keep draft order in Dexie until explicitly cleared"
    ],
    "passes": false
  },
  {
    "id": 12,
    "category": "feature",
    "description": "Update order queries to read from local DB first",
    "steps": [
      "Modify useOrderQuery to check Dexie first",
      "Fall back to server query if not in local DB",
      "Update useCurrentOrder for frontend ID support",
      "Handle both frontend ID and server ID in URLs"
    ],
    "passes": false
  },
  {
    "id": 13,
    "category": "feature",
    "description": "Update order mutations to save locally and queue sync",
    "steps": [
      "Modify useLineItemQuery mutations to save to Dexie",
      "Update useServiceQuery mutations for local storage",
      "Update usePaymentQuery mutations for local storage",
      "Queue sync operation after each mutation"
    ],
    "passes": false
  },
  {
    "id": 14,
    "category": "feature",
    "description": "Implement order completion with sync",
    "steps": [
      "Update done command to mark order complete locally",
      "Trigger sync attempt on completion",
      "Handle sync success (update serverId, syncStatus)",
      "Handle sync failure (add to retry queue)"
    ],
    "passes": false
  },
  {
    "id": 15,
    "category": "feature",
    "description": "Implement server order import",
    "steps": [
      "Detect server orders not in local DB during list fetch",
      "Generate frontend ID for imported orders",
      "Store imported orders in Dexie with syncStatus: synced",
      "Preserve frontend ID in order meta_data"
    ],
    "passes": false
  },
  {
    "id": 16,
    "category": "feature",
    "description": "Update printing to use frontend ID",
    "steps": [
      "Modify BillPrint.tsx to display frontend ID as order number",
      "Modify KotPrint.tsx to display frontend ID",
      "Show server ID only as small reference if synced",
      "Update print command to pass frontend ID"
    ],
    "passes": false
  },
  {
    "id": 17,
    "category": "documentation",
    "description": "Update documentation for new features",
    "steps": [
      "Update CLAUDE.md with offline architecture details",
      "Update CLAUDE.md with payment methods configuration",
      "Document frontend ID format and usage",
      "Update FEATURES.md with new feature status"
    ],
    "passes": false
  }
]
```
