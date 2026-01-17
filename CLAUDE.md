# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Simple POS is a WooCommerce-based Point of Sale system:

- **WordPress Plugin** (`simple-pos.php`) - Backend extending WooCommerce with POS-specific REST endpoints
- **Next.js Frontend** (`/next/`) - React-based POS interface (active development)
- **Vue.js Frontend** (`/front-end/`) - Legacy reference implementation (do not modify, reference only)

The ultimate goal is to package the Next.js frontend into an Electron app for Windows.

## Development Commands

```bash
cd next
npm install
npm run dev          # Development server with Turbopack
npm run build        # Production build
npm run lint         # Next.js linting
```

### WordPress Backend (wp-env)
```bash
cd next
npm run wp-env:start   # Start WordPress environment (port 8888)
npm run wp-env:stop    # Stop WordPress environment
```

The wp-env configuration is in `/next/.wp-env.json` and automatically:
- Installs WooCommerce
- Loads the Simple POS plugin from the parent directory
- Configures WooCommerce settings for testing

## Architecture

### Technology Stack
- **Framework**: Next.js 15 with React 19
- **State Management**: TanStack React Query (server state) + Zustand (client state)
- **Local Database**: Dexie.js (IndexedDB wrapper for offline-first storage)
- **UI Framework**: HeroUI + Tailwind CSS
- **Type Safety**: TypeScript + Zod validation
- **Icons**: Hugeicons React

### Design Principles
- **SOLID principles** - Single responsibility, interface segregation
- **Command Pattern** - All POS operations implemented as commands
- **Repository Pattern** - API layer abstracts data access
- **Offline-First** - Local storage with background sync to server
- **Optimistic Updates** - Immediate UI feedback with background sync
- **Debounced Mutations** - Prevent excessive API calls

### Directory Structure
```
/next/
├── api/                    # API client layer (Repository pattern)
│   ├── api.ts              # Base Axios client with auth
│   ├── orders.ts           # Order operations + Zod schemas
│   ├── products.ts         # Product catalog
│   ├── customers.ts        # Customer management
│   ├── coupons.ts          # Coupon operations + validation
│   └── shipping.ts         # Shipping methods
├── db/                     # Local database (Dexie.js)
│   └── index.ts            # Database schema and helpers
├── lib/                    # Utility libraries
│   ├── frontend-id.ts      # Frontend ID generation
│   └── escpos/             # ESC/POS printer rendering
├── services/               # Background services
│   └── sync.ts             # Order synchronization service
├── stores/                 # State management (TanStack Query hooks)
│   ├── orders.ts           # Order queries and mutations
│   ├── offline-orders.ts   # Local order CRUD operations
│   ├── products.ts         # Product catalog queries
│   ├── settings.ts         # Settings store (payment methods, printers)
│   ├── coupons.ts          # Coupon validation hook
│   └── service.ts          # Table/delivery service queries
├── commands/               # Command pattern implementation
│   ├── command.ts          # Base interfaces and classes
│   ├── command-registry.ts # Command registration and routing
│   ├── command-manager.ts  # Execution coordination
│   └── [command].ts        # Individual command implementations
├── hooks/                  # Custom React hooks
│   └── useConnectivity.ts  # Network status monitoring
├── components/             # Shared UI components
│   └── print/              # Print preview components
└── app/                    # Next.js App Router pages
    ├── components/         # App-level components
    │   ├── settings/       # Settings modal tabs
    │   └── OfflineIndicator.tsx  # Connectivity status
    └── orders/             # Order management pages
```

## Command System Architecture

The command system is the core interaction pattern for fast POS operation.

### Command Interface
```typescript
interface Command {
  getMetadata(): CommandMetadata;
  matches(keyword: string): boolean;
  execute(args: string[]): Promise<void>;
  getAutocompleteSuggestions(partialInput: string): CommandSuggestion[];
}
```

### Multi-Input Mode
Commands can enter a persistent input mode for rapid entry:
- `/item` enters item mode with `item>` prompt
- Type `SKU [quantity]` repeatedly without command prefix
- `/` exits multi-input mode

### Commands

| Command | Aliases | Status | Description |
|---------|---------|--------|-------------|
| `item` | `i` | ✅ | Set or increment line item quantity by SKU |
| `clear` | `cl` | ✅ | Clear current order |
| `pay` | `p` | ✅ | Record payment amount |
| `done` | `dn`, `d` | ✅ | Complete order (checkout) |
| `coupon` | `c`, `discount` | ✅ | Apply/remove discount codes |
| `print` | `pr` | ✅ | Print receipts/KOT |
| `customer-info` | `ci` | ❌ | Add customer details |
| `last-order` | `last` | ❌ | View last completed order |
| `drawer` | `cash` | ❌ | Open cash drawer |
| `manage-stock` | `stock` | ❌ | Update inventory |

### Item Command Behavior
- `/item SKU` - Increment quantity by 1
- `/item SKU 5` - Set quantity to 5
- `/item SKU 0` - Remove item from order

## API Integration

### Authentication
- **Development**: WP Nonce (same-origin)
- **Production**: Consumer Key/Secret

### Key Endpoints
- `GET/POST /wp-json/wc/v3/orders` - Order CRUD
- `GET /wp-json/wc/v3/products` - Product catalog
- `GET /wp-json/wc/v3/customers` - Customer search
- `GET /wp-json/wc/v3/coupons` - Coupon lookup
- `GET /wp-json/wc/v3/shipping_methods/local_pickup` - Table locations

### Order Update Pattern
WooCommerce requires specific handling for line items:
1. Set existing line item quantity to 0 (marks for deletion)
2. Add new line item with desired quantity
3. Send deletions before additions in array order

## Implementation Status

See `/next/FEATURES.md` for detailed feature documentation.

### Complete
- API client layer with Zod validation
- Order queries with optimistic updates
- Product catalog with variations
- Command infrastructure (registry, manager, base classes)
- Item command with multi-input mode
- Multi-order management (URL-based routing)
- Service/table selection
- Customer info and notes
- Payment tracking via meta_data
- Offline-first architecture with Dexie.js
- Frontend ID system for local order identification
- Configurable payment methods
- Coupon validation card with real-time feedback
- Printing system (Bill and KOT with ESC/POS support)
- Settings management (payment methods, printers)

### In Progress
- Additional command implementations

### Not Started
- Reporting

## Vue.js Reference

The `/front-end/` directory contains the legacy Vue.js implementation. Use it as a reference for:
- Feature behavior and business logic
- Command implementations
- Print system architecture
- KOT change detection logic

**Do not modify Vue.js code** - it's reference only.

## Key Patterns to Follow

### Adding a New Command
1. Create file in `/next/commands/[command-name].ts`
2. Extend `BaseCommand` or `BaseMultiInputCommand`
3. Implement `getMetadata()`, `execute()`, `getAutocompleteSuggestions()`
4. Register in `command-registry.ts`

### Adding State Management
1. Create hook in `/next/stores/[domain].ts`
2. Use TanStack Query for server state
3. Implement optimistic updates in `onMutate`
4. Use `useDebounce` and `useAvoidParallel` for mutations

### Component Structure
1. Server components for data fetching where possible
2. Client components for interactivity
3. Use HeroUI components for consistent styling
4. Follow existing patterns in `/next/app/orders/`

## Offline-First Architecture

The POS operates with an offline-first approach, storing all order data locally in IndexedDB (via Dexie.js) and synchronizing with WooCommerce when online.

### Frontend ID System

Each order is assigned a unique 6-character alphanumeric **Frontend ID** (e.g., `A3X9K2`) for local identification.

**Format**: 6 characters from charset `A-Z, 0-9` (36 possible characters per position)

**Generation** (`/next/lib/frontend-id.ts`):
```typescript
// Generate cryptographically secure random ID
const id = generateFrontendId();  // Returns "A3X9K2"

// Generate unique ID with collision check against Dexie DB
const uniqueId = await generateUniqueFrontendId();

// Validate ID format
const isValid = isValidFrontendId("A3X9K2");  // true
```

**Storage**: Frontend ID is stored in order `meta_data` as `pos_frontend_id` key and persists after sync.

### Local Database Schema

```typescript
// /next/db/index.ts
interface LocalOrder {
  frontendId: string;      // Primary key (6-char alphanumeric)
  serverId?: number;       // WooCommerce order ID (null until synced)
  status: OrderStatus;     // draft, pending, processing, completed, failed
  syncStatus: SyncStatus;  // local, syncing, synced, error
  data: OrderSchema;       // Full order data
  createdAt: Date;
  updatedAt: Date;
  lastSyncAttempt?: Date;
  syncError?: string;
}
```

### Order Lifecycle

1. **Create**: Order created locally with frontend ID, stored in Dexie
2. **Edit**: All changes saved to Dexie immediately, sync queued
3. **Complete**: Order marked complete locally, sync attempted
4. **Sync**: Background service pushes to WooCommerce, updates serverId

### URL Routing

- `/orders/{frontendId}` - Primary URL format (6-char ID)
- `/orders/{serverId}` - Legacy support, redirects to frontend ID URL
- Server orders are imported with generated frontend IDs

### Sync Service

```typescript
// /next/services/sync.ts

// Sync single order
const result = await syncOrder(frontendId);

// Process retry queue (exponential backoff: 30s, 1m, 2m, 5m, 10m max)
await processSyncQueue();

// Start background sync (every 30s when online)
startBackgroundSync((results) => console.log('Synced:', results));
```

### Connectivity Detection

The `useConnectivity` hook monitors network status:
- Browser `navigator.onLine` status
- API heartbeat check (30s interval)
- Sync queue count and status

The `OfflineIndicator` component displays status in the sidebar.

## Payment Methods Configuration

Payment methods are configurable via Settings > Payment Methods tab.

### Data Model

```typescript
interface PaymentMethodConfig {
  key: string;    // Unique identifier (auto-generated from label)
  label: string;  // Display name
}
```

### Settings Store

```typescript
// /next/stores/settings.ts
const { paymentMethods, addPaymentMethod, removePaymentMethod } = useSettingsStore();

// Add new method
addPaymentMethod({ key: 'venmo', label: 'Venmo' });

// Remove method
removePaymentMethod('venmo');
```

### Default Methods

- bKash
- Nagad
- Card

Cash is always available and not configurable.

### Storage

Payment methods persist to localStorage via Zustand persist middleware.

## Coupon Validation

The CouponCard component provides real-time coupon validation before applying to orders.

### Validation Hook

```typescript
// /next/stores/coupons.ts
const {
  code, setCode,           // Coupon code input
  status,                  // idle, validating, valid, invalid, error
  coupon,                  // Full coupon data if valid
  summary,                 // Human-readable discount description
  error,                   // Error message if invalid
} = useCouponValidation();
```

### Discount Summary Examples

- "10% off entire order"
- "500 off orders over 2000"
- "Free shipping"
- "50 off selected products"

## Printing System

The printing system supports thermal printers via ESC/POS commands.

### Print Types

| Type | Component | Renderer |
|------|-----------|----------|
| Bill | `BillPrint.tsx` | `bill-renderer.ts` |
| KOT | `KotPrint.tsx` | `kot-renderer.ts` |

### Frontend ID in Prints

- **Primary**: Frontend ID displayed as order number (e.g., "Order: A3X9K2")
- **Secondary**: Server ID shown as small reference if synced (e.g., "Ref: #1234")
