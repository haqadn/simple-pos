import { BaseCommand, CommandMetadata, CommandSuggestion } from './command';
import { CommandContext } from './command-manager';

/**
 * Drawer command - open cash drawer
 */
export class DrawerCommand extends BaseCommand {
  getMetadata(): CommandMetadata {
    return {
      keyword: 'drawer',
      aliases: ['cash'],
      description: 'Open cash drawer',
      usage: [
        '/drawer',
        '/cash'
      ],
      parameters: []
    };
  }

  async execute(_args: string[]): Promise<void> {
    const context = this.requireContext<CommandContext>();

    await context.openDrawer();
    context.showMessage('Opening cash drawer');
  }

  getAutocompleteSuggestions(partialInput: string): CommandSuggestion[] {
    return super.getAutocompleteSuggestions(partialInput);
  }
}
