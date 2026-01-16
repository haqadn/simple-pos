/**
 * Playwright Global Setup
 *
 * Runs once before all tests to:
 * 1. Fetch product data from WooCommerce API
 * 2. Cache the data for test use
 *
 * This ensures all tests have access to real product data (SKUs, prices, etc.)
 * without making redundant API calls during test execution.
 */

import { FullConfig } from '@playwright/test';
import {
  fetchTestData,
  saveTestDataCache,
  loadTestDataCache,
  setTestData,
} from './fixtures/test-data';

async function globalSetup(config: FullConfig) {
  console.log('\n========================================');
  console.log('Playwright Global Setup');
  console.log('========================================\n');

  // Check if we have cached data that's still fresh
  const cachedData = loadTestDataCache();

  if (cachedData) {
    console.log('Using cached test data (still fresh)\n');
    setTestData(cachedData);
    return;
  }

  // Fetch fresh data from WooCommerce
  try {
    console.log('Fetching fresh test data from WooCommerce...\n');
    const testData = await fetchTestData();

    // Cache the data for future runs
    saveTestDataCache(testData);

    // Store in memory for this run
    setTestData(testData);

    console.log('\n========================================');
    console.log('Global Setup Complete');
    console.log('========================================\n');
  } catch (error) {
    console.error('\n========================================');
    console.error('Global Setup Failed');
    console.error('========================================');
    console.error(error);
    console.error('\nEnsure WooCommerce is running and accessible.');
    console.error('API URL:', 'https://wordpress.simple-pos.orb.local/wp-json/wc/v3');
    console.error('========================================\n');

    // Try to use stale cache as fallback
    const staleCache = loadTestDataCache();
    if (staleCache) {
      console.log('Using stale cached data as fallback...\n');
      setTestData(staleCache);
      return;
    }

    throw error;
  }
}

export default globalSetup;
