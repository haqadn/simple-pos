import { BaseMultiInputCommand, CommandMetadata, CommandSuggestion } from './command';
import { CommandContext } from './command-manager';
import { formatCurrency } from '@/lib/format';

interface PayCommandData {
  totalPaid: number;
}

/**
 * Pay command - record payment amount received from customer
 */
export class PayCommand extends BaseMultiInputCommand {
  private context?: CommandContext;

  setContext(context: CommandContext) {
    this.context = context;
  }

  getMetadata(): CommandMetadata {
    return {
      keyword: 'pay',
      aliases: ['p'],
      description: 'Record payment amount received',
      usage: [
        '/pay <amount>',
        '/pay (enters multi-input mode for split payments)',
        'Multi-mode: <amount> (to add payment)',
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
    if (!this.context) {
      throw new Error('Command context not set');
    }

    if (!this.context.currentOrder) {
      throw new Error('No active order');
    }

    if (args.length === 0) {
      throw new Error('Amount is required. Usage: /pay <amount>');
    }

    const amount = this.parseFloat(args[0]);
    if (amount === null || amount < 0) {
      throw new Error('Amount must be a positive number');
    }

    await this.context.setPayment(amount);

    const orderTotal = parseFloat(this.context.currentOrder.total);
    const change = amount - orderTotal;

    if (change >= 0) {
      this.context.showMessage(`Cash: ${formatCurrency(amount)} | Change: ${formatCurrency(change)}`);
    } else {
      this.context.showMessage(`Cash: ${formatCurrency(amount)} | Due: ${formatCurrency(Math.abs(change))}`);
    }
  }

  async enterMultiMode(): Promise<{ prompt: string; data?: unknown }> {
    return {
      prompt: 'pay>',
      data: { totalPaid: 0 } as PayCommandData
    };
  }

  async exitMultiMode(currentData?: unknown): Promise<void> {
    const data = currentData as PayCommandData;
    if (data?.totalPaid && data.totalPaid > 0 && this.context) {
      const orderTotal = parseFloat(this.context.currentOrder?.total || '0');
      const change = data.totalPaid - orderTotal;
      if (change >= 0) {
        this.context.showMessage(`Total paid: $${formatCurrency(data.totalPaid)} | Change: $${formatCurrency(change)}`);
      }
    }
  }

  getMultiModeAutocompleteSuggestions(partialInput: string): CommandSuggestion[] {
    const suggestions: CommandSuggestion[] = [];

    if (!this.context?.currentOrder) return suggestions;

    const orderTotal = parseFloat(this.context.currentOrder.total);
    const currentPayment = this.context.getPaymentReceived?.() || 0;
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
    roundAmounts.slice(0, 2).forEach(amount => {
      suggestions.push({
        text: amount.toString(),
        description: `$${amount} (change: $${formatCurrency(amount - remaining)})`,
        insertText: amount.toString(),
        type: 'parameter'
      });
    });

    return suggestions;
  }

  getAutocompleteSuggestions(partialInput: string): CommandSuggestion[] {
    const baseSuggestions = super.getAutocompleteSuggestions(partialInput);

    const parts = partialInput.trim().split(/\s+/);
    if (parts.length === 2 && this.matches(parts[0]) && this.context?.currentOrder) {
      const orderTotal = parseFloat(this.context.currentOrder.total);
      const currentPayment = this.context.getPaymentReceived?.() || 0;
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

  private parseFloat(value: string): number | null {
    const parsed = Number.parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
}
