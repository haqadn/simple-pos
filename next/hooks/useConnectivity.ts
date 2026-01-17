/**
 * Connectivity Detection Hook
 *
 * Monitors network connectivity using both navigator.onLine and
 * periodic heartbeat checks to verify actual API connectivity.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { API } from "@/api/api";
import { hasPendingSyncOrders, getOrderCountsBySyncStatus } from "@/stores/offline-orders";
import { triggerImmediateSync, type SyncResult } from "@/services/sync";

export type ConnectivityStatus = "online" | "offline" | "checking";

export interface SyncCounts {
  local: number;
  syncing: number;
  synced: number;
  error: number;
}

export interface UseConnectivityReturn {
  /** Current connectivity status */
  status: ConnectivityStatus;
  /** Whether the app is online (status === 'online') */
  isOnline: boolean;
  /** Whether the app is offline (status === 'offline') */
  isOffline: boolean;
  /** Whether connectivity is being checked */
  isChecking: boolean;
  /** Number of orders pending sync */
  pendingSyncCount: number;
  /** Detailed sync status counts */
  syncCounts: SyncCounts;
  /** Whether there are orders that failed to sync */
  hasErrors: boolean;
  /** Trigger an immediate sync attempt */
  triggerSync: () => Promise<SyncResult[]>;
  /** Force a connectivity check */
  checkConnectivity: () => Promise<boolean>;
  /** Last successful heartbeat timestamp */
  lastHeartbeat: Date | null;
}

/** Default heartbeat interval in milliseconds (30 seconds) */
const HEARTBEAT_INTERVAL = 30 * 1000;

/** Heartbeat timeout in milliseconds (5 seconds) */
const HEARTBEAT_TIMEOUT = 5 * 1000;

/**
 * Hook for monitoring network connectivity and sync status
 *
 * @param heartbeatInterval - Interval for heartbeat checks (default: 30s)
 * @returns Connectivity state and sync information
 */
export function useConnectivity(
  heartbeatInterval: number = HEARTBEAT_INTERVAL
): UseConnectivityReturn {
  const [status, setStatus] = useState<ConnectivityStatus>(() => {
    // Initialize based on navigator.onLine if available
    if (typeof navigator !== "undefined") {
      return navigator.onLine ? "checking" : "offline";
    }
    return "checking";
  });

  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const [syncCounts, setSyncCounts] = useState<SyncCounts>({
    local: 0,
    syncing: 0,
    synced: 0,
    error: 0,
  });

  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Perform a heartbeat check to verify actual API connectivity
   */
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    // First check navigator.onLine
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (isMountedRef.current) {
        setStatus("offline");
      }
      return false;
    }

    if (isMountedRef.current) {
      setStatus("checking");
    }

    try {
      // Use a lightweight API endpoint to check connectivity
      // The system_status endpoint is typically available and lightweight
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), HEARTBEAT_TIMEOUT);

      // Try to get the system status or any lightweight endpoint
      // Using a simple GET request to check if API is reachable
      await Promise.race([
        API.client.get("/system_status", {
          params: { per_page: 1 },
        }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Heartbeat timeout")), HEARTBEAT_TIMEOUT);
        }),
      ]);

      clearTimeout(timeoutId);

      if (isMountedRef.current) {
        setStatus("online");
        setLastHeartbeat(new Date());
      }
      return true;
    } catch {
      // If system_status fails, try a simpler approach - just check if we can reach the API
      try {
        await Promise.race([
          API.client.get("/products", {
            params: { per_page: 1 },
          }),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Heartbeat timeout")), HEARTBEAT_TIMEOUT);
          }),
        ]);

        if (isMountedRef.current) {
          setStatus("online");
          setLastHeartbeat(new Date());
        }
        return true;
      } catch {
        if (isMountedRef.current) {
          setStatus("offline");
        }
        return false;
      }
    }
  }, []);

  /**
   * Update sync counts from Dexie
   */
  const updateSyncCounts = useCallback(async () => {
    try {
      const counts = await getOrderCountsBySyncStatus();
      if (isMountedRef.current) {
        setSyncCounts(counts);
      }
    } catch (error) {
      console.error("Failed to get sync counts:", error);
    }
  }, []);

  /**
   * Trigger an immediate sync
   */
  const triggerSync = useCallback(async (): Promise<SyncResult[]> => {
    const results = await triggerImmediateSync();
    await updateSyncCounts();
    return results;
  }, [updateSyncCounts]);

  // Set up navigator online/offline listeners
  useEffect(() => {
    isMountedRef.current = true;

    const handleOnline = () => {
      // When browser reports online, verify with heartbeat
      checkConnectivity();
    };

    const handleOffline = () => {
      setStatus("offline");
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      isMountedRef.current = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, [checkConnectivity]);

  // Set up periodic heartbeat checks
  useEffect(() => {
    // Initial check
    checkConnectivity();
    updateSyncCounts();

    // Set up interval for heartbeat
    heartbeatIntervalRef.current = setInterval(() => {
      checkConnectivity();
      updateSyncCounts();
    }, heartbeatInterval);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [checkConnectivity, updateSyncCounts, heartbeatInterval]);

  // Compute derived values
  const pendingSyncCount = syncCounts.local + syncCounts.error;
  const hasErrors = syncCounts.error > 0;

  return {
    status,
    isOnline: status === "online",
    isOffline: status === "offline",
    isChecking: status === "checking",
    pendingSyncCount,
    syncCounts,
    hasErrors,
    triggerSync,
    checkConnectivity,
    lastHeartbeat,
  };
}

export default useConnectivity;
