# Simple POS - Next.js Frontend

A WooCommerce-based Point of Sale system built with Next.js 15, React 19, and TanStack Query.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- WooCommerce backend running (local wp-env *or* a remote WooCommerce site)

### Docs

- Store setup (WooCommerce): `docs/store-setup.md`
- Electron auto-updates (GitHub Releases): `docs/electron-auto-updates.md`

### Development Server

```bash
npm install

# Default: web app only (Next.js)
npm run dev

# Optional: Electron wrapper + Next dev server
npm run dev:desktop
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## E2E Testing

Simple POS uses [Playwright](https://playwright.dev/) for end-to-end testing. Tests use a hybrid approach: real WooCommerce API for order mutations, with optional mocked responses for read-only operations.

### Quick Start

```bash
# Run all tests
npm run test:e2e

# Run tests with UI mode (recommended for development)
npm run test:e2e:ui

# Run tests with debugger
npm run test:e2e:debug
```

### Available Test Scripts

| Script | Description |
|--------|-------------|
| `npm run test:e2e` | Run all tests headlessly |
| `npm run test:e2e:ui` | Open Playwright UI mode with time-travel debugging |
| `npm run test:e2e:debug` | Run with Playwright Inspector (step through tests) |
| `npm run test:e2e:trace` | Run with trace recording enabled for all tests |
| `npm run test:e2e:report` | Open the HTML test report |

### Running Specific Tests

```bash
# Run a specific test file
npx playwright test e2e/tests/commands/item-command.spec.ts

# Run tests matching a pattern
npx playwright test -g "item command"

# Run tests in a specific directory
npx playwright test e2e/tests/commands/

# Run only failed tests from last run
npx playwright test --last-failed

# Run tests with specific tags (if using tags)
npx playwright test --grep @smoke
```

### Test Structure

```
e2e/
├── fixtures/           # Test fixtures and helpers
│   ├── test-base.ts    # Extended test with POSPage helper
│   ├── api-mocks.ts    # Mock response factories
│   ├── test-data.ts    # Dynamic test data from WooCommerce
│   └── index.ts        # Exports all fixtures
├── helpers/            # Standalone helper utilities
│   ├── commands.ts     # Command bar interaction helpers
│   ├── orders.ts       # Order manipulation helpers
│   ├── assertions.ts   # Custom assertions (POSAssert)
│   └── index.ts        # Exports all helpers
├── tests/
│   ├── order-management/   # Order CRUD tests
│   ├── line-items/         # Line item operations
│   ├── commands/           # Command system tests
│   ├── keyboard-shortcuts/ # Keyboard shortcut tests
│   ├── features/           # Feature-specific tests
│   └── integration/        # Full flow integration tests
└── global-setup.ts     # Fetches test data before tests run
```

### Debugging Failed Tests

#### 1. View the HTML Report

After running tests, view the detailed report:

```bash
npm run test:e2e:report
```

The report includes:
- Screenshots of failures
- Trace files (time-travel debugging)
- Console logs from the browser
- Network requests
- Video recordings (on retry)

#### 2. Use UI Mode for Development

UI mode provides the best debugging experience:

```bash
npm run test:e2e:ui
```

Features:
- Watch mode - tests re-run on file changes
- Time-travel through test steps
- View DOM snapshots at each step
- Network request inspection
- Console log viewing

#### 3. Use the Playwright Inspector

For step-by-step debugging:

```bash
npm run test:e2e:debug
```

Or debug a specific test:

```bash
npx playwright test -g "add item" --debug
```

#### 4. Enable Traces for All Tests

By default, traces are only recorded on retry. To record traces for all tests:

```bash
npm run test:e2e:trace
```

Or set the environment variable:

```bash
TRACE=1 npx playwright test
```

#### 5. View Trace Files

After a test failure, open the trace file:

```bash
npx playwright show-trace test-results/[test-name]/trace.zip
```

### Test Artifacts

Test artifacts are saved to `test-results/` and include:

| Artifact | When Created | Location |
|----------|--------------|----------|
| Screenshots | On failure | `test-results/[test-name]/screenshot.png` |
| Traces | On first retry | `test-results/[test-name]/trace.zip` |
| Videos | On first retry | `test-results/[test-name]/video.webm` |
| HTML Report | Always | `playwright-report/index.html` |

### Writing Tests

#### Using Fixtures

```typescript
import { test, expect } from '../fixtures';

test('can add item to order', async ({ posPage }) => {
  // Navigate to orders
  await posPage.gotoOrders();

  // Create a new order
  await posPage.createNewOrder();

  // Execute a command
  await posPage.executeCommand('/item', ['SKU123']);

  // Verify the result
  await expect(posPage.getLineItems()).toHaveCount(1);
});
```

#### Using Helpers

```typescript
import { test, expect } from '@playwright/test';
import { executeCommand, createNewOrder, OrderVerify } from '../helpers';

test('can add item to order', async ({ page }) => {
  await createNewOrder(page);
  await executeCommand(page, '/item', ['SKU123']);
  await OrderVerify.lineItemCount(page, 1);
});
```

#### Using Custom Assertions

```typescript
import { POSAssert, assertOrder } from '../helpers';

test('order has correct state', async ({ page }) => {
  // Single assertions
  await POSAssert.toHaveLineItem(page, 'Product Name', 2);
  await POSAssert.toHaveTotal(page, 29.99);
  await POSAssert.toBePaid(page);

  // Fluent assertions
  await assertOrder(page)
    .hasLineItem('Product Name', 2)
    .hasTotal(29.99)
    .isPaid()
    .verify();
});
```

### Configuration

Test configuration is in `playwright.config.ts`:

- **Base URL**: `http://localhost:3000`
- **Browser**: Chromium (Desktop Chrome)
- **Timeout**: 30 seconds per test, 10 seconds for assertions
- **Retries**: 2 on CI, 0 locally
- **Parallelism**: Full parallel locally, single worker on CI

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CI` | CI environment flag | `false` |
| `TRACE` | Force trace recording for all tests | `false` |

### Troubleshooting

#### Tests fail to start

Ensure the development server is running or let Playwright start it:

```bash
# Option 1: Let Playwright start the server (default)
npm run test:e2e

# Option 2: Start server manually first
npm run dev &
npm run test:e2e
```

#### Tests are flaky

1. Check for missing `await` statements
2. Use proper waiting strategies (avoid `page.waitForTimeout()`)
3. Use the custom assertions from `helpers/assertions.ts`
4. Run with `--retries=3` to identify flaky tests

#### Cannot find test data

Tests fetch products from WooCommerce during global setup. Ensure:
1. WooCommerce backend is running (`docker-compose up -d`)
2. Products exist with SKUs and prices
3. API credentials are configured in `api/config.ts`

#### Screenshots show wrong state

Screenshots are taken at the moment of failure. Use traces for time-travel:

```bash
npm run test:e2e:trace
npx playwright show-trace test-results/[test]/trace.zip
```

---

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [TanStack Query](https://tanstack.com/query)
- [HeroUI Components](https://heroui.com/)
