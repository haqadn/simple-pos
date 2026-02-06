import { BaseCommand, CommandMetadata, CommandSuggestion } from './command';
import { CommandContext } from './command-manager';
import { ServiceMethodSchema } from '@/stores/service';

/**
 * Service command - select a table or delivery method for the current order
 *
 * Usage:
 *   /service table 3     - Select "Table 3"
 *   /service pickup      - Select matching delivery zone
 *   /s takeaway           - Select matching service by partial name
 */
export class ServiceCommand extends BaseCommand {
  getMetadata(): CommandMetadata {
    return {
      keyword: 'service',
      aliases: ['s'],
      description: 'Select table or delivery method',
      usage: [
        '/service <name>',
        '/service table 3',
        '/service pickup',
        '/s takeaway',
      ],
      parameters: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Table or delivery zone name (partial match supported)'
        }
      ]
    };
  }

  async execute(args: string[]): Promise<void> {
    const context = this.requireContext<CommandContext>();
    this.requireActiveOrder();

    if (args.length === 0) {
      throw new Error('Service name is required. Usage: /service <name>');
    }

    const services = context.availableServices || [];
    if (services.length === 0) {
      throw new Error('No tables or delivery zones available');
    }

    const searchTerm = args.join(' ').toLowerCase();

    // Try exact match on slug first
    let match = services.find(s => s.slug.toLowerCase() === searchTerm);

    // Then try exact match on title
    if (!match) {
      match = services.find(s => s.title.toLowerCase() === searchTerm);
    }

    // Then try partial match on title
    if (!match) {
      const matches = services.filter(s =>
        s.title.toLowerCase().includes(searchTerm)
      );

      if (matches.length === 1) {
        match = matches[0];
      } else if (matches.length > 1) {
        const names = matches.map(s => s.title).join(', ');
        throw new Error(`Multiple matches: ${names}. Be more specific.`);
      }
    }

    // Try partial match on slug as fallback
    if (!match) {
      const matches = services.filter(s =>
        s.slug.toLowerCase().includes(searchTerm)
      );

      if (matches.length === 1) {
        match = matches[0];
      }
    }

    if (!match) {
      throw new Error(`No service found matching "${args.join(' ')}"`);
    }

    if (!context.setService) {
      throw new Error('Service selection not available');
    }

    await context.setService(match);
    const typeLabel = match.type === 'table' ? 'Table' : 'Delivery';
    context.showMessage(`${typeLabel}: ${match.title}`);
  }

  getAutocompleteSuggestions(partialInput: string): CommandSuggestion[] {
    const baseSuggestions = super.getAutocompleteSuggestions(partialInput);

    const parts = partialInput.trim().split(/\s+/);

    // If user is typing after the command keyword, suggest services
    if (parts.length >= 2 && this.matches(parts[0])) {
      const context = this._context as CommandContext | undefined;
      const services = context?.availableServices || [];
      const searchTerm = parts.slice(1).join(' ').toLowerCase();

      const suggestions = services
        .filter(s =>
          s.title.toLowerCase().includes(searchTerm) ||
          s.slug.toLowerCase().includes(searchTerm)
        )
        .map(s => {
          const typeLabel = s.type === 'table' ? 'Table' : 'Delivery';
          const feeLabel = s.fee > 0 ? ` (${s.fee})` : '';

          return {
            text: s.title,
            description: `${typeLabel}${feeLabel}`,
            insertText: `/${parts[0]} ${s.title}`,
            type: 'value' as const
          };
        });

      return [...baseSuggestions, ...suggestions];
    }

    return baseSuggestions;
  }
}
