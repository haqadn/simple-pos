import { BaseCommand, CommandMetadata, CommandSuggestion } from './command';
import { CommandContext } from './command-manager';

/**
 * Coupon command - apply or remove discount codes
 */
export class CouponCommand extends BaseCommand {
  private context?: CommandContext;

  setContext(context: CommandContext) {
    this.context = context;
  }

  getMetadata(): CommandMetadata {
    return {
      keyword: 'coupon',
      aliases: ['c', 'discount'],
      description: 'Apply or remove discount coupon',
      usage: [
        '/coupon <code>',
        '/coupon remove'
      ],
      parameters: [
        {
          name: 'code',
          type: 'string',
          required: true,
          description: 'Coupon code to apply, or "remove" to clear'
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
      throw new Error('Coupon code is required. Usage: /coupon <code>');
    }

    const code = args[0].toLowerCase();

    if (code === 'remove' || code === 'clear') {
      await this.context.removeCoupon();
      this.context.showMessage('Coupon removed');
    } else {
      await this.context.applyCoupon(code);
      this.context.showMessage(`Coupon "${code}" applied`);
    }
  }

  getAutocompleteSuggestions(partialInput: string): CommandSuggestion[] {
    const baseSuggestions = super.getAutocompleteSuggestions(partialInput);

    const parts = partialInput.trim().split(/\s+/);
    if (parts.length === 2 && this.matches(parts[0])) {
      // Suggest "remove" option
      if ('remove'.startsWith(parts[1].toLowerCase())) {
        return [
          ...baseSuggestions,
          {
            text: 'remove',
            description: 'Remove applied coupon',
            insertText: 'remove',
            type: 'parameter'
          }
        ];
      }
    }

    return baseSuggestions;
  }
}
