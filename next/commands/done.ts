import { BaseCommand, CommandMetadata, CommandSuggestion } from './command';
import { CommandContext } from './command-manager';
import { formatCurrency } from '@/lib/format';

/**
 * Done command - complete the order and navigate to next
 */
export class DoneCommand extends BaseCommand {
  private context?: CommandContext;

  setContext(context: CommandContext) {
    this.context = context;
  }

  getMetadata(): CommandMetadata {
    return {
      keyword: 'done',
      aliases: ['dn', 'd'],
      description: 'Complete order and navigate to next',
      usage: ['/done'],
      parameters: []
    };
  }

  async execute(): Promise<void> {
    if (!this.context) {
      throw new Error('Command context not set');
    }

    if (!this.context.currentOrder) {
      throw new Error('No active order');
    }

    const order = this.context.currentOrder;
    const orderTotal = parseFloat(order.total);
    const paymentReceived = this.context.getPaymentReceived?.() || 0;

    // Check if order has items
    if (order.line_items.length === 0) {
      throw new Error('Cannot complete empty order');
    }

    // Check if payment is sufficient
    if (paymentReceived < orderTotal) {
      const remaining = orderTotal - paymentReceived;
      throw new Error(`Insufficient payment. Due: $${formatCurrency(remaining)}`);
    }

    // Complete the order
    await this.context.completeOrder();

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
      await this.context.openDrawer();
    }

    if (change > 0) {
      this.context.showMessage(`Order completed! Change: $${formatCurrency(change)}`);
    } else {
      this.context.showMessage('Order completed!');
    }
  }

  getAutocompleteSuggestions(partialInput: string): CommandSuggestion[] {
    return super.getAutocompleteSuggestions(partialInput);
  }
}
