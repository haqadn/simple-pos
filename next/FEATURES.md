# Simple POS - Feature Documentation

This document provides comprehensive documentation of all POS features, their implementation status, and architectural details.

---

## Table of Contents

1. [Command System](#1-command-system)
2. [Order Management](#2-order-management)
3. [Product Catalog](#3-product-catalog)
4. [Cart & Line Items](#4-cart--line-items)
5. [Customer Management](#5-customer-management)
6. [Payment Processing](#6-payment-processing)
7. [Service Selection (Tables/Delivery)](#7-service-selection-tablesdelivery)
8. [Multi-Order Management](#8-multi-order-management)
9. [Coupon & Discount System](#9-coupon--discount-system)
10. [Printing System](#10-printing-system)
11. [Kitchen Order Tickets (KOT)](#11-kitchen-order-tickets-kot)
12. [Inventory Management](#12-inventory-management)
13. [Settings & Configuration](#13-settings--configuration)
14. [Reporting & Analytics](#14-reporting--analytics)
15. [Offline-First Architecture](#15-offline-first-architecture)

---

## 1. Command System

### Overview
The command system provides a CLI-like interface for rapid POS operations. Operators can type commands instead of clicking through UI elements, enabling faster transaction processing.

### Architecture

**Status: ✅ Core Commands Complete**

```
/next/commands/
├── command.ts           # Base interfaces and abstract classes
├── command-registry.ts  # Command registration and routing
├── command-manager.ts   # Execution coordination and state
├── item.ts              # ✅ Implemented
├── clear.ts             # ✅ Implemented
├── pay.ts               # ✅ Implemented
├── done.ts              # ✅ Implemented
├── coupon.ts            # ✅ Implemented
├── print.ts             # ✅ Implemented
├── note.ts              # ✅ Implemented
└── customer.ts          # ✅ Implemented
```

### Design Pattern: Command Pattern

The system follows the Gang of Four Command Pattern with extensions for:
- **Multi-input mode**: Commands can enter a persistent input state
- **Autocomplete**: Dynamic suggestions based on partial input
- **Command metadata**: Self-documenting commands with usage info

### Core Interfaces

```typescript
interface Command {
  getMetadata(): CommandMetadata;
  matches(keyword: string): boolean;
  execute(args: string[]): Promise<void>;
  getAutocompleteSuggestions(partialInput: string): CommandSuggestion[];
}

interface MultiInputCommand extends Command {
  enterMultiMode(): Promise<{ prompt: string; data?: unknown }>;
  exitMultiMode(currentData?: unknown): Promise<void>;
  getMultiModeAutocompleteSuggestions(partialInput: string, multiData?: unknown): CommandSuggestion[];
}
```

### Command State Machine

```
┌─────────────┐    /command args    ┌─────────────┐
│   NORMAL    │ ──────────────────► │  EXECUTING  │
│    MODE     │                     │   COMMAND   │
└─────────────┘                     └─────────────┘
      │                                    │
      │ /command (no args)                 │ complete
      ▼                                    ▼
┌─────────────┐     input           ┌─────────────┐
│   MULTI     │ ──────────────────► │  EXECUTING  │
│ INPUT MODE  │ ◄────────────────── │   INPUT     │
└─────────────┘     continue        └─────────────┘
      │
      │ / (exit)
      ▼
┌─────────────┐
│   NORMAL    │
│    MODE     │
└─────────────┘
```

### Commands Reference

| Command | Aliases | Status | Description |
|---------|---------|--------|-------------|
| `item` | `i` | ✅ Complete | Set or increment line item quantity by SKU |
| `clear` | `cl` | ✅ Complete | Clear current order |
| `pay` | `p` | ✅ Complete | Record payment amount |
| `done` | `dn`, `d` | ✅ Complete | Complete order (checkout) |
| `coupon` | `discount`, `c` | ✅ Complete | Apply coupon code |
| `print` | `pr` | ✅ Complete | Print receipt or KOT |
| `note` | `n` | ✅ Complete | Add customer note |
| `customer` | `cust`, `cu` | ✅ Complete | Set customer billing info |
| `last-order` | `last` | ❌ Not Started | View last completed order |
| `drawer` | `cash` | ❌ Not Started | Open cash drawer |
| `manage-stock` | `stock` | ❌ Not Started | Update product inventory |

### Item Command (Implemented)

**File**: `/next/commands/item.ts`

**Usage**:
- `/item SKU` - Increment quantity by 1
- `/item SKU 5` - Set quantity to 5
- `/item` - Enter multi-input mode

**Behavior**:
- With quantity: **Sets** the line item to that exact quantity
- Without quantity: **Increments** the line item by 1
- Setting quantity to 0 removes the item

**Multi-input mode**:
```
item> ABC123        # Increment ABC123 by 1
item> XYZ789 3      # Set XYZ789 to quantity 3
item> ABC123 0      # Remove ABC123 from order
item> /             # Exit multi-input mode
```

**Autocomplete**: Suggests matching SKUs based on partial input.

### Clear Command (Implemented)

**File**: `/next/commands/clear.ts`

**Usage**:
- `/clear` - Clear all items from current order (with confirmation)
- `/clear confirm` - Clear immediately without confirmation

**Behavior**:
- Removes all line items from the current order
- Shows confirmation message with number of items cleared

### Pay Command (Implemented)

**File**: `/next/commands/pay.ts`

**Usage**:
- `/pay 50` - Record $50 payment
- `/pay` - Enter multi-input mode for multiple payments

**Behavior**:
- Records payment amount in order meta_data
- Shows running total of payments and remaining balance
- Supports split payments via multi-input mode

**Multi-input mode**:
```
pay> 50           # Record $50 payment
pay> 25           # Record additional $25 payment
pay> /            # Exit multi-input mode
```

### Done Command (Implemented)

**File**: `/next/commands/done.ts`

**Usage**:
- `/done` - Complete order and navigate to next

**Behavior**:
- Validates order has items
- Validates payment is sufficient (payment >= total)
- Marks order as `completed` status
- Calculates and displays change if overpaid
- Navigates to next pending order or home

### Coupon Command (Implemented)

**File**: `/next/commands/coupon.ts`

**Usage**:
- `/coupon CODE` - Apply coupon code
- `/coupon remove` - Remove applied coupon

**Behavior**:
- Sends coupon to WooCommerce for validation
- Updates order total with discount
- Shows confirmation message

### Print Command (Implemented)

**File**: `/next/commands/print.ts`

**Usage**:
- `/print bill` - Print customer receipt
- `/print kot` - Print kitchen order ticket

**Behavior**:
- Validates order has items
- Sends print job to configured printer
- Records print timestamp in order meta_data

**Note**: Actual printing requires printer system integration (placeholder implementation).

### Note Command (Implemented)

**File**: `/next/commands/note.ts`

**Usage**:
- `/note Any text here` - Set customer note on order

**Behavior**:
- Sets the `customer_note` field on the order
- Updates UI immediately via optimistic update
- Supports spaces in the note text

### Customer Command (Implemented)

**File**: `/next/commands/customer.ts`

**Usage**:
- `/customer Name, Phone` - Set customer name and phone
- `/customer Name, Phone, Address` - Set name, phone and address

**Behavior**:
- Parses comma-separated values
- Updates order billing information
- Requires at least name and phone

---

## 2. Order Management

### Overview
Orders are the central entity representing a customer transaction. They contain line items, customer info, payment data, and service selection.

### Architecture

**Status: ✅ Core Implementation Complete**

```
/next/stores/orders.ts    # TanStack Query hooks for order operations
/next/api/orders.ts       # API client with Zod schemas
```

### Design Patterns

- **Repository Pattern**: API layer abstracts WooCommerce REST API
- **Optimistic Updates**: UI updates immediately, syncs in background
- **Debounced Mutations**: Prevents excessive API calls during rapid input

### Order Lifecycle (Restaurant Context)

In a restaurant, orders remain open while customers are dining. Items can be added, modified, or removed at any time until checkout.

```
┌──────────┐   create    ┌──────────┐   add/modify items  ┌──────────────┐
│  (none)  │ ──────────► │ pending  │ ◄─────────────────► │  pending     │
└──────────┘             └──────────┘                     │  (has items) │
                                                          └──────────────┘
                                                                 │
                                                    checkout     │
                                                                 ▼
                                                          ┌──────────────┐
                                                          │  completed   │
                                                          └──────────────┘
```

**Key characteristics**:
- Orders stay in `pending` status while customer is dining
- Line items can be freely added, modified, or removed
- No shipping/fulfillment states - this is dine-in service
- Checkout (`/done`) marks order as complete and triggers payment

### Available Hooks

```typescript
// List pending/processing orders
const { ordersQuery, createOrder } = useOrdersStore();

// Get specific order details
const orderQuery = useOrderQuery(orderId);

// Get order from current route params
const orderQuery = useCurrentOrder();
```

### Order Schema (Zod Validated)

```typescript
const OrderSchema = z.object({
  id: z.number(),
  status: z.string(),
  total: z.string(),
  discount_total: z.string(),
  customer_note: z.string(),
  line_items: z.array(LineItemSchema),
  shipping_lines: z.array(ShippingLineSchema),
  billing: BillingSchema,
  meta_data: z.array(MetaDataSchema),
  date_created: z.string(),
});
```

### WooCommerce API Quirks

**Line Item Updates**: WooCommerce doesn't recalculate prices for existing line items. The implementation:
1. Sets existing line item quantity to 0 (marks for deletion)
2. Adds new line item with fresh pricing
3. Sends deletions before additions

**Meta Data**: Custom fields stored in `meta_data` array:
- `payment_received` - Amount paid by customer
- `cart_name` - Associated table/cart name
- `pending_kot_print` - KOT print status
- `pending_bill_print` - Bill print status
- `previous_kot` - KOT history for change detection

---

## 3. Product Catalog

### Overview
Products are loaded from WooCommerce and displayed for selection. Variations (sizes, options) are flattened into a single list for easy selection.

### Architecture

**Status: ✅ Complete**

```
/next/stores/products.ts  # Product queries
/next/api/products.ts     # API client
```

### Product Schema

```typescript
const ProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  sku: z.string(),
  price: z.number(),
  regular_price: z.number(),
  product_id: z.number(),        // Parent product ID (or self for simple products)
  variation_id: z.number(),      // 0 for simple products
  variation_name: z.string(),    // Variation attributes
  parent_id: z.number().optional(),
  categories: z.array(CategorySchema),
  stock_quantity: z.number().nullable(),
  stock_status: z.enum(['instock', 'outofstock', 'onbackorder']),
  manage_stock: z.boolean(),
  low_stock_amount: z.number().nullable(),
});
```

### Product Card Visual Indicators

Product cards show visual indicators for:
- **In cart**: Badge with quantity, ring highlight
- **Low stock**: Warning text showing quantity remaining
- **Out of stock**: "Out" label (card still pressable)

### Variation Flattening

Variable products are flattened so each variation appears as a separate product:

```
Original:
  - T-Shirt (Variable)
    - Small
    - Medium
    - Large

Flattened:
  - T-Shirt - Small
  - T-Shirt - Medium
  - T-Shirt - Large
```

### Available Hooks

```typescript
// Get all products (with variations flattened)
const { data: products } = useProductsQuery();

// Get product by ID
const product = useGetProductById(productId);

// Get categories
const { data: categories } = useCategoriesQuery();
```

---

## 4. Cart & Line Items

### Overview
Line items represent products added to an order. The system supports quantity management with optimistic updates.

### Architecture

**Status: ✅ Complete**

```
/next/stores/orders.ts    # useLineItemQuery hook
```

### Line Item Operations

```typescript
const [lineItemQuery, mutation, isMutating] = useLineItemQuery(orderQuery, product);

// Get current quantity
const quantity = lineItemQuery.data?.quantity ?? 0;

// Update quantity
mutation.mutate({ quantity: newQuantity });
```

### Optimistic Update Flow

```
User clicks +1
      │
      ▼
┌─────────────────┐
│ onMutate:       │
│ - Cancel queries│
│ - Update cache  │
│ - Show new qty  │
└─────────────────┘
      │
      ▼
┌─────────────────┐    success    ┌─────────────────┐
│ API Request     │ ────────────► │ Update cache    │
│ (debounced)     │               │ with server data│
└─────────────────┘               └─────────────────┘
      │
      │ error
      ▼
┌─────────────────┐
│ Rollback cache  │
│ Show error      │
└─────────────────┘
```

### Debounce & Parallel Prevention

Mutations use two utility hooks:
- `useDebounce(fn, ms)` - Delays execution, resets on new calls
- `useAvoidParallel(fn)` - Prevents concurrent executions

This prevents:
- Excessive API calls during rapid clicking
- Race conditions from overlapping requests

---

## 5. Customer Management

### Overview
Customer information can be attached to orders for delivery, receipts, and history tracking.

### Architecture

**Status: ✅ Basic Implementation | ⚠️ Search Not Implemented**

```
/next/stores/orders.ts    # useCustomerInfoQuery hook
/next/api/customers.ts    # Customer API client
```

### Customer Info Fields

```typescript
interface BillingSchema {
  first_name: string;
  last_name: string;
  phone: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}
```

### Available Operations

```typescript
const [customerQuery, mutation, isMutating] = useCustomerInfoQuery(orderQuery);

// Update customer info
mutation.mutate({
  billing: {
    first_name: 'John',
    last_name: 'Doe',
    phone: '+1234567890'
  }
});
```

### Missing Features

- [ ] Customer search autocomplete
- [ ] Customer creation
- [ ] Customer history lookup
- [ ] Saved addresses

---

## 6. Payment Processing

### Overview
Payments are tracked via order meta_data. The system records the amount received from the customer, supporting split payments across multiple configurable methods.

### Architecture

**Status: ✅ Complete (with configurable methods)**

```
/next/stores/orders.ts                      # usePaymentQuery hook
/next/stores/settings.ts                    # Payment methods configuration
/next/app/orders/[orderId]/components/payment-card.tsx  # Payment UI
/next/app/components/settings/PaymentMethodsTab.tsx     # Settings UI
```

### Payment Tracking

```typescript
const [paymentQuery, mutation, isMutating] = usePaymentQuery(orderQuery);

// Get payment received
const received = paymentQuery.data ?? 0;

// Record payment
mutation.mutate({ received: 50.00 });
```

### Payment Calculation

```
Order Total:     $45.00
Payment Received: $50.00
─────────────────────────
Change Due:       $5.00
```

### Configurable Payment Methods

Payment methods are now configurable via Settings > Payment Methods:

```typescript
interface PaymentMethodConfig {
  key: string;    // Unique identifier (auto-slug from label)
  label: string;  // Display name
}

// Default methods
const defaultMethods = [
  { key: 'bkash', label: 'bKash' },
  { key: 'nagad', label: 'Nagad' },
  { key: 'card', label: 'Card' },
];
```

**Features:**
- Add/remove payment methods in settings
- Reorder methods with up/down arrows
- Auto-generate key from label (lowercase, underscores)
- Cash is always available (not configurable)
- Methods persist to localStorage

### Split Payments

The system supports split payments across multiple methods:
- **Cash** - Always visible
- **Configured methods** - Add via dropdown (bKash, Nagad, Card, etc.)

Split payment data is stored in order meta_data as `split_payments` JSON.

### Quick Payment Buttons

Quick payment buttons are shown for common amounts:
- Exact amount (pays total)
- Rounded to nearest 100
- Rounded to nearest 500
- Rounded to nearest 1000

### Features

- [x] Configurable payment methods via settings
- [x] Multiple payment methods (cash + configured methods)
- [x] Payment validation (amount >= total for completion)
- [x] Change calculation display
- [x] Quick payment buttons
- [x] Coupon display and removal

---

## 7. Service Selection (Tables/Delivery)

### Overview
Service selection determines whether an order is for dine-in (table) or takeaway/delivery.

### Architecture

**Status: ✅ Complete**

```
/next/stores/orders.ts    # useServiceQuery hook
/next/stores/service.ts   # useTablesQuery, useDeliveryZonesQuery
```

### Service Types

| Type | Method ID | Description |
|------|-----------|-------------|
| Table | `pickup_location` | Dine-in at specific table |
| Takeaway | `flat_rate` | Customer pickup |
| Delivery | `flat_rate` | Delivery with fee |

### Service Schema

```typescript
interface ServiceMethodSchema {
  slug: string;      // Unique identifier
  title: string;     // Display name
  type: 'table' | 'takeaway';
  fee: number;       // Delivery/service fee
}
```

### Available Hooks

```typescript
// Get available tables
const { data: tables } = useTablesQuery();

// Get delivery zones
const { data: zones } = useDeliveryZonesQuery();

// Get/set current service for order
const [serviceQuery, mutation, isMutating] = useServiceQuery(orderQuery);
mutation.mutate({ service: selectedService });
```

---

## 8. Multi-Order Management

### Overview
Multi-order support allows operators to manage multiple orders simultaneously, typically for different tables in a restaurant.

### Architecture

**Status: ✅ Implemented (URL-based routing)**

```
/next/app/components/sidebar.tsx   # Order list and switching
/next/stores/orders.ts             # useOrdersStore, useOrderQuery
```

### Current Implementation

Unlike the Vue.js reference (which uses a cart manager store), the Next.js implementation uses **URL-based order routing**:

- **Order List**: Sidebar displays all pending/processing orders
- **Order Switching**: Click order in sidebar navigates to `/orders/[orderId]`
- **Create Order**: "New Order" button creates order and navigates to it
- **Active Order**: Determined by URL params via `useCurrentOrder()` hook

```typescript
// Sidebar displays all open orders
const { ordersQuery: { data: orders }, createOrder } = useOrdersStore();

// Current order from URL
const orderQuery = useCurrentOrder();  // Uses useParams().orderId
```

### Order Display

Each order in the sidebar shows:
- Table/service name (from shipping line)
- Order number (last 2 digits for quick reference)
- Keyboard shortcut (1-9 for quick access)

### Advantages of URL-based Approach

1. **Deep linking** - Share/bookmark specific orders
2. **Browser history** - Back/forward navigation works
3. **Simpler state** - No cart manager store needed
4. **Persistence** - Orders are WooCommerce orders, not client state

### Potential Enhancements

- [x] Keyboard shortcuts (Ctrl+1-9) for order switching
- [x] Table name display in sidebar
- [ ] Visual indicator for orders with unsent KOT
- [ ] Order status badges

---

## 9. Coupon & Discount System

### Overview
Coupons can be applied to orders for discounts. The system provides real-time validation feedback before applying coupons.

### Architecture

**Status: ✅ Complete (Command + Validation Card)**

```
/next/api/coupons.ts                        # API client with validation
/next/stores/coupons.ts                     # Validation hook
/next/commands/coupon.ts                    # Coupon command
/next/app/orders/[orderId]/components/coupon-card.tsx  # Validation UI
```

### Coupon Validation Card

The CouponCard component provides real-time validation:

```typescript
const {
  code, setCode,           // Coupon code input
  status,                  // idle, validating, valid, invalid, error
  coupon,                  // Full coupon data if valid
  summary,                 // Human-readable discount description
  error,                   // Error message if invalid
} = useCouponValidation();
```

**Features:**
- Debounced validation (500ms delay)
- Color-coded status indicator (green/red/yellow)
- Human-readable discount summary
- Apply button to add coupon to order
- Positioned below customer info card

### Discount Summary Examples

| Coupon Type | Summary |
|-------------|---------|
| Percentage | "10% off entire order" |
| Fixed Cart | "500 off orders over 2000" |
| Fixed Product | "50 off selected products" |
| Free Shipping | "Free shipping" |

### Coupon Flow

```
User enters code
       │
       ▼
┌─────────────────┐
│ Debounced       │
│ validation      │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ Validate coupon │
│ via API         │
└─────────────────┘
       │
       ├── Invalid ──► Show error message
       │
       ▼
┌─────────────────┐
│ Check expiry    │
│ Check usage     │
└─────────────────┘
       │
       ├── Failed ──► Show reason
       │
       ▼
┌─────────────────┐
│ Show summary    │◄── User sees discount before applying
│ Enable Apply    │
└─────────────────┘
       │
       │ User clicks Apply
       ▼
┌─────────────────┐
│ Add to order    │
│ coupon_lines    │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ Recalculate     │
│ order total     │
└─────────────────┘
```

### Coupon Types

- **Percentage** - Discount by percentage
- **Fixed Cart** - Fixed amount off cart
- **Fixed Product** - Fixed amount off specific products

---

## 10. Printing System

### Overview
The POS supports thermal printer output for receipts and kitchen orders via ESC/POS commands.

### Architecture

**Status: ✅ Complete**

```
/next/commands/print.ts              # Print command
/next/stores/print.ts                # Print queue store
/next/lib/escpos/                    # ESC/POS rendering
│   ├── types.ts                     # BillData, KotData interfaces
│   ├── bill-renderer.ts             # Bill ESC/POS commands
│   └── kot-renderer.ts              # KOT ESC/POS commands
/next/components/print/
│   ├── BillPrint.tsx                # Bill preview component
│   └── KotPrint.tsx                 # KOT preview component
```

### Design

```typescript
interface PrintJob {
  type: 'bill' | 'kot' | 'drawer';
  data: PrintJobData;
}

interface PrintJobData {
  frontendId?: string;    // 6-char local order ID
  serverId?: number;      // WooCommerce order ID
  // ... other fields
}
```

### Frontend ID in Prints

Orders are identified by frontend ID in prints:

- **Primary identifier**: Frontend ID displayed prominently (e.g., "Order: A3X9K2")
- **Server reference**: Server ID shown as small reference when synced (e.g., "Ref: #1234")

### Print Types

| Type | Purpose | Content |
|------|---------|---------|
| Bill | Customer receipt | Items, totals, payment, change, frontend ID |
| KOT | Kitchen order | New/modified items, frontend ID |
| Drawer | Cash drawer | Open command |

### Thermal Printer Support

- **Protocol**: ESC/POS commands
- **Connection**: USB, Network, or Browser API
- **Format**: Customizable templates
- **Renderers**: Separate bill and KOT renderers for ESC/POS output

---

## 11. Kitchen Order Tickets (KOT)

### Overview
KOT tracks what needs to be prepared in the kitchen. It shows only new or modified items, not the entire order.

### Architecture

**Status: ❌ Not Implemented**

### KOT Change Detection

The system compares current order with previous KOT:

```typescript
interface KotLineItem {
  product_id: number;
  variation_id?: number;
  name: string;
  quantity: number;
  previousQuantity: number;  // For change detection
}
```

### Change Types

| Scenario | Display |
|----------|---------|
| New item | `+ 2x Burger` |
| Increased | `+ 1x Burger (was 2, now 3)` |
| Decreased | `- 1x Burger (was 3, now 2)` |
| Removed | `- 2x Burger (removed)` |

### Category Filtering

Some categories (e.g., drinks, retail items) can be excluded from KOT:

```typescript
const shouldSkipFromKot = (item: LineItem): boolean => {
  return item.categories.some(cat =>
    config.kotSkipCategories.includes(cat.id)
  );
};
```

---

## 12. Inventory Management

### Overview
Stock levels can be viewed and updated directly from the POS.

### Architecture

**Status: ❌ Not Implemented**

### Planned Features

- View stock quantities for products
- Update stock via command (`/stock SKU +10`)
- Low stock warnings
- Stock validation before adding to order

---

## 13. Settings & Configuration

### Overview
Configuration for API connections, printers, payment methods, and preferences.

### Architecture

**Status: ✅ Partial (Payment Methods, Printers)**

```
/next/stores/settings.ts                        # Zustand settings store
/next/app/components/settings-modal.tsx         # Settings modal
/next/app/components/settings/
│   ├── PaymentMethodsTab.tsx                   # Payment methods config
│   └── PrintersTab.tsx                         # Printer config
```

### Configuration Areas

| Area | Status | Settings |
|------|--------|----------|
| Payment Methods | ✅ | Configurable list with add/remove/reorder |
| Printers | ✅ | Bill printer, KOT printer, drawer |
| API | ❌ | WooCommerce URL, Consumer Key/Secret, Auth method |
| Tables | ❌ | Table names and mappings |
| Categories | ❌ | KOT skip categories |
| UI | ❌ | Theme, keyboard shortcuts |

### Payment Methods Configuration

```typescript
interface PaymentMethodConfig {
  key: string;    // Unique identifier
  label: string;  // Display name
}

// Store functions
const {
  paymentMethods,
  addPaymentMethod,
  updatePaymentMethod,
  removePaymentMethod,
  reorderPaymentMethods,
} = useSettingsStore();
```

### Storage

Settings persist to localStorage via Zustand persist middleware.

### Current Config (Environment Variables)

```typescript
// /next/api/config.ts
const config = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  consumerKey: process.env.NEXT_PUBLIC_CONSUMER_KEY,
  consumerSecret: process.env.NEXT_PUBLIC_CONSUMER_SECRET,
};
```

---

## 14. Reporting & Analytics

### Overview
Sales reports and analytics for business insights.

### Architecture

**Status: ❌ Not Implemented**

### Planned Reports

| Report | Description |
|--------|-------------|
| Daily Sales | Total sales, orders, average order value |
| Product Sales | Best sellers, category breakdown |
| Hourly Analysis | Peak hours, sales by time |
| Payment Summary | Cash vs card, totals by method |
| Customer Analysis | Repeat customers, average spend |

---

## 15. Offline-First Architecture

### Overview
The POS operates with an offline-first approach, storing all order data locally in IndexedDB (via Dexie.js) and synchronizing with WooCommerce when online.

### Architecture

**Status: ✅ Complete**

```
/next/db/index.ts                    # Dexie database schema
/next/lib/frontend-id.ts             # Frontend ID generation
/next/stores/offline-orders.ts       # Local order CRUD
/next/services/sync.ts               # Sync service
/next/hooks/useConnectivity.ts       # Network status hook
/next/app/components/OfflineIndicator.tsx  # Status UI
```

### Frontend ID System

Each order is assigned a unique 6-character alphanumeric identifier:

```typescript
// Format: 6 chars from A-Z, 0-9 (e.g., "A3X9K2")
const id = generateFrontendId();

// Generate with collision check
const uniqueId = await generateUniqueFrontendId();

// Validate format
const isValid = isValidFrontendId("A3X9K2");  // true
```

### Local Database Schema

```typescript
interface LocalOrder {
  frontendId: string;      // Primary key
  serverId?: number;       // WooCommerce ID (after sync)
  status: OrderStatus;     // draft, pending, completed, etc.
  syncStatus: SyncStatus;  // local, syncing, synced, error
  data: OrderSchema;       // Full order data
  createdAt: Date;
  updatedAt: Date;
  lastSyncAttempt?: Date;
  syncError?: string;
}
```

### Order Lifecycle

1. **Create**: Generate frontend ID, store in Dexie
2. **Edit**: Save to Dexie immediately, queue sync
3. **Complete**: Mark complete locally, attempt sync
4. **Sync**: Push to WooCommerce, update serverId

### URL Routing

- `/orders/{frontendId}` - Primary format (6-char ID)
- `/orders/{serverId}` - Legacy support, redirects to frontend ID

### Sync Service

```typescript
// Sync single order
const result = await syncOrder(frontendId);

// Process retry queue
await processSyncQueue();

// Background sync (30s interval)
startBackgroundSync(callback);
```

### Exponential Backoff

Failed syncs retry with increasing delays: 30s, 1m, 2m, 5m, 10m (max)

### Connectivity Detection

- Browser `navigator.onLine` status
- API heartbeat check (30s interval)
- Visual indicator in sidebar

### Features

- [x] Local order storage in IndexedDB
- [x] Frontend ID generation and validation
- [x] Order CRUD operations on local DB
- [x] Sync service with retry queue
- [x] Exponential backoff for failed syncs
- [x] Background sync (30s interval)
- [x] Connectivity detection (online/offline)
- [x] Offline indicator component
- [x] URL routing with frontend IDs
- [x] Server order import with frontend IDs
- [x] Print support for frontend IDs

---

## Implementation Priority

### Phase 1: Core POS ✅ Complete

1. ✅ Command infrastructure
2. ✅ Item command (set/increment line items)
3. ✅ Multi-order management (URL-based)
4. ✅ Clear command
5. ✅ Pay command
6. ✅ Done command (checkout)

### Phase 2: Business Features ✅ Complete

7. ✅ Coupon command
8. ✅ Note command
9. ✅ Customer command
10. ✅ Payment UI with split payments
11. ✅ Product card visual indicators
12. ⬜ Customer search (autocomplete)

### Phase 3: Operations ✅ Complete

13. ✅ Print command with ESC/POS support
14. ✅ Configurable payment methods
15. ✅ Coupon validation card
16. ⬜ KOT tracking & change detection
17. ⬜ Drawer command
18. ⬜ Simplified command interface (SKU entry without prefix)

### Phase 4: Offline-First ✅ Complete

19. ✅ Dexie.js local database
20. ✅ Frontend ID system
21. ✅ Offline order storage
22. ✅ Sync service with retry
23. ✅ Connectivity detection
24. ✅ Server order import

### Phase 5: Advanced

25. ⬜ Last order command
26. ⬜ Reporting
27. ⬜ Inventory management

---

## Testing

### Current Coverage

- ✅ Autocomplete suggestions (`/next/commands/__tests__/autocomplete.test.ts`)

### Required Tests

- [ ] Command execution
- [ ] Order mutations
- [ ] Optimistic update rollback
- [ ] Multi-cart state management
- [ ] Payment calculations
- [ ] KOT change detection
