# Project Plan

## Overview
Set up wp-env for self-contained E2E testing, seed WooCommerce with test products, fix TypeScript errors, and verify tests run successfully.

**Reference:** `PRD.md`

---

## Task List

```json
[
  {
    "id": 1,
    "category": "setup",
    "description": "Install and configure wp-env for E2E testing",
    "steps": [
      "Install @wordpress/env as dev dependency",
      "Create .wp-env.json with WordPress, WooCommerce, and Simple POS plugin",
      "Configure automatic port selection",
      "Add wp-env scripts to package.json (wp-env, wp-env:start, wp-env:stop)",
      "Test that wp-env starts successfully and WooCommerce is active"
    ],
    "passes": true
  },
  {
    "id": 2,
    "category": "setup",
    "description": "Create WooCommerce API credentials setup script",
    "steps": [
      "Create e2e/scripts/setup-api-credentials.js",
      "Use wp-env run to execute WP-CLI commands",
      "Generate WooCommerce REST API consumer key and secret",
      "Save credentials to .env.test file (gitignored)",
      "Add .env.test to .gitignore if not present"
    ],
    "passes": true
  },
  {
    "id": 3,
    "category": "setup",
    "description": "Create product seeding script",
    "steps": [
      "Create e2e/scripts/seed-products.js",
      "Read API credentials from .env.test",
      "Implement idempotent product creation (check SKU before creating)",
      "Create simple product: TEST-SIMPLE-001, price 25.00",
      "Create variable product: TEST-VAR-001 with S/M/L variations",
      "Add npm script test:e2e:seed"
    ],
    "passes": true
  },
  {
    "id": 4,
    "category": "setup",
    "description": "Update Playwright config for dynamic wp-env port",
    "steps": [
      "Modify playwright.config.ts to read WP_PORT from environment",
      "Create helper to detect wp-env port from .wp-env.json or CLI",
      "Update webServer config to start both wp-env and Next.js",
      "Ensure baseURL uses correct WordPress port for API calls",
      "Test configuration with wp-env running on non-default port"
    ],
    "passes": true
  },
  {
    "id": 5,
    "category": "setup",
    "description": "Create unified test setup script",
    "steps": [
      "Create e2e/scripts/setup.js that orchestrates full setup",
      "Check if wp-env is running, start if not",
      "Check if API credentials exist, create if not",
      "Check if products are seeded, seed if not",
      "Add npm script test:e2e:setup",
      "Update test:e2e to call setup first"
    ],
    "passes": true
  },
  {
    "id": 6,
    "category": "fix",
    "description": "Fix TypeScript errors in multi-input-mode.spec.ts",
    "steps": [
      "Remove parseInt() wrapper from OrdersAPI.getOrder() calls",
      "orderId is already a string from getCurrentOrderId()",
      "Verify no other type errors in file",
      "Run tsc --noEmit to confirm fixes"
    ],
    "passes": true
  },
  {
    "id": 7,
    "category": "fix",
    "description": "Fix TypeScript errors in customer-assignment.spec.ts",
    "steps": [
      "Remove parseInt() wrapper from all OrdersAPI.getOrder() calls",
      "Remove unused imports (mockCustomers, etc.)",
      "Fix any other type errors in file",
      "Run tsc --noEmit to confirm fixes"
    ],
    "passes": true
  },
  {
    "id": 8,
    "category": "fix",
    "description": "Fix TypeScript errors in clear-command.spec.ts",
    "steps": [
      "Update Order type or cast to include customer_id property",
      "Or change test to access customer_id via correct path",
      "Verify no other type errors in file",
      "Run tsc --noEmit to confirm fixes"
    ],
    "passes": true
  },
  {
    "id": 9,
    "category": "fix",
    "description": "Fix TypeScript errors in item-command.spec.ts",
    "steps": [
      "Fix .textContent() call on string array (suggestions already strings)",
      "Remove unused imports (getLineItems, getFirstInStockVariation, etc.)",
      "Fix unused posPage parameter in test",
      "Run tsc --noEmit to confirm fixes"
    ],
    "passes": true
  },
  {
    "id": 10,
    "category": "fix",
    "description": "Fix remaining TypeScript errors across all test files",
    "steps": [
      "Run npx tsc --noEmit and collect all errors",
      "Fix each error systematically",
      "Remove all unused imports",
      "Ensure all files compile without errors"
    ],
    "passes": true
  },
  {
    "id": 11,
    "category": "testing",
    "description": "Update test-data.ts to use wp-env API",
    "steps": [
      "Update API base URL to use wp-env port",
      "Read credentials from .env.test",
      "Ensure getTestProducts() works with seeded products",
      "Update globalSetup to work with new configuration",
      "Test that dynamic test data fetching works"
    ],
    "passes": true
  },
  {
    "id": 12,
    "category": "testing",
    "description": "Run full test suite and fix any runtime issues",
    "steps": [
      "Run npm run test:e2e with wp-env running",
      "Identify and fix any failing tests due to environment",
      "Ensure seeded products are found by tests",
      "Verify API calls use correct credentials",
      "Document any tests that need adjustment"
    ],
    "passes": false
  }
]
```
