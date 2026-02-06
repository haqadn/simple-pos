/**
 * Test Data Verification Tests
 *
 * These tests verify that the test data fetching from WooCommerce works correctly.
 * They run after global setup has populated the test data.
 */

import { test, expect } from '@playwright/test';
import {
  getTestData,
  getTestProducts,
  getTestSku,
  getTestPrice,
  getFirstInStockVariation,
  getAllSkus,
  getProductForScenario,
} from '../fixtures';

test.describe('Test Data Fixtures', () => {
  test('getTestData returns valid data structure', () => {
    const data = getTestData();

    // Verify data structure
    expect(data).toBeDefined();
    expect(data.simpleProduct).toBeDefined();
    expect(data.variableProduct).toBeDefined();
    expect(data.allProducts).toBeDefined();
    expect(data.fetchedAt).toBeDefined();

    // Verify allProducts is non-empty array
    expect(Array.isArray(data.allProducts)).toBe(true);
    expect(data.allProducts.length).toBeGreaterThan(0);
  });

  test('simpleProduct has required fields', () => {
    const data = getTestData();
    const product = data.simpleProduct;

    // Required fields for simple product
    expect(product.id).toBeGreaterThan(0);
    expect(product.name).toBeTruthy();
    expect(product.sku).toBeTruthy();
    expect(product.price).toBeGreaterThanOrEqual(0);
    expect(product.type).toBe('simple');
    expect(product.stock_status).toBe('instock');
  });

  test('variableProduct has variations if type is variable', () => {
    const data = getTestData();
    const product = data.variableProduct;

    expect(product.id).toBeGreaterThan(0);
    expect(product.name).toBeTruthy();

    if (product.type === 'variable') {
      // Variable products should have loaded variations
      expect(product.loadedVariations).toBeDefined();
      expect(Array.isArray(product.loadedVariations)).toBe(true);

      // If there are variations, they should have required fields
      if (product.loadedVariations && product.loadedVariations.length > 0) {
        const variation = product.loadedVariations[0];
        expect(variation.id).toBeGreaterThan(0);
        expect(variation.price).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('getTestProducts returns simple and variable products', () => {
    const products = getTestProducts();

    expect(products.simple).toBeDefined();
    expect(products.variable).toBeDefined();

    // Simple product should be type simple
    expect(products.simple.type).toBe('simple');
    expect(products.simple.sku).toBeTruthy();
  });

  test('getTestSku returns valid SKU for simple product', () => {
    const products = getTestProducts();
    const sku = getTestSku(products.simple);

    expect(sku).toBeTruthy();
    expect(typeof sku).toBe('string');
    expect(sku.length).toBeGreaterThan(0);
  });

  test('getTestSku returns variation SKU for variable product', () => {
    const products = getTestProducts();

    if (products.variable.type === 'variable' && products.variable.loadedVariations?.length) {
      const sku = getTestSku(products.variable);
      expect(sku).toBeTruthy();

      // Should match one of the variation SKUs
      const variationSkus = products.variable.loadedVariations
        .map((v) => v.sku)
        .filter((s) => s);
      expect(variationSkus).toContain(sku);
    }
  });

  test('getTestPrice returns valid price for simple product', () => {
    const products = getTestProducts();
    const price = getTestPrice(products.simple);

    expect(typeof price).toBe('number');
    expect(price).toBeGreaterThanOrEqual(0);
  });

  test('getFirstInStockVariation returns in-stock variation', () => {
    const products = getTestProducts();

    if (products.variable.loadedVariations?.length) {
      const variation = getFirstInStockVariation(products.variable);

      if (variation) {
        expect(variation.id).toBeGreaterThan(0);
        // Should prefer in-stock variations
        const hasInStock = products.variable.loadedVariations.some(
          (v) => v.stock_status === 'instock'
        );
        if (hasInStock) {
          expect(variation.stock_status).toBe('instock');
        }
      }
    }
  });

  test('getAllSkus returns array of SKUs', () => {
    const products = getTestProducts();
    const skus = getAllSkus(products.simple);

    expect(Array.isArray(skus)).toBe(true);
    expect(skus.length).toBeGreaterThan(0);

    // All SKUs should be strings
    for (const sku of skus) {
      expect(typeof sku).toBe('string');
    }
  });

  test('getAllSkus includes variation SKUs for variable products', () => {
    const products = getTestProducts();

    if (products.variable.loadedVariations?.length) {
      const skus = getAllSkus(products.variable);

      // Should include variation SKUs
      const variationSkus = products.variable.loadedVariations
        .map((v) => v.sku)
        .filter((s) => s);

      for (const vSku of variationSkus) {
        expect(skus).toContain(vSku);
      }
    }
  });

  test('getProductForScenario returns correct product type', () => {
    const simpleProduct = getProductForScenario('simple');
    expect(simpleProduct.type).toBe('simple');

    const variableProduct = getProductForScenario('variable');
    // May be simple if no variable products exist
    expect(variableProduct).toBeDefined();

    const anyProduct = getProductForScenario('any');
    expect(anyProduct).toBeDefined();
  });

  test('test data contains products with prices > 0', () => {
    const data = getTestData();

    // Simple product should have a price
    expect(data.simpleProduct.price).toBeGreaterThan(0);

    // At least some products should have prices
    const productsWithPrice = data.allProducts.filter((p) => p.price > 0);
    expect(productsWithPrice.length).toBeGreaterThan(0);
  });
});
