/**
 * E2E Test Fixtures
 *
 * Export all fixtures from a single entry point for easy importing.
 *
 * Usage in tests:
 *   import { test, expect, POSPage } from '../fixtures';
 *   import { getTestProducts, getTestSku, getTestPrice } from '../fixtures';
 *   import { setupMockRoutes, mockProducts, mockCustomers, mockCoupons } from '../fixtures';
 *   import { executeCommand, createNewOrder, getOrderTotal } from '../fixtures';
 */

export { test, expect, POSPage } from './test-base';

// Re-export all helpers for convenience
export * from '../helpers';

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

// API mock exports
export {
  // Mock data factories
  mockProducts,
  mockVariations,
  mockCustomers,
  mockCoupons,
  // Route interception helpers
  setupMockRoutes,
  setupProductMocks,
  setupCustomerMocks,
  setupCouponMocks,
  clearMockRoutes,
  // Convenience getters
  getValidCouponCode,
  getInvalidCouponCode,
  getExpiredCouponCode,
  getSimpleMockProduct,
  getVariableMockProduct,
  getMockCustomerByName,
  // Types
  type MockProduct,
  type MockVariation,
  type MockCustomer,
  type MockCoupon,
  type MockConfig,
} from './api-mocks';
