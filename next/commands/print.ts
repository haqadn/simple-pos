import { BaseCommand, CommandMetadata, CommandSuggestion } from './command';
import { CommandContext } from './command-manager';

type PrintType = 'bill' | 'kot';

/**
 * Print command - print receipts or kitchen order tickets
 */
export class PrintCommand extends BaseCommand {
  private context?: CommandContext;

  setContext(context: CommandContext) {
    this.context = context;
  }

  getMetadata(): CommandMetadata {
    return {
      keyword: 'print',
      aliases: ['pr'],
      description: 'Print bill or kitchen order ticket',
      usage: [
        '/print bill',
        '/print kot'
      ],
      parameters: [
        {
          name: 'type',
          type: 'string',
          required: true,
          description: 'Type of print: bill or kot'
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
      throw new Error('Print type is required. Usage: /print bill or /print kot');
    }

    const printType = args[0].toLowerCase() as PrintType;

    if (printType !== 'bill' && printType !== 'kot') {
      throw new Error('Invalid print type. Use "bill" or "kot"');
    }

    if (this.context.currentOrder.line_items.length === 0) {
      throw new Error('Cannot print empty order');
    }

    await this.context.print(printType);
    this.context.showMessage(`${printType.toUpperCase()} sent to printer`);
  }

  getAutocompleteSuggestions(partialInput: string): CommandSuggestion[] {
    const baseSuggestions = super.getAutocompleteSuggestions(partialInput);

    const parts = partialInput.trim().split(/\s+/);
    if (parts.length === 2 && this.matches(parts[0])) {
      const typeHint = parts[1].toLowerCase();
      const suggestions: CommandSuggestion[] = [];

      if ('bill'.startsWith(typeHint)) {
        suggestions.push({
          text: 'bill',
          description: 'Print customer receipt',
          insertText: 'bill',
          type: 'parameter'
        });
      }

      if ('kot'.startsWith(typeHint)) {
        suggestions.push({
          text: 'kot',
          description: 'Print kitchen order ticket',
          insertText: 'kot',
          type: 'parameter'
        });
      }

      return [...baseSuggestions, ...suggestions];
    }

    return baseSuggestions;
  }
}
