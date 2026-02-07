# Store setup (WooCommerce) for Simple POS

This app talks to a WooCommerce store over the WooCommerce REST API.

## 1) Prerequisites

- A WordPress site you control (staging/dev is recommended)
- WooCommerce installed and activated
- Ability to create WooCommerce REST API keys (Admin / Shop Manager)

## 2) Install WooCommerce

1. In WordPress Admin go to **Plugins → Add New**
2. Search for **WooCommerce**
3. **Install** and **Activate**

You can skip the guided setup wizard if you just need API access for development.

## 3) Create REST API keys

1. Go to **WooCommerce → Settings → Advanced → REST API**
2. Click **Add key**
3. Fill:
   - **Description:** `simple-pos` (or similar)
   - **User:** your admin user
   - **Permissions:** **Read/Write**
4. Click **Generate API key**
5. Copy both values immediately:
   - **Consumer key** (starts with `ck_`)
   - **Consumer secret** (starts with `cs_`)

## 4) Configure the app

Create `simple-pos/.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=https://YOUR-STORE-DOMAIN
NEXT_PUBLIC_CONSUMER_KEY=ck_...
NEXT_PUBLIC_CONSUMER_SECRET=cs_...
```

Then run:

```bash
npm ci
npm run dev
```

## 5) CORS / HTTPS notes (common gotchas)

- If you load the POS from a different origin than the WooCommerce site, you may hit CORS restrictions.
- The included WordPress plugin (in `wordpress-plugin/`) sets permissive CORS headers specifically for `/wp-json/wc/v3/*`.
- Prefer **HTTPS** for the store URL.

## 6) Optional: install the Simple POS WordPress plugin

The plugin provides extra endpoints / behavior the app expects in some flows.

- In WP Admin go to **Plugins → Add New → Upload Plugin**
- Upload the plugin zip from the GitHub release (or build one from `wordpress-plugin/`)
- Activate **Simple POS**

## 7) Security

- Treat the REST API keys like passwords.
- Use a dedicated WooCommerce user for API access when possible.
- Revoke keys if a laptop is lost or you suspect leakage.
