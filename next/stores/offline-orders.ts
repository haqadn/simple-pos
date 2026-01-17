/**
 * Offline Order Store with Dexie Integration
 *
 * Provides functions for managing orders in local IndexedDB storage
 * for offline-first operation. All orders are stored locally first
 * and synced to the server when connectivity is available.
 */

import {
  db,
  type LocalOrder,
  type SyncStatus,
  type OrderStatus,
  createLocalOrder as createLocalOrderRecord,
} from "../db";
import type { OrderSchema, LineItemSchema, ShippingLineSchema, CouponLineSchema, BillingSchema, MetaDataSchema } from "../api/orders";
import { generateUniqueFrontendId } from "../lib/frontend-id";

/**
 * Error thrown when an order is not found in the local database
 */
export class OrderNotFoundError extends Error {
  constructor(frontendId: string) {
    super(`Order with frontend ID "${frontendId}" not found in local database`);
    this.name = "OrderNotFoundError";
  }
}

/**
 * Create a new local order in the Dexie database
 *
 * @param initialData - Optional initial order data
 * @returns The created LocalOrder with generated frontend ID
 */
export async function createLocalOrder(
  initialData?: Partial<OrderSchema>
): Promise<LocalOrder> {
  // Generate a unique frontend ID
  const frontendId = await generateUniqueFrontendId();

  // Create the local order record with defaults
  const localOrder = createLocalOrderRecord(frontendId, initialData ?? {});

  // Store in Dexie
  await db.orders.add(localOrder);

  return localOrder;
}

/**
 * Update an existing local order in the Dexie database
 *
 * @param frontendId - The frontend ID of the order to update
 * @param updates - Partial updates to apply to the order data
 * @returns The updated LocalOrder
 * @throws OrderNotFoundError if order does not exist
 */
export async function updateLocalOrder(
  frontendId: string,
  updates: Partial<OrderSchema>
): Promise<LocalOrder> {
  const existing = await db.orders.get(frontendId);

  if (!existing) {
    throw new OrderNotFoundError(frontendId);
  }

  // Merge the updates into the existing order data
  const updatedData: OrderSchema = {
    ...existing.data,
    ...updates,
    // Preserve the frontend ID in meta_data
    meta_data: mergeMetaData(existing.data.meta_data, updates.meta_data, frontendId),
  };

  // Handle line_items array updates specifically
  if (updates.line_items !== undefined) {
    updatedData.line_items = updates.line_items;
  }

  // Handle shipping_lines array updates specifically
  if (updates.shipping_lines !== undefined) {
    updatedData.shipping_lines = updates.shipping_lines;
  }

  // Handle coupon_lines array updates specifically
  if (updates.coupon_lines !== undefined) {
    updatedData.coupon_lines = updates.coupon_lines;
  }

  // Handle billing object updates specifically (merge instead of replace)
  if (updates.billing !== undefined) {
    updatedData.billing = {
      ...existing.data.billing,
      ...updates.billing,
    };
  }

  const updatedOrder: LocalOrder = {
    ...existing,
    data: updatedData,
    updatedAt: new Date(),
  };

  // Update in Dexie
  await db.orders.put(updatedOrder);

  return updatedOrder;
}

/**
 * Update the sync status of a local order
 *
 * @param frontendId - The frontend ID of the order
 * @param syncStatus - The new sync status
 * @param options - Optional additional updates (serverId, syncError)
 * @returns The updated LocalOrder
 * @throws OrderNotFoundError if order does not exist
 */
export async function updateLocalOrderSyncStatus(
  frontendId: string,
  syncStatus: SyncStatus,
  options?: {
    serverId?: number;
    syncError?: string;
    lastSyncAttempt?: Date;
  }
): Promise<LocalOrder> {
  const existing = await db.orders.get(frontendId);

  if (!existing) {
    throw new OrderNotFoundError(frontendId);
  }

  const updatedOrder: LocalOrder = {
    ...existing,
    syncStatus,
    updatedAt: new Date(),
    ...(options?.serverId !== undefined && { serverId: options.serverId }),
    ...(options?.syncError !== undefined && { syncError: options.syncError }),
    ...(options?.lastSyncAttempt !== undefined && { lastSyncAttempt: options.lastSyncAttempt }),
  };

  // If synced successfully, update the server ID in the order data meta_data
  if (syncStatus === "synced" && options?.serverId !== undefined) {
    const existingServerIdMeta = updatedOrder.data.meta_data?.find(
      (m) => m.key === "pos_server_id"
    );
    if (!existingServerIdMeta) {
      updatedOrder.data.meta_data = [
        ...(updatedOrder.data.meta_data ?? []),
        { key: "pos_server_id", value: options.serverId },
      ];
    }
    // Also update the order ID in data
    updatedOrder.data.id = options.serverId;
  }

  // Clear sync error if status is not error
  if (syncStatus !== "error") {
    updatedOrder.syncError = undefined;
  }

  await db.orders.put(updatedOrder);

  return updatedOrder;
}

/**
 * Update the order status (draft, pending, completed, etc.)
 *
 * @param frontendId - The frontend ID of the order
 * @param status - The new order status
 * @returns The updated LocalOrder
 * @throws OrderNotFoundError if order does not exist
 */
export async function updateLocalOrderStatus(
  frontendId: string,
  status: OrderStatus
): Promise<LocalOrder> {
  const existing = await db.orders.get(frontendId);

  if (!existing) {
    throw new OrderNotFoundError(frontendId);
  }

  const updatedOrder: LocalOrder = {
    ...existing,
    status,
    data: {
      ...existing.data,
      status,
    },
    updatedAt: new Date(),
  };

  await db.orders.put(updatedOrder);

  return updatedOrder;
}

/**
 * Get a local order by frontend ID
 *
 * @param frontendId - The frontend ID of the order
 * @returns The LocalOrder or undefined if not found
 */
export async function getLocalOrder(
  frontendId: string
): Promise<LocalOrder | undefined> {
  return await db.orders.get(frontendId);
}

/**
 * Get a local order by server ID
 *
 * @param serverId - The WooCommerce server ID
 * @returns The LocalOrder or undefined if not found
 */
export async function getLocalOrderByServerId(
  serverId: number
): Promise<LocalOrder | undefined> {
  return await db.orders.where("serverId").equals(serverId).first();
}

/**
 * List all local orders, optionally filtered by status or sync status
 *
 * @param options - Filter options
 * @returns Array of LocalOrders sorted by updatedAt descending (newest first)
 */
export async function listLocalOrders(options?: {
  status?: OrderStatus | OrderStatus[];
  syncStatus?: SyncStatus | SyncStatus[];
  limit?: number;
}): Promise<LocalOrder[]> {
  let collection = db.orders.orderBy("updatedAt");

  // Apply filters if provided
  let orders = await collection.reverse().toArray();

  if (options?.status) {
    const statuses = Array.isArray(options.status) ? options.status : [options.status];
    orders = orders.filter((order) => statuses.includes(order.status));
  }

  if (options?.syncStatus) {
    const syncStatuses = Array.isArray(options.syncStatus)
      ? options.syncStatus
      : [options.syncStatus];
    orders = orders.filter((order) => syncStatuses.includes(order.syncStatus));
  }

  if (options?.limit) {
    orders = orders.slice(0, options.limit);
  }

  return orders;
}

/**
 * List orders that need to be synced (local or error status)
 *
 * @returns Array of LocalOrders that need syncing
 */
export async function listOrdersNeedingSync(): Promise<LocalOrder[]> {
  return await listLocalOrders({
    syncStatus: ["local", "error"],
  });
}

/**
 * Delete a local order
 *
 * @param frontendId - The frontend ID of the order to delete
 * @returns true if deleted, false if not found
 */
export async function deleteLocalOrder(frontendId: string): Promise<boolean> {
  const existing = await db.orders.get(frontendId);
  if (!existing) {
    return false;
  }

  await db.orders.delete(frontendId);
  return true;
}

/**
 * Clear all local orders (use with caution!)
 *
 * @returns Number of orders deleted
 */
export async function clearAllLocalOrders(): Promise<number> {
  const count = await db.orders.count();
  await db.orders.clear();
  return count;
}

/**
 * Import a server order into the local database
 *
 * @param serverOrder - The order data from WooCommerce
 * @param frontendId - Optional frontend ID (generates new if not provided)
 * @returns The created LocalOrder
 */
export async function importServerOrder(
  serverOrder: OrderSchema,
  frontendId?: string
): Promise<LocalOrder> {
  // Check if order already exists by server ID
  const existing = await getLocalOrderByServerId(serverOrder.id);
  if (existing) {
    return existing;
  }

  // Generate frontend ID if not provided
  const id = frontendId ?? (await generateUniqueFrontendId());

  const now = new Date();
  const localOrder: LocalOrder = {
    frontendId: id,
    serverId: serverOrder.id,
    status: serverOrder.status as OrderStatus,
    syncStatus: "synced",
    data: {
      ...serverOrder,
      meta_data: [
        ...(serverOrder.meta_data ?? []),
        { key: "pos_frontend_id", value: id },
      ],
    },
    createdAt: serverOrder.date_created ? new Date(serverOrder.date_created) : now,
    updatedAt: now,
  };

  await db.orders.add(localOrder);

  return localOrder;
}

/**
 * Get count of orders by sync status
 *
 * @returns Object with counts for each sync status
 */
export async function getOrderCountsBySyncStatus(): Promise<Record<SyncStatus, number>> {
  const orders = await db.orders.toArray();

  return orders.reduce(
    (acc, order) => {
      acc[order.syncStatus]++;
      return acc;
    },
    { local: 0, syncing: 0, synced: 0, error: 0 } as Record<SyncStatus, number>
  );
}

/**
 * Check if there are any orders pending sync
 *
 * @returns true if there are orders with local or error sync status
 */
export async function hasPendingSyncOrders(): Promise<boolean> {
  const localCount = await db.orders.where("syncStatus").equals("local").count();
  if (localCount > 0) return true;

  const errorCount = await db.orders.where("syncStatus").equals("error").count();
  return errorCount > 0;
}

// Helper function to merge meta_data arrays
function mergeMetaData(
  existing: MetaDataSchema[] | undefined,
  updates: MetaDataSchema[] | undefined,
  frontendId: string
): MetaDataSchema[] {
  const merged: MetaDataSchema[] = [...(existing ?? [])];

  // Ensure pos_frontend_id is always present
  const hasFrontendId = merged.some((m) => m.key === "pos_frontend_id");
  if (!hasFrontendId) {
    merged.push({ key: "pos_frontend_id", value: frontendId });
  }

  // Merge updates
  if (updates) {
    for (const update of updates) {
      const existingIdx = merged.findIndex((m) => m.key === update.key);
      if (existingIdx >= 0) {
        merged[existingIdx] = update;
      } else {
        merged.push(update);
      }
    }
  }

  return merged;
}
