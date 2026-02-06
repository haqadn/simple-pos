import { BaseCommand, CommandMetadata, CommandSuggestion } from './command';
import { CommandContext } from './command-manager';

/**
 * Note command - add customer note to order
 */
export class NoteCommand extends BaseCommand {
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
    const context = this.requireContext<CommandContext>();
    this.requireActiveOrder();

    if (args.length === 0) {
      throw new Error('Note text is required. Usage: /note <text>');
    }

    // Join all args as the note text (allows spaces)
    const noteText = args.join(' ');

    await context.setNote(noteText);
    context.showMessage(`Note: ${noteText}`);
  }

  getAutocompleteSuggestions(partialInput: string): CommandSuggestion[] {
    return super.getAutocompleteSuggestions(partialInput);
  }
}
