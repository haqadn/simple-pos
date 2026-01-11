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
Payments are tracked via order meta_data. The system records the amount received from the customer, supporting split payments across multiple methods.

### Architecture

**Status: ✅ Complete**

```
/next/stores/orders.ts                      # usePaymentQuery hook
/next/app/orders/[orderId]/components/payment-card.tsx  # Payment UI
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

### Split Payments

The system supports split payments across multiple methods:
- **Cash** - Always visible
- **bKash** - Add via dropdown
- **Nagad** - Add via dropdown
- **Card** - Add via dropdown

Split payment data is stored in order meta_data as `split_payments` JSON.

### Quick Payment Buttons

Quick payment buttons are shown for common amounts:
- Exact amount (pays total)
- Rounded to nearest 100
- Rounded to nearest 500
- Rounded to nearest 1000

### Features

- [x] Multiple payment methods (cash, bKash, Nagad, card)
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
Coupons can be applied to orders for discounts. WooCommerce handles validation and calculation.

### Architecture

**Status: ✅ Command Implemented**

```
/next/api/coupons.ts      # API client (exists)
/next/commands/coupon.ts  # ✅ Coupon command
```

### Coupon Flow

```
User enters code
       │
       ▼
┌─────────────────┐
│ Validate coupon │
│ via API         │
└─────────────────┘
       │
       ├── Invalid ──► Show error
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
The POS supports thermal printer output for receipts and kitchen orders.

### Architecture

**Status: ⚠️ Command Implemented | Printer Integration Pending**

```
/next/commands/print.ts   # ✅ Print command (placeholder)
```

### Design

```typescript
interface PrintJob {
  type: 'bill' | 'kot' | 'drawer';
  data: PrintData;
}

interface PrintStore {
  queue: PrintJob[];
  push(job: PrintJob): Promise<void>;
  pop(): PrintJob | undefined;
}
```

### Print Types

| Type | Purpose | Content |
|------|---------|---------|
| Bill | Customer receipt | Items, totals, payment, change |
| KOT | Kitchen order | New/modified items only |
| Drawer | Cash drawer | Open command |

### Thermal Printer Support

- **Protocol**: ESC/POS commands
- **Connection**: USB, Network, or Browser API
- **Format**: Customizable templates

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
Configuration for API connections, printers, tables, and preferences.

### Architecture

**Status: ❌ Not Implemented**

### Configuration Areas

| Area | Settings |
|------|----------|
| API | WooCommerce URL, Consumer Key/Secret, Auth method |
| Tables | Table names and mappings |
| Printers | Bill printer, KOT printer, drawer |
| Categories | KOT skip categories |
| UI | Theme, keyboard shortcuts |

### Current Config (Hardcoded)

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

### Phase 3: Operations (Current Focus)

13. ✅ Print command (placeholder - needs printer integration)
14. ⬜ KOT tracking & change detection
15. ⬜ Settings management
16. ⬜ Drawer command
17. ⬜ Simplified command interface (SKU entry without prefix)

### Phase 4: Advanced

18. ⬜ Last order command
19. ⬜ Reporting
20. ⬜ Offline support
21. ⬜ Inventory management

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
