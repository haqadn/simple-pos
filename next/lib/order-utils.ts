/**
 * Order Utility Functions
 *
 * Provides client-side calculations for order totals
 * since WooCommerce calculates totals server-side and local orders need
 * immediate total updates.
 */

import type { OrderSchema, LineItemSchema, ShippingLineSchema, CouponLineSchema } from "../api/orders";

/**
 * Calculate the total for an order based on line items, discounts, and shipping
 *
 * Formula: subtotal - discount_total + shipping_total
 * where subtotal = sum(line_items.price * quantity)
 *
 * @param order - The order data to calculate total for
 * @returns The calculated total as a string with 2 decimal places
 */
export function calculateOrderTotal(order: Partial<OrderSchema>): string {
  // Calculate subtotal from line items
  const subtotal = (order.line_items ?? []).reduce((sum, item) => {
    const price = parseFloat(String(item.price ?? "0"));
    return sum + price * item.quantity;
  }, 0);

  // Get discount total (from coupon application)
  const discount = parseFloat(order.discount_total ?? "0");

  // Calculate shipping total from shipping lines
  const shipping = (order.shipping_lines ?? []).reduce((sum, line) => {
    return sum + parseFloat(line.total ?? "0");
  }, 0);

  // Calculate final total
  const total = subtotal - discount + shipping;

  return total.toFixed(2);
}

/**
 * Calculate the subtotal for an order (before discounts and shipping)
 *
 * @param lineItems - The line items to calculate subtotal for
 * @returns The calculated subtotal as a string with 2 decimal places
 */
export function calculateSubtotal(lineItems: LineItemSchema[]): string {
  const subtotal = lineItems.reduce((sum, item) => {
    const price = parseFloat(String(item.price ?? "0"));
    return sum + price * item.quantity;
  }, 0);

  return subtotal.toFixed(2);
}

/**
 * Calculate the discount total from coupon lines
 *
 * @param couponLines - The coupon lines to sum discounts from
 * @returns The total discount as a string with 2 decimal places
 */
export function calculateDiscountTotal(couponLines: CouponLineSchema[]): string {
  const discount = couponLines.reduce((sum, coupon) => {
    return sum + parseFloat(coupon.discount ?? "0");
  }, 0);

  return discount.toFixed(2);
}

/**
 * Calculate the shipping total from shipping lines
 *
 * @param shippingLines - The shipping lines to sum totals from
 * @returns The total shipping as a string with 2 decimal places
 */
export function calculateShippingTotal(shippingLines: ShippingLineSchema[]): string {
  const shipping = shippingLines.reduce((sum, line) => {
    return sum + parseFloat(line.total ?? "0");
  }, 0);

  return shipping.toFixed(2);
}
