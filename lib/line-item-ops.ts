/**
 * Shared line item operations for local-first (frontend ID) orders.
 *
 * Single source of truth for updating line items: handles Dexie persistence,
 * subtotal/total recalculation, WooCommerce server sync, and sync status tracking.
 *
 * Callers are responsible for React Query cache updates (context-specific).
 */

import type { LineItemSchema } from '@/api/orders';
import type { LocalOrder } from '@/db';
import OrdersAPI from '@/api/orders';
import {
  getLocalOrder,
  updateLocalOrder,
  ensureServerOrder,
  updateLocalOrderSyncStatus,
} from '@/stores/offline-orders';

/**
 * Product info needed for line item operations.
 * Minimal subset — callers map from their own ProductSchema.
 */
export interface LineItemProduct {
  product_id: number;
  variation_id: number;
  name: string;
  variation_name?: string;
  price: string | number;
}

/**
 * Result of a line item update operation.
 */
export interface LineItemUpdateResult {
  /** The updated LocalOrder after Dexie write (and optional server sync) */
  localOrder: LocalOrder;
  /** The computed final quantity (after applying mode) */
  finalQuantity: number;
  /** Server response line items, if server sync happened. Callers can use these to merge IDs into cache. */
  serverLineItems?: LineItemSchema[];
}

function buildLineItemName(product: LineItemProduct): string {
  return product.name + (product.variation_name ? ` - ${product.variation_name}` : '');
}

/**
 * Update a line item quantity for a local-first (frontend ID) order.
 *
 * 1. Reads fresh data from Dexie (not cache) to avoid race conditions
 * 2. Calculates final quantity based on mode (set vs increment)
 * 3. Builds new line items array with per-item subtotal/total
 * 4. Saves to Dexie (which auto-recalculates order totals)
 * 5. Syncs to WooCommerce server (ensureServerOrder + delete/add pattern)
 * 6. Tracks sync status on success/failure
 */
export async function updateLineItem(
  frontendId: string,
  product: LineItemProduct,
  quantity: number,
  mode: 'set' | 'increment',
): Promise<LineItemUpdateResult> {
  // Step 1: Read fresh data from Dexie
  const localOrder = await getLocalOrder(frontendId);
  if (!localOrder) {
    throw new Error(`Order not found: ${frontendId}`);
  }

  // Step 2: Find existing item and calculate final quantity
  const existingLineItems = [...localOrder.data.line_items];
  const existingIdx = existingLineItems.findIndex(
    li => li.product_id === product.product_id && li.variation_id === product.variation_id
  );
  const currentQuantity = existingIdx >= 0 ? existingLineItems[existingIdx].quantity : 0;
  const finalQuantity = mode === 'set' ? quantity : currentQuantity + quantity;

  // Capture server-side line item ID before modifying the array (needed for WooCommerce delete+add)
  const existingServerItemId = existingIdx >= 0 ? existingLineItems[existingIdx].id : undefined;

  // Step 3: Build new line items array
  if (existingIdx >= 0) {
    if (finalQuantity > 0) {
      const unitPrice = parseFloat(String(existingLineItems[existingIdx].price || '0'));
      const subtotal = (unitPrice * finalQuantity).toFixed(2);
      existingLineItems[existingIdx] = {
        ...existingLineItems[existingIdx],
        quantity: finalQuantity,
        subtotal,
        total: subtotal,
      };
    } else {
      existingLineItems.splice(existingIdx, 1);
    }
  } else if (finalQuantity > 0) {
    const unitPrice = parseFloat(String(product.price || '0'));
    const subtotal = (unitPrice * finalQuantity).toFixed(2);
    existingLineItems.push({
      name: buildLineItemName(product),
      product_id: product.product_id,
      variation_id: product.variation_id,
      quantity: finalQuantity,
      price: product.price,
      subtotal,
      total: subtotal,
    });
  }

  // Step 4: Save to Dexie (updateLocalOrder auto-recalculates order subtotal/total)
  const updatedLocalOrder = await updateLocalOrder(frontendId, {
    line_items: existingLineItems,
  });

  // Step 5: Attempt server sync
  const hadServerId = !!localOrder.serverId;

  try {
    const serverId = await ensureServerOrder(frontendId);

    // If ensureServerOrder just created the server order, it already sent all line items.
    // Just refresh from Dexie to get the server-assigned IDs.
    if (!hadServerId) {
      const refreshedOrder = await getLocalOrder(frontendId);
      return {
        localOrder: refreshedOrder ?? updatedLocalOrder,
        finalQuantity,
        serverLineItems: refreshedOrder?.data.line_items,
      };
    }

    // For existing server orders, use the WooCommerce delete+add pattern
    const patchLineItems: LineItemSchema[] = [];

    if (existingServerItemId) {
      patchLineItems.push({
        id: existingServerItemId,
        name: product.name,
        product_id: product.product_id,
        variation_id: product.variation_id,
        quantity: 0,
      });
    }

    if (finalQuantity > 0) {
      patchLineItems.push({
        name: buildLineItemName(product),
        product_id: product.product_id,
        variation_id: product.variation_id,
        quantity: finalQuantity,
        price: product.price,
        id: undefined,
      });
    }

    const serverOrder = await OrdersAPI.updateOrder(serverId.toString(), {
      line_items: patchLineItems,
    });

    if (serverOrder) {
      const filteredLineItems = serverOrder.line_items.filter(li => li.quantity > 0);
      const finalLocalOrder = await updateLocalOrder(frontendId, {
        line_items: filteredLineItems,
      });
      await updateLocalOrderSyncStatus(frontendId, 'synced', { serverId });

      return {
        localOrder: finalLocalOrder,
        finalQuantity,
        serverLineItems: filteredLineItems,
      };
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during sync';
    console.error('Failed to sync line item update:', errorMessage);

    await updateLocalOrderSyncStatus(frontendId, 'error', {
      syncError: errorMessage,
      lastSyncAttempt: new Date(),
    }).catch(() => {}); // Don't throw if status update fails
  }

  // Step 6: Return local data (whether sync succeeded or failed)
  return { localOrder: updatedLocalOrder, finalQuantity };
}
