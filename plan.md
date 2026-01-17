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
      "Read current api/config.ts file",
      "Replace hardcoded BASE_URL, CONSUMER_KEY, CONSUMER_SECRET with empty strings",
      "Verify .gitignore includes .env.local",
      "Test that app still loads (will show empty state or error - expected)"
    ],
    "passes": true
  },
  {
    "id": 2,
    "category": "feature",
    "description": "Create useTestConnection hook for API credential validation",
    "steps": [
      "Create hooks/useTestConnection.ts",
      "Implement test function that calls GET /wp-json/wc/v3 with provided credentials",
      "Handle success (200), auth errors (401/403), and network errors",
      "Return status, error message, and reset function",
      "Export hook for use in setup and settings modals"
    ],
    "passes": true
  },
  {
    "id": 3,
    "category": "feature",
    "description": "Extract ApiConfigSection to shared component with test connection support",
    "steps": [
      "Create app/components/settings/ApiConfigSection.tsx",
      "Move ApiConfigSection from settings-modal.tsx to new file",
      "Add optional props for connection testing (onTestConnection, status, error)",
      "Add Test Connection button that shows when onTestConnection is provided",
      "Add status indicator (idle/testing/success/error) with appropriate styling",
      "Update settings-modal.tsx to import from new location"
    ],
    "passes": true
  },
  {
    "id": 4,
    "category": "feature",
    "description": "Create SetupModal component for first-run experience",
    "steps": [
      "Create app/components/setup-modal.tsx",
      "Build full-page blocking modal using HeroUI Modal (non-closable)",
      "Include title, description, and ApiConfigSection",
      "Integrate useTestConnection hook",
      "Disable Save button until connection test passes",
      "On save, call updateApi and close modal",
      "Style consistently with existing app design"
    ],
    "passes": true
  },
  {
    "id": 5,
    "category": "integration",
    "description": "Integrate SetupModal at app root level",
    "steps": [
      "Identify correct location for setup check (likely app/providers.tsx or layout)",
      "Add SetupModal that renders when !isConfigured()",
      "Ensure SetupModal blocks all app content when shown",
      "Test that existing users with localStorage credentials see no change",
      "Test that fresh browser shows setup modal"
    ],
    "passes": true
  },
  {
    "id": 6,
    "category": "feature",
    "description": "Add test connection functionality to existing SettingsModal",
    "steps": [
      "Import useTestConnection in settings-modal.tsx",
      "Pass connection test props to ApiConfigSection",
      "Allow users to test connection when editing credentials",
      "Show connection status in the API tab"
    ],
    "passes": true
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
      "Print clear success message with next steps"
    ],
    "passes": true
  },
  {
    "id": 8,
    "category": "setup",
    "description": "Add npm script and update documentation",
    "steps": [
      "Add dev:setup script to package.json",
      "Update CLAUDE.md with new setup instructions",
      "Document the first-run setup flow",
      "Verify end-to-end developer experience works"
    ],
    "passes": true
  },
  {
    "id": 9,
    "category": "testing",
    "description": "Update E2E tests for new setup flow",
    "steps": [
      "Review existing E2E test setup in e2e/scripts/",
      "Update E2E tests to handle setup modal on fresh state",
      "Add test for setup modal appearing without credentials",
      "Add test for setup modal dismissing after valid credentials",
      "Ensure existing E2E tests still pass with the new flow"
    ],
    "passes": true
  },
  {
    "id": 10,
    "category": "testing",
    "description": "Manual testing of complete flow",
    "steps": [
      "Clear localStorage and test fresh install shows setup modal",
      "Test invalid credentials show appropriate error",
      "Test valid credentials allow app to load",
      "Test npm run dev:setup creates working .env.local",
      "Test existing users (with localStorage) see no change",
      "Test SettingsModal API tab still works for credential updates"
    ],
    "passes": false
  }
]
```
