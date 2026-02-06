'use client'

import { useEffect } from 'react';
import { startBackgroundSync, stopBackgroundSync } from '@/services/sync';

/**
 * SyncManager - Manages background sync for offline orders
 *
 * Starts the background sync service when the app loads and stops it on unmount.
 * Background sync runs every 30s to sync orders with "error" or "local" status.
 */
export function SyncManager() {
  useEffect(() => {
    // Start background sync when component mounts
    console.log('[SyncManager] Starting background sync...');
    startBackgroundSync((results) => {
      if (results.length > 0) {
        console.log(`[SyncManager] Synced ${results.length} orders:`, results);
      }
    });

    // Stop background sync when component unmounts
    return () => {
      console.log('[SyncManager] Stopping background sync...');
      stopBackgroundSync();
    };
  }, []);

  // This component doesn't render anything
  return null;
}
