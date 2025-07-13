# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Simple POS is a WooCommerce-based Point of Sale system with the following components:

- **WordPress Plugin** (`simple-pos.php`) - Helper plugin extending WooCommerce with POS-specific functionality
- **Vue.js Frontend** (`/front-end/`) - Legacy implementation (95% complete, production-ready)
- **Next.js Frontend** (`/next/`) - **Current mission: React rewrite (15% complete)**

The ultimate goal is to package the Next.js frontend into an Electron app for Windows once core functionality is complete.

## Current Mission: Complete React Implementation

The primary focus is completing the React/Next.js rewrite in the `/next/` directory to achieve feature parity with the Vue.js version.

## Development Commands

### Next.js Frontend (Primary Development Target)
```bash
cd next
npm install
npm run dev          # Development server with Turbopack and debugging
npm run build        # Production build
npm run lint         # Next.js linting
```

### Vue.js Frontend (Reference Implementation)
```bash
cd front-end
npm install
npm run dev          # Development server
npm run build        # Production build for WordPress plugin
npm run lint         # ESLint with auto-fix
npm run type-check   # TypeScript checking
```

### WordPress Backend
```bash
cp .env.example .env
composer install
cd front-end && npm install && npm run build  # Build Vue.js version for plugin
docker-compose up -d
```

After setup, visit `http://localhost`, activate the plugin and WooCommerce, then create a page with shortcode `[simple-pos]`.

## Architecture Overview

### WordPress Plugin Integration
- **Purpose**: Extends WooCommerce with POS-specific REST endpoints
- **Key Features**: Customer search, pickup locations, order processing
- **Location**: Root `simple-pos.php` + `/endpoints/` directory
- **Integration**: Uses WooCommerce REST API with custom endpoints

### Next.js Frontend (Current Development)
- **Framework**: Next.js 15 with React 19
- **State Management**: Zustand (to replace Pinia from Vue version)
- **Data Fetching**: TanStack React Query
- **UI Framework**: HeroUI + Tailwind CSS
- **Type Safety**: TypeScript + Zod validation
- **Icons**: Hugeicons React components

### Vue.js Frontend (Reference Implementation)
- **State Management**: Pinia stores with reactive cart management
- **API Layer**: Axios client with WooCommerce REST API
- **UI Framework**: Vue 3 + Vuetify
- **Command System**: Text-based POS commands for fast operation
- **Multi-Cart**: Table-based cart management

## Key Development Patterns to Implement

### Multi-Cart Management System
The Vue.js version uses a sophisticated cart management pattern that needs to be replicated:
- Dynamic cart stores for multiple tables/locations
- Cart switching and persistence
- Auto-save functionality with dirty state tracking

### Command-Driven POS Interface
Critical feature for fast operation:
- Text-based command input (add-by-sku, clear, pay, done, etc.)
- Command parsing and validation
- History and auto-completion

### API Integration Patterns
- WooCommerce REST API integration
- Authentication via WP Nonce or Consumer Key/Secret
- Error handling and retry logic
- Optimistic updates for better UX

## Priority Implementation Order

Based on TODO.md analysis, focus on:

### Phase 1 - Core POS Infrastructure
1. **Command System** - Text-based command input and parsing
2. **Cart Management** - Multi-cart store with Zustand
3. **Product Catalog** - Product search and display
4. **Basic Order Flow** - Add items, calculate totals, complete orders

### Phase 2 - Essential POS Features
5. **Payment Processing** - Multiple payment methods
6. **Customer Management** - Search and add customer info
7. **Order Persistence** - Save/load orders via API
8. **Print System** - Receipts and KOT (Kitchen Order Tickets)

### Phase 3 - Advanced Features
9. **Settings Management** - Configuration interface
10. **Reporting** - Sales analytics and reports
11. **Offline Support** - Local storage and sync

## API Endpoints

The WordPress plugin provides these custom endpoints:
- `/wp-json/wc/v3/customers` (enhanced customer search)
- `/wp-json/wc/v3/shipping_methods/local_pickup` (pickup locations)
- Standard WooCommerce REST API for products, orders, etc.

## Configuration

### Authentication Methods
1. **WP Nonce** (development) - Set `method: 'nonce'`
2. **Consumer Key/Secret** (production) - Set `method: 'key'`

### Key Config Areas
- API authentication setup
- Table/location mapping
- Printer configuration
- Category settings for KOT filtering

## Reference Architecture (Vue.js)

### Store Structure (`/front-end/src/stores/`)
- `cart.ts` - Dynamic multi-cart management
- `catalog.ts` - Product catalog and search
- `alerts.ts` - Global notifications
- `print.ts` - Printing and receipt management

### Command System (`/front-end/src/commands/`)
Essential commands to replicate:
- `add-by-sku.ts`, `pay.ts`, `clear.ts`, `done.ts`
- `select-cart.ts`, `open-order.ts`, `customer-info.ts`

## Next.js Implementation Status

**Current Progress (~15%)**:
- ✅ Basic project setup with Next.js 15
- ✅ TanStack Query integration
- ✅ Basic product catalog
- ✅ HeroUI + Tailwind setup

**Immediate Next Steps**:
1. Implement command input system
2. Create Zustand cart management stores
3. Build main POS interface layout
4. Add essential POS commands

## Future Electron Packaging

Once the Next.js implementation reaches feature parity:
- Package frontend as Electron app for Windows
- Consider cross-platform builds (macOS, Linux)
- Implement proper app packaging and distribution