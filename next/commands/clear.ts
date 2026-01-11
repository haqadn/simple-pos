import { BaseCommand, CommandMetadata, CommandSuggestion } from './command';
import { CommandContext } from './command-manager';

/**
 * Clear command - removes all line items from the current order
 */
export class ClearCommand extends BaseCommand {
  private context?: CommandContext;

  setContext(context: CommandContext) {
    this.context = context;
  }

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
    if (!this.context) {
      throw new Error('Command context not set');
    }

    if (!this.context.currentOrder) {
      throw new Error('No active order');
    }

    const lineItems = this.context.currentOrder.line_items;
    if (lineItems.length === 0) {
      this.context.showMessage('Order is already empty');
      return;
    }

    await this.context.clearOrder();
    this.context.showMessage(`Cleared ${lineItems.length} items from order`);
  }

  getAutocompleteSuggestions(partialInput: string): CommandSuggestion[] {
    // No parameters, just suggest the command itself
    return super.getAutocompleteSuggestions(partialInput);
  }
}
