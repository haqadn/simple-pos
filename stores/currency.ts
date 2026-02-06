// Currency settings store - fetches and caches WooCommerce currency settings

import { useQuery } from '@tanstack/react-query';
import StoreAPI, { CurrencySettings, DEFAULT_CURRENCY_SETTINGS } from '@/api/store';

/**
 * Query hook for fetching currency settings from WooCommerce
 * Caches result for 24 hours (currency settings rarely change)
 */
export function useCurrencySettings() {
  return useQuery<CurrencySettings>({
    queryKey: ['currencySettings'],
    queryFn: StoreAPI.getCurrencySettings,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: Infinity, // Never garbage collect
    retry: 2,
    // Return default settings on error
    placeholderData: DEFAULT_CURRENCY_SETTINGS,
  });
}

/**
 * Get currency symbol from settings
 * Returns the symbol or currency code as fallback
 */
export function getCurrencySymbol(settings: CurrencySettings | undefined): string {
  return settings?.currency_symbol || DEFAULT_CURRENCY_SETTINGS.currency_symbol;
}

