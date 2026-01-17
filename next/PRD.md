# PRD: Production-Ready API Credentials Flow

## Overview

Make the Simple POS API credentials flow production-ready by removing hardcoded development credentials, implementing a blocking setup modal for fresh installations, and creating a streamlined development setup script.

**Goals:**
1. Remove hardcoded credentials from the codebase
2. Block app usage until valid credentials are configured
3. Provide a seamless first-run setup experience
4. Simplify local development setup with a single command

## Target Audience

- **End Users**: Restaurant/retail operators deploying Simple POS with their own WooCommerce instance
- **Developers**: Contributors setting up the development environment

## Core Features

### 1. Remove Hardcoded Credentials

**Current State:**
- `api/config.ts` contains hardcoded development credentials
- These credentials only work on the developer's local environment
- Creates security concerns and confusion for new deployments

**Target State:**
- `api/config.ts` exports empty strings as defaults
- No credentials committed to the repository
- `.env.local` is gitignored and used only for local development

**Acceptance Criteria:**
- [ ] `api/config.ts` exports empty `BASE_URL`, `CONSUMER_KEY`, `CONSUMER_SECRET`
- [ ] `.env.local` is in `.gitignore`
- [ ] App functions correctly when credentials are provided via env vars or localStorage

---

### 2. Setup Modal (Blocking First-Run Experience)

**Behavior:**
When the app loads without configured credentials (`!isConfigured()`), display a full-page blocking modal that:
- Prevents any app interaction until credentials are saved
- Reuses the existing `ApiConfigSection` component
- Includes a "Test Connection" button before allowing save
- Shows appropriate error messages for connection failures
- Provides a link to WooCommerce API keys page based on entered URL

**UI Flow:**
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              🔧 Setup Required                          │
│                                                         │
│   Connect to your WooCommerce store to get started.     │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │ Website URL                                     │   │
│   │ [https://example.com                          ] │   │
│   │ Your WooCommerce site URL (without /wp-json)    │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │ Consumer Key                                    │   │
│   │ [ck_...                                       ] │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │ Consumer Secret                                 │   │
│   │ [••••••••••••••••                             ] │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
│   → Manage API keys in WooCommerce                      │
│                                                         │
│   ┌──────────────────┐  ┌──────────────────────────┐   │
│   │ Test Connection  │  │    Save & Continue       │   │
│   └──────────────────┘  └──────────────────────────┘   │
│                                                         │
│   [Connection Status Message Area]                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Connection Test Behavior:**
- Makes a `GET /wp-json/wc/v3` request (WooCommerce store info endpoint)
- On success: Show green checkmark, enable "Save & Continue"
- On 401/403: Show error "Invalid credentials. Please check your Consumer Key and Secret."
- On network error: Show error "Could not connect. Please check the URL."
- Link format: `{baseUrl}/wp-admin/admin.php?page=wc-settings&tab=advanced&section=keys`

**Acceptance Criteria:**
- [ ] Modal appears on fresh install (no localStorage settings, no env vars)
- [ ] Modal is non-dismissable (no close button, no backdrop click)
- [ ] "Test Connection" validates credentials before save is allowed
- [ ] Error messages are clear and actionable
- [ ] Link to WooCommerce API keys page is generated from entered URL
- [ ] After successful save, modal closes and app loads normally
- [ ] Existing `SettingsModal` API tab continues to work for updating credentials later

---

### 3. Development Setup Script

**Purpose:**
Provide a single command that sets up the complete development environment.

**Command:**
```bash
npm run dev:setup
```

**Script Behavior:**
1. Start wp-env if not running
2. Wait for WordPress to be ready
3. Check if `.env.local` already has valid credentials
4. If not, generate WooCommerce API credentials
5. Test the credentials work
6. Save to `.env.local` with `NEXT_PUBLIC_*` prefix
7. Print success message with next steps

**Output Example:**
```
=== Simple POS Development Setup ===

[✓] wp-env is running on port 8888
[✓] WooCommerce is active
[✓] API credentials generated
[✓] Saved to .env.local

Environment ready! Start the app with:
  npm run dev

WordPress Admin: http://localhost:8888/wp-admin
  Username: admin
  Password: password
```

**Acceptance Criteria:**
- [ ] Script creates `.env.local` with valid `NEXT_PUBLIC_*` variables
- [ ] Script is idempotent (safe to run multiple times)
- [ ] Script reuses existing credentials if valid
- [ ] Script provides clear error messages if wp-env fails
- [ ] `--force` flag regenerates credentials even if they exist

---

## Technical Implementation

### File Changes

| File | Change |
|------|--------|
| `api/config.ts` | Export empty strings instead of hardcoded values |
| `api/api.ts` | No changes needed (already handles empty config) |
| `stores/settings.ts` | No changes needed (already has `isConfigured()`) |
| `app/components/setup-modal.tsx` | **New file** - Blocking setup modal |
| `app/components/settings-modal.tsx` | Extract `ApiConfigSection` for reuse, add test connection |
| `app/layout.tsx` or `app/providers.tsx` | Add `SetupModal` wrapper |
| `scripts/dev-setup.js` | **New file** - Development setup script |
| `package.json` | Add `dev:setup` script |
| `.gitignore` | Ensure `.env.local` is ignored |

### Shared Components

Extract `ApiConfigSection` to a shared location so both `SetupModal` and `SettingsModal` can use it:

```typescript
// app/components/settings/ApiConfigSection.tsx
interface ApiConfigSectionProps {
  localApi: ApiConfig;
  setLocalApi: (api: ApiConfig) => void;
  onTestConnection?: () => Promise<boolean>;
  connectionStatus?: 'idle' | 'testing' | 'success' | 'error';
  connectionError?: string;
}
```

### Test Connection Hook

```typescript
// hooks/useTestConnection.ts
interface UseTestConnectionResult {
  test: (config: ApiConfig) => Promise<boolean>;
  status: 'idle' | 'testing' | 'success' | 'error';
  error: string | null;
  reset: () => void;
}
```

### Setup Modal Integration

The `SetupModal` should be rendered at the app root level and check `isConfigured()`:

```typescript
// Pseudocode for app integration
function App() {
  const isConfigured = useSettingsStore(s => s.isConfigured());

  if (!isConfigured) {
    return <SetupModal />;
  }

  return <MainApp />;
}
```

---

## Security Considerations

- Credentials stored in localStorage (acceptable per requirements)
- No encryption needed for this use case
- `.env.local` should never be committed (already in `.gitignore`)

---

## Out of Scope

- Encrypted credential storage
- OAuth/SSO authentication
- Multi-store support
- Credential migration between devices

---

## Development Phases

### Phase 1: Foundation
- Remove hardcoded credentials
- Verify `.gitignore` includes `.env.local`
- Ensure app handles missing credentials gracefully

### Phase 2: Setup Modal
- Create test connection hook
- Extract and enhance `ApiConfigSection`
- Build `SetupModal` component
- Integrate at app root level

### Phase 3: Development Script
- Create `scripts/dev-setup.js` (adapt from existing e2e setup)
- Add `dev:setup` npm script
- Test end-to-end development workflow

---

## Success Metrics

1. Fresh clone + `npm run dev:setup` + `npm run dev` works in < 2 minutes
2. Fresh browser (no localStorage) shows setup modal
3. Invalid credentials show clear error message
4. Valid credentials allow app to function normally
5. Existing users (with localStorage) see no change in behavior
