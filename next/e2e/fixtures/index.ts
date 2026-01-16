/**
 * E2E Test Fixtures
 *
 * Export all fixtures from a single entry point for easy importing.
 *
 * Usage in tests:
 *   import { test, expect, POSPage } from '../fixtures';
 *   import { getTestProducts, getTestSku, getTestPrice } from '../fixtures';
 */

export { test, expect, POSPage } from './test-base';

// Test data exports
export {
  getTestData,
  getTestProducts,
  getTestSku,
  getTestPrice,
  getFirstInStockVariation,
  getAllSkus,
  findProductBySku,
  findVariationBySku,
  getProductForScenario,
  type TestProduct,
  type TestVariation,
  type TestProductWithVariations,
  type TestData,
} from './test-data';
