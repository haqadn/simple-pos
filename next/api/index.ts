// Barrel export for API layer
export { API } from './api';
export type { Request_Config, API_Client } from './api';

export { default as OrdersAPI } from './orders';
export type {
  OrderSchema,
  LineItemSchema,
  ShippingLineSchema,
  CouponLineSchema,
  BillingSchema,
  MetaDataSchema,
  ShippingMethodType,
} from './orders';

export { default as ProductsAPI } from './products';
export type { ProductCategorySchema, ServerSideProductSchema, ServerSideVariationSchema } from './products';

export { default as CustomersAPI } from './customers';
export type { CustomerSchema } from './customers';

export { default as CouponsAPI } from './coupons';

export { default as ShippingAPI } from './shipping';
export type {
  BeShippingZoneSchema,
  BeShippingMethodSchema,
  BePickupLocationsSchema,
  BePickupLocationsResponseSchema,
} from './shipping';
