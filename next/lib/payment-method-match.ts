import { PaymentMethodConfig } from '@/stores/settings';

/**
 * Match result from resolving a payment method input string
 */
export interface PaymentMethodMatch {
  /** The matched method's key (e.g. 'bkash', 'card') or 'cash' */
  key: string;
  /** The matched method's display label (e.g. 'bKash', 'Card') or 'Cash' */
  label: string;
}

/**
 * Resolve a user-typed payment method string to a configured payment method.
 *
 * Matching rules (case-insensitive):
 * 1. Exact match on key or label
 * 2. Prefix match on key or label (input is a prefix of the key/label)
 * 3. If multiple prefix matches exist, throw an ambiguous error
 * 4. If no match, throw a descriptive error listing available methods
 *
 * "cash" is always recognized as a valid method (hardcoded).
 *
 * @param input - The user-typed method string (e.g. "bk", "card", "Cash")
 * @param methods - The configured payment methods from settings
 * @returns The matched payment method key and label
 * @throws Error if no match or ambiguous match
 */
export function resolvePaymentMethod(
  input: string,
  methods: PaymentMethodConfig[],
): PaymentMethodMatch {
  const normalized = input.toLowerCase().trim();

  // Check for "cash" first (always available, hardcoded)
  if ('cash'.startsWith(normalized) && normalized.length > 0) {
    // Only match cash if no configured method is a better match
    // Check for exact match on configured methods first
    const exactConfigured = methods.find(
      m => m.key.toLowerCase() === normalized || m.label.toLowerCase() === normalized,
    );
    if (exactConfigured) {
      return { key: exactConfigured.key, label: exactConfigured.label };
    }

    // If "cash" is an exact match, return it immediately
    if (normalized === 'cash') {
      return { key: 'cash', label: 'Cash' };
    }

    // Check if any configured methods also prefix-match
    const configuredPrefixMatches = methods.filter(
      m => m.key.toLowerCase().startsWith(normalized) || m.label.toLowerCase().startsWith(normalized),
    );

    if (configuredPrefixMatches.length === 0) {
      // Only cash matches
      return { key: 'cash', label: 'Cash' };
    }

    if (configuredPrefixMatches.length === 1) {
      // Both cash and one configured method match -- ambiguous
      const names = ['Cash', configuredPrefixMatches[0].label];
      throw new Error(
        `Ambiguous method "${input}". Did you mean: ${names.join(', ')}?`,
      );
    }

    // Multiple configured methods + cash match
    const names = ['Cash', ...configuredPrefixMatches.map(m => m.label)];
    throw new Error(
      `Ambiguous method "${input}". Did you mean: ${names.join(', ')}?`,
    );
  }

  // Check configured methods for exact match (key or label)
  const exactMatch = methods.find(
    m => m.key.toLowerCase() === normalized || m.label.toLowerCase() === normalized,
  );
  if (exactMatch) {
    return { key: exactMatch.key, label: exactMatch.label };
  }

  // Check configured methods for prefix match
  const prefixMatches = methods.filter(
    m => m.key.toLowerCase().startsWith(normalized) || m.label.toLowerCase().startsWith(normalized),
  );

  if (prefixMatches.length === 1) {
    return { key: prefixMatches[0].key, label: prefixMatches[0].label };
  }

  if (prefixMatches.length > 1) {
    const names = prefixMatches.map(m => m.label).join(', ');
    throw new Error(
      `Ambiguous method "${input}". Did you mean: ${names}?`,
    );
  }

  // No match at all
  const availableNames = ['Cash', ...methods.map(m => m.label)].join(', ');
  throw new Error(
    `Unknown payment method "${input}". Available: ${availableNames}`,
  );
}

/**
 * Get all available payment method labels for autocomplete suggestions.
 * Includes "cash" and all configured methods.
 *
 * @param methods - The configured payment methods from settings
 * @returns Array of { key, label } for all available methods
 */
export function getAllPaymentMethods(
  methods: PaymentMethodConfig[],
): PaymentMethodMatch[] {
  return [
    { key: 'cash', label: 'Cash' },
    ...methods.map(m => ({ key: m.key, label: m.label })),
  ];
}
