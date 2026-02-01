import { BaseCommand, CommandMetadata, CommandSuggestion } from './command';
import { CommandContext } from './command-manager';
import OrdersAPI, { OrderSearchResult } from '@/api/orders';

/**
 * Open command - navigate to an order by server ID or local (frontend) ID
 * Supports async server search for autocomplete suggestions
 */
export class OpenCommand extends BaseCommand {
  private searchCache: OrderSearchResult[] = [];
  private lastSearchQuery = '';
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  private onSuggestionsUpdate?: () => void;

  /** Set callback to notify when suggestions update (for async search) */
  setSuggestionsCallback(callback: () => void) {
    this.onSuggestionsUpdate = callback;
  }

  /** Cleanup method to clear pending timeouts */
  dispose() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
    this.searchCache = [];
    this.onSuggestionsUpdate = undefined;
  }

  getMetadata(): CommandMetadata {
    return {
      keyword: 'open',
      description: 'Open an order by server ID or local ID',
      usage: [
        '/open <serverId>',
        '/open <localId>',
        '/open 1234',
        '/open A3X9K2',
      ],
      parameters: [
        {
          name: 'identifier',
          type: 'string',
          required: true,
          description: 'Server ID (numeric) or local frontend ID (6-char alphanumeric)'
        }
      ]
    };
  }

  async execute(args: string[]): Promise<void> {
    const context = this.requireContext<CommandContext>();

    if (args.length === 0) {
      throw new Error('Order ID is required. Usage: /open <serverId|localId>');
    }

    const identifier = args[0];

    if (!context.navigateToOrder) {
      throw new Error('Navigation not available');
    }

    context.navigateToOrder(identifier);
  }

  getAutocompleteSuggestions(partialInput: string): CommandSuggestion[] {
    const baseSuggestions = super.getAutocompleteSuggestions(partialInput);

    const parts = partialInput.trim().split(/\s+/);

    // If user is typing after the command keyword
    if (parts.length >= 2 && this.matches(parts[0])) {
      const searchQuery = parts.slice(1).join(' ');

      // Trigger async search
      if (searchQuery !== this.lastSearchQuery && searchQuery.length >= 1) {
        this.lastSearchQuery = searchQuery;
        this.triggerSearch(searchQuery);
      }

      // Return cached results
      const suggestions = this.searchCache.map(order => {
        const frontendId = order.pos_frontend_id || '—';
        const total = order.total || '0.00';
        const date = order.date_created
          ? new Date(order.date_created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : '';
        const identifier = order.pos_frontend_id || order.id.toString();

        return {
          text: `#${order.id} | ${frontendId} | ${total} | ${date}`,
          description: order.status,
          insertText: `/open ${identifier}`,
          type: 'command' as const
        };
      });

      return [...baseSuggestions, ...suggestions];
    }

    return baseSuggestions;
  }

  private triggerSearch(query: string): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(async () => {
      try {
        const results = await OrdersAPI.searchOrders(query);
        this.searchCache = results;
        this.onSuggestionsUpdate?.();
      } catch {
        this.searchCache = [];
      }
    }, 150);
  }
}
