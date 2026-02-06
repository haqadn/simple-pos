import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentOrder } from '@/stores/orders';
import { useProductsQuery } from '@/stores/products';
import { useSettingsStore } from '@/stores/settings';
import { usePrintStore } from '@/stores/print';
import { useOrderRouteInfo } from './useOrderRouteInfo';
import { buildPrintData, buildPrintMetaUpdates } from '@/lib/print-data';
import { createShouldSkipForKot } from '@/lib/kot';
import { updateLocalOrder } from '@/stores/offline-orders';
import { DRAFT_ORDER_ID } from '@/stores/draft-order';
import OrdersAPI from '@/api/orders';
import type { LocalOrder } from '@/db';

/**
 * Hook encapsulating print and cash drawer logic.
 *
 * Handles:
 * - Building print data for bill and KOT print types
 * - Queueing print jobs via the print store
 * - Persisting print meta_data (e.g. last_kot_items) to Dexie or server
 * - Opening the cash drawer
 */
export function usePrintHandler() {
  const orderQuery = useCurrentOrder();
  const queryClient = useQueryClient();
  const { urlOrderId, isFrontendIdOrder } = useOrderRouteInfo();
  const { data: products = [] } = useProductsQuery();
  const skipKotCategories = useSettingsStore(state => state.skipKotCategories);
  const printStore = usePrintStore();

  // Helper to check if a line item should be skipped on KOT based on category
  const shouldSkipForKot = useMemo(
    () => createShouldSkipForKot(products, skipKotCategories),
    [products, skipKotCategories]
  );

  /**
   * Print a bill or KOT for the current order.
   */
  const handlePrint = useCallback(async (type: 'bill' | 'kot') => {
    if (!orderQuery.data) throw new Error('No active order');

    // For frontend ID orders, get fresh data from local cache
    // For server orders, use the orderQuery.data directly (already fresh from cache)
    let order = orderQuery.data;
    if (isFrontendIdOrder && urlOrderId) {
      const cachedLocalOrder = queryClient.getQueryData<LocalOrder>(['localOrder', urlOrderId]);
      if (cachedLocalOrder) {
        order = cachedLocalOrder.data;
      }
    }

    const orderId = order.id;

    // Build print data using shared utility
    const printData = buildPrintData({
      order,
      type,
      urlOrderId,
      shouldSkipForKot,
    });

    // Queue the print job
    await printStore.push(type, printData);

    // Build meta_data updates (only updates last_kot_items when there are actual changes)
    const metaUpdates = buildPrintMetaUpdates({ order, type, printData });

    // For frontend ID orders - save print meta_data to Dexie
    if (isFrontendIdOrder && urlOrderId) {
      const updatedLocalOrder = await updateLocalOrder(urlOrderId, { meta_data: metaUpdates });
      queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], updatedLocalOrder);
      return;
    }

    // For server orders - save to server
    if (orderId !== DRAFT_ORDER_ID && orderId !== 0) {
      await OrdersAPI.updateOrder(orderId.toString(), {
        meta_data: metaUpdates
      });
    }
  }, [orderQuery, printStore, shouldSkipForKot, urlOrderId, isFrontendIdOrder, queryClient]);

  /**
   * Open the cash drawer.
   */
  const handleOpenDrawer = useCallback(async () => {
    await printStore.push('drawer', null);
  }, [printStore]);

  return { handlePrint, handleOpenDrawer, shouldSkipForKot };
}
