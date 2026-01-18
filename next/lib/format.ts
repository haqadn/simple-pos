/**
 * Format a number for display, showing decimals only when needed
 * @param value - The number to format
 * @param maxDecimals - Maximum decimal places (default 2)
 * @returns Formatted string without unnecessary decimals
 */
export function formatNumber(value: number, maxDecimals = 2): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  // Round to maxDecimals and remove trailing zeros
  const fixed = value.toFixed(maxDecimals);
  return parseFloat(fixed).toString();
}

/**
 * Format currency amount, showing decimals only when needed
 * @param amount - The amount to format
 * @returns Formatted string (e.g., "50" or "50.50")
 */
export function formatCurrency(amount: number): string {
  return formatNumber(amount, 2);
}

/**
 * Format currency amount with symbol
 * @param amount - The amount to format
 * @param symbol - Currency symbol (e.g., "$", "৳")
 * @param position - Symbol position: 'left', 'right', 'left_space', 'right_space'
 * @returns Formatted string with symbol (e.g., "$50" or "50 ৳")
 */
export function formatCurrencyWithSymbol(
  amount: number,
  symbol: string,
  position: 'left' | 'right' | 'left_space' | 'right_space' = 'left'
): string {
  const formatted = formatCurrency(amount);
  switch (position) {
    case 'left':
      return `${symbol}${formatted}`;
    case 'left_space':
      return `${symbol} ${formatted}`;
    case 'right':
      return `${formatted}${symbol}`;
    case 'right_space':
      return `${formatted} ${symbol}`;
    default:
      return `${symbol}${formatted}`;
  }
}
