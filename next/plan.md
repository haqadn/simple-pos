# Project Plan

## Overview
Make the API credentials flow production-ready by removing hardcoded credentials, implementing a blocking setup modal for first-run configuration, and creating a streamlined development setup script.

**Reference:** `PRD.md`

---

## Task List

```json
[
  {
    "id": 1,
    "category": "setup",
    "description": "Remove hardcoded credentials from api/config.ts",
    "steps": [
      "Verify api/config.ts has empty strings (check in browser console if needed), fix if not",
      "Verify .gitignore includes .env.local",
      "Run npm run build to confirm no compilation errors"
    ],
    "passes": false
  },
  {
    "id": 2,
    "category": "feature",
    "description": "Create useTestConnection hook for API credential validation",
    "steps": [
      "Verify hooks/useTestConnection.ts exists and exports correctly, fix if not",
      "Verify hook handles success, auth errors (401/403), and network errors",
      "Run npm run build to confirm no TypeScript errors"
    ],
    "passes": false
  },
  {
    "id": 3,
    "category": "feature",
    "description": "Extract ApiConfigSection to shared component with test connection support",
    "steps": [
      "Verify app/components/settings/ApiConfigSection.tsx exists, fix if not",
      "Verify settings-modal.tsx imports from new location",
      "Test in browser: open Settings modal, verify API tab renders correctly",
      "Run npm run build to confirm no errors"
    ],
    "passes": false
  },
  {
    "id": 4,
    "category": "feature",
    "description": "Create SetupModal component for first-run experience",
    "steps": [
      "Verify app/components/setup-modal.tsx exists, fix if not",
      "Test in browser: clear localStorage, reload - verify modal appears",
      "Verify modal has: title, description, URL/key/secret inputs, Test Connection button",
      "Verify modal is non-dismissable (no close button, no backdrop click)"
    ],
    "passes": false
  },
  {
    "id": 5,
    "category": "integration",
    "description": "Integrate SetupModal at app root level",
    "steps": [
      "Verify setup-guard.tsx exists and is used in providers.tsx, fix if not",
      "Test in browser: clear localStorage, reload - verify setup modal blocks app",
      "Test in browser: with credentials in localStorage, verify modal does NOT appear",
      "Verify app content is dimmed/disabled when modal is shown"
    ],
    "passes": false
  },
  {
    "id": 6,
    "category": "feature",
    "description": "Add test connection functionality to existing SettingsModal",
    "steps": [
      "Import useTestConnection in settings-modal.tsx",
      "Pass connection test props to ApiConfigSection",
      "Test in browser: open Settings > API tab, verify Test Connection button appears",
      "Test in browser: click Test Connection with valid creds, verify success message",
      "Test in browser: click Test Connection with invalid creds, verify error message"
    ],
    "passes": false
  },
  {
    "id": 7,
    "category": "setup",
    "description": "Create development setup script",
    "steps": [
      "Create scripts/dev-setup.js adapting logic from e2e/scripts/setup.js",
      "Implement wp-env start check and auto-start",
      "Reuse credential generation from e2e/scripts/setup-api-credentials.js",
      "Write credentials to .env.local with NEXT_PUBLIC_* prefix",
      "Add --force flag to regenerate credentials",
      "Test: run script and verify .env.local is created with valid credentials"
    ],
    "passes": false
  },
  {
    "id": 8,
    "category": "setup",
    "description": "Add npm script and update documentation",
    "steps": [
      "Add dev:setup script to package.json",
      "Update CLAUDE.md with new setup instructions",
      "Document the first-run setup flow",
      "Test: run npm run dev:setup and verify it works end-to-end"
    ],
    "passes": false
  },
  {
    "id": 9,
    "category": "testing",
    "description": "Update E2E tests for new setup flow",
    "steps": [
      "Review existing E2E test setup in e2e/scripts/",
      "Update E2E setup to handle credentials before tests run",
      "Add E2E test for setup modal appearing without credentials",
      "Add E2E test for setup modal completing with valid credentials",
      "Run npm run test:e2e and verify all tests pass"
    ],
    "passes": false
  },
  {
    "id": 10,
    "category": "testing",
    "description": "Final browser verification of complete flow",
    "steps": [
      "Test in browser: delete .env.local, clear localStorage, reload - setup modal appears",
      "Test in browser: enter invalid credentials, click Test Connection - error shown",
      "Test in browser: enter valid credentials, click Test Connection - success shown",
      "Test in browser: click Save & Continue - modal closes, app loads, shows Online",
      "Test in browser: open Settings > API, verify credentials are saved",
      "Test in browser: reload page - app loads directly without setup modal"
    ],
    "passes": false
  }
]
```
