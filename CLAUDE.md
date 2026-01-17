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
- **State Management**: TanStack React Query (server state) + Zustand (client state - planned)
- **UI Framework**: HeroUI + Tailwind CSS
- **Type Safety**: TypeScript + Zod validation
- **Icons**: Hugeicons React

### Design Principles
- **SOLID principles** - Single responsibility, interface segregation
- **Command Pattern** - All POS operations implemented as commands
- **Repository Pattern** - API layer abstracts data access
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
│   ├── coupons.ts          # Coupon operations
│   └── shipping.ts         # Shipping methods
├── stores/                 # State management (TanStack Query hooks)
│   ├── orders.ts           # Order queries and mutations
│   ├── products.ts         # Product catalog queries
│   └── service.ts          # Table/delivery service queries
├── commands/               # Command pattern implementation
│   ├── command.ts          # Base interfaces and classes
│   ├── command-registry.ts # Command registration and routing
│   ├── command-manager.ts  # Execution coordination
│   └── [command].ts        # Individual command implementations
├── hooks/                  # Custom React hooks
├── components/             # Shared UI components
└── app/                    # Next.js App Router pages
    ├── components/         # App-level components
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

### In Progress
- Additional command implementations

### Not Started
- Printing system
- Settings management
- Offline support
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
