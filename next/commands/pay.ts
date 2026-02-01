import { BaseMultiInputCommand, CommandMetadata, CommandSuggestion } from './command';
import { CommandContext } from './command-manager';
import { formatCurrency, formatCurrencyWithSymbol } from '@/lib/format';
import { OrderSchema } from '@/api/orders';
import { resolvePaymentMethod, getAllPaymentMethods } from '@/lib/payment-method-match';

interface PayCommandData {
  totalPaid: number;
}

/**
 * Parse an input string into an amount and an optional method token.
 * Supports formats: "200", "200 card", "200 bkash"
 */
function parseAmountAndMethod(args: string[]): { amount: string; methodToken?: string } {
  if (args.length === 0) {
    return { amount: '' };
  }
  // First arg is always the amount
  const amount = args[0];
  // Second arg (if present) is the payment method
  const methodToken = args.length > 1 ? args.slice(1).join(' ') : undefined;
  return { amount, methodToken };
}

/**
 * Pay command - record payment amount received from customer
 */
export class PayCommand extends BaseMultiInputCommand {
  private _multiModeTotal = 0;

  getMetadata(): CommandMetadata {
    return {
      keyword: 'pay',
      aliases: [],
      description: 'Record payment amount received',
      usage: [
        '/pay <amount> [method]',
        '/pay (enters multi-input mode for split payments)',
        'Multi-mode: <amount> [method] (to add payment)',
        'Multi-mode: / (to exit)'
      ],
      parameters: [
        {
          name: 'amount',
          type: 'number',
          required: true,
          description: 'Payment amount'
        }
      ]
    };
  }

  async execute(args: string[]): Promise<void> {
    const context = this.requireContext<CommandContext>();
    const order = this.requireActiveOrder<OrderSchema>();

    if (args.length === 0) {
      throw new Error('Amount is required. Usage: /pay <amount> [method]');
    }

    const { amount: amountStr, methodToken } = parseAmountAndMethod(args);

    const amount = this.parseFloat(amountStr);
    if (amount === null || amount < 0) {
      throw new Error('Amount must be a positive number');
    }

    // Resolve payment method (defaults to cash)
    let methodKey: string | undefined;
    let methodLabel = 'Cash';
    if (methodToken) {
      const methods = context.paymentMethods || [];
      const match = resolvePaymentMethod(methodToken, methods);
      methodKey = match.key;
      methodLabel = match.label;
    }

    await context.setPayment(amount, methodKey);
    this._multiModeTotal += amount;

    const orderTotal = parseFloat(order.total);
    const totalReceived = context.getPaymentReceived?.() || 0;
    // After this payment, the new total received includes the amount just set
    // But getPaymentReceived may not have updated yet, so calculate from the multi-mode total
    // For single execution (not multi-mode), use the amount directly against order total
    const change = amount - orderTotal;
    const currency = context.getCurrency?.() || { symbol: '$', position: 'left' as const };

    if (change >= 0) {
      context.showMessage(`${methodLabel}: ${formatCurrencyWithSymbol(amount, currency.symbol, currency.position)} | Change: ${formatCurrencyWithSymbol(change, currency.symbol, currency.position)}`);
    } else {
      context.showMessage(`${methodLabel}: ${formatCurrencyWithSymbol(amount, currency.symbol, currency.position)} | Due: ${formatCurrencyWithSymbol(Math.abs(change), currency.symbol, currency.position)}`);
    }
  }

  async enterMultiMode(): Promise<{ prompt: string; data?: unknown }> {
    this._multiModeTotal = 0;
    return {
      prompt: 'pay>',
      data: { totalPaid: 0 } as PayCommandData
    };
  }

  async exitMultiMode(): Promise<void> {
    const context = this._context as CommandContext | undefined;
    if (this._multiModeTotal > 0 && context) {
      const orderTotal = parseFloat(context.currentOrder?.total || '0');
      const change = this._multiModeTotal - orderTotal;
      if (change >= 0) {
        const currency = context.getCurrency?.() || { symbol: '$', position: 'left' as const };
        context.showMessage(`Total paid: ${formatCurrencyWithSymbol(this._multiModeTotal, currency.symbol, currency.position)} | Change: ${formatCurrencyWithSymbol(change, currency.symbol, currency.position)}`);
      }
    }
  }

  getMultiModeAutocompleteSuggestions(partialInput: string): CommandSuggestion[] {
    const suggestions: CommandSuggestion[] = [];
    const context = this._context as CommandContext | undefined;

    if (!context?.currentOrder) return suggestions;

    const parts = partialInput.trim().split(/\s+/);

    // If user has typed an amount and is now typing a method name
    if (parts.length >= 2) {
      const methodPartial = parts.slice(1).join(' ').toLowerCase();
      return this.getMethodSuggestions(methodPartial, parts[0]);
    }

    const orderTotal = parseFloat(context.currentOrder.total);
    const currentPayment = context.getPaymentReceived?.() || 0;
    const remaining = orderTotal - currentPayment;

    // Suggest remaining amount
    if (remaining > 0) {
      suggestions.push({
        text: formatCurrency(remaining),
        description: `Remaining balance`,
        insertText: formatCurrency(remaining),
        type: 'parameter'
      });
    }

    // Suggest common round amounts
    const roundAmounts = [10, 20, 50, 100].filter(a => a >= remaining);
    const currency = context.getCurrency?.() || { symbol: '$', position: 'left' as const };
    roundAmounts.slice(0, 2).forEach(amount => {
      suggestions.push({
        text: amount.toString(),
        description: `${formatCurrencyWithSymbol(amount, currency.symbol, currency.position)} (change: ${formatCurrencyWithSymbol(amount - remaining, currency.symbol, currency.position)})`,
        insertText: amount.toString(),
        type: 'parameter'
      });
    });

    return suggestions;
  }

  getAutocompleteSuggestions(partialInput: string): CommandSuggestion[] {
    const baseSuggestions = super.getAutocompleteSuggestions(partialInput);
    const context = this._context as CommandContext | undefined;

    const parts = partialInput.trim().split(/\s+/);

    // If user has typed command + amount + partial method (3+ parts)
    if (parts.length >= 3 && this.matches(parts[0]) && context?.currentOrder) {
      const methodPartial = parts.slice(2).join(' ').toLowerCase();
      const amountStr = parts[1];
      const commandKeyword = parts[0];
      return [
        ...baseSuggestions,
        ...this.getMethodSuggestionsForCommand(methodPartial, commandKeyword, amountStr),
      ];
    }

    // If we're typing the amount parameter (second part)
    if (parts.length === 2 && this.matches(parts[0]) && context?.currentOrder) {
      const orderTotal = parseFloat(context.currentOrder.total);
      const currentPayment = context.getPaymentReceived?.() || 0;
      const remaining = orderTotal - currentPayment;

      const suggestions: CommandSuggestion[] = [];

      // Suggest exact amount
      if (remaining > 0) {
        suggestions.push({
          text: formatCurrency(remaining),
          description: `Exact amount`,
          insertText: formatCurrency(remaining),
          type: 'parameter'
        });
      }

      return [...baseSuggestions, ...suggestions];
    }

    return baseSuggestions;
  }

  /**
   * Get method suggestions for multi-input mode (no command prefix)
   */
  private getMethodSuggestions(methodPartial: string, amountStr: string): CommandSuggestion[] {
    const context = this._context as CommandContext | undefined;
    const methods = context?.paymentMethods || [];
    const allMethods = getAllPaymentMethods(methods);

    return allMethods
      .filter(m =>
        m.key.toLowerCase().startsWith(methodPartial) ||
        m.label.toLowerCase().startsWith(methodPartial)
      )
      .map(m => ({
        text: m.label,
        description: `Pay with ${m.label}`,
        insertText: `${amountStr} ${m.key}`,
        type: 'value' as const,
      }));
  }

  /**
   * Get method suggestions for command mode (with /pay prefix)
   */
  private getMethodSuggestionsForCommand(
    methodPartial: string,
    commandKeyword: string,
    amountStr: string,
  ): CommandSuggestion[] {
    const context = this._context as CommandContext | undefined;
    const methods = context?.paymentMethods || [];
    const allMethods = getAllPaymentMethods(methods);

    return allMethods
      .filter(m =>
        m.key.toLowerCase().startsWith(methodPartial) ||
        m.label.toLowerCase().startsWith(methodPartial)
      )
      .map(m => ({
        text: m.label,
        description: `Pay with ${m.label}`,
        insertText: `/${commandKeyword} ${amountStr} ${m.key}`,
        type: 'value' as const,
      }));
  }

  private parseFloat(value: string): number | null {
    const parsed = Number.parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
}
