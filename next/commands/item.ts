import { BaseMultiInputCommand, CommandMetadata, CommandSuggestion } from './command';
import { CommandContext } from './command-manager';
import { ProductSchema } from '@/stores/products';

interface ItemCommandData {
  itemsModified: number;
}

export class ItemCommand extends BaseMultiInputCommand {
  private context?: CommandContext;

  constructor(context?: CommandContext) {
    super();
    this.context = context;
  }

  setContext(context: CommandContext) {
    this.context = context;
  }

  getMetadata(): CommandMetadata {
    return {
      keyword: 'item',
      aliases: ['i'],
      description: 'Set or increment line item quantity by SKU',
      usage: [
        '/item <sku> [quantity]',
        '/item (enters multi-input mode)',
        'Multi-mode: <sku> [quantity]',
        'Multi-mode: / (to exit)'
      ],
      parameters: [
        {
          name: 'sku',
          type: 'sku',
          required: true,
          description: 'Product SKU'
        },
        {
          name: 'quantity',
          type: 'number',
          required: false,
          description: 'Set quantity to this value (omit to increment by 1)'
        }
      ]
    };
  }

  async execute(args: string[]): Promise<void> {
    if (!this.context) {
      throw new Error('Command context not set');
    }

    if (args.length === 0) {
      throw new Error('SKU is required. Usage: /item <sku> [quantity]');
    }

    const sku = args[0];
    const hasQuantity = args.length > 1;
    const quantity = hasQuantity ? this.parseInt(args[1]) : 1;

    if (quantity === null || quantity <= 0) {
      throw new Error('Quantity must be a positive number');
    }

    // If quantity is provided, set to that quantity. Otherwise, increment by 1
    const mode = hasQuantity ? 'set' : 'increment';
    await this.addProductToOrder(sku, quantity, mode);
  }

  async enterMultiMode(): Promise<{ prompt: string; data?: unknown }> {
    return {
      prompt: 'item>',
      data: { itemsModified: 0 } as ItemCommandData
    };
  }

  async exitMultiMode(currentData?: unknown): Promise<void> {
    const data = currentData as ItemCommandData;
    if (data?.itemsModified && data.itemsModified > 0 && this.context) {
      this.context.showMessage(`Modified ${data.itemsModified} items`);
    }
  }

  getMultiModeAutocompleteSuggestions(partialInput: string): CommandSuggestion[] {
    const suggestions: CommandSuggestion[] = [];

    // For SKU/name suggestions, search available products
    const parts = partialInput.trim().split(/\s+/);
    if (parts.length === 1 && this.context) {
      const searchTerm = parts[0].toLowerCase();

      // Find products matching by SKU or name
      const matchingProducts = this.context.products
        .filter(p =>
          p.sku?.toLowerCase().startsWith(searchTerm) ||
          p.name?.toLowerCase().includes(searchTerm)
        )
        .slice(0, 8); // Limit to 8 suggestions

      matchingProducts.forEach(product => {
        suggestions.push({
          text: product.sku,
          description: `${product.name} - $${product.price}`,
          insertText: product.sku,
          type: 'parameter'
        });
      });
    } else if (parts.length === 2) {
      // Suggest quantities
      const qty = parts[1];
      if (qty && !isNaN(Number(qty))) {
        suggestions.push({
          text: qty,
          description: 'Quantity',
          insertText: qty,
          type: 'parameter'
        });
      }
    }

    return suggestions;
  }

  private async addProductToOrder(sku: string, quantity: number, mode: 'set' | 'increment'): Promise<void> {
    if (!this.context) {
      throw new Error('Command context not set');
    }

    // Find product by SKU
    const product = this.context.products.find((p: ProductSchema) => 
      p.sku === sku
    );

    if (!product) {
      throw new Error(`Product not found: ${sku}`);
    }

    if (!this.context.currentOrder) {
      throw new Error('No active order found');
    }

    try {
      // Use the context's update function instead of calling hooks directly
      await this.context.updateLineItem(
        product.product_id, 
        product.variation_id || 0, 
        quantity,
        mode
      );
      
      const action = mode === 'set' ? 'Set' : 'Added';
      this.context.showMessage(`${action} ${product.name} to ${quantity}`);
    } catch (error) {
      this.context.showError(`Failed to add product: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  // Override base autocomplete to include product SKU/name suggestions
  getAutocompleteSuggestions(partialInput: string): CommandSuggestion[] {
    const baseSuggestions = super.getAutocompleteSuggestions(partialInput);

    // If we're typing parameters, add product suggestions
    const parts = partialInput.trim().split(/\s+/);
    if (parts.length > 1 && this.matches(parts[0]) && this.context) {
      const searchTerm = parts[1].toLowerCase();
      const matchingProducts = this.context.products
        .filter(p =>
          p.sku?.toLowerCase().startsWith(searchTerm) ||
          p.name?.toLowerCase().includes(searchTerm)
        )
        .slice(0, 8);

      const productSuggestions: CommandSuggestion[] = matchingProducts.map(product => ({
        text: product.sku,
        description: `${product.name} - $${product.price}`,
        insertText: product.sku,
        type: 'parameter'
      }));

      return [...baseSuggestions, ...productSuggestions];
    }

    return baseSuggestions;
  }
}