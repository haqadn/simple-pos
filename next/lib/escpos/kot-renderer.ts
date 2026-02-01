// KOT (Kitchen Order Ticket) ESC/POS renderer

import { EscPosBuilder } from './commands';
import type { KotSettings, KotData } from './types';

interface KotRenderOptions {
  settings: KotSettings;
  paperWidth: number;
}

/**
 * Format service display based on type
 * - Table: show just the table name/number (strip "Table " prefix if present)
 * - Delivery: show "Delivery"
 */
function formatServiceDisplay(cartName: string, serviceType?: 'table' | 'delivery'): string {
  if (!cartName) return '';
  if (serviceType === 'delivery') return 'Delivery';
  // For tables, strip "Table " prefix if present
  return cartName;
}

/**
 * Render a KOT as ESC/POS commands
 * Features:
 * - Large table/cart name or order number as heading
 * - Item list with quantities (left-aligned)
 * - Change detection: strikethrough old qty, bold new qty
 */
export function renderKot(data: KotData, options: KotRenderOptions): Uint8Array {
  const { settings, paperWidth } = options;
  const charWidth = Math.round(paperWidth * (46 / 80));

  const builder = new EscPosBuilder();
  builder.init();

  // Service type display (Table name or "Delivery") - large and bold
  if (settings.showTableName && data.cartName) {
    builder.alignCenter();
    builder.doubleSize();
    builder.bold(true);
    builder.text(formatServiceDisplay(data.cartName, data.serviceType));
    builder.bold(false);
    builder.normalSize();
    builder.newline();
  }

  // Order number (smaller, below service type) - use frontend ID as primary
  const displayOrderNumber = data.frontendId || data.orderReference;
  if (settings.showOrderNumber && displayOrderNumber) {
    builder.alignCenter();
    builder.text(`Order #${displayOrderNumber}`);
    builder.newline();
  }

  builder.separator('=', charWidth);

  // Items header
  builder.alignLeft();
  builder.bold(true);
  builder.columns('Item', 'Qty', charWidth);
  builder.bold(false);
  builder.separator('-', charWidth);

  // KOT items with change detection
  const kotItems = data.kotItems || [];

  kotItems.forEach((item) => {
    // Truly new item: not in previous KOT at all (previousQuantity is undefined)
    const isTrulyNewItem = item.previousQuantity === undefined;
    // Item was previously removed (quantity was 0) and is being re-added
    const wasRemoved = item.previousQuantity === 0;
    // Item existed before with quantity > 0
    const hadPrevious = item.previousQuantity !== undefined && item.previousQuantity > 0;
    // Quantity has changed from a previous non-zero value
    const hasQuantityChanged = hadPrevious && item.quantity !== item.previousQuantity;
    // Item is being removed (was > 0, now is 0)
    const isRemoved = item.quantity === 0 && hadPrevious;

    // Build quantity string
    let qtyStr: string;
    let itemName = item.name;

    // Bold rules:
    // - Newly added items (first KOT or re-added after removal) should be bold
    // - Items with changed quantity should be bold
    // - Removed items should be bold
    const shouldBold = settings.highlightChanges && (isTrulyNewItem || wasRemoved || hasQuantityChanged || isRemoved);

    if (settings.highlightChanges) {
      if (isRemoved) {
        // Removed item: show "~oldQty~ X" and strikethrough name
        qtyStr = `~${item.previousQuantity}~ X`;
        itemName = `~~${item.name}~~`;
      } else if (hasQuantityChanged) {
        // Changed quantity: show "~oldQty~ newQty"
        qtyStr = `~${item.previousQuantity}~ ${item.quantity}`;
      } else {
        // New items or no change - just show quantity (no + prefix)
        qtyStr = item.quantity.toString();
      }
    } else if (item.quantity === 0) {
      // Skip items with 0 quantity if not highlighting changes
      return;
    } else {
      qtyStr = item.quantity.toString();
    }

    // Print item row using columns (left-aligned name, right-aligned qty)
    // Bold new/removed/changed items for visibility
    builder.alignLeft();
    if (shouldBold) builder.bold(true);
    builder.columns(itemName, qtyStr, charWidth);
    if (shouldBold) builder.bold(false);
  });

  builder.separator('-', charWidth);

  // Customer note
  if (settings.showCustomerNote && data.customerNote) {
    builder.newline();
    builder.alignLeft();
    builder.bold(true);
    builder.text('NOTE:').newline();
    builder.bold(false);

    // Word wrap the note
    const words = data.customerNote.split(' ');
    let currentLine = '';
    words.forEach((word) => {
      if ((currentLine + ' ' + word).trim().length > charWidth) {
        builder.text(currentLine.trim()).newline();
        currentLine = word;
      } else {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      }
    });
    if (currentLine) {
      builder.text(currentLine.trim()).newline();
    }
  }

  // Feed and cut
  builder.feed(3);
  builder.cut();

  return builder.build();
}

/**
 * Check if KOT has any changes worth printing
 */
export function hasKotChanges(data: KotData): boolean {
  const items = data.kotItems || [];
  return items.some(
    (item) =>
      item.previousQuantity === undefined ||
      item.quantity !== item.previousQuantity
  );
}
