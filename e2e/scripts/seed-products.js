#!/usr/bin/env node

/**
 * Seed WooCommerce with Test Products for E2E Testing
 *
 * This script creates the required test products using the WooCommerce REST API.
 * Products are created idempotently - existing products (by SKU) are skipped.
 *
 * Usage: node e2e/scripts/seed-products.js
 *
 * Products created:
 *   - Simple Product: TEST-SIMPLE-001 (price: 25.00)
 *   - Variable Product: TEST-VAR-001 with variations:
 *       - TEST-VAR-S (Small, price: 30.00)
 *       - TEST-VAR-M (Medium, price: 35.00)
 *       - TEST-VAR-L (Large, price: 40.00)
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const ENV_FILE = path.join(__dirname, "../../.env.test");

// ==========================================
// Configuration
// ==========================================

/**
 * Test product definitions
 */
const TEST_PRODUCTS = {
  simple: {
    name: "Test Simple Product",
    type: "simple",
    sku: "TEST-SIMPLE-001",
    regular_price: "25.00",
    description: "A simple test product for E2E testing",
    short_description: "Test product",
    manage_stock: true,
    stock_quantity: 100,
    stock_status: "instock",
    status: "publish",
  },
  variable: {
    name: "Test Variable Product",
    type: "variable",
    sku: "TEST-VAR-001",
    description: "A variable test product for E2E testing",
    short_description: "Variable test product with size options",
    status: "publish",
    attributes: [
      {
        name: "Size",
        visible: true,
        variation: true,
        options: ["Small", "Medium", "Large"],
      },
    ],
  },
  variations: [
    {
      sku: "TEST-VAR-S",
      regular_price: "30.00",
      manage_stock: true,
      stock_quantity: 50,
      stock_status: "instock",
      attributes: [{ name: "Size", option: "Small" }],
    },
    {
      sku: "TEST-VAR-M",
      regular_price: "35.00",
      manage_stock: true,
      stock_quantity: 50,
      stock_status: "instock",
      attributes: [{ name: "Size", option: "Medium" }],
    },
    {
      sku: "TEST-VAR-L",
      regular_price: "40.00",
      manage_stock: true,
      stock_quantity: 50,
      stock_status: "instock",
      attributes: [{ name: "Size", option: "Large" }],
    },
  ],
};

// ==========================================
// Environment Loading
// ==========================================

/**
 * Load credentials from .env.test file
 */
function loadCredentials() {
  if (!fs.existsSync(ENV_FILE)) {
    throw new Error(
      `.env.test file not found at ${ENV_FILE}\n` +
        "Run 'npm run test:e2e:credentials' to generate credentials first."
    );
  }

  const content = fs.readFileSync(ENV_FILE, "utf-8");
  const config = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      config[match[1]] = match[2];
    }
  }

  const required = ["WC_CONSUMER_KEY", "WC_CONSUMER_SECRET", "WP_BASE_URL"];
  for (const key of required) {
    if (!config[key]) {
      throw new Error(`Missing ${key} in .env.test file`);
    }
  }

  return config;
}

// ==========================================
// HTTP Client
// ==========================================

/**
 * Make an HTTP/HTTPS request
 */
function makeRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === "https:" ? https : http;

    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || "GET",
      headers: options.headers || {},
      // Accept self-signed certificates in development
      rejectUnauthorized: false,
    };

    const req = client.request(reqOptions, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const json = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on("error", reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// ==========================================
// WooCommerce API Client
// ==========================================

class WooCommerceClient {
  constructor(baseUrl, consumerKey, consumerSecret) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
  }

  getAuthHeader() {
    const credentials = Buffer.from(
      `${this.consumerKey}:${this.consumerSecret}`
    ).toString("base64");
    return `Basic ${credentials}`;
  }

  async get(endpoint, params = {}) {
    const url = new URL(`${this.baseUrl}/wp-json/wc/v3${endpoint}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await makeRequest(url.toString(), {
      method: "GET",
      headers: {
        Authorization: this.getAuthHeader(),
        "Content-Type": "application/json",
      },
    });

    if (response.status >= 400) {
      const error = new Error(
        `API Error ${response.status}: ${JSON.stringify(response.data)}`
      );
      error.status = response.status;
      throw error;
    }

    return response.data;
  }

  async post(endpoint, data) {
    const url = `${this.baseUrl}/wp-json/wc/v3${endpoint}`;

    const response = await makeRequest(
      url,
      {
        method: "POST",
        headers: {
          Authorization: this.getAuthHeader(),
          "Content-Type": "application/json",
        },
      },
      data
    );

    if (response.status >= 400) {
      const error = new Error(
        `API Error ${response.status}: ${JSON.stringify(response.data)}`
      );
      error.status = response.status;
      throw error;
    }

    return response.data;
  }

  async put(endpoint, data) {
    const url = `${this.baseUrl}/wp-json/wc/v3${endpoint}`;

    const response = await makeRequest(
      url,
      {
        method: "PUT",
        headers: {
          Authorization: this.getAuthHeader(),
          "Content-Type": "application/json",
        },
      },
      data
    );

    if (response.status >= 400) {
      const error = new Error(
        `API Error ${response.status}: ${JSON.stringify(response.data)}`
      );
      error.status = response.status;
      throw error;
    }

    return response.data;
  }
}

// ==========================================
// Product Creation Functions
// ==========================================

/**
 * Check if a product exists by SKU
 */
async function findProductBySku(client, sku) {
  try {
    const products = await client.get("/products", { sku });
    return products.length > 0 ? products[0] : null;
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

/**
 * Check if a variation exists by SKU within a product
 */
async function findVariationBySku(client, productId, sku) {
  try {
    const variations = await client.get(`/products/${productId}/variations`, {
      per_page: 100,
    });
    return variations.find((v) => v.sku === sku) || null;
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

/**
 * Create the simple test product
 */
async function createSimpleProduct(client) {
  console.log("\n--- Simple Product ---");
  const sku = TEST_PRODUCTS.simple.sku;

  const existing = await findProductBySku(client, sku);
  if (existing) {
    console.log(`Product ${sku} already exists (ID: ${existing.id}), skipping`);
    return existing;
  }

  console.log(`Creating simple product: ${sku}`);
  const product = await client.post("/products", TEST_PRODUCTS.simple);
  console.log(`Created product: ${product.name} (ID: ${product.id})`);
  return product;
}

/**
 * Create the variable test product with variations
 */
async function createVariableProduct(client) {
  console.log("\n--- Variable Product ---");
  const sku = TEST_PRODUCTS.variable.sku;

  let product = await findProductBySku(client, sku);
  let productCreated = false;

  if (product) {
    console.log(`Product ${sku} already exists (ID: ${product.id})`);
  } else {
    console.log(`Creating variable product: ${sku}`);
    product = await client.post("/products", TEST_PRODUCTS.variable);
    console.log(`Created product: ${product.name} (ID: ${product.id})`);
    productCreated = true;
  }

  // Create variations
  console.log("\nCreating variations...");
  for (const variationData of TEST_PRODUCTS.variations) {
    const variationSku = variationData.sku;

    const existing = await findVariationBySku(client, product.id, variationSku);
    if (existing) {
      console.log(
        `  Variation ${variationSku} already exists (ID: ${existing.id}), skipping`
      );
      continue;
    }

    console.log(`  Creating variation: ${variationSku}`);
    const variation = await client.post(
      `/products/${product.id}/variations`,
      variationData
    );
    console.log(
      `  Created variation: ${variationSku} (ID: ${variation.id}, Price: ${variation.regular_price})`
    );
  }

  return product;
}

/**
 * Verify products were created correctly
 */
async function verifyProducts(client) {
  console.log("\n--- Verification ---");

  // Verify simple product
  const simple = await findProductBySku(client, TEST_PRODUCTS.simple.sku);
  if (!simple) {
    throw new Error(
      `Simple product ${TEST_PRODUCTS.simple.sku} not found after creation`
    );
  }
  console.log(
    `Simple product verified: ${simple.name} (SKU: ${simple.sku}, Price: ${simple.regular_price})`
  );

  // Verify variable product
  const variable = await findProductBySku(client, TEST_PRODUCTS.variable.sku);
  if (!variable) {
    throw new Error(
      `Variable product ${TEST_PRODUCTS.variable.sku} not found after creation`
    );
  }

  // Verify variations
  const variations = await client.get(`/products/${variable.id}/variations`, {
    per_page: 100,
  });
  console.log(
    `Variable product verified: ${variable.name} (SKU: ${variable.sku}, Variations: ${variations.length})`
  );

  for (const expectedVariation of TEST_PRODUCTS.variations) {
    const found = variations.find((v) => v.sku === expectedVariation.sku);
    if (!found) {
      throw new Error(
        `Variation ${expectedVariation.sku} not found after creation`
      );
    }
    console.log(
      `  Variation verified: ${found.sku} (ID: ${found.id}, Price: ${found.regular_price})`
    );
  }

  return {
    simple,
    variable,
    variations,
  };
}

// ==========================================
// Main Function
// ==========================================

async function main() {
  console.log("=== WooCommerce Test Product Seeding ===\n");

  // Check for --force flag
  const force = process.argv.includes("--force");
  if (force) {
    console.log("Force mode: Will recreate products if they exist\n");
  }

  // Load credentials
  console.log("Loading credentials from .env.test...");
  const config = loadCredentials();
  console.log(`API URL: ${config.WP_BASE_URL}`);
  console.log(`Consumer Key: ${config.WC_CONSUMER_KEY.substring(0, 10)}...`);

  // Create API client
  const client = new WooCommerceClient(
    config.WP_BASE_URL,
    config.WC_CONSUMER_KEY,
    config.WC_CONSUMER_SECRET
  );

  // Test API connection
  console.log("\nTesting API connection...");
  try {
    await client.get("/products", { per_page: 1 });
    console.log("API connection successful!");
  } catch (error) {
    console.error("Failed to connect to WooCommerce API:", error.message);
    console.error("\nMake sure:");
    console.error("  1. wp-env is running (npm run wp-env:start)");
    console.error("  2. WooCommerce is activated");
    console.error("  3. API credentials are valid");
    process.exit(1);
  }

  // Create products
  await createSimpleProduct(client);
  await createVariableProduct(client);

  // Verify products
  const products = await verifyProducts(client);

  console.log("\n=== Seeding Complete ===");
  console.log("\nTest products available:");
  console.log(
    `  Simple: ${products.simple.sku} (Price: ${products.simple.regular_price})`
  );
  console.log(`  Variable: ${products.variable.sku}`);
  for (const v of products.variations) {
    console.log(`    - ${v.sku} (Price: ${v.regular_price})`);
  }
}

main().catch((error) => {
  console.error("\nSeeding failed:", error.message);
  if (error.stack) {
    console.error("\nStack trace:", error.stack);
  }
  process.exit(1);
});
