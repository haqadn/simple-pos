import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentOrder } from '@/stores/orders';
import { useOrderRouteInfo } from './useOrderRouteInfo';
import { updateLocalOrder } from '@/stores/offline-orders';
import OrdersAPI, { OrderSchema } from '@/api/orders';
import type { CustomerData } from '@/commands/command-manager';
import type { LocalOrder } from '@/db';

/**
 * Hook encapsulating customer note and customer info handlers.
 *
 * Handles:
 * - Setting/updating the customer note
 * - Setting/updating billing contact info (name, phone, address)
 *
 * Works for both local-first (frontend ID) orders and legacy server orders.
 */
export function useOrderNoteAndCustomer() {
  const orderQuery = useCurrentOrder();
  const queryClient = useQueryClient();
  const { urlOrderId, isFrontendIdOrder } = useOrderRouteInfo();

  /**
   * Set the customer note on the current order.
   */
  const handleSetNote = useCallback(async (note: string) => {
    if (!orderQuery.data) throw new Error('No active order');

    // For frontend ID orders - handle locally via Dexie
    if (isFrontendIdOrder && urlOrderId) {
      const updatedLocalOrder = await updateLocalOrder(urlOrderId, { customer_note: note });
      queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], updatedLocalOrder);
      return;
    }

    // Legacy flow for server orders
    const orderId = orderQuery.data.id;
    const orderQueryKey = ['orders', orderId, 'detail'];
    const noteQueryKey = ['orders', orderId, 'note'];

    const currentOrder = queryClient.getQueryData<OrderSchema>(orderQueryKey) || orderQuery.data;

    // Optimistic update
    queryClient.setQueryData(orderQueryKey, { ...currentOrder, customer_note: note });
    queryClient.setQueryData(noteQueryKey, note);

    // API call
    const updatedOrder = await OrdersAPI.updateOrder(orderId.toString(), { customer_note: note });
    queryClient.setQueryData(orderQueryKey, updatedOrder);
    queryClient.setQueryData(noteQueryKey, updatedOrder.customer_note);
  }, [orderQuery, queryClient, urlOrderId, isFrontendIdOrder]);

  /**
   * Set customer billing info (name, phone, optional address) on the current order.
   */
  const handleSetCustomer = useCallback(async (customer: CustomerData) => {
    if (!orderQuery.data) throw new Error('No active order');

    // Parse name into first and last
    const nameParts = customer.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const billing = {
      ...orderQuery.data.billing,
      first_name: firstName,
      last_name: lastName,
      phone: customer.phone,
      ...(customer.address && { address_1: customer.address })
    };

    // For frontend ID orders - handle locally via Dexie
    if (isFrontendIdOrder && urlOrderId) {
      const updatedLocalOrder = await updateLocalOrder(urlOrderId, { billing });
      queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], updatedLocalOrder);
      return;
    }

    // Legacy flow for server orders
    const orderId = orderQuery.data.id;
    const orderQueryKey = ['orders', orderId, 'detail'];
    const customerInfoKey = ['orders', orderId, 'customerInfo'];

    const currentOrder = queryClient.getQueryData<OrderSchema>(orderQueryKey) || orderQuery.data;

    // Optimistic update
    queryClient.setQueryData(orderQueryKey, { ...currentOrder, billing });
    queryClient.setQueryData(customerInfoKey, billing);

    // API call
    const updatedOrder = await OrdersAPI.updateOrder(orderId.toString(), { billing });
    queryClient.setQueryData(orderQueryKey, updatedOrder);
    queryClient.setQueryData(customerInfoKey, updatedOrder.billing);
  }, [orderQuery, queryClient, urlOrderId, isFrontendIdOrder]);

  return { handleSetNote, handleSetCustomer };
}
