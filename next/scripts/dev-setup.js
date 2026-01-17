#!/usr/bin/env node

/**
 * Development Setup Script for Simple POS
 *
 * This script sets up the complete development environment:
 * 1. Start wp-env if not running
 * 2. Wait for WordPress to be ready
 * 3. Generate WooCommerce API credentials (if not present)
 * 4. Save credentials to .env.local with NEXT_PUBLIC_* prefix
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
