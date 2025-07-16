import { BaseMultiInputCommand, CommandMetadata, CommandSuggestion } from './command';
import { CommandContext } from './command-manager';
import { ProductSchema } from '@/stores/products';

interface AddCommandData {
  itemsAdded: number;
}

export class AddBySKUCommand extends BaseMultiInputCommand {
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
      keyword: 'add',
      aliases: ['a'],
      description: 'Add products to order by SKU',
      usage: [
        '/add <sku> [quantity]',
        '/add (enters multi-input mode)',
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
          description: 'Quantity to add (default: 1)'
        }
      ]
    };
  }

  async execute(args: string[]): Promise<void> {
    if (!this.context) {
      throw new Error('Command context not set');
    }

    if (args.length === 0) {
      throw new Error('SKU is required. Usage: /add <sku> [quantity]');
    }

    const sku = args[0];
    const quantity = args.length > 1 ? this.parseInt(args[1]) : 1;

    if (quantity === null || quantity <= 0) {
      throw new Error('Quantity must be a positive number');
    }

    await this.addProductToOrder(sku, quantity);
  }

  async enterMultiMode(): Promise<{ prompt: string; data?: unknown }> {
    return {
      prompt: 'add>',
      data: { itemsAdded: 0 } as AddCommandData
    };
  }

  async exitMultiMode(currentData?: unknown): Promise<void> {
    const data = currentData as AddCommandData;
    if (data?.itemsAdded && data.itemsAdded > 0 && this.context) {
      this.context.showMessage(`Added ${data.itemsAdded} items to order`);
    }
  }

  getMultiModeAutocompleteSuggestions(partialInput: string): CommandSuggestion[] {
    const suggestions: CommandSuggestion[] = [];

    // For SKU suggestions, search available products
    const parts = partialInput.trim().split(/\s+/);
    if (parts.length === 1 && this.context) {
      // Suggest product SKUs that match the partial input
      const matchingProducts = this.context.products
        .filter(p => 
          p.sku?.toLowerCase().startsWith(parts[0].toLowerCase())
        )
        .slice(0, 5); // Limit to 5 suggestions

      matchingProducts.forEach(product => {
        suggestions.push({
          text: product.sku,
          description: `${product.name} - $${product.price}`,
          insertText: product.sku,
          type: 'parameter'
        });
      });

      // If no exact matches, show generic SKU hint
      if (matchingProducts.length === 0) {
        suggestions.push({
          text: partialInput,
          description: 'Enter product SKU',
          insertText: partialInput,
          type: 'parameter'
        });
      }
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

  private async addProductToOrder(sku: string, quantity: number): Promise<void> {
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
        quantity
      );
      
      this.context.showMessage(`Added ${quantity}x ${product.name} to order`);
    } catch (error) {
      this.context.showError(`Failed to add product: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  // Override base autocomplete to include product SKU suggestions
  getAutocompleteSuggestions(partialInput: string): CommandSuggestion[] {
    const baseSuggestions = super.getAutocompleteSuggestions(partialInput);
    
    // If we're typing parameters, add product SKU suggestions
    const parts = partialInput.trim().split(/\s+/);
    if (parts.length > 1 && this.matches(parts[0]) && this.context) {
      const skuPart = parts[1];
      const matchingProducts = this.context.products
        .filter(p => 
          p.sku?.toLowerCase().startsWith(skuPart.toLowerCase())
        )
        .slice(0, 5);

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