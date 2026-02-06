import { BaseCommand } from './command';

/**
 * Base class for commands that need debounced async search with cached results.
 *
 * Provides:
 * - `searchCache` array of type T (results from the last successful search)
 * - `lastSearchQuery` to avoid redundant requests
 * - `triggerSearch(query, delay?)` with configurable debounce (default 150ms)
 * - `setSuggestionsCallback(callback)` so the UI can refresh when async results arrive
 * - `dispose()` cleanup for timers and state
 *
 * Subclasses must implement `performSearch(query)` which returns the actual API results.
 */
export abstract class AsyncSearchCommand<T> extends BaseCommand {
  protected searchCache: T[] = [];
  protected lastSearchQuery = '';
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  private onSuggestionsUpdate?: () => void;

  /**
   * Perform the actual async search. Subclasses implement this to call their
   * respective API (e.g., OrdersAPI.searchOrders, CustomersAPI.search).
   */
  protected abstract performSearch(query: string): Promise<T[]>;

  /** Set callback to notify the UI when async suggestions are ready */
  setSuggestionsCallback(callback: () => void): void {
    this.onSuggestionsUpdate = callback;
  }

  /** Cleanup pending timeouts, cached results, and callback */
  dispose(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
    this.searchCache = [];
    this.onSuggestionsUpdate = undefined;
  }

  /**
   * Trigger a debounced search. Cancels any pending search and schedules a new
   * one after `delay` milliseconds (default 150).
   */
  protected triggerSearch(query: string, delay = 150): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(async () => {
      try {
        const results = await this.performSearch(query);
        this.searchCache = results;
        this.onSuggestionsUpdate?.();
      } catch {
        this.searchCache = [];
      }
    }, delay);
  }
}
