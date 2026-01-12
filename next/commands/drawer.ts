import { BaseCommand, CommandMetadata, CommandSuggestion } from './command';
import { CommandContext } from './command-manager';

/**
 * Drawer command - open cash drawer
 */
export class DrawerCommand extends BaseCommand {
  private context?: CommandContext;

  setContext(context: CommandContext) {
    this.context = context;
  }

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
    if (!this.context) {
      throw new Error('Command context not set');
    }

    await this.context.openDrawer();
    this.context.showMessage('Opening cash drawer');
  }

  getAutocompleteSuggestions(partialInput: string): CommandSuggestion[] {
    return super.getAutocompleteSuggestions(partialInput);
  }
}
