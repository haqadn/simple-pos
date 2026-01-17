import { BaseCommand, CommandMetadata, CommandSuggestion } from './command';
import { CommandContext } from './command-manager';
import { OrderSchema } from '@/api/orders';

/**
 * Clear command - removes all line items from the current order
 */
export class ClearCommand extends BaseCommand {
  getMetadata(): CommandMetadata {
    return {
      keyword: 'clear',
      aliases: ['cl'],
      description: 'Clear all items from current order',
      usage: ['/clear'],
      parameters: []
    };
  }

  async execute(): Promise<void> {
    const context = this.requireContext<CommandContext>();
    const order = this.requireActiveOrder<OrderSchema>();

    const lineItems = order.line_items;
    if (lineItems.length === 0) {
      context.showMessage('Order is already empty');
      return;
    }

    await context.clearOrder();
    context.showMessage(`Cleared ${lineItems.length} items from order`);
  }

  getAutocompleteSuggestions(partialInput: string): CommandSuggestion[] {
    // No parameters, just suggest the command itself
    return super.getAutocompleteSuggestions(partialInput);
  }
}
