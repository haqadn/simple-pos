# PRD: E2E Test Infrastructure Independence

## Overview
Make the Playwright E2E test suite fully self-contained and runnable from a fresh checkout. Tests should spin up their own WordPress/WooCommerce environment via wp-env, seed necessary test data, and execute without external dependencies.

## Objectives
1. **Zero external dependencies** - Tests run with `npm run test:e2e` after install
2. **Automatic environment** - wp-env handles WordPress/WooCommerce setup
3. **Auto port selection** - No port conflicts with other local services
4. **Seeded test data** - Products available for tests automatically
5. **Error-free codebase** - All TypeScript errors resolved

---

## Technical Requirements

### 1. WordPress Environment (wp-env)

**Package**: `@wordpress/env`

**Configuration (`.wp-env.json`)**:
- WordPress core (latest)
- WooCommerce plugin (latest stable)
- Simple POS plugin mounted from `../` (parent directory)
- Automatic port selection enabled

**Port Strategy**:
- Let wp-env auto-select available ports
- Expose selected port to Playwright via wp-env CLI or config parsing
- Update `playwright.config.ts` to read dynamic port

**Environment Management**:
```bash
npm run wp-env start   # Start WordPress environment
npm run wp-env stop    # Stop environment
npm run wp-env destroy # Remove environment completely
```

### 2. Test Data Seeding

**Products to Create**:
```
Simple Product:
  - Name: "Test Simple Product"
  - SKU: "TEST-SIMPLE-001"
  - Regular Price: 25.00
  - Stock: 100
  - Status: publish

Variable Product:
  - Name: "Test Variable Product"
  - SKU: "TEST-VAR-001"
  - Attribute: Size (Small, Medium, Large)
  - Variations:
    - Small:  SKU "TEST-VAR-S", Price 30.00
    - Medium: SKU "TEST-VAR-M", Price 35.00
    - Large:  SKU "TEST-VAR-L", Price 40.00
```

**Seeding Approach**:
- Node.js script using WooCommerce REST API
- Idempotent: Check if products exist by SKU before creating
- Run via `npm run test:e2e:seed`
- Automatically called during test setup if products missing

**API Authentication**:
- Generate consumer key/secret via WP-CLI during setup
- Store in `.env.test` (gitignored)

### 3. TypeScript Error Fixes

**Known Issues**:
| File | Line | Issue |
|------|------|-------|
| `item-command.spec.ts` | 319 | Calling `.textContent()` on string (already fixed) |
| `multi-input-mode.spec.ts` | 444, 476, 518 | `parseInt()` passed to `getOrder()` expecting string |
| `customer-assignment.spec.ts` | Multiple | Same `parseInt()` issue |
| `clear-command.spec.ts` | 485, 493 | `customer_id` not in Order type |
| Various files | Various | Unused imports |

### 4. Playwright Configuration

**Dynamic Base URL**:
```typescript
// playwright.config.ts
const WP_PORT = process.env.WP_PORT || '8888';
baseURL: `http://localhost:${WP_PORT}`,
```

**Web Server Integration**:
- Start wp-env before tests if not running
- Start Next.js dev server
- Wait for both to be ready

### 5. NPM Scripts

```json
{
  "wp-env": "wp-env",
  "test:e2e:setup": "wp-env start && npm run test:e2e:seed",
  "test:e2e:seed": "node e2e/scripts/seed-products.js",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:debug": "playwright test --debug"
}
```

---

## Success Criteria

1. Fresh clone + `npm install` + `npm run test:e2e` works
2. No manual WordPress/WooCommerce setup required
3. No TypeScript errors (`npx tsc --noEmit` passes for e2e files)
4. Tests find seeded products and execute successfully
5. Multiple developers can run tests without port conflicts

---

## Out of Scope

- CI/CD configuration
- Database reset between tests
- Custom coupons, customers, shipping zones
- Cross-browser testing setup
