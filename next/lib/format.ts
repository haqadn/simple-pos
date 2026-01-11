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
