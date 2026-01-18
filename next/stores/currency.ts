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

/**
 * Format a price with currency symbol based on settings
 */
export function formatPrice(
  amount: number,
  settings: CurrencySettings | undefined
): string {
  const {
    currency_symbol = DEFAULT_CURRENCY_SETTINGS.currency_symbol,
    currency_position = DEFAULT_CURRENCY_SETTINGS.currency_position,
    thousand_separator = DEFAULT_CURRENCY_SETTINGS.thousand_separator,
    decimal_separator = DEFAULT_CURRENCY_SETTINGS.decimal_separator,
    price_num_decimals = DEFAULT_CURRENCY_SETTINGS.price_num_decimals,
  } = settings || DEFAULT_CURRENCY_SETTINGS;

  // Format the number
  const fixed = amount.toFixed(price_num_decimals);
  const [intPart, decPart] = fixed.split('.');

  // Add thousand separators
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousand_separator);

  // Build formatted number
  let formattedNumber = formattedInt;
  if (price_num_decimals > 0 && decPart) {
    // Remove trailing zeros for cleaner display
    const trimmedDec = decPart.replace(/0+$/, '');
    if (trimmedDec) {
      formattedNumber += decimal_separator + trimmedDec;
    }
  }

  // Apply currency position
  switch (currency_position) {
    case 'left':
      return `${currency_symbol}${formattedNumber}`;
    case 'left_space':
      return `${currency_symbol} ${formattedNumber}`;
    case 'right':
      return `${formattedNumber}${currency_symbol}`;
    case 'right_space':
      return `${formattedNumber} ${currency_symbol}`;
    default:
      return `${currency_symbol}${formattedNumber}`;
  }
}

/**
 * Format a price without the symbol (just the number part)
 * Useful for inputs and calculations where symbol is shown separately
 */
export function formatAmount(
  amount: number,
  settings: CurrencySettings | undefined
): string {
  const {
    thousand_separator = DEFAULT_CURRENCY_SETTINGS.thousand_separator,
    decimal_separator = DEFAULT_CURRENCY_SETTINGS.decimal_separator,
    price_num_decimals = DEFAULT_CURRENCY_SETTINGS.price_num_decimals,
  } = settings || DEFAULT_CURRENCY_SETTINGS;

  // For whole numbers, don't show decimals
  if (Number.isInteger(amount)) {
    const intPart = amount.toString();
    return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousand_separator);
  }

  // Format the number
  const fixed = amount.toFixed(price_num_decimals);
  const [intPart, decPart] = fixed.split('.');

  // Add thousand separators
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousand_separator);

  // Remove trailing zeros
  const trimmedDec = decPart?.replace(/0+$/, '');
  if (trimmedDec) {
    return formattedInt + decimal_separator + trimmedDec;
  }
  return formattedInt;
}
