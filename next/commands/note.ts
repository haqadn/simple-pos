import { BaseCommand, CommandMetadata, CommandSuggestion } from './command';
import { CommandContext } from './command-manager';

/**
 * Note command - add customer note to order
 */
export class NoteCommand extends BaseCommand {
  private context?: CommandContext;

  setContext(context: CommandContext) {
    this.context = context;
  }

  getMetadata(): CommandMetadata {
    return {
      keyword: 'note',
      aliases: ['n'],
      description: 'Add customer note to order',
      usage: [
        '/note <text>',
        '/note Extra spicy, no onions',
      ],
      parameters: [
        {
          name: 'text',
          type: 'string',
          required: true,
          description: 'Note text (can include spaces)'
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
      throw new Error('Note text is required. Usage: /note <text>');
    }

    // Join all args as the note text (allows spaces)
    const noteText = args.join(' ');

    await this.context.setNote(noteText);
    this.context.showMessage(`Note: ${noteText}`);
  }

  getAutocompleteSuggestions(partialInput: string): CommandSuggestion[] {
    return super.getAutocompleteSuggestions(partialInput);
  }
}
