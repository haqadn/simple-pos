import { BaseMultiInputCommand, CommandMetadata, CommandSuggestion } from './command';
import { CommandContext } from './command-manager';
import ProductsAPI from '@/api/products';

/**
 * Stock command - update product inventory
 * Usage: /stock SKU [+|-]quantity
 * Examples:
 *   /stock ABC123 +10   - Add 10 to current stock
 *   /stock ABC123 -5    - Remove 5 from current stock
 *   /stock ABC123 50    - Set stock to exactly 50
 */
export class StockCommand extends BaseMultiInputCommand {
  getMetadata(): CommandMetadata {
    return {
      keyword: 'stock',
      aliases: [],
      description: 'Update product inventory',
      usage: [
        '/stock SKU +10   - Add 10 to stock',
        '/stock SKU -5    - Remove 5 from stock',
        '/stock SKU 50    - Set stock to 50',
        '/stock SKU unset - Disable stock tracking',
        '/stock           - Enter stock mode'
      ],
      parameters: [
        {
          name: 'sku',
          type: 'string',
          required: true,
          description: 'Product SKU'
        },
        {
          name: 'quantity',
          type: 'string',
          required: true,
          description: 'Quantity change (+10, -5) or absolute value (50)'
        }
      ]
    };
  }

  async execute(args: string[]): Promise<void> {
    const context = this.requireContext<CommandContext>();

    if (args.length < 2) {
      throw new Error('Usage: /stock SKU [+|-]quantity');
    }

    const sku = args[0].toUpperCase();
    const quantityArg = args[1].toLowerCase();

    // Find product by SKU
    const product = context.products.find(
      p => p.sku.toUpperCase() === sku
    );

    if (!product) {
      throw new Error(`Product not found: ${sku}`);
    }

    // Handle unset - disable stock management
    if (quantityArg === 'unset') {
      await ProductsAPI.disableStockManagement(product.product_id, product.variation_id);

      if (context.invalidateProducts) {
        await context.invalidateProducts();
      }

      const productName = product.variation_name
        ? `${product.name} - ${product.variation_name}`
        : product.name;
      context.showMessage(`${productName}: stock management disabled`);
      return;
    }

    const currentStock = product.stock_quantity ?? 0;
    let newStock: number;

    // Parse quantity - check for +/- prefix
    if (quantityArg.startsWith('+')) {
      const delta = parseInt(quantityArg.slice(1), 10);
      if (isNaN(delta)) throw new Error('Invalid quantity');
      newStock = currentStock + delta;
    } else if (quantityArg.startsWith('-')) {
      const delta = parseInt(quantityArg.slice(1), 10);
      if (isNaN(delta)) throw new Error('Invalid quantity');
      newStock = currentStock - delta;
    } else {
      // Absolute value
      newStock = parseInt(quantityArg, 10);
      if (isNaN(newStock)) throw new Error('Invalid quantity');
    }

    // Ensure stock doesn't go negative
    if (newStock < 0) {
      throw new Error(`Cannot set negative stock. Current: ${currentStock}`);
    }

    // Update stock via API
    await ProductsAPI.updateStock(product.product_id, product.variation_id, newStock);

    // Invalidate products cache to refresh UI
    if (context.invalidateProducts) {
      await context.invalidateProducts();
    }

    const productName = product.variation_name
      ? `${product.name} - ${product.variation_name}`
      : product.name;
    context.showMessage(`${productName}: ${currentStock} → ${newStock}`);
  }

  async enterMultiMode(): Promise<{ prompt: string; data?: unknown }> {
    return {
      prompt: 'stock>',
      data: {}
    };
  }

  async exitMultiMode(): Promise<void> {
    // Nothing to clean up
  }

  getAutocompleteSuggestions(partialInput: string): CommandSuggestion[] {
    const baseSuggestions = super.getAutocompleteSuggestions(partialInput);
    const context = this._context as CommandContext | undefined;

    if (!context) return baseSuggestions;

    const parts = partialInput.trim().split(/\s+/);

    // If typing the SKU (first argument after command)
    if (parts.length <= 2 && this.matches(parts[0])) {
      const skuHint = (parts[1] || '').toUpperCase();

      // Filter products matching SKU hint
      const matchingProducts = context.products.filter(
        p => p.sku.toUpperCase().includes(skuHint)
      );

      const suggestions = matchingProducts.slice(0, 10).map(p => {
        const displayName = p.variation_name
          ? `${p.name} - ${p.variation_name}`
          : p.name;
        const stockInfo = p.stock_quantity !== null ? ` (${p.stock_quantity})` : '';

        return {
          text: p.sku,
          description: `${displayName}${stockInfo}`,
          insertText: p.sku + ' ',
          type: 'value' as const
        };
      });

      return [...baseSuggestions, ...suggestions];
    }

    return baseSuggestions;
  }

  getMultiModeAutocompleteSuggestions(partialInput: string): CommandSuggestion[] {
    const context = this._context as CommandContext | undefined;
    if (!context) return [];

    const parts = partialInput.trim().split(/\s+/);
    const skuHint = (parts[0] || '').toUpperCase();

    // Show all products matching SKU hint
    const matchingProducts = context.products.filter(
      p => p.sku.toUpperCase().includes(skuHint)
    );

    return matchingProducts.slice(0, 10).map(p => {
      const displayName = p.variation_name
        ? `${p.name} - ${p.variation_name}`
        : p.name;
      const stockInfo = p.stock_quantity !== null ? ` (${p.stock_quantity})` : '';

      return {
        text: p.sku,
        description: `${displayName}${stockInfo}`,
        insertText: p.sku + ' ',
        type: 'value' as const
      };
    });
  }
}
