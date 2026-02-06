import { CommandMetadata, CommandSuggestion } from './command';
import { AsyncSearchCommand } from './async-search-command';
import { CommandContext } from './command-manager';
import CustomersAPI, { CustomerSchema } from '@/api/customers';

export interface CustomerData {
  name: string;
  phone: string;
  address?: string;
}

/**
 * Customer command - set customer info on order
 * Supports searching previous customers by name or phone
 */
export class CustomerCommand extends AsyncSearchCommand<CustomerSchema> {
  protected async performSearch(query: string): Promise<CustomerSchema[]> {
    return CustomersAPI.search(query);
  }

  getMetadata(): CommandMetadata {
    return {
      keyword: 'customer',
      aliases: ['cus'],
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
          description: 'Customer info: name, phone[, address] - or search by name/phone'
        }
      ]
    };
  }

  async execute(args: string[]): Promise<void> {
    const context = this.requireContext<CommandContext>();
    this.requireActiveOrder();

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

    await context.setCustomer(customerData);

    let message = `Customer: ${customerData.name}, ${customerData.phone}`;
    if (customerData.address) {
      message += `, ${customerData.address}`;
    }
    context.showMessage(message);
  }

  getAutocompleteSuggestions(partialInput: string): CommandSuggestion[] {
    const baseSuggestions = super.getAutocompleteSuggestions(partialInput);

    const parts = partialInput.trim().split(/\s+/);

    // If user is typing after the command keyword
    if (parts.length >= 2 && this.matches(parts[0])) {
      const searchQuery = parts.slice(1).join(' ');

      // Don't search if it looks like they're entering full info (has comma)
      if (searchQuery.includes(',')) {
        return baseSuggestions;
      }

      // Trigger async search (results will be cached for next call)
      if (searchQuery !== this.lastSearchQuery && searchQuery.length >= 2) {
        this.lastSearchQuery = searchQuery;
        this.triggerSearch(searchQuery);
      }

      // Return cached results - use type 'command' to replace entire input
      const suggestions = this.searchCache.map(customer => ({
        text: `${customer.name}, ${customer.phone}`,
        description: `Previous customer`,
        insertText: `/customer ${customer.name}, ${customer.phone}`,
        type: 'command' as const
      }));

      return [...baseSuggestions, ...suggestions];
    }

    return baseSuggestions;
  }
}
