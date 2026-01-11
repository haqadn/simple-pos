# Simple POS - Next.js Implementation TODO

## Project Status

- **Next.js Frontend**: ~60% complete - Core commands done, UI polish in progress
- **Vue.js Frontend**: Legacy reference only (do not modify)
- **Goal**: Feature parity with Vue.js, then Electron packaging for Windows

See `/next/FEATURES.md` for detailed feature documentation.

---

## Current State

### Complete

- **Command Infrastructure** - Base classes, registry, manager, history, autocomplete
- **Item Command** (`/item`, `/i`) - Set/increment line items by SKU with multi-input mode
- **Clear Command** (`/clear`, `/cl`) - Clear all items from current order
- **Pay Command** (`/pay`, `/p`) - Record payment with multi-input mode for split payments
- **Done Command** (`/done`, `/dn`, `/d`) - Complete order with payment validation
- **Coupon Command** (`/coupon`, `/c`, `/discount`) - Apply/remove discount codes
- **Print Command** (`/print`, `/pr`) - Print bill or KOT (placeholder for printer integration)
- **Note Command** (`/note`, `/n`) - Add customer note to order
- **Customer Command** (`/customer`, `/cust`, `/cu`) - Set customer billing info (name, phone, address)
- **Multi-Order Management** - URL-based order switching via sidebar
- **API Layer** - Orders, products, customers, coupons, shipping with Zod validation
- **Order Queries** - TanStack Query with optimistic updates and debouncing
- **Product Catalog** - Products with variation flattening, categories, stock status
- **Line Item Management** - Add/update/remove with optimistic cache updates
- **Service Selection** - Table/takeaway selection
- **Customer Info** - Billing info attached to orders
- **Payment Tracking** - Payment received via order meta_data with split payment support
- **Order Notes** - Customer notes on orders
- **Payment UI** - Total, received, change display with quick payment buttons
- **Split Payments** - Multiple payment methods (Cash, bKash, Nagad, Card)
- **Product Card Indicators** - Visual indicators for low stock, out of stock, in-cart quantity

### In Progress

- Simplified command interface (SKU entry without /item prefix)
- Printer integration

---

## Phase 1: Core Commands ✅ Complete

All essential POS commands are implemented:

| Command | Aliases | Status | Description |
|---------|---------|--------|-------------|
| `item` | `i` | ✅ Done | Set/increment line items by SKU |
| `clear` | `cl` | ✅ Done | Clear all items from order |
| `pay` | `p` | ✅ Done | Record payment amount |
| `done` | `dn`, `d` | ✅ Done | Complete order |
| `coupon` | `c`, `discount` | ✅ Done | Apply/remove discount codes |
| `print` | `pr` | ✅ Done | Print bill or KOT |
| `note` | `n` | ✅ Done | Add customer note |
| `customer` | `cust`, `cu` | ✅ Done | Set customer info |

---

## Phase 2: UI Improvements ✅ Complete

### Payment UI ✅
- [x] Payment card showing total, received, change
- [x] Quick payment buttons (BDT denominations)
- [x] Split payment with multiple methods (Cash always visible, add bKash/Nagad/Card via dropdown)
- [x] Coupon display with remove button

### Order Summary ✅
- [x] Better order total display
- [x] Applied discounts visible (coupon code shown in payment card)
- [x] Service type indicator (shown in sidebar and service card)

### Action Buttons ✅
- [x] KOT button (prints kitchen order ticket)
- [x] Bill button (prints receipt)
- [x] Cancel button with confirmation dropdown

### Product Cards ✅
- [x] Visual indicator when product is in cart (badge with quantity)
- [x] Low stock warning indicator
- [x] Out of stock indicator
- [x] Tooltip with product description

---

## Phase 3: Printing System Integration

### Print Infrastructure
- [ ] Print store/queue for managing jobs
- [ ] ESC/POS command generation
- [ ] Printer connection (USB, network, browser API)
- [ ] Print templates (bill, KOT)

### Bill Printing
- [ ] Receipt format with items, totals, payment
- [ ] Business info header
- [ ] Connect to `/print bill` command

### KOT (Kitchen Order Ticket)
- [ ] Track previous KOT state per order
- [ ] Detect changes (new items, quantity changes)
- [ ] Category filtering (skip drinks, retail)
- [ ] Connect to `/print kot` command

---

## Phase 3.5: Simplified Command Interface (In Progress)

Streamline input so users can add items without command prefixes.

### New Input Patterns
| Input | Action |
|-------|--------|
| `BURGER` | Add 1 burger by SKU |
| `BURGER 3` | Add 3 burgers |
| `@T5` or `@table5` | Switch to table 5 |
| `@123` | Switch to order #123 |
| `/pay 50` | Record payment |
| `/done` | Complete order |

### Implementation Tasks
- [ ] Input type detection (SKU vs `/command`)
- [ ] Default to product search when no prefix
- [ ] Update autocomplete to show products by default

---

## Phase 4: Additional Commands

| Command | Aliases | Priority | Description |
|---------|---------|----------|-------------|
| `last-order` | `last` | Low | View/reprint last completed order |
| `drawer` | `cash` | Low | Open cash drawer |
| `manage-stock` | `stock` | Low | Update product inventory |

---

## Phase 5: Polish & Advanced

### Customer Search
- [ ] Autocomplete customer lookup
- [ ] Customer creation
- [ ] Attach customer to order

### Keyboard Shortcuts
- [x] Ctrl+1-9 for order switching (with sidebar auto-scroll)
- [x] Escape to focus command bar (or clear input if already focused)
- [x] Enter to submit
- [x] Ctrl+N for new order
- [x] Alt+1-9 to select service (tables then delivery zones)
- [x] Ctrl+K to print KOT
- [x] Ctrl+P to print Bill
- [x] Ctrl+D to open drawer
- [x] Ctrl+Enter to complete order (done)

### Settings Management
- [ ] API configuration UI
- [ ] Printer setup
- [ ] Table configuration
- [ ] KOT skip categories

### Offline Support
- [ ] Local order queue
- [ ] Sync when online
- [ ] Offline indicator

### Electron Packaging
- [ ] Electron wrapper for Next.js
- [ ] Windows installer
- [ ] Auto-updates

---

## File Reference

### Commands
- `/next/commands/command.ts` - Base interfaces
- `/next/commands/command-registry.ts` - Command routing
- `/next/commands/command-manager.ts` - Execution coordination
- `/next/commands/item.ts` - Line item management
- `/next/commands/clear.ts` - Clear order
- `/next/commands/pay.ts` - Payment recording
- `/next/commands/done.ts` - Order completion
- `/next/commands/coupon.ts` - Discount codes
- `/next/commands/print.ts` - Printing (placeholder)
- `/next/commands/note.ts` - Customer notes
- `/next/commands/customer.ts` - Customer info

### Utilities
- `/next/lib/format.ts` - Currency formatting (no decimal if whole number)

### Stores
- `/next/stores/orders.ts` - Order queries and mutations
- `/next/stores/products.ts` - Product catalog
- `/next/stores/service.ts` - Table/delivery services

### UI
- `/next/app/components/command-bar.tsx` - Command input
- `/next/app/components/sidebar.tsx` - Order list
- `/next/app/orders/[orderId]/` - Order page components

### API
- `/next/api/orders.ts` - Order CRUD with Zod schemas
- `/next/api/products.ts` - Product fetching
- `/next/api/customers.ts` - Customer operations
- `/next/api/coupons.ts` - Coupon validation
