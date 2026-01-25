/**
 * Sync Service for Order Synchronization
 *
 * Handles syncing local orders to the WooCommerce server with:
 * - Individual order sync
 * - Sync queue with retry logic
 * - Exponential backoff (30s, 1m, 2m, 5m, 10m max)
 * - Background sync interval (every 30s when online)
 */

import { db, calculateNextRetryTime, type SyncQueueEntry } from "../db";
import {
  getLocalOrder,
  updateLocalOrderSyncStatus,
  listOrdersNeedingSync,
} from "../stores/offline-orders";
import OrdersAPI from "../api/orders";
import type { LocalOrder } from "../db";
import type { OrderSchema } from "../api/orders";

/**
 * Result of a sync operation
 */
export interface SyncResult {
  success: boolean;
  frontendId: string;
  serverId?: number;
  error?: string;
}

/**
 * Options for sync operations
 */
export interface SyncOptions {
  /** Force sync even if order is already synced */
  force?: boolean;
}

/**
 * Sync a single order to the WooCommerce server
 *
 * Only syncs orders that are 'completed' or 'processing' status.
 * Draft and pending orders are kept local-only until completion.
 *
 * @param frontendId - The frontend ID of the order to sync
 * @param options - Sync options
 * @returns SyncResult indicating success or failure
 */
export async function syncOrder(
  frontendId: string,
  options?: SyncOptions
): Promise<SyncResult> {
  const order = await getLocalOrder(frontendId);

  if (!order) {
    return {
      success: false,
      frontendId,
      error: `Order with frontend ID "${frontendId}" not found`,
    };
  }

  // Check if order needs syncing
  if (!options?.force && order.syncStatus === "synced") {
    return {
      success: true,
      frontendId,
      serverId: order.serverId,
    };
  }

  // Mark order as syncing
  await updateLocalOrderSyncStatus(frontendId, "syncing", {
    lastSyncAttempt: new Date(),
  });

  try {
    // Prepare the order data for WooCommerce
    const orderData = prepareOrderForSync(order);

    let serverOrder: OrderSchema | null;

    if (order.serverId) {
      // Update existing order
      serverOrder = await OrdersAPI.updateOrder(
        order.serverId.toString(),
        orderData
      );
    } else {
      // Create new order
      serverOrder = await OrdersAPI.saveOrder(orderData);
    }

    if (!serverOrder) {
      throw new Error("Server returned null response");
    }

    // Mark order as synced
    await updateLocalOrderSyncStatus(frontendId, "synced", {
      serverId: serverOrder.id,
    });

    // Remove from sync queue if present
    await removeFromSyncQueue(frontendId);

    return {
      success: true,
      frontendId,
      serverId: serverOrder.id,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error during sync";

    // Mark order as error
    await updateLocalOrderSyncStatus(frontendId, "error", {
      syncError: errorMessage,
      lastSyncAttempt: new Date(),
    });

    // Add to sync queue for retry
    await addToSyncQueue(frontendId, errorMessage);

    return {
      success: false,
      frontendId,
      error: errorMessage,
    };
  }
}

/**
 * Prepare order data for sending to WooCommerce
 * Removes local-only fields and formats data appropriately
 *
 * For orders with serverId (updates), we only send status and meta_data
 * since line_items, shipping_lines, and coupons are synced directly when changed.
 *
 * For new orders (no serverId), we send the full order data.
 */
function prepareOrderForSync(order: LocalOrder): Partial<OrderSchema> {
  const { data } = order;

  // For orders that already exist on the server, only send status and meta_data
  // Line items, shipping, and coupons are synced directly when changed
  if (order.serverId) {
    return {
      status: data.status,
      meta_data: data.meta_data,
      customer_note: data.customer_note,
      billing: data.billing,
    };
  }

  // For new orders, send the full order data
  const orderData: Partial<OrderSchema> = {
    status: data.status,
    customer_id: data.customer_id,
    line_items: data.line_items.map((item) => ({
      id: item.id,
      name: item.name,
      product_id: item.product_id,
      variation_id: item.variation_id,
      quantity: item.quantity,
    })),
    shipping_lines: data.shipping_lines,
    coupon_lines: data.coupon_lines.map((coupon) => ({
      id: coupon.id,
      code: coupon.code,
      discount: coupon.discount,
      discount_tax: coupon.discount_tax,
    })),
    customer_note: data.customer_note,
    billing: data.billing,
    meta_data: data.meta_data,
  };

  return orderData;
}

/**
 * Add an order to the sync queue for retry
 */
async function addToSyncQueue(
  frontendId: string,
  errorMessage: string
): Promise<void> {
  // Check if already in queue
  const existing = await db.syncQueue
    .where("frontendId")
    .equals(frontendId)
    .first();

  if (existing) {
    // Update existing entry with incremented retry count
    const retryCount = existing.retryCount + 1;
    await db.syncQueue.update(existing.id!, {
      retryCount,
      nextRetryAt: calculateNextRetryTime(retryCount),
      lastError: errorMessage,
    });
  } else {
    // Create new queue entry
    const entry: SyncQueueEntry = {
      frontendId,
      createdAt: new Date(),
      retryCount: 0,
      nextRetryAt: calculateNextRetryTime(0),
      lastError: errorMessage,
    };
    await db.syncQueue.add(entry);
  }
}

/**
 * Remove an order from the sync queue
 */
async function removeFromSyncQueue(frontendId: string): Promise<void> {
  await db.syncQueue.where("frontendId").equals(frontendId).delete();
}

/**
 * Get orders from the sync queue that are ready for retry
 */
async function getQueuedOrdersReadyForRetry(): Promise<SyncQueueEntry[]> {
  const now = new Date();
  return await db.syncQueue.where("nextRetryAt").belowOrEqual(now).toArray();
}

/**
 * Process the sync queue - attempt to sync all orders ready for retry
 *
 * @returns Array of sync results
 */
export async function processSyncQueue(): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  // Get orders ready for retry from the queue
  const queuedOrders = await getQueuedOrdersReadyForRetry();

  for (const queueEntry of queuedOrders) {
    const result = await syncOrder(queueEntry.frontendId);
    results.push(result);
  }

  // Also sync any orders with 'local' status that aren't in the queue
  const localOrders = await listOrdersNeedingSync();
  const queuedIds = new Set(queuedOrders.map((q) => q.frontendId));

  for (const order of localOrders) {
    if (!queuedIds.has(order.frontendId) && order.syncStatus === "local") {
      const result = await syncOrder(order.frontendId);
      results.push(result);
    }
  }

  return results;
}

/**
 * Sync all orders that need syncing (local or error status)
 *
 * @returns Array of sync results
 */
export async function syncAllPendingOrders(): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  const ordersNeedingSync = await listOrdersNeedingSync();

  for (const order of ordersNeedingSync) {
    const result = await syncOrder(order.frontendId);
    results.push(result);
  }

  return results;
}

/**
 * Get the count of orders in the sync queue
 */
export async function getSyncQueueCount(): Promise<number> {
  return await db.syncQueue.count();
}

/**
 * Get sync queue entries
 */
export async function getSyncQueueEntries(): Promise<SyncQueueEntry[]> {
  return await db.syncQueue.orderBy("nextRetryAt").toArray();
}

/**
 * Clear the entire sync queue
 */
export async function clearSyncQueue(): Promise<void> {
  await db.syncQueue.clear();
}

// Background sync interval management
let backgroundSyncInterval: ReturnType<typeof setInterval> | null = null;
let backgroundSyncCallbacks: Array<(results: SyncResult[]) => void> = [];

/**
 * Start background sync interval
 * Runs every 30 seconds when online
 *
 * @param onSyncComplete - Optional callback when sync completes
 */
export function startBackgroundSync(
  onSyncComplete?: (results: SyncResult[]) => void
): void {
  if (backgroundSyncInterval) {
    // Already running, just add callback if provided
    if (onSyncComplete) {
      backgroundSyncCallbacks.push(onSyncComplete);
    }
    return;
  }

  if (onSyncComplete) {
    backgroundSyncCallbacks.push(onSyncComplete);
  }

  const SYNC_INTERVAL = 30 * 1000; // 30 seconds

  backgroundSyncInterval = setInterval(async () => {
    // Only sync if online
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    try {
      const results = await processSyncQueue();

      // Notify callbacks
      for (const callback of backgroundSyncCallbacks) {
        try {
          callback(results);
        } catch (err) {
          console.error("Error in sync callback:", err);
        }
      }
    } catch (error) {
      console.error("Background sync error:", error);
    }
  }, SYNC_INTERVAL);
}

/**
 * Stop background sync interval
 */
export function stopBackgroundSync(): void {
  if (backgroundSyncInterval) {
    clearInterval(backgroundSyncInterval);
    backgroundSyncInterval = null;
  }
  backgroundSyncCallbacks = [];
}

/**
 * Check if background sync is running
 */
export function isBackgroundSyncRunning(): boolean {
  return backgroundSyncInterval !== null;
}

/**
 * Trigger an immediate sync (outside of the regular interval)
 *
 * @returns Array of sync results
 */
export async function triggerImmediateSync(): Promise<SyncResult[]> {
  return await processSyncQueue();
}

/**
 * Remove a callback from background sync
 */
export function removeBackgroundSyncCallback(
  callback: (results: SyncResult[]) => void
): void {
  const index = backgroundSyncCallbacks.indexOf(callback);
  if (index > -1) {
    backgroundSyncCallbacks.splice(index, 1);
  }
}
