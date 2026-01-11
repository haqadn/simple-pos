import { BaseCommand, CommandMetadata, CommandSuggestion } from './command';
import { CommandContext } from './command-manager';

export interface CustomerData {
  name: string;
  phone: string;
  address?: string;
}

/**
 * Customer command - set customer info on order
 */
export class CustomerCommand extends BaseCommand {
  private context?: CommandContext;

  setContext(context: CommandContext) {
    this.context = context;
  }

  getMetadata(): CommandMetadata {
    return {
      keyword: 'customer',
      aliases: ['cust', 'cu'],
      description: 'Set customer info (name, phone, address)',
      usage: [
        '/customer <name>, <phone>',
        '/customer <name>, <phone>, <address>',
        '/customer John Doe, 555-1234',
        '/customer John Doe, 555-1234, 123 Main St',
      ],
      parameters: [
        {
          name: 'info',
          type: 'string',
          required: true,
          description: 'Customer info: name, phone[, address]'
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
      throw new Error('Customer info is required. Usage: /customer <name>, <phone>[, <address>]');
    }

    // Join all args and split by comma
    const fullInput = args.join(' ');
    const parts = fullInput.split(',').map(p => p.trim());

    if (parts.length < 2) {
      throw new Error('Both name and phone are required. Usage: /customer <name>, <phone>[, <address>]');
    }

    const customerData: CustomerData = {
      name: parts[0],
      phone: parts[1],
      address: parts.length > 2 ? parts.slice(2).join(', ') : undefined
    };

    await this.context.setCustomer(customerData);

    let message = `Customer: ${customerData.name}, ${customerData.phone}`;
    if (customerData.address) {
      message += `, ${customerData.address}`;
    }
    this.context.showMessage(message);
  }

  getAutocompleteSuggestions(partialInput: string): CommandSuggestion[] {
    return super.getAutocompleteSuggestions(partialInput);
  }
}
