import { z } from "zod";
import { API } from "./api";

// Coupon discount types as defined by WooCommerce
export const CouponDiscountTypeSchema = z.enum([
  "percent",
  "fixed_cart",
  "fixed_product",
]);

export type CouponDiscountType = z.infer<typeof CouponDiscountTypeSchema>;

// Meta data schema for coupons (WooCommerce can return any type in value)
const CouponMetaDataSchema = z.object({
  id: z.number().optional(),
  key: z.string(),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.record(z.string(), z.unknown()))]),
});

// Full coupon schema based on WooCommerce REST API v3
export const CouponSchema = z.object({
  id: z.number(),
  code: z.string(),
  amount: z.string().default("0"),
  status: z.string().default("publish"),
  date_created: z.string().optional(),
  date_created_gmt: z.string().optional(),
  date_modified: z.string().optional(),
  date_modified_gmt: z.string().optional(),
  discount_type: CouponDiscountTypeSchema.default("fixed_cart"),
  description: z.string().default(""),
  date_expires: z.string().nullable().optional(),
  date_expires_gmt: z.string().nullable().optional(),
  usage_count: z.number().default(0),
  individual_use: z.boolean().default(false),
  product_ids: z.array(z.number()).default([]),
  excluded_product_ids: z.array(z.number()).default([]),
  usage_limit: z.number().nullable().optional(),
  usage_limit_per_user: z.number().nullable().optional(),
  limit_usage_to_x_items: z.number().nullable().optional(),
  free_shipping: z.boolean().default(false),
  product_categories: z.array(z.number()).default([]),
  excluded_product_categories: z.array(z.number()).default([]),
  exclude_sale_items: z.boolean().default(false),
  minimum_amount: z.string().default(""),
  maximum_amount: z.string().default(""),
  email_restrictions: z.array(z.string()).default([]),
  used_by: z.array(z.union([z.string(), z.number()])).default([]),
  meta_data: z.array(CouponMetaDataSchema).default([]),
});

export type CouponSchema = z.infer<typeof CouponSchema>;

// Coupon validation result with human-readable summary
export interface CouponValidationResult {
  isValid: boolean;
  coupon: CouponSchema | null;
  summary: string;
  error?: string;
}

/**
 * Generates a human-readable description of a coupon's discount rules
 */
export function generateCouponSummary(coupon: CouponSchema): string {
  const parts: string[] = [];
  const amount = parseFloat(coupon.amount) || 0;

  // Main discount description
  switch (coupon.discount_type) {
    case "percent":
      parts.push(`${amount}% off`);
      break;
    case "fixed_cart":
      parts.push(`${amount.toFixed(0)} off`);
      break;
    case "fixed_product":
      parts.push(`${amount.toFixed(0)} off per item`);
      break;
  }

  // Add scope description
  if (coupon.product_ids.length > 0) {
    parts.push("on selected products");
  } else if (coupon.product_categories.length > 0) {
    parts.push("on selected categories");
  } else {
    parts.push("entire order");
  }

  // Add minimum requirement
  const minAmount = parseFloat(coupon.minimum_amount) || 0;
  if (minAmount > 0) {
    parts[parts.length - 1] += ` (min order: ${minAmount.toFixed(0)})`;
  }

  // Add maximum cap
  const maxAmount = parseFloat(coupon.maximum_amount) || 0;
  if (maxAmount > 0) {
    parts.push(`max discount: ${maxAmount.toFixed(0)}`);
  }

  // Add free shipping if applicable
  if (coupon.free_shipping) {
    parts.push("+ free shipping");
  }

  // Check usage limits
  if (coupon.usage_limit !== null && coupon.usage_limit !== undefined) {
    const remaining = coupon.usage_limit - coupon.usage_count;
    if (remaining <= 5 && remaining > 0) {
      parts.push(`(${remaining} uses left)`);
    }
  }

  return parts.join(" ");
}

/**
 * Validates a coupon and returns a validation result
 */
export function validateCoupon(coupon: CouponSchema): CouponValidationResult {
  // Check if coupon is published/active
  if (coupon.status !== "publish") {
    return {
      isValid: false,
      coupon,
      summary: "",
      error: "This coupon is not active",
    };
  }

  // Check expiration
  if (coupon.date_expires) {
    const expiresDate = new Date(coupon.date_expires);
    if (expiresDate < new Date()) {
      return {
        isValid: false,
        coupon,
        summary: "",
        error: "This coupon has expired",
      };
    }
  }

  // Check usage limit
  if (
    coupon.usage_limit !== null &&
    coupon.usage_limit !== undefined &&
    coupon.usage_count >= coupon.usage_limit
  ) {
    return {
      isValid: false,
      coupon,
      summary: "",
      error: "This coupon has reached its usage limit",
    };
  }

  // Coupon is valid
  return {
    isValid: true,
    coupon,
    summary: generateCouponSummary(coupon),
  };
}

export default class CouponsAPI extends API {
  /**
   * Get a coupon by its code
   * Returns null if coupon not found
   */
  static async getCouponByCode(code: string): Promise<CouponSchema | null> {
    const response = await this.client.get<CouponSchema[]>(`/coupons`, {
      params: {
        code: code.trim().toLowerCase(),
      },
    });

    // WooCommerce returns an array of matching coupons
    const coupons = z.array(CouponSchema).parse(response.data);

    if (coupons.length === 0) {
      // Intentional null: "not found" is a valid result, not an error
      return null;
    }

    // Return the first matching coupon
    return coupons[0];
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use getCouponByCode instead
   */
  static async getCoupon(code: string) {
    return await this.client.get(`/coupons`, {
      params: {
        code,
      },
    });
  }
}
