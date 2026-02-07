/**
 * API Mocks Tests
 *
 * Verify that API mock factories and route interception work correctly.
 */

import { test, expect } from '../fixtures';
import {
  mockProducts,
  mockVariations,
  mockCustomers,
  mockCoupons,
  setupMockRoutes,
  setupProductMocks,
  setupCustomerMocks,
  setupCouponMocks,
  getValidCouponCode,
  getInvalidCouponCode,
  getExpiredCouponCode,
  getSimpleMockProduct,
  getVariableMockProduct,
  getMockCustomerByName,
} from '../fixtures';

test.describe('Mock Data Factories', () => {
  test('mockProducts returns expected product data', () => {
    const products = mockProducts();

    // Should have at least 5 products by default
    expect(products.length).toBeGreaterThanOrEqual(5);

    // First product should be Test Coffee (simple product)
    const coffee = products[0];
    expect(coffee.name).toBe('Test Coffee');
    expect(coffee.sku).toBe('TEST-COFFEE-001');
    expect(coffee.type).toBe('simple');
    expect(coffee.stock_status).toBe('instock');
    expect(parseFloat(coffee.price)).toBeGreaterThan(0);

    // Should include a variable product
    const variableProduct = products.find((p) => p.type === 'variable');
    expect(variableProduct).toBeDefined();
    expect(variableProduct?.variations).toBeDefined();
    expect(variableProduct?.variations?.length).toBeGreaterThan(0);

    // Should include an out of stock product
    const oosProduct = products.find((p) => p.stock_status === 'outofstock');
    expect(oosProduct).toBeDefined();
  });

  test('mockProducts can generate custom count', () => {
    const products = mockProducts(10);
    expect(products.length).toBeGreaterThanOrEqual(10);
  });

  test('mockVariations returns expected variation data', () => {
    const variations = mockVariations(1003);

    // Should have multiple size variations
    expect(variations.length).toBeGreaterThanOrEqual(3);

    // Each variation should have a unique SKU
    const skus = variations.map((v) => v.sku);
    const uniqueSkus = new Set(skus);
    expect(uniqueSkus.size).toBe(skus.length);

    // Should include in-stock and out-of-stock variations
    const inStock = variations.filter((v) => v.stock_status === 'instock');
    const outOfStock = variations.filter((v) => v.stock_status === 'outofstock');
    expect(inStock.length).toBeGreaterThan(0);
    expect(outOfStock.length).toBeGreaterThan(0);
  });

  test('mockCustomers returns expected customer data', () => {
    const customers = mockCustomers();

    // Should have multiple customers
    expect(customers.length).toBeGreaterThan(0);

    // Each customer should have name and phone
    for (const customer of customers) {
      expect(customer.name).toBeTruthy();
      expect(customer.phone).toBeTruthy();
    }
  });

  test('mockCoupons returns valid and invalid coupon scenarios', () => {
    const coupons = mockCoupons();

    // Should have multiple coupons
    expect(coupons.length).toBeGreaterThan(0);

    // Should have a percentage discount coupon
    const percentCoupon = coupons.find((c) => c.discount_type === 'percent');
    expect(percentCoupon).toBeDefined();
    expect(parseFloat(percentCoupon!.amount)).toBeGreaterThan(0);

    // Should have a fixed cart discount coupon
    const fixedCoupon = coupons.find((c) => c.discount_type === 'fixed_cart');
    expect(fixedCoupon).toBeDefined();

    // Should have an expired coupon
    const expiredCoupon = coupons.find((c) => c.code === 'EXPIRED');
    expect(expiredCoupon).toBeDefined();
    const expiredDate = new Date(expiredCoupon!.date_expires!);
    expect(expiredDate.getTime()).toBeLessThan(Date.now());

    // Should have a coupon with minimum amount requirement
    const minAmountCoupon = coupons.find((c) => parseFloat(c.minimum_amount) > 0);
    expect(minAmountCoupon).toBeDefined();
  });
});

test.describe('Convenience Getters', () => {
  test('getValidCouponCode returns a valid coupon', () => {
    const code = getValidCouponCode();
    const coupons = mockCoupons();
    const coupon = coupons.find((c) => c.code === code);

    expect(coupon).toBeDefined();
    // Should not be expired
    if (coupon?.date_expires) {
      const expiresDate = new Date(coupon.date_expires);
      expect(expiresDate.getTime()).toBeGreaterThan(Date.now());
    }
  });

  test('getInvalidCouponCode returns a code not in mock data', () => {
    const code = getInvalidCouponCode();
    const coupons = mockCoupons();
    const coupon = coupons.find((c) => c.code === code);

    expect(coupon).toBeUndefined();
  });

  test('getExpiredCouponCode returns an expired coupon', () => {
    const code = getExpiredCouponCode();
    const coupons = mockCoupons();
    const coupon = coupons.find((c) => c.code === code);

    expect(coupon).toBeDefined();
    expect(coupon?.date_expires).toBeTruthy();
    const expiresDate = new Date(coupon!.date_expires!);
    expect(expiresDate.getTime()).toBeLessThan(Date.now());
  });

  test('getSimpleMockProduct returns a simple product', () => {
    const product = getSimpleMockProduct();

    expect(product).toBeDefined();
    expect(product.type).toBe('simple');
    expect(product.sku).toBeTruthy();
    expect(parseFloat(product.price)).toBeGreaterThan(0);
  });

  test('getVariableMockProduct returns a variable product', () => {
    const product = getVariableMockProduct();

    expect(product).toBeDefined();
    expect(product.type).toBe('variable');
    expect(product.variations).toBeDefined();
    expect(product.variations!.length).toBeGreaterThan(0);
  });

  test('getMockCustomerByName finds customer by partial name', () => {
    const customer = getMockCustomerByName('john');

    expect(customer).toBeDefined();
    expect(customer?.name.toLowerCase()).toContain('john');
  });

  test('getMockCustomerByName returns undefined for non-existent name', () => {
    const customer = getMockCustomerByName('nonexistent12345');

    expect(customer).toBeUndefined();
  });
});

test.describe('Route Interception', () => {
  test('setupMockRoutes intercepts product requests', async ({ page }) => {
    await setupMockRoutes(page);

    // Navigate to orders flow. This route redirects (/orders -> /orders/new -> /orders/:id).
    await page.goto('/orders', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/orders\/[^/]+$/, { timeout: 30000 });

    // Basic sanity: we ended up on an order page and did not hit the error route.
    await expect(page).toHaveURL(/\/orders\//);
    await expect(page).not.toHaveURL(/\/error/);
  });

  test('setupProductMocks allows custom product data', async ({ page }) => {
    const customProducts = [
      {
        id: 9999,
        name: 'Custom Test Product',
        sku: 'CUSTOM-001',
        price: '99.99',
        regular_price: '99.99',
        sale_price: '',
        description: 'Custom product for testing',
        categories: [{ id: 1, name: 'Test' }],
        stock_status: 'instock' as const,
        stock_quantity: 50,
        manage_stock: true,
        low_stock_amount: 5,
        type: 'simple' as const,
      },
    ];

    await setupProductMocks(page, customProducts);

    await page.goto('/orders', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/orders\/[^/]+$/, { timeout: 30000 });
    await expect(page).not.toHaveURL(/\/error/);
  });

  test('setupCustomerMocks intercepts customer search', async ({ page }) => {
    const customCustomers = [
      { name: 'Test User', phone: '+1-555-000-0000' },
      { name: 'Another User', phone: '+1-555-111-1111' },
    ];

    await setupCustomerMocks(page, customCustomers);

    await page.goto('/orders', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/orders\/[^/]+$/, { timeout: 30000 });
    await expect(page).not.toHaveURL(/\/error/);
  });

  test('setupCouponMocks intercepts coupon lookup', async ({ page }) => {
    const customCoupons = [
      {
        id: 8888,
        code: 'TESTDISCOUNT',
        amount: '25',
        discount_type: 'percent' as const,
        description: 'Test discount',
        date_expires: new Date(Date.now() + 86400000).toISOString(),
        usage_count: 0,
        individual_use: false,
        product_ids: [],
        excluded_product_ids: [],
        usage_limit: null,
        usage_limit_per_user: null,
        limit_usage_to_x_items: null,
        free_shipping: false,
        minimum_amount: '0',
        maximum_amount: '',
      },
    ];

    await setupCouponMocks(page, customCoupons);

    await page.goto('/orders', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/orders\/[^/]+$/, { timeout: 30000 });
    await expect(page).not.toHaveURL(/\/error/);
  });
});
