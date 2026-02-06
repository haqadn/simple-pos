// Store settings API - fetches WooCommerce store information

import { API } from './api';
import { z } from 'zod';

/**
 * WooCommerce currency settings schema
 */
export const CurrencySettingsSchema = z.object({
  currency: z.string(),
  currency_symbol: z.string(),
  currency_position: z.enum(['left', 'right', 'left_space', 'right_space']),
  thousand_separator: z.string(),
  decimal_separator: z.string(),
  price_num_decimals: z.number(),
});
export type CurrencySettings = z.infer<typeof CurrencySettingsSchema>;

/**
 * Default currency settings (used before fetching from server)
 */
export const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
  currency: 'USD',
  currency_symbol: '$',
  currency_position: 'left',
  thousand_separator: ',',
  decimal_separator: '.',
  price_num_decimals: 2,
};

/**
 * Fetch currency settings from WooCommerce settings API
 * Uses /settings/general endpoint to get individual settings
 */
async function fetchCurrencySettings(): Promise<CurrencySettings> {
  try {
    // Fetch currency settings from general settings
    const settingsKeys = [
      'woocommerce_currency',
      'woocommerce_currency_pos',
      'woocommerce_price_thousand_sep',
      'woocommerce_price_decimal_sep',
      'woocommerce_price_num_decimals',
    ];

    // Fetch all settings in parallel
    const responses = await Promise.all(
      settingsKeys.map(key =>
        API.client.get<{ id: string; value: string }>(`/settings/general/${key}`).catch(() => null)
      )
    );

    const [
      currencyRes,
      currencyPosRes,
      thousandSepRes,
      decimalSepRes,
      numDecimalsRes,
    ] = responses;

    // Map currency code to symbol (common currencies)
    const currencyCode = currencyRes?.data?.value || 'USD';
    const currencySymbol = getCurrencySymbol(currencyCode);

    const position = currencyPosRes?.data?.value || 'left';
    const thousandSep = thousandSepRes?.data?.value || ',';
    const decimalSep = decimalSepRes?.data?.value || '.';
    const numDecimals = parseInt(numDecimalsRes?.data?.value || '2', 10);

    return {
      currency: currencyCode,
      currency_symbol: currencySymbol,
      currency_position: position as CurrencySettings['currency_position'],
      thousand_separator: thousandSep,
      decimal_separator: decimalSep,
      price_num_decimals: numDecimals,
    };
  } catch (error) {
    console.error('Failed to fetch currency settings:', error);
    return DEFAULT_CURRENCY_SETTINGS;
  }
}

/**
 * Get currency symbol from currency code
 */
function getCurrencySymbol(currencyCode: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CNY: '¥',
    INR: '₹',
    BDT: '৳',
    AUD: 'A$',
    CAD: 'C$',
    CHF: 'CHF',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr',
    NZD: 'NZ$',
    SGD: 'S$',
    HKD: 'HK$',
    KRW: '₩',
    MXN: 'MX$',
    BRL: 'R$',
    RUB: '₽',
    ZAR: 'R',
    TRY: '₺',
    PLN: 'zł',
    THB: '฿',
    MYR: 'RM',
    PHP: '₱',
    IDR: 'Rp',
    VND: '₫',
    AED: 'د.إ',
    SAR: '﷼',
    PKR: '₨',
    LKR: 'Rs',
    NPR: '₨',
    EGP: 'E£',
    NGN: '₦',
    KES: 'KSh',
  };
  return symbols[currencyCode] || currencyCode;
}

export const StoreAPI = {
  getCurrencySettings: fetchCurrencySettings,
};

export default StoreAPI;
