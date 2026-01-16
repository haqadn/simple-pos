# E2E Testing PRD - Simple POS

## Overview and Objectives

### Purpose
Implement comprehensive end-to-end testing for Simple POS to prevent regressions during active development and refactoring, ensure all features work correctly, and catch corner cases before they reach production.

### Goals
1. **Regression Prevention**: Catch breaking changes early during heavy refactoring
2. **Feature Validation**: Verify all POS features work correctly end-to-end
3. **Corner Case Coverage**: Test edge cases, especially around line item operations
4. **Developer Confidence**: Enable faster iteration with safety net

### Success Metrics
- All critical user flows have test coverage
- Tests catch regressions before manual testing discovers them
- Test suite runs reliably without flakiness
- New features include corresponding e2e tests

---

## Technical Stack

### Framework
**Playwright** - Official Next.js recommendation for e2e testing

### Key Dependencies
```
@playwright/test - Core testing framework
```

### Configuration
- **Browsers**: Chromium (primary), optionally Firefox/WebKit for cross-browser
- **Base URL**: `http://localhost:3000` (Next.js dev server)
- **Backend URL**: `http://localhost:8080` (Docker WooCommerce)
- **Timeout**: Reasonable defaults with extended timeouts for API operations

---

## Test Architecture

### Hybrid Backend Strategy

| Test Category | Backend Approach | Rationale |
|---------------|------------------|-----------|
| Order creation | Real WooCommerce API | Critical business logic, must test actual behavior |
| Order updates (line items) | Real WooCommerce API | Complex update patterns, high regression risk |
| Order completion | Real WooCommerce API | Payment and status transitions |
| Product listing/search | Mocked responses | Read-only, speed optimization |
| Customer search | Mocked responses | Read-only, speed optimization |
| Coupon lookup | Mocked responses | Read-only, speed optimization |

### Directory Structure
```
/next/
├── e2e/
│   ├── fixtures/
│   │   ├── test-base.ts          # Extended test with POS helpers
│   │   ├── api-mocks.ts          # Mock response factories
│   │   └── test-data.ts          # Dynamic test data fetching
│   ├── helpers/
│   │   ├── commands.ts           # Command input helpers
│   │   ├── orders.ts             # Order manipulation helpers
│   │   └── assertions.ts         # Custom assertions
│   ├── tests/
│   │   ├── order-management/
│   │   │   ├── create-order.spec.ts
│   │   │   ├── multi-order.spec.ts
│   │   │   └── order-completion.spec.ts
│   │   ├── line-items/
│   │   │   ├── add-item.spec.ts
│   │   │   ├── remove-item.spec.ts
│   │   │   ├── update-quantity.spec.ts
│   │   │   └── edge-cases.spec.ts
│   │   ├── commands/
│   │   │   ├── item-command.spec.ts
│   │   │   ├── pay-command.spec.ts
│   │   │   ├── done-command.spec.ts
│   │   │   ├── coupon-command.spec.ts
│   │   │   ├── clear-command.spec.ts
│   │   │   ├── print-command.spec.ts
│   │   │   └── multi-input-mode.spec.ts
│   │   ├── keyboard-shortcuts/
│   │   │   ├── global-shortcuts.spec.ts
│   │   │   └── command-bar-shortcuts.spec.ts
│   │   ├── features/
│   │   │   ├── product-search.spec.ts
│   │   │   ├── customer-assignment.spec.ts
│   │   │   ├── service-selection.spec.ts
│   │   │   └── notes.spec.ts
│   │   └── integration/
│   │       └── full-order-flow.spec.ts
│   └── playwright.config.ts
```

### Test Data Strategy

**Dynamic Product Fetching**: Tests fetch existing products from WooCommerce at setup time.

```
Setup Phase:
1. Fetch products from WooCommerce API
2. Store products with variations for test use
3. Use first available simple product for basic tests
4. Use variable product for variation tests
```

**Test Isolation**:
- Each test creates its own draft order
- Test orders remain as drafts (no cleanup necessary)
- No shared state between tests

---

## Feature Coverage

### 1. Order Management

#### 1.1 Create Order
**Description**: Creating new draft orders from the POS interface

**Test Scenarios**:
| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Create empty order | Navigate to /orders, click new order | Draft order created, redirected to order page |
| Create order with service | Select service/table before creating | Order has correct service meta |

**Acceptance Criteria**:
- Draft order exists in WooCommerce after creation
- Order ID visible in URL
- Order status is "draft" or equivalent

---

#### 1.2 Multi-Order Management
**Description**: Managing multiple concurrent orders

**Test Scenarios**:
| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Switch between orders | Create 2 orders, click to switch | Correct order loads, line items preserved |
| Create order while another open | Have order open, create new | New order created, original unchanged |
| URL-based routing | Navigate directly to /orders/[id] | Correct order loads |

**Acceptance Criteria**:
- Each order maintains independent state
- Switching orders does not corrupt data
- URL reflects current order ID

---

#### 1.3 Order Completion
**Description**: Completing orders through checkout flow

**Test Scenarios**:
| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Complete paid order | Add items, record payment, run /done | Order status changes to completed |
| Complete with partial payment | Add items, partial payment, /done | Appropriate handling (warn or complete) |

**Acceptance Criteria**:
- Order status updates in WooCommerce
- Payment recorded correctly
- Order removed from active orders list

---

### 2. Line Item Operations

#### 2.1 Add Item
**Description**: Adding products to order

**Test Scenarios**:
| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Add by SKU via command | `/item SKU123` | Item added with qty 1 |
| Add with quantity | `/item SKU123 5` | Item added with qty 5 |
| Add via product search | Search product, click add | Item added with qty 1 |
| Add variable product | Select product with variations | Variation selector appears, correct variation added |
| Add same item twice | `/item SKU123` twice | Quantity increments to 2 |

**Acceptance Criteria**:
- Line item appears in order UI
- Line item exists in WooCommerce order
- Correct product, quantity, and price

**Edge Cases**:
- Invalid SKU handling
- Out of stock product (if stock management enabled)
- Product with special characters in name

---

#### 2.2 Remove Item
**Description**: Removing products from order

**Test Scenarios**:
| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Remove via command | `/item SKU123 0` | Item removed from order |
| Remove via UI button | Click remove/delete on line item | Item removed from order |
| Remove only item | Remove last item from order | Order empty, totals zero |

**Acceptance Criteria**:
- Line item removed from UI
- Line item removed from WooCommerce order
- Order totals recalculated

**Edge Cases**:
- Remove item that doesn't exist in order
- Remove during pending API update

---

#### 2.3 Update Quantity
**Description**: Changing quantity of existing line items

**Test Scenarios**:
| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Increase via command | `/item SKU123 5` (from qty 2) | Quantity set to 5 |
| Decrease via command | `/item SKU123 1` (from qty 5) | Quantity set to 1 |
| Update via UI input | Change quantity input field | Quantity updated |
| Rapid quantity changes | Multiple quick quantity changes | Final quantity correct, no race conditions |

**Acceptance Criteria**:
- Quantity updates in UI immediately (optimistic)
- Quantity persists in WooCommerce
- Totals recalculate correctly

**Edge Cases**:
- Set quantity to 0 (should remove)
- Set negative quantity (should reject/handle)
- Very large quantity
- Decimal quantity (if applicable)

---

### 3. Command System

#### 3.1 Item Command (`/item`, `/i`)
**Description**: Add or update line items by SKU

**Test Scenarios**:
| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Basic add | `/item SKU` | Item added, qty 1 |
| Add with quantity | `/item SKU 3` | Item added, qty 3 |
| Increment existing | `/item SKU` on existing item | Quantity +1 |
| Set quantity | `/item SKU 5` on existing (qty 2) | Quantity becomes 5 |
| Remove item | `/item SKU 0` | Item removed |
| Alias works | `/i SKU` | Same as /item |
| Autocomplete | Type `/item SK` | Suggestions appear |

**Multi-Input Mode**:
| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Enter multi-input | `/item` (no args) | Prompt changes to `item>` |
| Rapid entry | `SKU1`, `SKU2 3`, `SKU3` | All items added correctly |
| Exit mode | Type `/` | Returns to normal prompt |

**Acceptance Criteria**:
- All input formats work correctly
- Multi-input mode enables rapid entry
- Autocomplete shows relevant products

---

#### 3.2 Pay Command (`/pay`, `/p`)
**Description**: Record payment amounts

**Test Scenarios**:
| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Record exact payment | `/pay 50.00` (total is 50) | Payment recorded, balance zero |
| Record partial payment | `/pay 25.00` (total is 50) | Payment recorded, balance shown |
| Record overpayment | `/pay 60.00` (total is 50) | Change amount shown |
| Alias works | `/p 50` | Same as /pay |

**Acceptance Criteria**:
- Payment amount stored in order meta
- UI reflects payment status
- Balance/change calculated correctly

---

#### 3.3 Done Command (`/done`, `/dn`, `/d`)
**Description**: Complete the current order

**Test Scenarios**:
| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Complete paid order | Full payment recorded, `/done` | Order completed |
| All aliases work | `/dn`, `/d` | Same behavior |

**Acceptance Criteria**:
- Order status changes to completed
- Order removed from active list
- Ready for new order

---

#### 3.4 Coupon Command (`/coupon`, `/c`, `/discount`)
**Description**: Apply or remove discount codes

**Test Scenarios**:
| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Apply valid coupon | `/coupon SAVE10` | Discount applied, totals updated |
| Apply invalid coupon | `/coupon INVALID` | Error message shown |
| Remove coupon | `/coupon SAVE10` (already applied) | Coupon removed |
| Autocomplete | `/coupon SA` | Matching coupons shown |

**Acceptance Criteria**:
- Valid coupons apply discount
- Invalid coupons show appropriate error
- Totals recalculate with discount

---

#### 3.5 Clear Command (`/clear`, `/cl`)
**Description**: Clear current order (remove all items)

**Test Scenarios**:
| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Clear order with items | Add items, `/clear` | All items removed |
| Clear empty order | `/clear` on empty order | No error, order remains empty |

**Acceptance Criteria**:
- All line items removed
- Order totals zero
- Order remains as draft (not deleted)

---

#### 3.6 Print Command (`/print`, `/pr`)
**Description**: Print receipts or KOT

**Test Scenarios**:
| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Print receipt | `/print` or `/print receipt` | Print event emitted/detected |
| Print KOT | `/print kot` | KOT print event emitted/detected |

**Acceptance Criteria**:
- Print action initiates correctly
- Correct template used

**Testability Note**: The print system sends commands directly to a printer. For testing, the application may need slight adjustments to emit testable events or expose print state that tests can observe (e.g., a `data-testid` attribute, custom event, or state flag).

---

### 4. Keyboard Shortcuts

#### 4.1 Global Shortcuts
**Description**: Keyboard shortcuts available throughout the app

**Test Scenarios**:
| Shortcut | Action | Test Steps |
|----------|--------|------------|
| Focus command bar | (defined shortcut) | Press shortcut, command bar focused |
| New order | (defined shortcut) | Press shortcut, new order created |

**Acceptance Criteria**:
- Shortcuts work from any context
- No conflicts with browser/OS shortcuts
- Shortcuts don't trigger when typing in inputs (where appropriate)

---

#### 4.2 Command Bar Shortcuts
**Description**: Shortcuts specific to command bar interaction

**Test Scenarios**:
| Shortcut | Context | Action |
|----------|---------|--------|
| Enter | Command typed | Execute command |
| Escape | Command bar focused | Clear/blur command bar |
| Up/Down | Autocomplete open | Navigate suggestions |
| Tab | Autocomplete open | Accept suggestion |

**Acceptance Criteria**:
- All shortcuts trigger correct actions
- Autocomplete navigation works smoothly

---

### 5. Supporting Features

#### 5.1 Product Search
**Description**: Finding products to add to orders

**Test Scenarios**:
| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Search by name | Type product name | Matching products shown |
| Search by SKU | Type SKU | Product with SKU shown |
| Select from results | Click product | Product added to order |
| No results | Search non-existent | Empty state shown |

---

#### 5.2 Customer Assignment
**Description**: Assigning customers to orders

**Test Scenarios**:
| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Search customer | Type customer name/email | Matching customers shown |
| Assign customer | Select customer | Customer attached to order |
| Remove customer | Clear customer | Order becomes guest order |

---

#### 5.3 Service/Table Selection
**Description**: Selecting service type and table/location

**Test Scenarios**:
| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Select dine-in | Choose dine-in service | Service type saved |
| Select table | Choose table number | Table saved in order meta |
| Change service | Switch from dine-in to takeaway | Service type updates |

---

#### 5.4 Notes
**Description**: Adding notes to orders

**Test Scenarios**:
| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Add order note | Enter note text | Note saved to order |
| Edit note | Modify existing note | Note updates |
| Customer note vs order note | Add both types | Correct note types saved |

---

### 6. Integration Tests

#### 6.1 Full Order Flow
**Description**: Complete end-to-end order lifecycle

**Test Scenario**:
```
1. Select service (dine-in, table 5)
2. Create new order
3. Add customer
4. Add multiple items via /item command
5. Modify quantity of one item
6. Remove one item
7. Apply coupon
8. Add order note
9. Record payment
10. Complete order with /done
11. Verify order in WooCommerce
```

**Acceptance Criteria**:
- All steps complete successfully
- Final order in WooCommerce matches all inputs
- No console errors throughout flow

---

## Edge Cases and Known Issues

### Line Item Update Pattern
WooCommerce requires special handling for line item updates:
- Existing items: set quantity to 0 (delete) then add new with desired quantity
- Order of operations matters: deletions before additions

**Tests Must Verify**:
- Quantity changes persist correctly
- No duplicate line items after update
- No orphaned line items

### Optimistic Updates
The app uses optimistic updates for better UX.

**Tests Must Verify**:
- UI updates immediately
- Rollback occurs on API failure
- Final state matches server state

### Debounced Mutations
Rapid changes are debounced to prevent API spam.

**Tests Must Verify**:
- Rapid quantity changes result in single final API call
- Final value is correct
- No race conditions

---

## Development Phases

### Phase 1: Foundation (Priority: High)
- [ ] Playwright setup and configuration
- [ ] Test fixtures and helpers
- [ ] Dynamic test data fetching
- [ ] Mock response factories
- [ ] Basic order creation test

### Phase 2: Core Operations (Priority: High)
- [ ] Line item add/remove/update tests
- [ ] Item command tests (all formats)
- [ ] Multi-input mode tests
- [ ] Order completion tests

### Phase 3: Commands (Priority: Medium)
- [ ] Pay command tests
- [ ] Done command tests
- [ ] Coupon command tests
- [ ] Clear command tests
- [ ] Print command tests

### Phase 4: Features (Priority: Medium)
- [ ] Product search tests
- [ ] Customer assignment tests
- [ ] Service/table selection tests
- [ ] Notes tests
- [ ] Keyboard shortcuts tests

### Phase 5: Integration (Priority: High)
- [ ] Full order flow integration test
- [ ] Multi-order management tests
- [ ] Edge case coverage

### Phase 6: Polish (Priority: Low)
- [ ] Cross-browser testing (Firefox, WebKit)
- [ ] Performance benchmarks
- [ ] Flakiness reduction
- [ ] CI/CD integration (future)

---

## Technical Considerations

### API Mocking Strategy
Use Playwright's route interception for mocked endpoints:
```
Products: GET /wp-json/wc/v3/products
Customers: GET /wp-json/wc/v3/customers
Coupons: GET /wp-json/wc/v3/coupons
```

Pass through to real API:
```
Orders: GET/POST/PUT /wp-json/wc/v3/orders
```

### Test Isolation
- Each test should create its own order
- Use `test.beforeEach` for setup
- Test orders can remain as drafts (no cleanup necessary)

### Waiting Strategies
- Wait for network idle after mutations
- Wait for specific UI elements after commands
- Avoid arbitrary `page.waitForTimeout()` calls

### Debugging Support
- Screenshots on failure
- Trace recording for debugging
- Console log capture

### Application Testability Adjustments
Some features may require minor application modifications to become testable. This is acceptable and expected:
- **Print system**: Add event emission or state flags to detect when print is triggered
- **External integrations**: Add hooks or callbacks that tests can observe
- **Async operations**: Ensure loading states are properly exposed via `data-testid` or ARIA attributes

These adjustments should be minimal and improve the overall code quality by making behavior more observable.

---

## Potential Challenges

| Challenge | Mitigation |
|-----------|------------|
| Test flakiness from async operations | Use proper waiting strategies, retry flaky assertions |
| WooCommerce API latency | Reasonable timeouts, parallel test execution where possible |
| Test data dependencies | Dynamic fetching, clear documentation of requirements |
| Variable products complexity | Dedicated test helpers for variation selection |
| Features requiring testability adjustments | Minor app modifications to emit events or expose state |

---

## Future Expansion

- **CI/CD Integration**: GitHub Actions workflow to run tests on PR
- **Visual Regression**: Screenshot comparison for UI changes
- **Performance Testing**: Measure and track response times
- **Accessibility Testing**: Automated a11y checks
- **Mobile Viewport Testing**: Responsive design validation
