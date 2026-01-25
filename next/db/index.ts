import Dexie, { type EntityTable } from "dexie";
import type { OrderSchema } from "../api/orders";

/**
 * Sync status for local orders
 * - local: Created locally, not yet synced
 * - syncing: Currently being synced to server
 * - synced: Successfully synced to server
 * - error: Sync failed, will retry
 */
export type SyncStatus = "local" | "syncing" | "synced" | "error";

/**
 * Order status matching WooCommerce order statuses
 */
export type OrderStatus =
  | "draft"
  | "pending"
  | "processing"
  | "completed"
  | "cancelled"
  | "refunded"
  | "failed"
  | "on-hold";

/**
 * Local order stored in IndexedDB via Dexie
 * This is the primary data structure for offline-first order management
 */
export interface LocalOrder {
  /** 6-character alphanumeric ID (e.g., "A3X9K2") - primary key */
  frontendId: string;
  /** WooCommerce order ID - null until synced to server */
  serverId?: number;
  /** Order status */
  status: OrderStatus;
  /** Sync status for offline tracking */
  syncStatus: SyncStatus;
  /** Full order data matching WooCommerce schema */
  data: OrderSchema;
  /** When the order was created locally */
  createdAt: Date;
  /** When the order was last modified */
  updatedAt: Date;
  /** When sync was last attempted */
  lastSyncAttempt?: Date;
  /** Error message if sync failed */
  syncError?: string;
}

/**
 * Sync queue entry for failed sync attempts
 * Used for retry logic with exponential backoff
 */
export interface SyncQueueEntry {
  /** Auto-incremented ID */
  id?: number;
  /** Reference to the order's frontend ID */
  frontendId: string;
  /** When this entry was added to the queue */
  createdAt: Date;
  /** Number of retry attempts */
  retryCount: number;
  /** When to attempt next sync */
  nextRetryAt: Date;
  /** Last error message */
  lastError?: string;
}

/**
 * Simple POS Database using Dexie.js
 * Provides offline-first storage for orders and sync management
 */
class SimplePOSDatabase extends Dexie {
  orders!: EntityTable<LocalOrder, "frontendId">;
  syncQueue!: EntityTable<SyncQueueEntry, "id">;

  constructor() {
    super("SimplePOSDB");

    // Schema version 1
    this.version(1).stores({
      // Orders table: indexed by frontendId (primary), serverId, status, syncStatus, updatedAt
      orders: "frontendId, serverId, status, syncStatus, updatedAt",
      // Sync queue: auto-increment id, indexed by frontendId and nextRetryAt for efficient queries
      syncQueue: "++id, frontendId, nextRetryAt",
    });

    // Schema version 2: Change index from updatedAt to createdAt for stable order sorting
    this.version(2).stores({
      // Orders table: indexed by frontendId (primary), serverId, status, syncStatus, createdAt
      orders: "frontendId, serverId, status, syncStatus, createdAt",
      // Sync queue: unchanged
      syncQueue: "++id, frontendId, nextRetryAt",
    });
  }
}

/**
 * Singleton database instance
 * Use this throughout the application
 */
export const db = new SimplePOSDatabase();

/**
 * Helper to create a new LocalOrder with defaults
 */
export function createLocalOrder(
  frontendId: string,
  data: Partial<OrderSchema>
): LocalOrder {
  const now = new Date();
  return {
    frontendId,
    serverId: undefined,
    status: "draft",
    syncStatus: "local",
    data: {
      id: 0,
      status: "pending",
      customer_id: 0,
      line_items: [],
      shipping_lines: [],
      coupon_lines: [],
      customer_note: "",
      billing: {
        first_name: "",
        last_name: "",
        phone: "",
        address_1: "",
        address_2: "",
        city: "",
        state: "",
        postcode: "",
        country: "",
      },
      total: "0.00",
      discount_total: "0.00",
      meta_data: [{ key: "pos_frontend_id", value: frontendId }],
      ...data,
    } as OrderSchema,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Helper to calculate next retry time with exponential backoff
 * Intervals: 30s, 1m, 2m, 5m, 10m (max)
 */
export function calculateNextRetryTime(retryCount: number): Date {
  const backoffIntervals = [
    30 * 1000, // 30 seconds
    60 * 1000, // 1 minute
    2 * 60 * 1000, // 2 minutes
    5 * 60 * 1000, // 5 minutes
    10 * 60 * 1000, // 10 minutes (max)
  ];

  const intervalIndex = Math.min(retryCount, backoffIntervals.length - 1);
  const interval = backoffIntervals[intervalIndex];

  return new Date(Date.now() + interval);
}

export default db;
