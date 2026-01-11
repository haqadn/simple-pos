# Simple POS - Next.js Implementation TODO

## Project Status

- **Next.js Frontend**: ~35% complete - Core infrastructure done, commands needed
- **Vue.js Frontend**: Legacy reference only (do not modify)
- **Goal**: Feature parity with Vue.js, then Electron packaging for Windows

See `/next/FEATURES.md` for detailed feature documentation.

---

## Current State

### Complete

- **Command Infrastructure** - Base classes, registry, manager, history, autocomplete
- **Item Command** (`/item`, `/i`) - Set/increment line items by SKU with multi-input mode
- **Multi-Order Management** - URL-based order switching via sidebar
- **API Layer** - Orders, products, customers, coupons, shipping with Zod validation
- **Order Queries** - TanStack Query with optimistic updates and debouncing
- **Product Catalog** - Products with variation flattening, categories
- **Line Item Management** - Add/update/remove with optimistic cache updates
- **Service Selection** - Table/takeaway selection
- **Customer Info** - Billing info attached to orders
- **Payment Tracking** - Payment received via order meta_data
- **Order Notes** - Customer notes on orders

### In Progress

- Additional command implementations

---

## Phase 1: Core Commands (Current Focus)

### Essential Commands Needed

| Command | Aliases | Priority | Description |
|---------|---------|----------|-------------|
| `clear` | `cl` | High | Clear all items from current order |
| `pay` | `p` | High | Record payment amount received |
| `done` | `dn` | High | Complete order (set status, trigger print) |
| `coupon` | `c` | Medium | Apply/remove discount codes |
| `customer-info` | `ci` | Medium | Set customer billing info via command |
| `last-order` | `last` | Low | View/reprint last completed order |
| `drawer` | `cash` | Low | Open cash drawer |
| `manage-stock` | `stock` | Low | Update product inventory |

### Implementation Pattern

Each command should:
1. Extend `BaseCommand` or `BaseMultiInputCommand`
2. Implement `getMetadata()`, `execute()`, `getAutocompleteSuggestions()`
3. Register in `command-manager.ts`
4. Use `CommandContext` for data access and mutations

Reference: `/next/commands/item.ts` for working example.

---

## Phase 2: Payment & Checkout

### Pay Command
- [ ] Record payment amount via `/pay <amount>`
- [ ] Multi-input mode for split payments
- [ ] Show change due calculation
- [ ] Support multiple payment methods (cash, card)
- [ ] By default, cash is present. Allow adding rows for each configured payment methods

### Done Command
- [ ] Validate payment >= order total
- [ ] Update order status to completed
- [ ] Navigate to next pending order or create new

### Payment UI
- [ ] Payment card showing total, received, change
- [ ] Quick payment buttons (exact, round up)
- [ ] Payment method selection

---

## Phase 3: Printing System

### Print Infrastructure
- [ ] Print store/queue for managing jobs
- [ ] ESC/POS command generation
- [ ] Printer connection (USB, network, browser API)
- [ ] Print templates (bill, KOT)

### Bill Printing
- [ ] Receipt format with items, totals, payment
- [ ] Business info header
- [ ] Print via `/print bill`

### KOT (Kitchen Order Ticket)
- [ ] Track previous KOT state per order
- [ ] Detect changes (new items, quantity changes)
- [ ] Category filtering (skip drinks, retail)
- [ ] Print via `/print kot` or manual trigger

---

## Phase 4: Additional Features

### Customer Search
- [ ] Autocomplete customer lookup
- [ ] Customer creation
- [ ] Attach customer to order

### Coupon System
- [ ] Validate coupon codes via API
- [ ] Apply to order (`coupon_lines`)
- [ ] Show discount in totals
- [ ] Remove coupon

### Settings Management
- [ ] API configuration UI
- [ ] Printer setup
- [ ] Table configuration
- [ ] KOT skip categories

---

## Phase 5: Polish & Advanced

### Keyboard Shortcuts
- [ ] Number keys (1-9) for order switching
- [ ] Escape to clear input
- [ ] Enter to submit

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
- `/next/commands/item.ts` - Reference implementation

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

---

## Quick Start for New Commands

```typescript
// /next/commands/clear.ts
import { BaseCommand, CommandMetadata } from './command';
import { CommandContext } from './command-manager';

export class ClearCommand extends BaseCommand {
  private context?: CommandContext;

  setContext(context: CommandContext) {
    this.context = context;
  }

  getMetadata(): CommandMetadata {
    return {
      keyword: 'clear',
      aliases: ['cl'],
      description: 'Clear all items from current order',
      usage: ['/clear'],
      parameters: []
    };
  }

  async execute(args: string[]): Promise<void> {
    // Implementation here
  }
}
```

Then register in `command-manager.ts`:
```typescript
import { ClearCommand } from './clear';

// In registerDefaultCommands():
const clearCommand = new ClearCommand();
this.registry.registerCommand(clearCommand);

// In updateCommandContexts():
if (command instanceof ClearCommand) {
  command.setContext(this.context!);
}
```
