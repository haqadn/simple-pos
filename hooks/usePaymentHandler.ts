import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentOrder } from '@/stores/orders';
import { useOrderRouteInfo } from './useOrderRouteInfo';
import { updateLocalOrder } from '@/stores/offline-orders';
import OrdersAPI from '@/api/orders';
import type { LocalOrder } from '@/db';

/**
 * Hook encapsulating the payment-related command handlers.
 *
 * Handles:
 * - Setting payment amounts with split-payment support
 * - Reading the current payment_received total from order meta
 *
 * Works for both local-first (frontend ID) orders and legacy server orders.
 */
export function usePaymentHandler() {
  const orderQuery = useCurrentOrder();
  const queryClient = useQueryClient();
  const { urlOrderId, isFrontendIdOrder } = useOrderRouteInfo();

  /**
   * Set payment amount for a given method (defaults to 'cash').
   * Merges into the existing split_payments meta, recalculates total received.
   */
  const handleSetPayment = useCallback(async (amount: number, method?: string) => {
    if (!orderQuery.data) throw new Error('No active order');

    // Get fresh order data
    const currentOrder = orderQuery.data;

    // Parse existing split_payments to merge with new payment
    const existingSplitMeta = (currentOrder.meta_data || []).find(m => m.key === 'split_payments');
    let existingSplitPayments: Record<string, number> = {};
    if (existingSplitMeta && typeof existingSplitMeta.value === 'string') {
      try {
        existingSplitPayments = JSON.parse(existingSplitMeta.value);
      } catch { /* ignore parse errors */ }
    }

    // Determine the payment method key (default to 'cash')
    const methodKey = method || 'cash';

    // Set the amount for the specified method (replaces any existing amount for that method)
    const updatedSplitPayments = { ...existingSplitPayments, [methodKey]: amount };

    // Calculate total received across all methods
    const totalReceived = Object.values(updatedSplitPayments).reduce((sum, val) => sum + (val || 0), 0);

    // Update meta_data with both split_payments (for UI) and payment_received (for legacy)
    const metaData = (currentOrder.meta_data || []).filter(
      m => m.key !== 'payment_received' && m.key !== 'split_payments'
    );
    metaData.push({ key: 'split_payments', value: JSON.stringify(updatedSplitPayments) });
    metaData.push({ key: 'payment_received', value: totalReceived.toString() });

    // For frontend ID orders - handle locally via Dexie
    if (isFrontendIdOrder && urlOrderId) {
      const updatedLocalOrder = await updateLocalOrder(urlOrderId, { meta_data: metaData });
      queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], updatedLocalOrder);
      return;
    }

    // Legacy flow for server orders
    const orderId = currentOrder.id;
    const orderQueryKey = ['orders', orderId, 'detail'];

    // Optimistic update
    queryClient.setQueryData(orderQueryKey, { ...currentOrder, meta_data: metaData });

    // API call
    const updatedOrder = await OrdersAPI.updateOrder(orderId.toString(), { meta_data: metaData });
    queryClient.setQueryData(orderQueryKey, updatedOrder);
  }, [orderQuery, queryClient, urlOrderId, isFrontendIdOrder]);

  /**
   * Read the current total payment received from order meta_data.
   */
  const getPaymentReceived = useCallback((): number => {
    if (!orderQuery.data) return 0;
    const paymentMeta = orderQuery.data.meta_data.find(m => m.key === 'payment_received');
    return paymentMeta ? parseFloat(String(paymentMeta.value)) : 0;
  }, [orderQuery.data]);

  return { handleSetPayment, getPaymentReceived };
}
