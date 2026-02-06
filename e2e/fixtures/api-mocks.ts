/**
 * API Mock Factories
 *
 * Provides mock response factories for read-only API endpoints.
 * Used with Playwright route interception to speed up tests and
 * provide predictable test data for customer search and coupon lookup.
 *
 * Per PRD: Order mutations use real WooCommerce API, but read-only
 * operations (products, customers, coupons) can be mocked.
 */

import { Page, Route, Request } from '@playwright/test';

// ==========================================
// Types
// ==========================================

/**
 * Mock product matching the WooCommerce API structure
 */
export interface MockProduct {
  id: number;
  name: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  description: string;
  categories: Array<{ id: number; name: string }>;
  variations?: number[];
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  stock_quantity: number | null;
  manage_stock: boolean;
  low_stock_amount: number | null;
  type?: 'simple' | 'variable';
}

/**
 * Mock variation matching the WooCommerce API structure
 */
export interface MockVariation {
  id: number;
  name: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  description: string;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  stock_quantity: number | null;
  manage_stock: boolean;
  low_stock_amount: number | null;
}

/**
 * Mock customer matching the custom Simple POS API structure
 */
export interface MockCustomer {
  name: string;
  phone: string;
}

/**
 * Mock coupon matching the WooCommerce API structure
 */
export interface MockCoupon {
  id: number;
  code: string;
  amount: string;
  discount_type: 'percent' | 'fixed_cart' | 'fixed_product';
  description: string;
  date_expires: string | null;
  usage_count: number;
  individual_use: boolean;
  product_ids: number[];
  excluded_product_ids: number[];
  usage_limit: number | null;
  usage_limit_per_user: number | null;
  limit_usage_to_x_items: number | null;
  free_shipping: boolean;
  minimum_amount: string;
  maximum_amount: string;
}

/**
 * Configuration for route interception
 */
export interface MockConfig {
  products?: MockProduct[];
  variations?: Record<number, MockVariation[]>;
  customers?: MockCustomer[];
  coupons?: MockCoupon[];
}

// ==========================================
// Mock Data Factories
// ==========================================

/**
 * Create mock products with realistic data
 */
export function mockProducts(count: number = 5): MockProduct[] {
  const products: MockProduct[] = [];

  // Always include a simple product for basic tests
  products.push({
    id: 1001,
    name: 'Test Coffee',
    sku: 'TEST-COFFEE-001',
    price: '4.50',
    regular_price: '4.50',
    sale_price: '',
    description: 'A delicious test coffee for E2E testing',
    categories: [{ id: 1, name: 'Beverages' }],
    stock_status: 'instock',
    stock_quantity: 100,
    manage_stock: true,
    low_stock_amount: 10,
    type: 'simple',
  });

  // Add a second simple product
  products.push({
    id: 1002,
    name: 'Test Muffin',
    sku: 'TEST-MUFFIN-001',
    price: '3.25',
    regular_price: '3.50',
    sale_price: '3.25',
    description: 'A tasty test muffin on sale',
    categories: [{ id: 2, name: 'Food' }],
    stock_status: 'instock',
    stock_quantity: 50,
    manage_stock: true,
    low_stock_amount: 5,
    type: 'simple',
  });

  // Add a variable product for variation tests
  products.push({
    id: 1003,
    name: 'Test T-Shirt',
    sku: 'TEST-TSHIRT',
    price: '19.99',
    regular_price: '19.99',
    sale_price: '',
    description: 'A test t-shirt with size variations',
    categories: [{ id: 3, name: 'Apparel' }],
    variations: [1003001, 1003002, 1003003],
    stock_status: 'instock',
    stock_quantity: null,
    manage_stock: false,
    low_stock_amount: null,
    type: 'variable',
  });

  // Add out of stock product for edge case testing
  products.push({
    id: 1004,
    name: 'Out of Stock Item',
    sku: 'TEST-OOS-001',
    price: '9.99',
    regular_price: '9.99',
    sale_price: '',
    description: 'This item is out of stock',
    categories: [{ id: 1, name: 'Beverages' }],
    stock_status: 'outofstock',
    stock_quantity: 0,
    manage_stock: true,
    low_stock_amount: 10,
    type: 'simple',
  });

  // Add a product without SKU for edge case testing
  products.push({
    id: 1005,
    name: 'No SKU Product',
    sku: '',
    price: '5.00',
    regular_price: '5.00',
    sale_price: '',
    description: 'A product without SKU',
    categories: [{ id: 2, name: 'Food' }],
    stock_status: 'instock',
    stock_quantity: null,
    manage_stock: false,
    low_stock_amount: null,
    type: 'simple',
  });

  // Add more products if requested
  for (let i = products.length; i < count; i++) {
    products.push({
      id: 1100 + i,
      name: `Test Product ${i + 1}`,
      sku: `TEST-PROD-${String(i + 1).padStart(3, '0')}`,
      price: String((Math.random() * 20 + 1).toFixed(2)),
      regular_price: String((Math.random() * 20 + 1).toFixed(2)),
      sale_price: '',
      description: `Generated test product ${i + 1}`,
      categories: [{ id: 1, name: 'General' }],
      stock_status: 'instock',
      stock_quantity: Math.floor(Math.random() * 100) + 10,
      manage_stock: true,
      low_stock_amount: 5,
      type: 'simple',
    });
  }

  return products;
}

/**
 * Create mock variations for a variable product
 */
export function mockVariations(productId: number = 1003): MockVariation[] {
  return [
    {
      id: productId * 1000 + 1,
      name: 'Small',
      sku: `TEST-TSHIRT-S`,
      price: '19.99',
      regular_price: '19.99',
      sale_price: '',
      description: 'Small size',
      stock_status: 'instock',
      stock_quantity: 20,
      manage_stock: true,
      low_stock_amount: 5,
    },
    {
      id: productId * 1000 + 2,
      name: 'Medium',
      sku: `TEST-TSHIRT-M`,
      price: '19.99',
      regular_price: '19.99',
      sale_price: '',
      description: 'Medium size',
      stock_status: 'instock',
      stock_quantity: 30,
      manage_stock: true,
      low_stock_amount: 5,
    },
    {
      id: productId * 1000 + 3,
      name: 'Large',
      sku: `TEST-TSHIRT-L`,
      price: '21.99',
      regular_price: '21.99',
      sale_price: '',
      description: 'Large size',
      stock_status: 'instock',
      stock_quantity: 15,
      manage_stock: true,
      low_stock_amount: 5,
    },
    {
      id: productId * 1000 + 4,
      name: 'X-Large',
      sku: `TEST-TSHIRT-XL`,
      price: '21.99',
      regular_price: '21.99',
      sale_price: '',
      description: 'Extra large size',
      stock_status: 'outofstock',
      stock_quantity: 0,
      manage_stock: true,
      low_stock_amount: 5,
    },
  ];
}

/**
 * Create mock customers with sample data
 */
export function mockCustomers(): MockCustomer[] {
  return [
    {
      name: 'John Doe',
      phone: '+1-555-123-4567',
    },
    {
      name: 'Jane Smith',
      phone: '+1-555-234-5678',
    },
    {
      name: 'Bob Johnson',
      phone: '+1-555-345-6789',
    },
    {
      name: 'Alice Williams',
      phone: '+1-555-456-7890',
    },
    {
      name: 'Charlie Brown',
      phone: '+1-555-567-8901',
    },
    {
      name: 'Diana Prince',
      phone: '+1-555-678-9012',
    },
    {
      name: 'Edward Norton',
      phone: '+1-555-789-0123',
    },
    {
      name: 'Fiona Apple',
      phone: '+1-555-890-1234',
    },
  ];
}

/**
 * Create mock coupons with valid and invalid scenarios
 */
export function mockCoupons(): MockCoupon[] {
  const now = new Date();
  const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
  const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday

  return [
    // Valid percentage discount
    {
      id: 2001,
      code: 'SAVE10',
      amount: '10',
      discount_type: 'percent',
      description: '10% off your order',
      date_expires: futureDate.toISOString(),
      usage_count: 5,
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
    // Valid fixed cart discount
    {
      id: 2002,
      code: 'FLAT5',
      amount: '5.00',
      discount_type: 'fixed_cart',
      description: '$5 off your cart',
      date_expires: futureDate.toISOString(),
      usage_count: 10,
      individual_use: false,
      product_ids: [],
      excluded_product_ids: [],
      usage_limit: null,
      usage_limit_per_user: null,
      limit_usage_to_x_items: null,
      free_shipping: false,
      minimum_amount: '10',
      maximum_amount: '',
    },
    // Valid coupon with free shipping
    {
      id: 2003,
      code: 'FREESHIP',
      amount: '0',
      discount_type: 'fixed_cart',
      description: 'Free shipping on your order',
      date_expires: futureDate.toISOString(),
      usage_count: 2,
      individual_use: false,
      product_ids: [],
      excluded_product_ids: [],
      usage_limit: null,
      usage_limit_per_user: null,
      limit_usage_to_x_items: null,
      free_shipping: true,
      minimum_amount: '25',
      maximum_amount: '',
    },
    // Valid product-specific discount
    {
      id: 2004,
      code: 'COFFEE20',
      amount: '20',
      discount_type: 'percent',
      description: '20% off coffee products',
      date_expires: futureDate.toISOString(),
      usage_count: 0,
      individual_use: true,
      product_ids: [1001], // Only for Test Coffee
      excluded_product_ids: [],
      usage_limit: 100,
      usage_limit_per_user: 1,
      limit_usage_to_x_items: 1,
      free_shipping: false,
      minimum_amount: '0',
      maximum_amount: '',
    },
    // Expired coupon (for invalid scenario testing)
    {
      id: 2005,
      code: 'EXPIRED',
      amount: '50',
      discount_type: 'percent',
      description: 'This coupon has expired',
      date_expires: pastDate.toISOString(),
      usage_count: 999,
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
    // Used up coupon (for invalid scenario testing)
    {
      id: 2006,
      code: 'MAXEDOUT',
      amount: '15',
      discount_type: 'percent',
      description: 'This coupon has reached its usage limit',
      date_expires: futureDate.toISOString(),
      usage_count: 10,
      individual_use: false,
      product_ids: [],
      excluded_product_ids: [],
      usage_limit: 10,
      usage_limit_per_user: null,
      limit_usage_to_x_items: null,
      free_shipping: false,
      minimum_amount: '0',
      maximum_amount: '',
    },
    // High minimum amount coupon (for edge case testing)
    {
      id: 2007,
      code: 'BIG50',
      amount: '50',
      discount_type: 'fixed_cart',
      description: '$50 off orders over $200',
      date_expires: futureDate.toISOString(),
      usage_count: 0,
      individual_use: false,
      product_ids: [],
      excluded_product_ids: [],
      usage_limit: null,
      usage_limit_per_user: null,
      limit_usage_to_x_items: null,
      free_shipping: false,
      minimum_amount: '200',
      maximum_amount: '',
    },
  ];
}

// ==========================================
// Route Interception Helpers
// ==========================================

/**
 * URL pattern for WooCommerce API endpoints
 */
const WC_API_PATTERN = '**/wp-json/wc/v3/**';
const SIMPLE_POS_API_PATTERN = '**/wp-json/wc/v3/simple-pos/**';

/**
 * Setup route interception for mock responses
 *
 * This function intercepts API requests and returns mock data for read-only
 * endpoints while allowing order mutations to pass through to the real API.
 *
 * @param page - Playwright page object
 * @param config - Mock data configuration
 */
export async function setupMockRoutes(page: Page, config: MockConfig = {}): Promise<void> {
  const products = config.products ?? mockProducts();
  const variations = config.variations ?? { 1003: mockVariations(1003) };
  const customers = config.customers ?? mockCustomers();
  const coupons = config.coupons ?? mockCoupons();

  // Intercept WooCommerce API requests
  await page.route(WC_API_PATTERN, async (route: Route, request: Request) => {
    const url = request.url();
    const method = request.method();

    // Only intercept GET requests for read-only endpoints
    if (method !== 'GET') {
      await route.continue();
      return;
    }

    // Products endpoint
    if (url.includes('/products') && !url.includes('/variations')) {
      // Check if this is a single product request
      const productMatch = url.match(/\/products\/(\d+)$/);
      if (productMatch) {
        const productId = parseInt(productMatch[1], 10);
        const product = products.find((p) => p.id === productId);
        if (product) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(product),
          });
          return;
        }
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'not_found', message: 'Product not found' }),
        });
        return;
      }

      // Products list
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(products),
      });
      return;
    }

    // Variations endpoint
    if (url.includes('/variations')) {
      const variationMatch = url.match(/\/products\/(\d+)\/variations/);
      if (variationMatch) {
        const productId = parseInt(variationMatch[1], 10);
        const productVariations = variations[productId] ?? [];
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(productVariations),
        });
        return;
      }
    }

    // Coupons endpoint
    if (url.includes('/coupons')) {
      // Parse the code query parameter
      const urlObj = new URL(url);
      const codeParam = urlObj.searchParams.get('code');

      if (codeParam) {
        // Search by code
        const matchingCoupons = coupons.filter(
          (c) => c.code.toLowerCase() === codeParam.toLowerCase()
        );
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(matchingCoupons),
        });
        return;
      }

      // Return all coupons
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(coupons),
      });
      return;
    }

    // Let all other requests pass through
    await route.continue();
  });

  // Intercept Simple POS custom API endpoints (customers)
  await page.route(SIMPLE_POS_API_PATTERN, async (route: Route, request: Request) => {
    const url = request.url();
    const method = request.method();

    // Only intercept GET requests
    if (method !== 'GET') {
      await route.continue();
      return;
    }

    // Customers search endpoint
    if (url.includes('/simple-pos/customers')) {
      const urlObj = new URL(url);
      const searchParam = urlObj.searchParams.get('search') || '';

      // Filter customers by search term
      const filteredCustomers = searchParam.length >= 2
        ? customers.filter(
            (c) =>
              c.name.toLowerCase().includes(searchParam.toLowerCase()) ||
              c.phone.includes(searchParam)
          )
        : [];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ customers: filteredCustomers }),
      });
      return;
    }

    // Let other requests pass through
    await route.continue();
  });
}

/**
 * Setup mock routes for products only
 *
 * Useful when you only need to mock products and want other
 * endpoints to use real API data.
 */
export async function setupProductMocks(
  page: Page,
  products: MockProduct[] = mockProducts()
): Promise<void> {
  await page.route('**/wp-json/wc/v3/products*', async (route: Route, request: Request) => {
    if (request.method() !== 'GET') {
      await route.continue();
      return;
    }

    const url = request.url();

    // Check for variations endpoint
    if (url.includes('/variations')) {
      const variationMatch = url.match(/\/products\/(\d+)\/variations/);
      if (variationMatch) {
        const productId = parseInt(variationMatch[1], 10);
        const variationsData = mockVariations(productId);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(variationsData),
        });
        return;
      }
    }

    // Single product
    const productMatch = url.match(/\/products\/(\d+)$/);
    if (productMatch) {
      const productId = parseInt(productMatch[1], 10);
      const product = products.find((p) => p.id === productId);
      if (product) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(product),
        });
        return;
      }
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'not_found', message: 'Product not found' }),
      });
      return;
    }

    // Products list
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(products),
    });
  });
}

/**
 * Setup mock routes for customers only
 */
export async function setupCustomerMocks(
  page: Page,
  customers: MockCustomer[] = mockCustomers()
): Promise<void> {
  await page.route('**/wp-json/wc/v3/simple-pos/customers*', async (route: Route, request: Request) => {
    if (request.method() !== 'GET') {
      await route.continue();
      return;
    }

    const urlObj = new URL(request.url());
    const searchParam = urlObj.searchParams.get('search') || '';

    const filteredCustomers = searchParam.length >= 2
      ? customers.filter(
          (c) =>
            c.name.toLowerCase().includes(searchParam.toLowerCase()) ||
            c.phone.includes(searchParam)
        )
      : [];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ customers: filteredCustomers }),
    });
  });
}

/**
 * Setup mock routes for coupons only
 */
export async function setupCouponMocks(
  page: Page,
  coupons: MockCoupon[] = mockCoupons()
): Promise<void> {
  await page.route('**/wp-json/wc/v3/coupons*', async (route: Route, request: Request) => {
    if (request.method() !== 'GET') {
      await route.continue();
      return;
    }

    const urlObj = new URL(request.url());
    const codeParam = urlObj.searchParams.get('code');

    if (codeParam) {
      const matchingCoupons = coupons.filter(
        (c) => c.code.toLowerCase() === codeParam.toLowerCase()
      );
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(matchingCoupons),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(coupons),
    });
  });
}

/**
 * Clear all mock routes from a page
 *
 * Useful for cleaning up after tests that set up specific mocks.
 */
export async function clearMockRoutes(page: Page): Promise<void> {
  await page.unrouteAll();
}

// ==========================================
// Convenience Getters
// ==========================================

/**
 * Get a valid coupon code for testing
 */
export function getValidCouponCode(): string {
  return 'SAVE10';
}

/**
 * Get an invalid/expired coupon code for testing
 */
export function getInvalidCouponCode(): string {
  return 'INVALID123';
}

/**
 * Get an expired coupon code for testing
 */
export function getExpiredCouponCode(): string {
  return 'EXPIRED';
}

/**
 * Get the simple test product
 */
export function getSimpleMockProduct(): MockProduct {
  return mockProducts()[0];
}

/**
 * Get the variable test product
 */
export function getVariableMockProduct(): MockProduct {
  return mockProducts().find((p) => p.type === 'variable')!;
}

/**
 * Get a customer by name for assertions
 */
export function getMockCustomerByName(name: string): MockCustomer | undefined {
  return mockCustomers().find((c) => c.name.toLowerCase().includes(name.toLowerCase()));
}
