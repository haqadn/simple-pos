import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCurrentOrder, useOrdersQuery } from '@/stores/orders';
import { useOrderRouteInfo } from './useOrderRouteInfo';
import { updateLocalOrderStatus, getLocalOrder } from '@/stores/offline-orders';
import { syncOrder } from '@/services/sync';
import OrdersAPI from '@/api/orders';

/**
 * Hook encapsulating order completion logic.
 *
 * Handles:
 * - Completing local-first (frontend ID) orders with non-blocking sync
 * - Completing legacy server orders via the API
 * - Navigating to the next pending order (or home) after completion
 */
export function useOrderCompletion() {
  const orderQuery = useCurrentOrder();
  const { ordersQuery } = useOrdersQuery();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { urlOrderId, isFrontendIdOrder } = useOrderRouteInfo();

  const handleCompleteOrder = useCallback(async () => {
    if (!orderQuery.data) throw new Error('No active order');

    const orderId = orderQuery.data.id;

    if (isFrontendIdOrder && urlOrderId) {
      // Local-first flow: Mark order complete locally first
      const localOrder = await getLocalOrder(urlOrderId);
      if (!localOrder) {
        throw new Error('Local order not found');
      }

      // Update local order status to completed
      await updateLocalOrderStatus(urlOrderId, 'completed');

      // Invalidate local order query to reflect new status
      await queryClient.invalidateQueries({ queryKey: ['localOrder', urlOrderId] });

      // Trigger sync attempt on completion (non-blocking)
      syncOrder(urlOrderId).then((result) => {
        if (result.success) {
          // Sync succeeded - invalidate queries to refresh with server data
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['localOrder', urlOrderId] });
          console.log(`Order ${urlOrderId} synced successfully with server ID ${result.serverId}`);
        } else {
          // Sync failed - order will be retried via background sync
          console.warn(`Order ${urlOrderId} sync failed: ${result.error}. Will retry automatically.`);
        }
      }).catch((error) => {
        console.error(`Unexpected error syncing order ${urlOrderId}:`, error);
      });
    } else {
      // Legacy flow for server-side orders: Update order status directly via API
      await OrdersAPI.updateOrder(orderId.toString(), { status: 'completed' });

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    }

    // Navigate to next pending order or home
    const orders = ordersQuery.data || [];
    const nextOrder = orders.find(o => {
      // Skip the current order (check both orderId and urlOrderId)
      if (o.id === orderId) return false;
      // Also check if the order's frontend ID matches
      const orderFrontendId = o.meta_data?.find(m => m.key === 'pos_frontend_id')?.value;
      if (orderFrontendId === urlOrderId) return false;
      return o.status === 'pending';
    });

    if (nextOrder) {
      // Prefer using frontend ID if available
      const nextFrontendId = nextOrder.meta_data?.find(m => m.key === 'pos_frontend_id')?.value;
      if (nextFrontendId && typeof nextFrontendId === 'string') {
        router.push(`/orders/${nextFrontendId}`);
      } else {
        router.push(`/orders/${nextOrder.id}`);
      }
    } else {
      router.push('/');
    }
  }, [orderQuery, queryClient, ordersQuery, router, urlOrderId, isFrontendIdOrder]);

  return { handleCompleteOrder };
}
