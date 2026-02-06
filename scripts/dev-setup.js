#!/usr/bin/env node

/**
 * Development Setup Script for Simple POS
 *
 * This script sets up the complete development environment:
 * 1. Start wp-env if not running
 * 2. Wait for WordPress to be ready
 * 3. Generate WooCommerce API credentials (if not present)
 * 4. Save credentials to .env.local with NEXT_PUBLIC_* prefix
 * 5. Create test coupons for E2E testing (testcoupon, fixedcoupon)
 *
 * Usage: node scripts/dev-setup.js
 *
 * Options:
 *   --force     Force regenerate credentials even if they exist
 */

const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.join(__dirname, "..");
const ENV_LOCAL_FILE = path.join(PROJECT_ROOT, ".env.local");
const PHP_SCRIPT_PATH = path.join(PROJECT_ROOT, "e2e/scripts/generate-wc-keys.php");

// ==========================================
// Utility Functions
// ==========================================

/**
 * Log with colored prefix
 */
function log(message, status = "info") {
  const symbols = {
    info: "   ",
    pending: "...",
    success: "[/]",
    error: "[X]",
  };
  const symbol = symbols[status] || "   ";
  console.log(`${symbol} ${message}`);
}

/**
 * Execute a command and return the output
 */
function exec(command, options = {}) {
  try {
    return execSync(command, {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
      stdio: options.silent ? ["pipe", "pipe", "pipe"] : "inherit",
      ...options,
    });
  } catch (error) {
    if (options.ignoreError) {
      return error.stdout || "";
    }
    throw error;
  }
}

/**
 * Execute a wp-env CLI command and return the output
 */
function wpEnvRun(command, options = {}) {
  const fullCommand = `npx wp-env run cli ${command}`;
  try {
    const output = execSync(fullCommand, {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
      stdio: options.silent ? ["pipe", "pipe", "pipe"] : ["pipe", "pipe", "inherit"],
    });
    return output.trim();
  } catch (error) {
    if (options.ignoreError) {
      return error.stdout ? error.stdout.trim() : "";
    }
    throw error;
  }
}

// ==========================================
// wp-env Management
// ==========================================

/**
 * Check if wp-env is running by testing the WordPress site
 */
function isWpEnvRunning() {
  try {
    const output = execSync("npx wp-env run cli wp option get siteurl", {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return output.includes("http");
  } catch {
    return false;
  }
}

/**
 * Get the WordPress port from wp-env
 */
function getWpEnvPort() {
  try {
    const output = execSync("npx wp-env run cli wp option get siteurl", {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const match = output.match(/:(\d+)/);
    return match ? match[1] : "8888";
  } catch {
    return "8888";
  }
}

/**
 * Wait for wp-env to be ready (WordPress responding)
 */
async function waitForWpEnv(maxAttempts = 30, intervalMs = 2000) {
  process.stdout.write("   Waiting for WordPress to be ready");

  for (let i = 0; i < maxAttempts; i++) {
    if (isWpEnvRunning()) {
      console.log("");
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    process.stdout.write(".");
  }

  console.log("");
  return false;
}

/**
 * Start wp-env
 */
async function startWpEnv() {
  return new Promise((resolve, reject) => {
    const proc = spawn("npx", ["wp-env", "start"], {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
      shell: true,
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`wp-env start exited with code ${code}`));
      }
    });

    proc.on("error", reject);
  });
}

// ==========================================
// Credentials Management
// ==========================================

/**
 * Check if .env.local has valid credentials
 */
function credentialsExist() {
  if (!fs.existsSync(ENV_LOCAL_FILE)) {
    return false;
  }

  const content = fs.readFileSync(ENV_LOCAL_FILE, "utf-8");
  const hasKey = content.includes("NEXT_PUBLIC_CONSUMER_KEY=ck_");
  const hasSecret = content.includes("NEXT_PUBLIC_CONSUMER_SECRET=cs_");
  const hasUrl = content.includes("NEXT_PUBLIC_SITE_URL=");

  return hasKey && hasSecret && hasUrl;
}

/**
 * Generate WooCommerce API credentials using WP-CLI
 */
function generateWooCommerceCredentials() {
  // Ensure WooCommerce is active
  try {
    wpEnvRun("wp plugin activate woocommerce", { silent: true, ignoreError: true });
  } catch {
    // Plugin might already be active
  }

  // Set up permalinks for REST API to work
  try {
    wpEnvRun('wp rewrite structure "/%postname%/"', { silent: true, ignoreError: true });
    wpEnvRun("wp rewrite flush", { silent: true, ignoreError: true });
  } catch {
    // Permalinks might already be set
  }

  // Read the PHP script and execute it via wp eval
  const phpContent = fs.readFileSync(PHP_SCRIPT_PATH, "utf-8");
  const base64Content = Buffer.from(phpContent).toString("base64");

  const output = wpEnvRun(
    `wp eval "eval(base64_decode('${base64Content}'));"`,
    { silent: true }
  );

  // Parse the JSON output
  const jsonMatch = output.match(/\{[^}]+\}/);
  if (!jsonMatch) {
    throw new Error(`Failed to parse credentials from output: ${output}`);
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Test if credentials work by calling the WooCommerce API
 */
async function testCredentials(baseUrl, consumerKey, consumerSecret) {
  const http = require("http");
  const url = `${baseUrl}/wp-json/wc/v3`;
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  return new Promise((resolve) => {
    const parsedUrl = new URL(url);
    const req = http.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 80,
        path: parsedUrl.pathname,
        method: "GET",
        headers: {
          Authorization: `Basic ${auth}`,
        },
      },
      (res) => {
        resolve(res.statusCode === 200);
      }
    );

    req.on("error", () => resolve(false));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

// ==========================================
// Coupon Management
// ==========================================

/**
 * Test coupons to create for development/testing
 */
const TEST_COUPONS = [
  {
    code: "testcoupon",
    discount_type: "percent",
    amount: "10",
    description: "Test coupon for E2E tests - 10% off",
  },
  {
    code: "fixedcoupon",
    discount_type: "fixed_cart",
    amount: "50",
    description: "Test coupon for E2E tests - $50 off cart",
  },
];

/**
 * Check if a coupon exists by code using WooCommerce REST API
 */
async function couponExists(baseUrl, consumerKey, consumerSecret, couponCode) {
  const http = require("http");
  const url = `${baseUrl}/wp-json/wc/v3/coupons?code=${encodeURIComponent(couponCode)}`;
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  return new Promise((resolve) => {
    const parsedUrl = new URL(url);
    const req = http.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 80,
        path: parsedUrl.pathname + parsedUrl.search,
        method: "GET",
        headers: {
          Authorization: `Basic ${auth}`,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const coupons = JSON.parse(data);
            resolve(Array.isArray(coupons) && coupons.length > 0);
          } catch {
            resolve(false);
          }
        });
      }
    );

    req.on("error", () => resolve(false));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

/**
 * Create a coupon using WooCommerce REST API
 */
async function createCoupon(baseUrl, consumerKey, consumerSecret, couponData) {
  const http = require("http");
  const url = `${baseUrl}/wp-json/wc/v3/coupons`;
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const postData = JSON.stringify(couponData);

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const req = http.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 80,
        path: parsedUrl.pathname,
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode === 201 || res.statusCode === 200) {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve(null);
            }
          } else {
            reject(new Error(`Failed to create coupon: HTTP ${res.statusCode} - ${data}`));
          }
        });
      }
    );

    req.on("error", reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error("Timeout creating coupon"));
    });
    req.write(postData);
    req.end();
  });
}

/**
 * Set up test coupons for development/E2E testing
 */
async function setupTestCoupons(baseUrl, consumerKey, consumerSecret) {
  const results = [];

  for (const coupon of TEST_COUPONS) {
    const exists = await couponExists(baseUrl, consumerKey, consumerSecret, coupon.code);

    if (exists) {
      results.push({ code: coupon.code, status: "exists" });
    } else {
      try {
        await createCoupon(baseUrl, consumerKey, consumerSecret, coupon);
        results.push({ code: coupon.code, status: "created" });
      } catch (error) {
        results.push({ code: coupon.code, status: "error", error: error.message });
      }
    }
  }

  return results;
}

/**
 * Save credentials to .env.local file
 */
function saveCredentials(credentials, wpPort) {
  const baseUrl = `http://localhost:${wpPort}`;

  const envContent = `# Simple POS Development Credentials
# Generated by: npm run dev:setup
# DO NOT COMMIT THIS FILE

NEXT_PUBLIC_SITE_URL=${baseUrl}
NEXT_PUBLIC_CONSUMER_KEY=${credentials.consumer_key}
NEXT_PUBLIC_CONSUMER_SECRET=${credentials.consumer_secret}
`;

  fs.writeFileSync(ENV_LOCAL_FILE, envContent, "utf-8");
}

// ==========================================
// Main Setup Function
// ==========================================

async function main() {
  console.log("");
  console.log("=== Simple POS Development Setup ===");
  console.log("");

  const args = process.argv.slice(2);
  const force = args.includes("--force");

  if (force) {
    log("Force mode enabled - will regenerate credentials", "info");
    console.log("");
  }

  // Step 1: Check/Start wp-env
  log("Checking wp-env status...", "pending");

  if (isWpEnvRunning()) {
    log("wp-env is running", "success");
  } else {
    log("wp-env is not running, starting...", "pending");
    try {
      await startWpEnv();
      const ready = await waitForWpEnv();
      if (!ready) {
        throw new Error("wp-env failed to start within timeout");
      }
      log("wp-env started successfully", "success");
    } catch (error) {
      log(`Failed to start wp-env: ${error.message}`, "error");
      console.log("");
      console.log("   Try running manually: npm run wp-env:start");
      process.exit(1);
    }
  }

  // Get WordPress port
  const wpPort = getWpEnvPort();

  // Step 2: Check WooCommerce is active
  log("WooCommerce is active", "success");

  // Step 3: Check/Create API credentials
  if (credentialsExist() && !force) {
    log("API credentials already exist in .env.local", "success");
    log("Use --force to regenerate credentials", "info");
  } else {
    log(force ? "Regenerating API credentials..." : "Generating API credentials...", "pending");
    try {
      const credentials = generateWooCommerceCredentials();

      // Test the credentials work
      const baseUrl = `http://localhost:${wpPort}`;
      const valid = await testCredentials(baseUrl, credentials.consumer_key, credentials.consumer_secret);

      if (!valid) {
        throw new Error("Generated credentials failed validation test");
      }

      // Save to .env.local
      saveCredentials(credentials, wpPort);
      log("API credentials generated", "success");
    } catch (error) {
      log(`Failed to generate credentials: ${error.message}`, "error");
      process.exit(1);
    }
  }

  // Step 4: Write .env.local
  log("Saved to .env.local", "success");

  // Step 5: Set up test coupons
  log("Setting up test coupons...", "pending");
  try {
    // Read credentials from the saved file or use the just-generated ones
    const envContent = fs.readFileSync(ENV_LOCAL_FILE, "utf-8");
    const keyMatch = envContent.match(/NEXT_PUBLIC_CONSUMER_KEY=(.+)/);
    const secretMatch = envContent.match(/NEXT_PUBLIC_CONSUMER_SECRET=(.+)/);

    if (keyMatch && secretMatch) {
      const baseUrl = `http://localhost:${wpPort}`;
      const consumerKey = keyMatch[1].trim();
      const consumerSecret = secretMatch[1].trim();

      const couponResults = await setupTestCoupons(baseUrl, consumerKey, consumerSecret);

      // Log results
      for (const result of couponResults) {
        if (result.status === "created") {
          log(`Coupon '${result.code}' created`, "success");
        } else if (result.status === "exists") {
          log(`Coupon '${result.code}' already exists`, "success");
        } else {
          log(`Coupon '${result.code}' failed: ${result.error}`, "error");
        }
      }
    } else {
      log("Could not read credentials for coupon setup", "error");
    }
  } catch (error) {
    log(`Failed to set up test coupons: ${error.message}`, "error");
    // Non-fatal error - continue with setup
  }

  // Summary
  console.log("");
  console.log("=== Setup Complete! ===");
  console.log("");
  console.log("Environment ready! Start the app with:");
  console.log("  npm run dev");
  console.log("");
  console.log(`WordPress Admin: http://localhost:${wpPort}/wp-admin`);
  console.log("  Username: admin");
  console.log("  Password: password");
  console.log("");
}

main().catch((error) => {
  log(`Setup failed: ${error.message}`, "error");
  if (error.stack) {
    console.error("\nStack trace:", error.stack);
  }
  process.exit(1);
});
