# E2E Test Fix Plan

## Overview
Fix 144 failing E2E tests in the Simple POS Next.js application. The primary issues are:
1. Tests using `parseInt()` on alphanumeric frontend IDs instead of using `getServerOrderId()` helper
2. Setup Modal tests timing out due to localStorage clearing issues
3. Multi-order tests timing out due to order ID resolution problems

**Reference:** Test report at http://localhost:9323/

---

## Task List

```json
[
  {
    "id": 1,
    "category": "investigation",
    "description": "Investigate and fix getServerOrderId helper to properly wait for order sync",
    "steps": [
      "Read e2e/helpers/orders.ts and understand getServerOrderId implementation",
      "Verify the helper properly waits for order to sync to WooCommerce",
      "Add retry logic if order isn't synced yet (poll IndexedDB for serverId)",
      "Export getServerOrderId from e2e/fixtures/index.ts if not already exported",
      "Run a single test to verify the helper works correctly"
    ],
    "passes": true
  },
  {
    "id": 2,
    "category": "fix",
    "description": "Fix notes.spec.ts - Replace parseInt with getServerOrderId",
    "steps": [
      "Import getServerOrderId from fixtures",
      "Find all occurrences of parseInt(match![1], 10) pattern",
      "Replace with await getServerOrderId(page) and add null check",
      "Ensure test skips gracefully if order not synced",
      "Run notes.spec.ts and verify tests pass"
    ],
    "passes": true
  },
  {
    "id": 3,
    "category": "fix",
    "description": "Fix pay-command.spec.ts - Replace parseInt with getServerOrderId",
    "steps": [
      "Import getServerOrderId from fixtures",
      "Find all occurrences of parseInt pattern for order ID extraction",
      "Replace with await getServerOrderId(page) with proper null handling",
      "Run pay-command.spec.ts and verify tests pass"
    ],
    "passes": true
  },
  {
    "id": 4,
    "category": "fix",
    "description": "Fix done-command.spec.ts - Replace parseInt with getServerOrderId",
    "steps": [
      "Import getServerOrderId from fixtures",
      "Find all occurrences of parseInt pattern for order ID extraction",
      "Replace with await getServerOrderId(page) with proper null handling",
      "Run done-command.spec.ts and verify tests pass"
    ],
    "passes": true
  },
  {
    "id": 5,
    "category": "fix",
    "description": "Fix customer-assignment.spec.ts - Replace parseInt with getServerOrderId",
    "steps": [
      "Import getServerOrderId from fixtures",
      "Find all occurrences of parseInt pattern for order ID extraction",
      "Replace with await getServerOrderId(page) with proper null handling",
      "Run customer-assignment.spec.ts and verify tests pass"
    ],
    "passes": true
  },
  {
    "id": 6,
    "category": "fix",
    "description": "Fix order-completion.spec.ts - Replace parseInt with getServerOrderId",
    "steps": [
      "Import getServerOrderId from fixtures",
      "Find all occurrences of parseInt pattern for order ID extraction",
      "Replace with await getServerOrderId(page) with proper null handling",
      "Run order-completion.spec.ts and verify tests pass"
    ],
    "passes": true
  },
  {
    "id": 7,
    "category": "fix",
    "description": "Fix clear-command.spec.ts - Replace parseInt with getServerOrderId if needed",
    "steps": [
      "Check if clear-command.spec.ts uses parseInt for order ID extraction",
      "Import getServerOrderId from fixtures if needed",
      "Replace any parseInt patterns with getServerOrderId",
      "Run clear-command.spec.ts and verify tests pass"
    ],
    "passes": true
  },
  {
    "id": 8,
    "category": "fix",
    "description": "Fix multi-input-mode.spec.ts - Replace parseInt with getServerOrderId if needed",
    "steps": [
      "Check if multi-input-mode.spec.ts uses parseInt for order ID extraction",
      "Import getServerOrderId from fixtures if needed",
      "Replace any parseInt patterns with getServerOrderId",
      "Run multi-input-mode.spec.ts and verify tests pass"
    ],
    "passes": true
  },
  {
    "id": 9,
    "category": "investigation",
    "description": "Investigate setup-modal.spec.ts Fresh State test failures",
    "steps": [
      "Read setup-modal.spec.ts to understand test setup",
      "Check if clearBrowserStorage is working correctly with addInitScript",
      "Investigate if test-base.ts beforeEach is interfering",
      "Test localStorage clearing in isolation",
      "Document findings for the fix"
    ],
    "passes": true
  },
  {
    "id": 10,
    "category": "fix",
    "description": "Fix setup-modal.spec.ts Fresh State tests",
    "steps": [
      "Implement proper localStorage clearing that executes before navigation",
      "Consider using page.evaluate() instead of addInitScript for clearing",
      "Ensure the setup modal component properly checks for credentials",
      "Run setup-modal.spec.ts Fresh State tests and verify they pass"
    ],
    "passes": true
  },
  {
    "id": 11,
    "category": "fix",
    "description": "Fix multi-order.spec.ts timeout issues",
    "steps": [
      "Read multi-order.spec.ts to understand test flow",
      "Identify where tests are timing out (likely order ID resolution)",
      "Update tests to use getServerOrderId helper",
      "Add proper wait conditions for order sync",
      "Run multi-order.spec.ts and verify tests pass or timeout is reasonable"
    ],
    "passes": true
  },
  {
    "id": 12,
    "category": "verification",
    "description": "Run full E2E test suite and verify all fixes",
    "steps": [
      "Run npm run test:e2e to execute full test suite",
      "Check test report for any remaining failures",
      "Document any tests that still fail for further investigation",
      "Ensure pass rate is significantly improved (target: 239+ passing)"
    ],
    "passes": true
  }
]
```
