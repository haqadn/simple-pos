# Activity Log

Last updated: 2026-01-16
Tasks completed: 24
Current task: None

---

## [2026-01-16] - Task 1: Initialize Playwright and configure for Next.js

### Changes Made
- `/next/package.json`: Added e2e test scripts (`test:e2e`, `test:e2e:ui`, `test:e2e:debug`)
- `/next/playwright.config.ts`: Fixed HTML reporter output folder conflict (changed from `test-results/html-report` to `playwright-report`)
- `/next/e2e/tests/smoke.spec.ts`: Created minimal smoke test to verify Playwright runs correctly

### Verification
- Verified `@playwright/test` is already installed as dev dependency
- Verified `playwright.config.ts` has correct configuration (baseURL, Chromium browser, reasonable timeouts)
- Verified e2e directory structure exists: `e2e/fixtures/`, `e2e/helpers/`, `e2e/tests/`
- Ran `npx playwright test --list` to confirm tests are discovered (2 tests in smoke.spec.ts)
- Configuration validation passed without errors

### Notes
- The Playwright webServer configuration expects a dev server running on localhost:3000
- Run `npm run dev` in a separate terminal before running tests, or tests will auto-start the server
- Smoke tests require the application to be accessible at http://localhost:3000

### Commit
- chore: initialize Playwright e2e testing setup

---

## [2026-01-16] - Task 2: Create test fixtures and base test configuration

### Changes Made
- `/next/e2e/fixtures/test-base.ts`: Created extended test fixture with POSPage helper class
  - POSPage class with common selectors for command bar, order page, sidebar, service selection
  - Command bar interaction methods: focusCommandBar, typeCommand, executeCommand, clearCommandInput
  - Autocomplete methods: waitForAutocomplete, getAutocompleteSuggestions, selectAutocompleteSuggestion
  - Multi-input mode methods: enterMultiInputMode, exitMultiInputMode, isInMultiInputMode
  - Navigation methods: gotoOrders, gotoOrder, gotoNewOrder, createNewOrder
  - Line item methods: getLineItems, getLineItem, hasLineItem, updateLineItemQuantity
  - Order verification methods: getCurrentOrderId, verifyOnOrderPage, verifyLineItemCount, verifyLineItem
  - Payment methods: getOrderTotal, getPaymentAmount, getChangeAmount, isOrderPaid, enterPayment
  - Service selection methods: selectTable, selectDeliveryZone, getSelectedService
  - Sidebar methods: getOrderLinksFromSidebar, clickOrderInSidebar
  - Extended test fixture that provides posPage to all tests
- `/next/e2e/fixtures/index.ts`: Export file for clean imports
- `/next/e2e/tests/fixtures.spec.ts`: Verification tests for the fixtures

### Verification
- TypeScript compilation passes with no errors
- IDE diagnostics show no errors for test-base.ts and fixtures.spec.ts
- `npx playwright test --list` discovers 7 tests (5 new fixture tests + 2 smoke tests)
- Fixture tests verify: posPage availability, navigation, command bar locators, sidebar locators, order creation

### Notes
- POSPage uses aria-labels and data-testid where available for reliable element selection
- Command bar input is identified by aria-label="Command input field"
- Service selection card uses id="service-selection-card"
- Line items table uses aria-label="Order line items"
- Payment table uses aria-label="Payment details"

### Commit
- chore: create test fixtures and POSPage helper class

---

## [2026-01-16] - Task 3: Implement dynamic test data fetching from WooCommerce

### Changes Made
- `/next/e2e/fixtures/test-data.ts`: Created test data module for fetching real products from WooCommerce API
  - `TestProductSchema` and `TestVariationSchema` Zod schemas for type-safe data parsing
  - `fetchTestData()` function that fetches products and variations from WooCommerce API
  - `getTestProducts()` returns simple and variable products for test use
  - `getTestSku()` returns appropriate SKU (variation SKU for variable products)
  - `getTestPrice()` returns appropriate price for product type
  - `getFirstInStockVariation()` finds in-stock variation for variable products
  - `getAllSkus()` returns all SKUs including variation SKUs
  - `findProductBySku()` and `findVariationBySku()` lookup helpers
  - `getProductForScenario()` returns product based on test scenario type
  - Cache management functions: `saveTestDataCache()`, `loadTestDataCache()`, `clearTestDataCache()`
  - In-memory store for test data with `setTestData()` and `getTestData()`
- `/next/e2e/global-setup.ts`: Playwright global setup that runs before all tests
  - Fetches test data from WooCommerce API
  - Caches data for 1 hour to avoid redundant API calls
  - Falls back to stale cache if API is unavailable
- `/next/e2e/fixtures/index.ts`: Updated to export all test data functions and types
- `/next/e2e/tests/test-data.spec.ts`: Verification tests for test data functionality (12 tests)
- `/next/playwright.config.ts`: Added `globalSetup` configuration to run data fetching before tests
- `/next/.gitignore`: Added `/e2e/.test-data-cache.json` to ignore cache file

### Verification
- IDE diagnostics show no TypeScript errors for all new files
- `npx playwright test --list` discovers 19 total tests (12 new test-data tests)
- Playwright configuration correctly references global-setup.ts
- All TypeScript code compiles without errors

### Notes
- Test data is fetched once during global setup and cached for all tests
- Cache expires after 1 hour to ensure data freshness
- Simple product: must have SKU, price > 0, and be in stock
- Variable product: must have variations loaded for variation selection tests
- Uses same API credentials as the main application (from api/config.ts)
- HTTPS agent configured to handle self-signed certificates in development

### Commit
- chore: implement dynamic test data fetching from WooCommerce

---

## [2026-01-16] - Task 4: Create API mock factories for read-only endpoints

### Changes Made
- `/next/e2e/fixtures/api-mocks.ts`: Created API mock factories module
  - Type definitions: MockProduct, MockVariation, MockCustomer, MockCoupon, MockConfig
  - `mockProducts()`: Creates realistic product data including simple products, variable products, out-of-stock items, and products without SKU for edge case testing
  - `mockVariations()`: Creates size variations (S, M, L, XL) for variable products with mixed stock status
  - `mockCustomers()`: Creates sample customer data with names and phone numbers
  - `mockCoupons()`: Creates valid and invalid coupon scenarios including percentage discounts, fixed cart discounts, expired coupons, maxed-out coupons, and minimum amount requirements
  - `setupMockRoutes()`: Main route interception helper that mocks products, customers, and coupons endpoints
  - `setupProductMocks()`: Individual route interception for products only
  - `setupCustomerMocks()`: Individual route interception for customers only
  - `setupCouponMocks()`: Individual route interception for coupons only
  - `clearMockRoutes()`: Utility to clear all mock routes
  - Convenience getters: getValidCouponCode(), getInvalidCouponCode(), getExpiredCouponCode(), getSimpleMockProduct(), getVariableMockProduct(), getMockCustomerByName()
- `/next/e2e/fixtures/index.ts`: Updated to export all API mock functions and types
- `/next/e2e/tests/api-mocks.spec.ts`: Verification tests for mock factories (16 tests)
  - Mock Data Factories tests: verify product, variation, customer, and coupon data structure
  - Convenience Getters tests: verify helper functions return expected data
  - Route Interception tests: verify Playwright route mocking works correctly

### Verification
- IDE diagnostics show no TypeScript errors for api-mocks.ts and api-mocks.spec.ts
- `npx playwright test --list` discovers 35 total tests (16 new api-mocks tests)
- TypeScript compilation passes without errors
- All mock data factories return properly structured data matching WooCommerce API responses

### Notes
- Mock data follows WooCommerce API response structure for products, coupons
- Customer mock follows Simple POS custom endpoint structure (/simple-pos/customers)
- Route interception only intercepts GET requests; mutations pass through to real API
- Mocks include edge cases: out-of-stock items, expired coupons, maxed-out coupons, products without SKU
- Pattern matches both WooCommerce API (**/wp-json/wc/v3/**) and Simple POS API (**/wp-json/wc/v3/simple-pos/**)

### Commit
- chore: create API mock factories for read-only endpoints

---

## [2026-01-16] - Task 5: Create command and order helper utilities

### Changes Made
- `/next/e2e/helpers/commands.ts`: Created standalone command input helper utilities
  - `executeCommand(page, command, args)`: Execute a command with optional arguments
  - `executeCommandAndWait()`: Execute command and wait for network to settle
  - `typePartialCommand()`: Type command without executing (for autocomplete testing)
  - `clearCommandInput()`, `escapeCommandBar()`: Command bar cleanup utilities
  - `getPromptText()`: Get current prompt text (e.g., ">", "item>")
  - `enterMultiInputMode(page, command)`: Enter multi-input mode for a command
  - `exitMultiInputMode(page)`: Exit multi-input mode by typing /
  - `isInMultiInputMode(page)`: Check if currently in multi-input mode
  - `executeMultiModeEntry()`: Execute entry in multi-input mode
  - Autocomplete helpers: `waitForAutocomplete()`, `getAutocompleteSuggestionTexts()`, `selectAutocompleteSuggestionByIndex()`, `acceptAutocompleteSuggestion()`, `navigateAutocomplete()`
  - Locator helpers: `getCommandInput()`, `getAutocompleteDropdown()`, `getAutocompleteSuggestions()`
  - String utilities: `buildCommandString()`, `parseCommandString()`
  - `CommandShortcuts` object with convenient helpers: `addItem()`, `removeItem()`, `recordPayment()`, `completeOrder()`, `clearOrder()`, `applyCoupon()`, `print()`
  - Exported `COMMAND_BAR_SELECTORS` constant for direct selector access
- `/next/e2e/helpers/orders.ts`: Created standalone order manipulation helper utilities
  - Navigation: `gotoOrders()`, `gotoOrder()`, `gotoNewOrder()`, `createNewOrder()`
  - Order page: `waitForOrderPageReady()`, `getCurrentOrderId()`, `verifyOnOrderPage()`
  - Line items: `getLineItems()`, `getLineItemCount()`, `getLineItem()`, `hasLineItem()`, `getLineItemQuantityInput()`, `updateLineItemQuantity()`
  - Payment: `getOrderTotal()`, `getPaymentAmount()`, `getChangeAmount()`, `getOrderBalance()`, `isOrderPaid()`, `enterPayment()`, `clickQuickPayment()`
  - Sidebar: `getOrderLinksFromSidebar()`, `clickOrderInSidebar()`
  - Summary: `getOrderSummary()` returns combined order info
  - `OrderVerify` object with assertion helpers: `lineItemCount()`, `lineItem()`, `noLineItem()`, `total()`, `isPaid()`, `isNotPaid()`, `balance()`, `isEmpty()`, `onOrderPage()`
  - `ServiceSelection` object: `selectTable()`, `selectDeliveryZone()`, `getSelectedService()`, `isServiceCardVisible()`
  - Utility: `waitForMutations()`, `screenshot()`
  - Exported `ORDER_SELECTORS` constant for direct selector access
  - Type definitions: `LineItem`, `OrderSummary`
- `/next/e2e/helpers/index.ts`: Created index file exporting all helpers
- `/next/e2e/fixtures/index.ts`: Updated to re-export all helpers for convenience

### Verification
- IDE diagnostics show no TypeScript errors for commands.ts, orders.ts, and index.ts
- `npx playwright test --list` continues to discover all 35 existing tests
- All helper functions are exported and importable from both `../helpers` and `../fixtures`
- Helpers are standalone (use Page object) and complement the POSPage class methods

### Notes
- Helpers are standalone utilities that use Playwright Page object directly
- Can be used alongside or instead of POSPage class methods
- `CommandShortcuts` provides quick access to common command operations
- `OrderVerify` provides expect-based assertions for order validation
- `ServiceSelection` provides table/delivery zone selection helpers
- All helpers follow the same selector patterns as POSPage for consistency

### Commit
- chore: create command and order helper utilities

---

## [2026-01-16] - Task 6: Implement order creation tests

### Changes Made
- `/next/e2e/tests/order-management/create-order.spec.ts`: Created comprehensive order creation tests (9 tests)
  - **Create empty order** tests:
    - `can navigate to orders page and create new draft order`: Verifies navigation to /orders and clicking New Order
    - `draft order becomes real order when modified with line item`: Verifies draft order saves to WooCommerce when item added
    - `URL contains order ID after order is saved`: Verifies URL routing contains order ID
  - **Create order with service selection** tests:
    - `can select a table before/after creating order`: Verifies table selection in service card
    - `can select a delivery zone`: Verifies delivery zone selection
    - `service selection persists when order is saved`: Verifies service meta saved to WooCommerce
  - **Order status verification** tests:
    - `new orders start as draft/pending status`: Verifies orders created with pending status
    - `order ID is visible in the UI after creation`: Verifies order title shows Order #[id]
  - **Order appears in sidebar** tests:
    - `newly created order appears in sidebar order list`: Verifies order link appears in sidebar

### Verification
- IDE diagnostics show no TypeScript errors for create-order.spec.ts
- `npx playwright test --list` discovers 44 total tests (9 new order creation tests)
- All tests use proper waiting strategies (waitForURL, waitForLoadState, waitForMutations)
- Tests use test.skip() for graceful handling when service options or products are unavailable
- Tests verify both UI state and WooCommerce API state where applicable

### Notes
- Tests follow hybrid backend strategy: real WooCommerce API for mutations
- Tests are resilient to different service configurations (tables, delivery zones, or neither)
- Order creation flow: /orders/new is draft -> add item -> saves to DB -> URL changes to /orders/[id]
- Service selection card uses id="service-selection-card" for reliable selection
- Tests use OrdersAPI.getOrder() to verify order state in WooCommerce

### Commit
- feat: implement order creation e2e tests

---

## [2026-01-16] - Task 7: Implement line item add tests

### Changes Made
- `/next/e2e/tests/line-items/add-item.spec.ts`: Created comprehensive line item add tests (15 tests)
  - **Add item by SKU via command** tests:
    - `can add item by SKU using /item command`: Verifies basic /item SKU functionality
    - `item command with SKU adds item with quantity 1`: Verifies default quantity is 1
  - **Add item with specific quantity** tests:
    - `can add item with specific quantity using /item SKU qty`: Verifies quantity specification
    - `/item SKU 3 adds item with quantity 3`: Verifies quantity parsing
  - **Add same item twice increments quantity** tests:
    - `adding same item twice increments quantity`: Verifies increment behavior
    - `adding item twice without quantity increments by 1 each time`: Verifies sequential increments
  - **Add variable product** tests:
    - `adding variable product shows variation selector`: Tests variable product handling
    - `can add variation product by variation SKU`: Tests direct variation SKU entry
  - **Persistence to WooCommerce** tests:
    - `added item persists to WooCommerce order`: Verifies API persistence
    - `item with quantity persists correct quantity to WooCommerce`: Verifies quantity persistence
    - `multiple items persist correctly to WooCommerce`: Verifies multi-item orders
    - `order total updates correctly when item is added`: Verifies total calculation
  - **Add item via autocomplete** tests:
    - `can add item by selecting from autocomplete suggestions`: Tests autocomplete flow
  - **Item command aliases** tests:
    - `/i alias works the same as /item`: Verifies /i alias
    - `/i SKU qty adds item with specified quantity`: Verifies alias with quantity

### Verification
- IDE diagnostics show no TypeScript errors for add-item.spec.ts
- `npx playwright test --list` discovers 59 total tests (15 new add-item tests)
- All tests use dynamic test data from getTestProducts()
- Tests verify both UI state and WooCommerce API state
- Tests use test.skip() for graceful handling when products or variations unavailable

### Notes
- Tests follow hybrid backend strategy: real WooCommerce API for order mutations
- Line item tests verify persistence via OrdersAPI.getOrder()
- Tests handle both simple and variable products
- Variable product tests use getFirstInStockVariation() to find testable variations
- Tests are resilient and skip gracefully when required test data is unavailable

### Commit
- feat: implement line item add e2e tests

---

## [2026-01-16] - Task 8: Implement line item remove and update tests

### Changes Made
- `/next/e2e/tests/line-items/remove-item.spec.ts`: Created comprehensive line item removal tests (8 tests)
  - **Remove item via command** tests:
    - `can remove item via /item SKU 0 command`: Verifies basic removal functionality
    - `/item SKU 0 removes item from order`: Verifies removal with explicit quantity 0
    - `removing item with /i SKU 0 alias works`: Verifies /i alias works for removal
  - **Remove last item** tests:
    - `removing last item leaves order empty`: Verifies order is empty after last item removed
    - `order with no items has zero total`: Verifies total recalculates to zero
  - **Remove one of multiple items** tests:
    - `can remove one item while keeping others`: Verifies selective removal works
  - **Persistence to WooCommerce** tests:
    - `removed item is deleted from WooCommerce order`: Verifies API deletion
    - `order total updates to zero after all items removed`: Verifies total persistence

- `/next/e2e/tests/line-items/update-quantity.spec.ts`: Created comprehensive quantity update tests (14 tests)
  - **Update quantity via command** tests:
    - `can increase quantity using /item SKU qty command`: Verifies quantity increase
    - `can decrease quantity using /item SKU qty command`: Verifies quantity decrease
    - `setting quantity to 1 works correctly`: Verifies edge case of quantity 1
  - **Update quantity via UI input** tests:
    - `can update quantity via line item input field`: Verifies UI input update
    - `UI quantity update persists to WooCommerce`: Verifies UI update persistence
  - **Rapid quantity changes** tests:
    - `rapid quantity changes result in correct final value`: Verifies debouncing/final state
    - `rapid quantity changes sync correctly to WooCommerce`: Verifies rapid changes persist
  - **Order total recalculation** tests:
    - `order total updates when quantity changes`: Verifies total increases
    - `decreasing quantity decreases total`: Verifies total decreases
  - **Increment behavior** tests:
    - `using /item SKU without quantity increments by 1`: Verifies increment behavior
    - `multiple increments work correctly`: Verifies sequential increments
  - **WooCommerce persistence** tests:
    - `quantity changes persist correctly via command`: Verifies command persistence
    - `quantity changes persist correctly via UI`: Verifies UI persistence

### Verification
- IDE diagnostics show no TypeScript errors for both new test files
- `npx playwright test --list` discovers 81 total tests (22 new tests: 8 remove + 14 update)
- All tests use dynamic test data from getTestProducts()
- Tests verify both UI state and WooCommerce API state
- Tests use proper waiting strategies (waitForMutations, waitForURL)
- Tests use test.skip() for graceful handling when test data unavailable

### Notes
- Remove tests verify item is completely removed from order (line_items.length = 0)
- Update tests cover both command-based and UI-based quantity changes
- Rapid quantity change tests verify debouncing results in correct final state
- Tests verify total recalculation on both increase and decrease
- Increment behavior tests verify /item SKU without quantity adds 1 to existing

### Commit
- feat: implement line item remove and update e2e tests

---

## [2026-01-16] - Task 9: Implement line item edge case tests

### Changes Made
- `/next/e2e/tests/line-items/edge-cases.spec.ts`: Created comprehensive edge case tests (17 tests)
  - **Invalid SKU handling** tests (3 tests):
    - `invalid SKU shows appropriate error or no item added`: Verifies invalid SKU does not add item
    - `empty SKU does not add item`: Verifies /item with empty SKU is handled
    - `SKU with only whitespace does not add item`: Verifies whitespace-only SKU is rejected
  - **Negative quantity handling** tests (2 tests):
    - `negative quantity is handled gracefully`: Verifies no crash and no negative quantities
    - `negative quantity does not create negative line item`: Verifies direct negative qty handling
  - **Very large quantity handling** tests (2 tests):
    - `very large quantity is handled without crash`: Verifies system handles 999999 qty
    - `large quantity persists correctly to WooCommerce`: Verifies 1000 qty saves correctly
  - **WooCommerce update pattern** tests (2 tests):
    - `quantity update uses correct delete-then-add pattern`: Verifies update pattern maintains single item
    - `multiple updates maintain single line item`: Verifies sequential updates result in 1 line item
  - **No duplicate or orphaned line items** tests (5 tests):
    - `no duplicate line items after adding same product twice`: Verifies no duplicates
    - `no orphaned line items after remove and re-add`: Verifies clean add after remove
    - `no duplicate items when rapidly adding same product`: Verifies rapid adds don't create duplicates
    - `multiple products remain separate line items`: Verifies different products stay separate
    - `UI and WooCommerce line items stay in sync`: Verifies UI/API consistency
  - **Special characters and edge cases** tests (3 tests):
    - `SKU with special characters is handled`: Verifies special char SKUs don't crash
    - `decimal quantity is handled correctly`: Verifies decimal qty handling (2.5)
    - `zero quantity removes item if it exists`: Verifies qty 0 removes existing item

### Verification
- IDE diagnostics show no TypeScript errors for edge-cases.spec.ts
- `npx playwright test --list` discovers 98 total tests (17 new edge-cases tests)
- All tests use dynamic test data from getTestProducts()
- Tests verify both UI state and WooCommerce API state
- Tests are designed to be resilient - verify behavior doesn't crash rather than specific error messages

### Notes
- Edge case tests focus on graceful handling rather than specific error messages
- Invalid/negative/large quantity tests verify no crashes and valid final states
- WooCommerce update pattern tests verify the delete-then-add pattern works correctly
- Duplicate detection tests verify both UI and API maintain consistency
- Tests use test.skip() when required test data is unavailable

### Commit
- feat: implement line item edge case e2e tests

---

## [2026-01-16] - Task 10: Implement item command comprehensive tests

### Changes Made
- `/next/e2e/tests/commands/item-command.spec.ts`: Created comprehensive item command tests (31 tests)
  - **Input Format: /item SKU** tests (3 tests):
    - `can add item with /item SKU format`: Verifies basic /item SKU command
    - `/item SKU adds item with default quantity of 1`: Verifies default quantity is 1
    - `/item SKU works with SKU containing special characters`: Verifies special char SKUs
  - **Input Format: /item SKU qty** tests (4 tests):
    - `can add item with /item SKU qty format`: Verifies quantity specification
    - `/item SKU 1 adds single item`: Verifies single quantity
    - `/item SKU 10 adds item with double-digit quantity`: Verifies double-digit qty
    - `/item SKU 100 adds large quantity`: Verifies large quantity handling
  - **Input Format: /i alias** tests (3 tests):
    - `/i alias adds item same as /item`: Verifies /i alias works
    - `/i SKU qty works same as /item SKU qty`: Verifies alias with quantity
    - `/i is case insensitive command`: Verifies case insensitivity
  - **Autocomplete Suggestions** tests (4 tests):
    - `typing partial SKU shows autocomplete suggestions`: Verifies autocomplete appears
    - `autocomplete suggestions include matching products`: Verifies relevant suggestions
    - `selecting autocomplete suggestion fills command`: Verifies click selection
    - `Tab accepts first autocomplete suggestion`: Verifies Tab key acceptance
  - **Increment vs Set Behavior** tests (6 tests):
    - `/item SKU on new item adds quantity 1`: Verifies initial add behavior
    - `/item SKU on existing item increments by 1`: Verifies increment on re-add
    - `/item SKU qty on existing item sets quantity (not increment)`: Verifies set vs increment
    - `multiple /item SKU increments correctly`: Verifies sequential increments
    - `/item SKU 0 removes item from order`: Verifies removal with qty 0
    - `increment then set then increment works correctly`: Verifies mixed operations
  - **Optimistic Updates and Server State** tests (6 tests):
    - `UI updates immediately (optimistic update)`: Verifies immediate UI feedback
    - `final UI state matches server state after add`: Verifies UI/server consistency
    - `final UI state matches server state after multiple operations`: Verifies complex scenarios
    - `order total in UI matches server total`: Verifies total calculation sync
    - `server state persists correctly after quantity change`: Verifies persistence
    - `no duplicate line items in server state after multiple operations`: Verifies no duplicates
  - **Edge Cases** tests (5 tests):
    - `/item with invalid SKU does not add item`: Verifies invalid SKU handling
    - `/item without arguments does not crash`: Verifies empty argument handling
    - `/item with very long SKU is handled`: Verifies long input handling
    - `/item SKU with decimal quantity is handled`: Verifies decimal qty handling
    - `/item SKU with negative quantity is rejected`: Verifies negative qty rejection
- Created `/next/e2e/tests/commands/` directory for command-related tests

### Verification
- IDE diagnostics show no TypeScript errors for item-command.spec.ts
- `npx playwright test --list` discovers 128 total tests (31 new item-command tests)
- Test file follows established patterns from existing test files
- All tests use dynamic test data from getTestProducts()
- Tests verify both UI state and WooCommerce API state
- Tests use test.skip() for graceful handling when test data unavailable

### Notes
- Tests cover all required input formats: /item SKU, /item SKU qty, /i alias
- Autocomplete tests handle cases where autocomplete may not appear
- Increment vs set behavior is thoroughly tested with multiple scenarios
- Optimistic update tests verify immediate UI feedback and eventual consistency
- Edge case tests focus on graceful error handling
- Tests are resilient with proper waiting strategies (waitForURL, waitForMutations)

### Commit
- feat: implement item command comprehensive e2e tests

---

## [2026-01-16] - Task 11: Implement multi-input mode tests

### Changes Made
- `/next/e2e/tests/commands/multi-input-mode.spec.ts`: Created comprehensive multi-input mode tests (22 tests)
  - **Enter Multi-Input Mode** tests (4 tests):
    - `/item with no args enters multi-input mode`: Verifies /item without arguments enters multi-input mode
    - `prompt changes to item> when entering item multi-input mode`: Verifies prompt text changes
    - `/i alias also enters multi-input mode`: Verifies alias works for entering mode
    - `command bar remains focused after entering multi-input mode`: Verifies focus is maintained
  - **Multi-Input Mode Entry** tests (3 tests):
    - `can add item by typing SKU in multi-input mode`: Verifies SKU entry without /item prefix
    - `can add item with quantity in multi-input mode`: Verifies SKU + quantity entry
    - `prompt remains as item> after adding item`: Verifies staying in multi-input mode
  - **Rapid Entry of Multiple SKUs** tests (4 tests):
    - `can add multiple different items rapidly`: Verifies adding different products
    - `can add same item multiple times to increment quantity`: Verifies increment behavior
    - `rapid entry with mixed quantities`: Verifies mixed increment/set operations
    - `stays in multi-input mode throughout rapid entry`: Verifies mode persistence
  - **Exit Multi-Input Mode** tests (4 tests):
    - `/ exits multi-input mode`: Verifies exit via /
    - `prompt returns to > after exiting`: Verifies prompt reset
    - `can exit after adding items`: Verifies items persist after exit
    - `switching to another command exits multi-input mode`: Verifies command switching
  - **Persistence to WooCommerce** tests (3 tests):
    - `all items added in multi-input mode persist correctly`: Verifies API persistence
    - `order total is correct after multi-input mode entries`: Verifies total calculation
    - `no duplicate line items after multiple multi-input operations`: Verifies no duplicates
  - **Edge Cases** tests (4 tests):
    - `invalid SKU in multi-input mode shows error but stays in mode`: Verifies error handling
    - `empty entry in multi-input mode does not crash`: Verifies empty input handling
    - `can re-enter multi-input mode after exiting`: Verifies re-entry works
    - `multi-input mode works with products added before entering mode`: Verifies compatibility

### Verification
- IDE diagnostics show no TypeScript errors for multi-input-mode.spec.ts
- `npx playwright test --list` discovers 150 total tests (22 new multi-input-mode tests)
- Test file follows established patterns from existing command test files
- All tests use dynamic test data from getTestProducts()
- Tests verify both UI state and WooCommerce API state
- Tests use test.skip() for graceful handling when test data unavailable

### Notes
- Multi-input mode allows rapid SKU entry without repeating the command prefix
- Prompt changes from ">" to "item>" to indicate active mode
- Exit via "/" or by executing a different command
- Tests cover: entering mode, entries, rapid entry, exiting, persistence, and edge cases
- Helper functions from commands.ts are used: enterMultiInputMode, exitMultiInputMode, isInMultiInputMode, executeMultiModeEntry

### Commit
- feat: implement multi-input mode e2e tests

---

## [2026-01-16] - Task 12: Implement pay command tests

### Changes Made
- `/next/e2e/tests/commands/pay-command.spec.ts`: Created comprehensive pay command tests (21 tests)
  - **Record exact payment /pay amount** tests (3 tests):
    - `can record payment with /pay command`: Verifies basic /pay amount functionality
    - `/pay with exact amount shows zero change/balance`: Verifies exact payment results in zero balance
    - `/pay with amount records payment correctly in UI`: Verifies payment displayed in UI
  - **Record partial payment shows balance** tests (3 tests):
    - `partial payment shows remaining balance`: Verifies partial payment and balance calculation
    - `partial payment shows "Short" or balance indicator`: Verifies balance indicator display
    - `can add multiple partial payments`: Verifies payment replacement behavior
  - **Record overpayment shows change amount** tests (3 tests):
    - `overpayment shows positive change amount`: Verifies change calculation on overpayment
    - `large overpayment shows correct change`: Verifies change with round number payments
    - `paying double the amount shows correct change`: Verifies doubling payment gives correct change
  - **/p alias works correctly** tests (3 tests):
    - `/p alias records payment same as /pay`: Verifies /p alias basic functionality
    - `/p with partial amount works correctly`: Verifies /p with partial payment
    - `/p with overpayment works correctly`: Verifies /p with overpayment
  - **Verify payment stored in order meta** tests (3 tests):
    - `payment is saved to WooCommerce order meta_data`: Verifies payment_received in meta_data
    - `payment meta updates correctly on subsequent /pay commands`: Verifies meta updates on changes
    - `UI payment amount matches server meta_data value`: Verifies UI/server consistency
  - **Edge Cases** tests (6 tests):
    - `/pay with zero amount is handled`: Verifies zero payment handling
    - `/pay without amount does not crash`: Verifies empty argument handling
    - `/pay with negative amount is rejected`: Verifies negative amount rejection
    - `/pay with decimal amount works correctly`: Verifies decimal (45.67) handling
    - `/pay with very large amount is handled`: Verifies large payment (99999.99)
    - `/pay on empty order is handled gracefully`: Verifies payment on empty order

### Verification
- IDE diagnostics show no TypeScript errors for pay-command.spec.ts
- `npx playwright test --list` discovers 171 total tests (21 new pay-command tests)
- Test file follows established patterns from existing command test files
- All tests use dynamic test data from getTestProducts()
- Tests verify both UI state and WooCommerce API state (via OrdersAPI.getOrder)
- Tests verify payment_received meta_data key in WooCommerce order
- Tests use test.skip() for graceful handling when test data unavailable

### Notes
- Pay command stores payment in order meta_data with key `payment_received`
- Payment is set (not additive) - each /pay command replaces the previous payment amount
- Change/Short is calculated as payment - total in the UI
- /p alias works identically to /pay
- Tests cover: exact payment, partial payment, overpayment, alias, meta storage, edge cases

### Commit
- feat: implement pay command e2e tests

---

## [2026-01-16] - Task 13: Implement done command tests

### Changes Made
- `/next/e2e/tests/commands/done-command.spec.ts`: Created comprehensive done command tests (16 tests)
  - **/done completes paid order** tests (3 tests):
    - `can complete order with /done command`: Verifies basic /done functionality and status change to completed
    - `/done on fully paid order shows success message`: Verifies success handling
    - `/done with overpayment shows change and completes`: Verifies overpayment scenario completion
  - **All aliases /dn, /d work correctly** tests (3 tests):
    - `/dn alias completes paid order`: Verifies /dn alias works
    - `/d alias completes paid order`: Verifies /d alias works
    - `all aliases produce same result`: Verifies all aliases behave identically
  - **Verify order status changes to completed in WooCommerce** tests (3 tests):
    - `order status is completed after /done`: Verifies WooCommerce status update
    - `order total and line items are preserved after completion`: Verifies data integrity
    - `payment meta is preserved after completion`: Verifies payment_received meta persists
  - **Verify order removed from active orders list** tests (2 tests):
    - `completed order is removed from sidebar`: Verifies order removed from sidebar after completion
    - `app navigates away from completed order`: Verifies navigation behavior after completion
  - **Edge Cases** tests (5 tests):
    - `/done on empty order shows error`: Verifies empty order handling
    - `/done on unpaid order shows error about insufficient payment`: Verifies unpaid order rejection
    - `/done on partially paid order shows error`: Verifies partial payment rejection
    - `/done twice on same order is handled gracefully`: Verifies double-completion handling
    - `command bar remains functional after /done`: Verifies app state after completion

### Verification
- IDE diagnostics show no TypeScript errors for done-command.spec.ts
- `npx playwright test --list` discovers 187 total tests (16 new done-command tests)
- All tests use dynamic test data from getTestProducts()
- Tests verify both UI state and WooCommerce API state (via OrdersAPI.getOrder)
- Tests verify order status changes to 'completed' in WooCommerce
- Tests verify order is removed from sidebar after completion
- Tests use test.skip() for graceful handling when test data unavailable

### Notes
- Done command requires: (1) order has line items, (2) payment >= order total
- Done command changes order status to 'completed' in WooCommerce
- After completion, order should be removed from active orders in sidebar
- Tests verify all aliases: /done, /dn, /d
- Edge case tests verify insufficient payment and empty order handling

### Commit
- feat: implement done command e2e tests

---

## [2026-01-16] - Task 14: Implement coupon command tests

### Changes Made
- `/next/e2e/tests/commands/coupon-command.spec.ts`: Created comprehensive coupon command tests (21 tests)
  - **Apply valid coupon updates totals** tests (3 tests):
    - `can apply coupon with /coupon command`: Verifies basic /coupon functionality
    - `applied coupon shows discount in UI`: Verifies discount display in payment card
    - `coupon code is stored in WooCommerce order`: Verifies coupon_lines in API
  - **Apply invalid coupon shows error** tests (3 tests):
    - `invalid coupon code does not apply discount`: Verifies invalid code rejection
    - `empty coupon code is rejected`: Verifies empty argument handling
    - `coupon with special characters is handled`: Verifies special character handling
  - **Toggle coupon (apply then remove)** tests (3 tests):
    - `can remove applied coupon using /coupon remove`: Verifies remove keyword
    - `can remove coupon using /coupon clear`: Verifies clear keyword
    - `removing coupon restores original total`: Verifies total restoration
  - **Autocomplete shows matching coupons** tests (2 tests):
    - `typing /coupon shows autocomplete suggestions`: Verifies autocomplete appears
    - `typing /coupon re shows remove suggestion`: Verifies "remove" in suggestions
  - **/c and /discount aliases work** tests (4 tests):
    - `/c alias applies coupon same as /coupon`: Verifies /c alias
    - `/discount alias applies coupon same as /coupon`: Verifies /discount alias
    - `/c remove works same as /coupon remove`: Verifies alias with remove
    - `all coupon aliases behave identically`: Verifies all aliases work
  - **Edge Cases** tests (6 tests):
    - `/coupon on empty order is handled gracefully`: Verifies empty order handling
    - `applying same coupon twice does not duplicate`: Verifies no duplicate coupons
    - `coupon code is case-insensitive`: Verifies case normalization
    - `removing non-existent coupon does not error`: Verifies safe removal
    - `coupon command preserves line items`: Verifies line items intact after coupon
    - `coupon with very long code is handled`: Verifies long input handling

### Verification
- IDE diagnostics show no TypeScript errors for coupon-command.spec.ts
- `npx playwright test --list` discovers 208 total tests (21 new coupon-command tests)
- All tests use dynamic test data from getTestProducts()
- Tests verify both UI state and WooCommerce API state (via OrdersAPI.getOrder)
- Tests verify coupon_lines array in WooCommerce order
- Tests use test.skip() for graceful handling when test data unavailable
- Tests are resilient - handle case where test coupon may not exist in WooCommerce

### Notes
- Coupon command uses coupon_lines array in WooCommerce order to store applied coupons
- Each coupon_line has `code` and `discount` fields
- Coupon removal uses "remove" or "clear" keywords
- Tests verify all aliases: /coupon, /c, /discount
- Tests are designed to work with or without pre-seeded coupons in test environment
- Edge case tests verify graceful handling of invalid inputs

### Commit
- feat: implement coupon command e2e tests

---

## [2026-01-16] - Task 15: Implement clear command tests

### Changes Made
- `/next/e2e/tests/commands/clear-command.spec.ts`: Created comprehensive clear command tests (20 tests)
  - **/clear removes all line items** tests (4 tests):
    - `can clear order with /clear command`: Verifies basic /clear functionality removes all items
    - `/clear removes all items regardless of quantity`: Verifies large quantity items are removed
    - `/clear removes multiple different items`: Verifies multiple different products are cleared
    - `/clear updates order total to zero in UI`: Verifies total becomes zero after clear
  - **/clear on empty order does not error** tests (3 tests):
    - `/clear on empty order shows message but does not crash`: Verifies graceful handling
    - `/clear on order with zero items does not create negative state`: Verifies valid zero state
    - `multiple /clear commands on empty order do not cause issues`: Verifies repeated clears are safe
  - **/cl alias works correctly** tests (3 tests):
    - `/cl alias clears order same as /clear`: Verifies /cl alias works
    - `/cl alias updates total to zero`: Verifies alias updates totals correctly
    - `/cl on empty order behaves same as /clear on empty order`: Verifies alias handles empty order
  - **Verify order remains as draft with zero total** tests (5 tests):
    - `order remains as draft status after /clear`: Verifies order status is preserved
    - `order total is zero in WooCommerce after /clear`: Verifies API total is zero
    - `line_items array is empty in WooCommerce after /clear`: Verifies line_items cleared in API
    - `order is not deleted after /clear`: Verifies order still exists (not trashed)
    - `can add items after /clear`: Verifies order can be reused after clear
  - **Edge Cases** tests (5 tests):
    - `/clear preserves customer assignment`: Verifies customer_id maintained
    - `/clear preserves order notes`: Verifies customer_note maintained
    - `/clear does not affect coupon lines`: Verifies coupon_lines preserved
    - `command bar remains functional after /clear`: Verifies UI still works
    - `/clear with payment recorded - payment is preserved`: Verifies payment meta handling

### Verification
- IDE diagnostics show no TypeScript errors for clear-command.spec.ts
- `npx playwright test --list` discovers 228 total tests (20 new clear-command tests)
- All tests use dynamic test data from getTestProducts()
- Tests verify both UI state and WooCommerce API state (via OrdersAPI.getOrder)
- Tests verify line_items array becomes empty in WooCommerce
- Tests verify order status remains pending/draft (not deleted)
- Tests use test.skip() for graceful handling when test data unavailable

### Notes
- Clear command removes all line_items from order but preserves the order itself
- Order remains in pending/draft status and can be reused
- Aliases supported: /clear, /cl
- Tests verify edge cases: empty order handling, preserving customer/notes/coupons
- Tests follow established patterns from other command test files

### Commit
- feat: implement clear command e2e tests

---

## [2026-01-16] - Task 16: Implement print command tests

### Changes Made
- `/next/e2e/tests/commands/print-command.spec.ts`: Created comprehensive print command tests (20 tests)
  - **/print bill triggers print action** tests (3 tests):
    - `can trigger bill print with /print bill command`: Verifies basic /print bill functionality
    - `/print bill updates last_bill_print in order meta`: Verifies meta_data timestamp is set
    - `/print bill shows success message`: Verifies command executes without crashing
  - **/print kot triggers KOT print action** tests (3 tests):
    - `can trigger KOT print with /print kot command`: Verifies /print kot functionality
    - `/print kot updates last_kot_print in order meta`: Verifies KOT meta_data timestamp
    - `/print kot also updates last_kot_items meta for change detection`: Verifies KOT item tracking
  - **/pr alias works correctly** tests (3 tests):
    - `/pr alias triggers print same as /print`: Verifies /pr bill works
    - `/pr kot works same as /print kot`: Verifies /pr kot works
    - `/pr bill and /print bill produce identical results`: Verifies alias equivalence
  - **Autocomplete suggestions** tests (2 tests):
    - `typing /print shows autocomplete with bill and kot options`: Verifies autocomplete
    - `typing /print b narrows suggestions to bill`: Verifies filtered autocomplete
  - **Error handling** tests (4 tests):
    - `/print without type argument shows error`: Verifies missing argument handling
    - `/print with invalid type is rejected`: Verifies invalid type handling
    - `/print on empty order shows error`: Verifies empty order handling
    - `command bar remains functional after print error`: Verifies graceful error recovery
  - **Print with different order states** tests (4 tests):
    - `can print bill after recording payment`: Verifies print works with payment
    - `can print multiple times on same order`: Verifies multiple prints work
    - `can print both bill and KOT for same order`: Verifies both print types work
    - `print bill includes correct order data`: Verifies order data integrity
  - **KOT change detection** tests (1 test):
    - `KOT tracks items for change detection on subsequent prints`: Verifies last_kot_items tracking
- `/next/e2e/helpers/commands.ts`: Updated `CommandShortcuts.print` to use correct types ('bill' | 'kot')

### Verification
- TypeScript compilation passes without errors for print-command.spec.ts
- `npx playwright test --list` discovers 248 total tests (20 new print-command tests)
- Tests use proper waiting strategies (waitForMutations, waitForURL)
- Tests verify print was triggered by checking meta_data timestamps
- Tests use test.skip() for graceful handling when test data unavailable

### Notes
- Print command uses types 'bill' (customer receipt) or 'kot' (kitchen order ticket)
- Alias is /pr
- Print is verified by checking order meta_data for last_bill_print or last_kot_print timestamps
- KOT print also sets last_kot_items for change detection on subsequent prints
- The actual print output is not verified (requires printer hardware)
- Tests check testability by observing meta_data changes, following PRD guidance

### Commit
- feat: implement print command e2e tests

---

## [2026-01-16] - Task 17: Implement keyboard shortcuts tests

### Changes Made
- `/next/e2e/tests/keyboard-shortcuts/global-shortcuts.spec.ts`: Created comprehensive global shortcuts tests (13 tests)
  - **Focus Command Bar (Escape)** tests (2 tests):
    - `Escape focuses command bar when not focused`: Verifies Escape key focuses command bar
    - `Escape focuses command bar from any context`: Verifies Escape works from various UI contexts
  - **New Order (Ctrl+N)** tests (3 tests):
    - `Ctrl+N creates new order`: Verifies basic Ctrl+N creates new order
    - `Ctrl+N from existing order creates new order`: Verifies navigation to /orders/new
    - `shortcut does not conflict with browser shortcuts`: Verifies app shortcut takes precedence
  - **Print KOT (Ctrl+K)** tests (1 test):
    - `Ctrl+K triggers KOT print on order with items`: Verifies KOT print via meta_data update
  - **Print Bill (Ctrl+P)** tests (1 test):
    - `Ctrl+P triggers bill print on order with items`: Verifies bill print via meta_data update
  - **Complete Order (Ctrl+Enter)** tests (2 tests):
    - `Ctrl+Enter completes fully paid order`: Verifies order status changes to completed
    - `Ctrl+Enter on unpaid order does not complete`: Verifies insufficient payment handling
  - **Shortcuts Do Not Trigger While Typing** tests (2 tests):
    - `Ctrl+N does not trigger when typing text in input`: Tests shortcut behavior when typing
    - `Escape clears suggestions before unfocusing`: Verifies multi-stage Escape behavior
  - **Service Selection (Alt+0-9)** tests (2 tests):
    - `Alt+number selects service option`: Verifies Alt+0 selects first service
    - `Alt+1 selects second service option if available`: Verifies Alt+1 selects second service

- `/next/e2e/tests/keyboard-shortcuts/command-bar-shortcuts.spec.ts`: Created comprehensive command bar shortcuts tests (18 tests)
  - **Enter Executes Command** tests (3 tests):
    - `Enter executes typed command`: Verifies Enter executes command and adds item
    - `Enter clears input after successful command`: Verifies input cleared on success
    - `Enter on empty input does nothing`: Verifies empty input handling
  - **Escape Clears/Blurs Command Bar** tests (3 tests):
    - `Escape clears input when text is typed`: Verifies Escape clears input
    - `Escape blurs command bar when empty`: Verifies Escape blurs when empty
    - `Escape first clears suggestions, then clears input, then blurs`: Verifies multi-stage behavior
  - **Up/Down Navigate Suggestions** tests (3 tests):
    - `Down arrow navigates to next suggestion`: Verifies down arrow navigation
    - `Up arrow navigates to previous suggestion`: Verifies up arrow navigation
    - `Up/Down wraps around suggestion list`: Verifies wrap-around behavior
  - **Up/Down Navigate Command History** tests (2 tests):
    - `Up arrow recalls previous command when no suggestions`: Verifies history recall
    - `Down arrow navigates forward through history`: Verifies forward navigation
  - **Tab Accepts Suggestion** tests (3 tests):
    - `Tab accepts highlighted autocomplete suggestion`: Verifies Tab completes suggestion
    - `Tab with SKU suggestion completes the SKU`: Verifies SKU completion
    - `Tab does nothing when no suggestions`: Verifies Tab is safe without suggestions
  - **Click Suggestion Selection** tests (1 test):
    - `Clicking suggestion selects it`: Verifies click selection works
  - **Keyboard Focus Management** tests (3 tests):
    - `Command bar maintains focus during input`: Verifies focus persistence
    - `Command bar regains focus after selecting suggestion`: Verifies focus return
    - `Command bar can be focused by clicking`: Verifies click-to-focus

### Verification
- IDE diagnostics show no TypeScript errors for both test files
- `npx playwright test --list` discovers 279 total tests (31 new keyboard shortcuts tests)
- Tests follow established patterns from existing command test files
- Tests use proper waiting strategies (waitForMutations, waitForURL)
- Tests verify keyboard actions trigger expected behavior
- Tests use test.skip() for graceful handling when features unavailable

### Notes
- Global shortcuts are defined in `/next/lib/shortcuts.ts` (APP_SHORTCUTS array)
- Shortcuts include: Ctrl+N (new order), Ctrl+K (KOT), Ctrl+P (bill), Ctrl+D (drawer), Ctrl+Enter (done), Alt+0-9 (service)
- Escape has special context-dependent behavior (focus command bar if not focused, otherwise clears/blurs)
- Command bar shortcuts: Enter (execute), Escape (clear/blur), Up/Down (navigate), Tab (accept)
- Tests verify behavior through UI state changes and WooCommerce API state

### Commit
- feat: implement keyboard shortcuts e2e tests

---

## [2026-01-16] - Task 18: Implement product search tests

### Changes Made
- `/next/e2e/tests/features/product-search.spec.ts`: Created comprehensive product search tests (17 tests)
  - **Search by product name shows results** tests (3 tests):
    - `typing product name in command bar shows autocomplete suggestions`: Verifies name-based autocomplete
    - `product cards with matching name are visible in product grid`: Verifies product visibility in grid
    - `product name search is case-insensitive`: Verifies case-insensitive search
  - **Search by SKU shows matching product** tests (3 tests):
    - `typing SKU in command bar shows matching product in autocomplete`: Verifies SKU-based autocomplete
    - `full SKU entry via command adds the correct product`: Verifies SKU command adds correct product
    - `SKU shown in product card matches expected product`: Verifies SKU display in product cards
  - **Click product adds to order** tests (4 tests):
    - `clicking product card adds item to order with quantity 1`: Verifies click-to-add functionality
    - `clicking product card multiple times increments quantity`: Verifies quantity increment on click
    - `clicking product persists to WooCommerce order`: Verifies click-add persistence to API
    - `product badge shows quantity when added to order`: Verifies quantity badge on product card
  - **Category filtering** tests (2 tests):
    - `clicking a category filters products`: Verifies category selection filters product grid
    - `clicking All shows all products`: Verifies All category shows all products
  - **No results shows empty state** tests (3 tests):
    - `searching for non-existent product shows no results in autocomplete`: Verifies no match behavior
    - `invalid SKU via command does not add item`: Verifies invalid SKU handling
    - `empty product grid shows appropriate message`: Verifies empty state display
  - **Product card displays correct information** tests (2 tests):
    - `product card shows name, SKU, and price`: Verifies product card content
    - `out of stock products show appropriate indicator`: Verifies stock status indicators
- Created `/next/e2e/tests/features/` directory for feature-specific tests

### Verification
- IDE diagnostics show no TypeScript errors for product-search.spec.ts
- `npx playwright test --list` discovers 296 total tests (17 new product-search tests)
- Tests follow established patterns from existing test files
- Tests use dynamic test data from getTestProducts()
- Tests verify both UI state and WooCommerce API state
- Tests use test.skip() for graceful handling when products/features unavailable

### Notes
- Product search in Simple POS works through multiple mechanisms:
  - Command bar autocomplete for SKU/product name search
  - Category filtering via category links
  - Direct product card clicks to add items
- Product cards display: name, SKU (in Kbd element), price, stock status indicators
- Product cards have ring-2 indicator and quantity badge when added to order
- Tests cover: name search, SKU search, click-to-add, category filtering, empty states

### Commit
- feat: implement product search e2e tests

---

## [2026-01-16] - Task 19: Implement customer assignment tests

### Changes Made
- `/next/e2e/tests/features/customer-assignment.spec.ts`: Created comprehensive customer assignment tests (22 tests)
  - **Search customer by name/phone** tests (3 tests):
    - `typing /customer with partial name shows autocomplete suggestions`: Verifies customer autocomplete
    - `typing /customer with phone number shows matching customers`: Verifies phone-based search
    - `customer search is case-insensitive`: Verifies case-insensitive matching
  - **Select customer assigns to order** tests (5 tests):
    - `can assign customer using /customer command with name and phone`: Verifies basic assignment
    - `can assign customer with full address`: Verifies address storage in billing
    - `selecting customer from autocomplete assigns to order`: Verifies autocomplete selection
    - `/cust alias works the same as /customer`: Verifies /cust alias
    - `/cu alias works the same as /customer`: Verifies /cu alias
  - **Clear customer makes order guest** tests (2 tests):
    - `clearing customer name removes customer from order`: Verifies customer removal via UI
    - `order without customer is a guest order`: Verifies guest order billing is empty
  - **Verify customer in WooCommerce order** tests (5 tests):
    - `customer name is stored in billing.first_name and billing.last_name`: Verifies name parsing
    - `customer phone is stored in billing.phone`: Verifies phone persistence
    - `customer address is stored in billing.address_1`: Verifies address persistence
    - `customer info persists after page reload`: Verifies data durability
  - **Customer Info UI** tests (3 tests):
    - `customer name input is editable`: Verifies UI input functionality
    - `customer phone input is editable`: Verifies phone field editing
    - `customer address input is editable`: Verifies address field editing
  - **Edge Cases** tests (4 tests):
    - `/customer without arguments shows error`: Verifies empty argument handling
    - `/customer with only name (no phone) is rejected`: Verifies validation
    - `customer with special characters in name is handled`: Verifies special char handling
    - `customer command on empty order (no line items) creates order first`: Verifies order requirement
    - `updating customer multiple times updates correctly`: Verifies customer replacement

### Verification
- IDE diagnostics show no TypeScript errors for customer-assignment.spec.ts
- `npx playwright test --list` discovers 318 total tests (22 new customer-assignment tests)
- Tests follow established patterns from existing feature test files
- Tests use dynamic test data from getTestProducts()
- Tests verify both UI state and WooCommerce API state via OrdersAPI.getOrder()
- Tests use setupCustomerMocks() for autocomplete testing
- Tests use test.skip() for graceful handling when test data unavailable

### Notes
- Customer assignment uses /customer command with format: /customer name, phone[, address]
- Customer data stored in WooCommerce order billing field:
  - first_name: First word of name
  - last_name: Remaining words of name
  - phone: Phone number from command
  - address_1: Address if provided
- Aliases supported: /customer, /cust, /cu
- Customer Info UI component allows direct editing of name, phone, address
- Mock customer data is provided by setupCustomerMocks() for autocomplete tests
- Tests cover: search, assignment, clearing, WooCommerce persistence, UI editing, edge cases

### Commit
- feat: implement customer assignment e2e tests

---

## [2026-01-16] - Task 20: Implement service/table selection tests

### Changes Made
- `/next/e2e/tests/features/service-selection.spec.ts`: Created comprehensive service selection tests (22 tests)
  - **Select dine-in service type** tests (3 tests):
    - `can select a table from the service card`: Verifies basic table selection
    - `table selection shows table name in radio button`: Verifies table labels are visible
    - `selecting table deselects delivery zone if previously selected`: Verifies service type switching
  - **Select table number** tests (4 tests):
    - `can select different tables from the list`: Verifies switching between tables
    - `table selection can be made using keyboard shortcut Alt+0`: Verifies Alt+0 shortcut
    - `table selection can be made using keyboard shortcut Alt+1`: Verifies Alt+1 shortcut
  - **Select delivery zone** tests (3 tests):
    - `can select a delivery zone from the service card`: Verifies basic delivery zone selection
    - `delivery zone shows fee information`: Verifies fee display in labels
    - `can select different delivery zones`: Verifies switching between zones
  - **Change service type updates order** tests (3 tests):
    - `changing from table to delivery zone updates order`: Verifies API update on type change
    - `changing from delivery zone to table updates order`: Verifies reverse type change
    - `service selection persists after page reload`: Verifies data durability
  - **Verify service meta in WooCommerce order** tests (4 tests):
    - `table selection is stored in shipping_lines with pickup_location method`: Verifies pickup_location method_id
    - `delivery zone selection is stored in shipping_lines with flat_rate or free_shipping method`: Verifies delivery method_id
    - `shipping_lines total reflects delivery fee`: Verifies fee is stored correctly
    - `service selection is preserved when order is updated`: Verifies persistence after line item changes
  - **Service card UI behavior** tests (3 tests):
    - `service card has warning style when no service selected`: Verifies bg-warning-100 class
    - `service card warning style removed after selection`: Verifies style update
    - `service options show keyboard shortcuts`: Verifies Kbd elements present
  - **Edge cases** tests (3 tests):
    - `service selection on empty order works`: Verifies selection without items
    - `rapid service selection changes do not cause issues`: Verifies debouncing/final state
    - `service selection with product already in order`: Verifies selection after item added

### Verification
- IDE diagnostics show no TypeScript errors for service-selection.spec.ts
- `npx playwright test --list` discovers 340 total tests (22 new service-selection tests)
- Tests follow established patterns from existing feature test files
- Tests use dynamic test data from getTestProducts()
- Tests verify both UI state and WooCommerce API state via OrdersAPI.getOrder()
- Tests use test.skip() for graceful handling when service options unavailable

### Notes
- Service selection uses two RadioGroup components: Tables and Delivery zones
- Tables use method_id: 'pickup_location' in shipping_lines
- Delivery zones use method_id: 'flat_rate' or 'free_shipping' in shipping_lines
- Keyboard shortcuts Alt+0-9 select service options (first 10 options)
- Service card shows warning background (bg-warning-100) when no service selected
- Tests handle environments with only tables, only delivery zones, or both
- Tests verify service persists through page reloads and order updates

### Commit
- feat: implement service/table selection e2e tests

---

## [2026-01-16] - Task 21: Implement order notes tests

### Changes Made
- `/next/e2e/tests/features/notes.spec.ts`: Created comprehensive order notes tests (22 tests)
  - **Add order note** tests (4 tests):
    - `can add note using /note command`: Verifies basic /note functionality
    - `/n alias works the same as /note`: Verifies /n alias works
    - `note with multiple words is saved correctly`: Verifies multi-word notes with special characters
    - `adding note via UI textarea works`: Verifies direct textarea input
  - **Edit existing note** tests (4 tests):
    - `can edit note by typing new /note command`: Verifies note replacement via command
    - `can edit note via UI textarea`: Verifies editing via textarea
    - `note can be cleared by setting empty value`: Verifies note clearing
    - `note persists after page reload`: Verifies data durability
  - **Customer note vs order note distinction** tests (3 tests):
    - `note command sets customer_note field`: Verifies customer_note is the storage field
    - `customer note is displayed in the order note textarea`: Verifies UI display
    - `customer note is visible to kitchen staff (KOT context)`: Verifies KOT relevance
  - **Verify notes saved correctly in WooCommerce** tests (5 tests):
    - `note is saved to WooCommerce customer_note field`: Verifies API persistence
    - `note with special characters is saved correctly`: Verifies special char handling
    - `note update replaces previous note in WooCommerce`: Verifies replacement behavior
    - `note is preserved when line items are modified`: Verifies note persistence during order changes
    - `note is preserved after order completion`: Verifies note persists on completed orders
  - **Edge Cases** tests (6 tests):
    - `/note without arguments shows error`: Verifies empty argument handling
    - `/note on empty order (no line items) is handled gracefully`: Verifies empty order handling
    - `note with very long text is handled`: Verifies long text handling
    - `note textarea shows warning color while mutating`: Verifies mutation state feedback
    - `command bar remains functional after /note`: Verifies app state after note command
    - `multiple rapid note updates result in correct final value`: Verifies debouncing behavior

### Verification
- IDE diagnostics show no TypeScript errors for notes.spec.ts
- `npx playwright test --list` discovers 362 total tests (22 new notes tests)
- Tests follow established patterns from existing feature test files
- Tests use dynamic test data from getTestProducts()
- Tests verify both UI state and WooCommerce API state via OrdersAPI.getOrder()
- Tests use test.skip() for graceful handling when test data unavailable

### Notes
- Notes are stored in WooCommerce order `customer_note` field
- The /note command (alias /n) sets customer notes
- Notes are displayed in a Textarea with placeholder "Order Note"
- Notes are used for customer-facing information like kitchen instructions
- Tests cover: adding notes, editing notes, customer note distinction, WooCommerce persistence, edge cases

### Commit
- feat: implement order notes e2e tests

---

## [2026-01-16] - Task 22: Implement multi-order management tests

### Changes Made
- `/next/e2e/tests/order-management/multi-order.spec.ts`: Created comprehensive multi-order management tests (16 tests)
  - **Create and switch between multiple orders** tests (3 tests):
    - `can create two orders and switch between them`: Verifies creating two orders with different data
    - `can switch between orders using sidebar links`: Verifies sidebar navigation works
    - `switching orders does not corrupt data`: Verifies multiple switches preserve data integrity
  - **Each order maintains independent state** tests (3 tests):
    - `line items are independent between orders`: Verifies quantity changes don't affect other orders
    - `modifying one order does not affect another`: Verifies API state independence
    - `payment data is independent between orders`: Verifies payment meta isolation
  - **URL-based routing loads correct order** tests (4 tests):
    - `navigating directly to order URL loads correct order`: Verifies direct URL navigation
    - `URL updates when switching orders`: Verifies URL reflects current order
    - `browser back/forward navigation works correctly`: Verifies history navigation
    - `refresh preserves current order`: Verifies data durability on page reload
  - **Create order while another is open** tests (4 tests):
    - `creating new order while viewing existing order works`: Verifies new order creation
    - `original order remains unchanged when new order is created`: Verifies data preservation
    - `both orders appear in sidebar after creation`: Verifies sidebar list updates
    - `can switch to original order via sidebar while on new order page`: Verifies navigation flexibility
  - **Edge cases** tests (2 tests):
    - `invalid order ID in URL shows appropriate error`: Verifies error handling for non-existent orders
    - `orders with different statuses can coexist`: Verifies pending and completed orders can coexist

### Verification
- IDE diagnostics show no TypeScript errors for multi-order.spec.ts
- `npx playwright test --list` discovers 378 total tests (16 new multi-order tests)
- Tests follow established patterns from existing order-management test files
- Tests use dynamic test data from getTestProducts()
- Tests verify both UI state and WooCommerce API state via OrdersAPI.getOrder()
- Tests use test.skip() for graceful handling when test data unavailable

### Notes
- Multi-order tests verify orders maintain independent state across: line items, totals, payments
- Tests use clickOrderInSidebar() helper for reliable order switching
- URL-based routing tests verify deep linking works correctly
- Tests verify sidebar reflects all active orders
- Tests cover edge cases: invalid order IDs, orders with different statuses

### Commit
- feat: implement multi-order management e2e tests

---

## [2026-01-16] - Task 23: Implement order completion flow tests

### Changes Made
- `/next/e2e/tests/order-management/order-completion.spec.ts`: Created comprehensive order completion flow tests (20 tests)
  - **Complete fully paid order** tests (4 tests):
    - `can complete order after adding items and recording full payment`: Verifies full completion flow
    - `order completion flow with exact payment shows zero balance`: Verifies exact payment handling
    - `order completion flow with overpayment shows correct change`: Verifies change calculation
    - `order completion preserves line item data`: Verifies data integrity after completion
  - **Handle partial payment scenario** tests (4 tests):
    - `partial payment prevents order completion`: Verifies incomplete payment blocks completion
    - `partial payment shows remaining balance in UI`: Verifies balance display
    - `can complete order after topping up partial payment`: Verifies payment update flow
    - `zero payment does not allow order completion`: Verifies no-payment rejection
  - **Verify payment recorded correctly** tests (4 tests):
    - `payment amount is stored in order meta_data`: Verifies payment_received in WooCommerce
    - `payment persists after order completion`: Verifies payment survives status change
    - `UI payment amount matches WooCommerce stored value`: Verifies UI/API consistency
    - `multiple payment updates result in correct final value`: Verifies payment replacement
  - **Verify order removed from active list** tests (4 tests):
    - `completed order disappears from sidebar`: Verifies sidebar update on completion
    - `can create new order after completing previous`: Verifies app flow continues
    - `sidebar shows remaining active orders after completion`: Verifies partial list update
    - `navigates away from completed order page`: Verifies navigation behavior
  - **Edge cases** tests (4 tests):
    - `attempting to complete empty order does not crash`: Verifies graceful error handling
    - `completing order with multiple items works correctly`: Verifies multi-item completion
    - `order completion after page reload works`: Verifies data durability
    - `rapid complete attempts do not cause issues`: Verifies race condition handling

### Verification
- IDE diagnostics show no TypeScript errors for order-completion.spec.ts
- `npx playwright test --list` discovers 398 total tests (20 new order-completion tests)
- Tests follow established patterns from existing order-management test files
- Tests use dynamic test data from getTestProducts()
- Tests verify both UI state and WooCommerce API state via OrdersAPI.getOrder()
- Tests use test.skip() for graceful handling when test data unavailable

### Notes
- Tests cover the complete order lifecycle: add items -> record payment -> complete order
- Tests verify order status changes to 'completed' in WooCommerce
- Tests verify payment_received meta_data is stored and preserved
- Tests verify completed orders are removed from sidebar
- Tests verify partial payment prevents completion (requires full payment)
- Edge case tests verify graceful handling of empty orders, page reloads, and rapid attempts

### Commit
- feat: implement order completion flow e2e tests

---

## [2026-01-16] - Task 24: Implement full order flow integration test

### Changes Made
- `/next/e2e/tests/integration/full-order-flow.spec.ts`: Created comprehensive full order flow integration tests (7 tests)
  - **Primary Integration Test** (1 test):
    - `complete order flow: service > create > customer > items > modify > remove > coupon > note > pay > done`: Complete end-to-end test covering all major features in realistic workflow. Captures and reports console errors throughout flow.
  - **Simplified Flow Tests** (2 tests):
    - `basic order flow: create > add item > pay > complete`: Fast, simple flow for quick CI validation
    - `order flow with multiple items: add items > modify > pay > complete`: Tests multiple items through complete flow
  - **Feature-Specific Flow Tests** (2 tests):
    - `order flow with customer and notes: add item > customer > note > pay > complete`: Tests customer assignment and notes
    - `order flow with service selection: select table > add item > pay > complete`: Tests service/table selection
  - **Edge Case Flow Tests** (2 tests):
    - `order flow with item modifications: add > modify > remove > pay > complete`: Tests modifying and removing items
    - `order data persists after page reload during flow`: Tests data resilience through page reload
- Created `/next/e2e/tests/integration/` directory for integration tests

### Verification
- IDE diagnostics show no TypeScript errors for full-order-flow.spec.ts
- `npx playwright test --list` discovers 405 total tests (7 new integration tests)
- Tests follow established patterns from existing test files
- All tests use dynamic test data from getTestProducts()
- Tests verify both UI state and WooCommerce API state via OrdersAPI.getOrder()
- Tests use test.skip() for graceful handling when features/data unavailable
- Primary test captures console errors for debugging

### Notes
- Primary integration test covers complete flow per PRD: service > create > customer > items > modify > remove > coupon > note > pay > done
- Primary test verifies final order in WooCommerce matches all inputs: status, line items, customer info, notes, payment meta, shipping lines
- Console errors are captured and reported (non-critical errors filtered out)
- Secondary tests provide focused coverage for specific feature combinations
- Tests are designed as the primary smoke test for CI
- All tests gracefully skip when required features or test data are unavailable

### Commit
- feat: implement full order flow integration test
