import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentOrder } from '@/stores/orders';
import { useOrderRouteInfo } from './useOrderRouteInfo';
import { updateLocalOrder } from '@/stores/offline-orders';
import OrdersAPI, { OrderSchema, CouponLineSchema } from '@/api/orders';
import CouponsAPI, { validateCoupon } from '@/api/coupons';
import type { LocalOrder } from '@/db';

/**
 * Hook encapsulating coupon apply/remove logic.
 *
 * Handles:
 * - Server-side coupon validation before application
 * - Local discount calculation for frontend-ID orders
 * - WooCommerce-delegated discount for server orders
 * - Coupon removal for both order types
 */
export function useCouponHandler() {
  const orderQuery = useCurrentOrder();
  const queryClient = useQueryClient();
  const { urlOrderId, isFrontendIdOrder } = useOrderRouteInfo();

  /**
   * Validate and apply a coupon code to the current order.
   */
  const handleApplyCoupon = useCallback(async (code: string) => {
    if (!orderQuery.data) throw new Error('No active order');

    // Validate coupon against the server first
    let coupon;
    try {
      coupon = await CouponsAPI.getCouponByCode(code);
    } catch {
      throw new Error(`Failed to validate coupon "${code}"`);
    }
    if (!coupon) {
      throw new Error(`Coupon "${code}" not found`);
    }

    const validation = validateCoupon(coupon);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Coupon is not valid');
    }

    // For frontend ID orders - calculate discount and save locally
    if (isFrontendIdOrder && urlOrderId) {
      const subtotal = parseFloat(orderQuery.data.subtotal || orderQuery.data.total || '0');
      let discountAmount = 0;

      if (coupon.discount_type === 'percent') {
        discountAmount = (subtotal * parseFloat(coupon.amount)) / 100;
      } else {
        // fixed_cart or fixed_product
        discountAmount = parseFloat(coupon.amount);
      }

      const newCouponLine: CouponLineSchema = {
        code,
        discount: discountAmount.toFixed(2),
        discount_tax: '0.00',
      };

      const existingCoupons = (orderQuery.data.coupon_lines || []).filter(c => c.code !== code);
      const updatedCouponLines = [...existingCoupons, newCouponLine];
      const totalDiscount = updatedCouponLines.reduce((sum, c) => sum + parseFloat(c.discount || '0'), 0);

      const updatedLocalOrder = await updateLocalOrder(urlOrderId, {
        coupon_lines: updatedCouponLines,
        discount_total: totalDiscount.toFixed(2),
      });
      queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], updatedLocalOrder);
      return;
    }

    // Server orders - WooCommerce calculates the discount
    const orderId = orderQuery.data.id;
    const existingCodes = (orderQuery.data.coupon_lines || []).map(c => ({ code: c.code }));
    const updatedOrder = await OrdersAPI.updateOrder(orderId.toString(), {
      coupon_lines: [...existingCodes, { code }]
    } as Partial<OrderSchema>);

    const orderQueryKey = ['orders', orderId, 'detail'];
    queryClient.setQueryData(orderQueryKey, updatedOrder);
  }, [orderQuery, queryClient, urlOrderId, isFrontendIdOrder]);

  /**
   * Remove all coupons from the current order.
   */
  const handleRemoveCoupon = useCallback(async () => {
    if (!orderQuery.data) throw new Error('No active order');

    // For frontend ID orders - handle locally via Dexie
    if (isFrontendIdOrder && urlOrderId) {
      const updatedLocalOrder = await updateLocalOrder(urlOrderId, {
        coupon_lines: [],
      });
      queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], updatedLocalOrder);
      return;
    }

    // Legacy flow for server orders
    const orderId = orderQuery.data.id;

    const updatedOrder = await OrdersAPI.updateOrder(orderId.toString(), {
      coupon_lines: []
    } as Partial<OrderSchema>);

    const orderQueryKey = ['orders', orderId, 'detail'];
    queryClient.setQueryData(orderQueryKey, updatedOrder);
  }, [orderQuery, queryClient, urlOrderId, isFrontendIdOrder]);

  return { handleApplyCoupon, handleRemoveCoupon };
}
