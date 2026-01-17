# Activity Log

Last updated: 2026-01-17
Tasks completed: 2
Current task: None

---

## 2026-01-17 - Task 1: Remove hardcoded credentials from api/config.ts

### Changes Made
- Modified `/next/api/config.ts` to replace hardcoded development credentials with empty strings
- Changed `BASE_URL` from `'https://wordpress.simple-pos.orb.local/wp-json/wc/v3'` to `''`
- Changed `CONSUMER_KEY` from `'ck_857f37fac852b7cb5d03711cfa8041f6b9766016'` to `''`
- Changed `CONSUMER_SECRET` from `'cs_9f3abbe9282c208645b6b8aa49c254c4bc3c3cdd'` to `''`
- Added comment explaining credentials should be configured via localStorage or .env.local

### Verification
- Confirmed `.gitignore` already includes `.env*` pattern (line 41), which covers `.env.local`
- Ran `npm run build` successfully - app compiles with empty credentials
- The app will now require credentials to be configured via Settings Modal (localStorage) or environment variables

### Commit
- chore: remove hardcoded credentials from api/config.ts

---

## 2026-01-17 - Task 2: Create useTestConnection hook for API credential validation

### Changes Made
- Created `/next/hooks/useTestConnection.ts` - new hook for testing WooCommerce API credentials
- Hook implements `test()` function that makes GET request to `/wp-json/wc/v3` endpoint
- Handles success (200), auth errors (401/403), network errors, timeout, and 404 (WooCommerce not found)
- Returns `status` ('idle' | 'testing' | 'success' | 'error'), `error` message, and `reset()` function
- Updated `/next/hooks/index.ts` to export the new hook and its types

### Verification
- Ran `npm run build` - compiles successfully with no TypeScript errors
- Ran `npm run lint` - no ESLint warnings or errors
- Hook follows existing patterns in the codebase (similar structure to useConnectivity)
- Interface matches the specification in PRD.md

### Commit
- feat: create useTestConnection hook for API credential validation

---
