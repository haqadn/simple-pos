/**
 * wp-env Configuration Helper
 *
 * Provides utilities to detect wp-env port and configuration
 * for use in Playwright tests and global setup.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Path to .env.test file (relative to project root)
const ENV_TEST_PATH = path.join(__dirname, '../../.env.test');

export interface WpEnvConfig {
  port: string;
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

/**
 * Load configuration from .env.test file
 */
export function loadEnvTestConfig(): WpEnvConfig | null {
  if (!fs.existsSync(ENV_TEST_PATH)) {
    return null;
  }

  const content = fs.readFileSync(ENV_TEST_PATH, 'utf-8');
  const config: Partial<WpEnvConfig> = {};

  // Parse each line of the .env file
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) continue;

    const [, key, value] = match;
    switch (key.trim()) {
      case 'WP_PORT':
        config.port = value.trim();
        break;
      case 'WP_BASE_URL':
        config.baseUrl = value.trim();
        break;
      case 'WC_CONSUMER_KEY':
        config.consumerKey = value.trim();
        break;
      case 'WC_CONSUMER_SECRET':
        config.consumerSecret = value.trim();
        break;
    }
  }

  // Validate required fields
  if (!config.consumerKey || !config.consumerSecret) {
    return null;
  }

  // Set defaults if not present
  config.port = config.port || '8888';
  config.baseUrl = config.baseUrl || `http://localhost:${config.port}`;

  return config as WpEnvConfig;
}

/**
 * Get wp-env port by querying the running instance
 * Falls back to default port if wp-env is not running
 */
export function getWpEnvPortFromCli(): string {
  try {
    const projectRoot = path.join(__dirname, '../..');
    const output = execSync('npx wp-env run cli wp option get siteurl', {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000,
    });
    const match = output.match(/:(\d+)/);
    return match ? match[1] : '8888';
  } catch {
    return '8888';
  }
}

/**
 * Check if wp-env is currently running
 */
export function isWpEnvRunning(): boolean {
  try {
    const projectRoot = path.join(__dirname, '../..');
    const output = execSync('npx wp-env run cli wp option get siteurl', {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000,
    });
    return output.includes('http');
  } catch {
    return false;
  }
}

/**
 * Get the WordPress API configuration
 * Prefers .env.test file, falls back to CLI detection
 */
export function getWpEnvConfig(): WpEnvConfig {
  // First, try to load from .env.test
  const envConfig = loadEnvTestConfig();
  if (envConfig) {
    return envConfig;
  }

  // Fall back to CLI detection (for backwards compatibility)
  const port = process.env.WP_PORT || getWpEnvPortFromCli();
  return {
    port,
    baseUrl: `http://localhost:${port}`,
    // These will cause tests to fail if .env.test is not set up properly
    consumerKey: process.env.WC_CONSUMER_KEY || '',
    consumerSecret: process.env.WC_CONSUMER_SECRET || '',
  };
}

/**
 * Get the WordPress port for use in Playwright config
 * This is a synchronous function suitable for config files
 */
export function getWpPort(): string {
  // Check environment variable first
  if (process.env.WP_PORT) {
    return process.env.WP_PORT;
  }

  // Try to load from .env.test
  const envConfig = loadEnvTestConfig();
  if (envConfig?.port) {
    return envConfig.port;
  }

  // Default port
  return '8888';
}

/**
 * Get the WordPress base URL for use in Playwright config
 */
export function getWpBaseUrl(): string {
  const port = getWpPort();
  return `http://localhost:${port}`;
}
