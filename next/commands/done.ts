import { BaseCommand, CommandMetadata, CommandSuggestion } from './command';
import { CommandContext } from './command-manager';
import { formatCurrency } from '@/lib/format';
import { OrderSchema } from '@/api/orders';

/**
 * Done command - complete the order and navigate to next
 * Optionally accepts a payment amount to record before completing
 */
export class DoneCommand extends BaseCommand {
  getMetadata(): CommandMetadata {
    return {
      keyword: 'done',
      aliases: ['dn', 'd'],
      description: 'Complete order and navigate to next',
      usage: ['/done', '/done <amount>'],
      parameters: [
        {
          name: 'amount',
          type: 'number',
          required: false,
          description: 'Optional payment amount to record before completing'
        }
      ]
    };
  }

  async execute(args: string[]): Promise<void> {
    const context = this.requireContext<CommandContext>();
    const order = this.requireActiveOrder<OrderSchema>();

    const orderTotal = parseFloat(order.total);
    let paymentReceived = context.getPaymentReceived?.() || 0;

    // Check if order has items
    if (order.line_items.length === 0) {
      throw new Error('Cannot complete empty order');
    }

    // If amount provided, record payment first
    if (args.length > 0) {
      const amount = this.parseNumber(args[0]);
      if (amount === null || amount < 0) {
        throw new Error('Amount must be a positive number');
      }
      await context.setPayment(amount);
      paymentReceived = amount;
    }

    // Check if payment is sufficient
    if (paymentReceived < orderTotal) {
      const remaining = orderTotal - paymentReceived;
      throw new Error(`Insufficient payment. Due: $${formatCurrency(remaining)}`);
    }

    // Complete the order
    await context.completeOrder();

    const change = paymentReceived - orderTotal;

    // Check if there's cash payment (from split_payments meta)
    const splitPaymentsMeta = order.meta_data.find(m => m.key === 'split_payments');
    let cashPayment = 0;
    if (splitPaymentsMeta && typeof splitPaymentsMeta.value === 'string') {
      try {
        const payments = JSON.parse(splitPaymentsMeta.value);
        cashPayment = payments.cash || 0;
      } catch { /* ignore */ }
    } else {
      // Legacy: if no split_payments, assume all payment is cash
      cashPayment = paymentReceived;
    }

    // Open drawer if there's cash payment or change to give
    if (cashPayment > 0 || change > 0) {
      await context.openDrawer();
    }

    if (change > 0) {
      context.showMessage(`Order completed! Change: $${formatCurrency(change)}`);
    } else {
      context.showMessage('Order completed!');
    }
  }

  getAutocompleteSuggestions(partialInput: string): CommandSuggestion[] {
    const baseSuggestions = super.getAutocompleteSuggestions(partialInput);
    const context = this._context as CommandContext | undefined;

    const parts = partialInput.trim().split(/\s+/);
    // If we're typing the amount parameter (second part)
    if (parts.length === 2 && this.matches(parts[0]) && context?.currentOrder) {
      const orderTotal = parseFloat(context.currentOrder.total);
      const currentPayment = context.getPaymentReceived?.() || 0;
      const remaining = orderTotal - currentPayment;

      const suggestions: CommandSuggestion[] = [];

      // Suggest exact amount needed
      if (remaining > 0) {
        suggestions.push({
          text: formatCurrency(remaining),
          description: `Exact amount to complete`,
          insertText: `/${parts[0]} ${formatCurrency(remaining)}`,
          type: 'parameter'
        });
      }

      // Suggest common round amounts that cover the remaining balance
      const roundAmounts = [10, 20, 50, 100, 200, 500].filter(a => a >= remaining);
      roundAmounts.slice(0, 2).forEach(amount => {
        suggestions.push({
          text: amount.toString(),
          description: `$${amount} (change: $${formatCurrency(amount - remaining)})`,
          insertText: `/${parts[0]} ${amount}`,
          type: 'parameter'
        });
      });

      return [...baseSuggestions, ...suggestions];
    }

    return baseSuggestions;
  }
}
