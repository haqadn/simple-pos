# Simple POS - Next.js Implementation TODO

## Project Status

- **Next.js Frontend**: ~80% complete - Core features done, printing implemented
- **Vue.js Frontend**: Legacy reference only (do not modify)
- **Goal**: Feature parity with Vue.js, then Electron packaging for Windows

See `/next/FEATURES.md` for detailed feature documentation.

---

## Bugs / Issues

- [ ] **Shipping costs missing from bill** - Delivery/service fees not showing on printed receipts

---

## Current State

### Complete

- **Command Infrastructure** - Base classes, registry, manager, history, autocomplete
- **Item Command** (`/item`, `/i`) - Set/increment line items by SKU with multi-input mode
- **Clear Command** (`/clear`, `/cl`) - Clear all items from current order
- **Pay Command** (`/pay`, `/p`) - Record payment with multi-input mode for split payments
- **Done Command** (`/done`, `/dn`, `/d`) - Complete order with payment validation
- **Coupon Command** (`/coupon`, `/c`, `/discount`) - Apply/remove discount codes
- **Print Command** (`/print`, `/pr`) - Print bill or KOT
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
- **ESC/POS Printing** - Bill and KOT rendering with thermal printer support
- **Printer Settings UI** - USB auto-detect, network config, bill customization
- **Bill Customization** - Logo, header text, footer text, date/time, order number
- **Customer Address on Bills** - Billing address included in receipts
- **80mm Paper Only** - Removed paper size selection (hardcoded to 80mm)

### In Progress

- KOT service type display (Table/Takeaway/Delivery)
- KOT change detection (track previous quantities)

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
- [x] KOT button with Ctrl+K shortcut
- [x] Bill button with Ctrl+P shortcut
- [x] Cancel button with confirmation dropdown

### Product Cards ✅
- [x] Visual indicator when product is in cart (badge with quantity)
- [x] Low stock warning indicator
- [x] Out of stock indicator
- [x] Tooltip with product description

---

## Phase 3: Printing System ✅ Mostly Complete

### Print Infrastructure ✅
- [x] Print store/queue for managing jobs
- [x] ESC/POS command generation (EscPosBuilder class)
- [x] USB printer support (via Electron IPC)
- [x] Network printer support (TCP socket port 9100)
- [x] Print templates (bill, KOT)

### Bill Printing ✅
- [x] Receipt format with items, totals, payment, change
- [x] Logo support with image encoding
- [x] Customizable header/footer text
- [x] Customer name, phone, address
- [x] Date/time and order number options
- [x] Live preview in settings

### KOT (Kitchen Order Ticket)
- [x] Basic KOT format with order number heading
- [ ] **Include service type** (Table/Takeaway/Delivery)
- [ ] Track previous KOT state per order
- [ ] Detect changes (new items, quantity changes)
- [ ] Category filtering (skip drinks, retail)

### Cash Drawer ✅
- [x] Drawer kick command
- [x] Test drawer button in settings
- [x] Configurable pulse pin (2 or 5)

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

### Keyboard Shortcuts ✅
- [x] Ctrl+1-9 for order switching (with sidebar auto-scroll)
- [x] Escape to focus command bar (or clear input if already focused)
- [x] Enter to submit
- [x] Ctrl+N for new order
- [x] Alt+1-9 to select service (tables then delivery zones)
- [x] Ctrl+K to print KOT
- [x] Ctrl+P to print Bill
- [x] Ctrl+D to open drawer
- [x] Ctrl+Enter to complete order (done)

### Settings Management ✅ Mostly Complete
- [x] API configuration UI
- [x] Printer setup (USB and network)
- [x] Bill customization (logo, header, footer)
- [ ] KOT skip categories UI

### Offline Support
- [ ] Local order queue
- [ ] Sync when online
- [ ] Offline indicator

### Electron Packaging
- [x] Electron wrapper for Next.js
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
- `/next/commands/print.ts` - Printing
- `/next/commands/note.ts` - Customer notes
- `/next/commands/customer.ts` - Customer info

### ESC/POS Printing
- `/next/lib/escpos/commands.ts` - ESC/POS command builder
- `/next/lib/escpos/bill-renderer.ts` - Bill receipt generator
- `/next/lib/escpos/kot-renderer.ts` - KOT generator
- `/next/lib/escpos/encoder.ts` - Image encoding for logos
- `/next/lib/escpos/types.ts` - Print configuration types

### Stores
- `/next/stores/orders.ts` - Order queries and mutations
- `/next/stores/products.ts` - Product catalog
- `/next/stores/service.ts` - Table/delivery services
- `/next/stores/print.ts` - Print queue and configuration

### Settings UI
- `/next/app/components/settings/PrinterSettingsTab.tsx` - Printer configuration
- `/next/app/components/settings/PrinterConnectionForm.tsx` - USB/network selector
- `/next/app/components/settings/BillPreview.tsx` - Live receipt preview
- `/next/app/components/settings/LogoUpload.tsx` - Logo image upload

### UI
- `/next/app/components/command-bar.tsx` - Command input
- `/next/app/components/sidebar.tsx` - Order list
- `/next/app/orders/[orderId]/` - Order page components
- `/next/components/print/ThermalPrint.tsx` - Print job processor

### API
- `/next/api/orders.ts` - Order CRUD with Zod schemas
- `/next/api/products.ts` - Product fetching
- `/next/api/customers.ts` - Customer operations
- `/next/api/coupons.ts` - Coupon validation
