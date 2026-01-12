// Bill receipt ESC/POS renderer

import { EscPosBuilder } from './commands';
import { encodeImageForPrint } from './encoder';
import type { BillCustomization, BillData } from './types';

interface BillRenderOptions {
  customization: BillCustomization;
  paperWidth: 58 | 80;
}

/**
 * Convert cart name to human-readable format
 */
function humanizeCartName(name: string): string {
  if (!name) return '';
  if (/^T-?\d/i.test(name)) return 'Table ' + name.replace(/^T-?/i, '');
  if (/^D-?\d/i.test(name)) return 'Home Delivery';
  if (/^P-?\d/i.test(name)) return 'Take Away';
  return name;
}

/**
 * Format currency (simple number formatting)
 */
function formatCurrency(amount: number): string {
  return amount.toFixed(0);
}

/**
 * Render a bill receipt as ESC/POS commands
 */
export async function renderBill(
  data: BillData,
  options: BillRenderOptions
): Promise<Uint8Array> {
  const { customization, paperWidth } = options;
  const charWidth = paperWidth === 80 ? 46 : 32;

  const builder = new EscPosBuilder();
  builder.init();

  // Logo - use full paper width for better visibility
  if (customization.logo) {
    try {
      // Use wider logo: 576px for 80mm, 384px for 58mm (full printable width)
      const logoWidth = customization.logoWidth || (paperWidth === 80 ? 576 : 384);
      const { data: imageData, widthBytes, height } = await encodeImageForPrint(
        customization.logo,
        logoWidth
      );
      builder.alignCenter();
      builder.rasterImage(imageData, widthBytes, height);
      builder.feed(1);
    } catch (e) {
      console.error('Failed to encode logo:', e);
    }
  }

  // Header text
  if (customization.headerText) {
    builder.alignCenter();
    customization.headerText.split('\n').forEach((line) => {
      builder.text(line.trim()).newline();
    });
  }

  builder.separator('-', charWidth);

  // Cart/Table name
  if (data.cartName) {
    builder.alignCenter();
    builder.bold(true);
    builder.text(humanizeCartName(data.cartName));
    builder.bold(false);
    builder.newline();
  }

  // Customer info
  if (data.customer?.name || data.customer?.phone) {
    builder.alignCenter();
    const customerInfo = [data.customer?.name, data.customer?.phone]
      .filter(Boolean)
      .join(' | ');
    builder.text(customerInfo).newline();

    // Customer address
    if (data.customer?.address) {
      builder.text(data.customer.address).newline();
    }
  }

  // Order reference
  if (customization.showOrderNumber && data.orderReference) {
    builder.alignCenter();
    builder.text(`Invoice#: ${data.orderReference}`).newline();
  }

  // Date and time
  if (customization.showDateTime && data.orderTime) {
    builder.alignCenter();
    const date = new Date(data.orderTime);
    builder.text(
      `Date: ${date.toLocaleDateString('en-GB')} Time: ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
    );
    builder.newline();
  }

  builder.separator('-', charWidth);

  // Line items header - table format
  builder.alignLeft();
  builder.bold(true);
  // Column widths for 46 chars: name(28) + qty(3) + price(7) + total(8)
  const nameColW = 28;
  const qtyColW = 3;
  const priceColW = 7;
  const totalColW = 8;
  builder.text(
    'Item'.padEnd(nameColW) +
    'Qty'.padStart(qtyColW) +
    'Price'.padStart(priceColW) +
    'Total'.padStart(totalColW)
  ).newline();
  builder.bold(false);
  builder.separator('-', charWidth);

  // Line items
  const items = data.items?.filter((item) => item.quantity > 0) || [];
  let subtotal = 0;

  items.forEach((item) => {
    const lineTotal = item.price * item.quantity;
    subtotal += lineTotal;

    // Truncate item name if needed
    let name = item.name;
    if (name.length > nameColW - 1) {
      name = name.substring(0, nameColW - 4) + '...';
    }

    builder.text(
      name.padEnd(nameColW) +
      item.quantity.toString().padStart(qtyColW) +
      formatCurrency(item.price).padStart(priceColW) +
      formatCurrency(lineTotal).padStart(totalColW)
    ).newline();
  });

  builder.separator('-', charWidth);

  // Discount
  const discount = data.discountTotal || 0;
  if (discount > 0) {
    builder.columns('Discount', `-${formatCurrency(discount)}`, charWidth);
  }

  // Total
  const total = data.total ?? subtotal - discount;
  builder.bold(true);
  builder.columns('Total', formatCurrency(total), charWidth);
  builder.bold(false);

  // Payment and change
  const payment = data.payment || 0;
  if (payment > 0) {
    builder.columns('Payment', formatCurrency(payment), charWidth);
    const change = payment - total;
    if (change > 0) {
      builder.columns('Change', formatCurrency(change), charWidth);
    } else if (change < 0) {
      builder.columns('Due', formatCurrency(-change), charWidth);
    }
  }

  builder.separator('-', charWidth);

  // Footer text
  if (customization.footerText) {
    builder.alignCenter();
    customization.footerText.split('\n').forEach((line) => {
      builder.text(line.trim()).newline();
    });
  }

  // Feed and cut
  builder.feed(3);
  builder.cut();

  return builder.build();
}

/**
 * Generate cash drawer kick command
 */
export function renderDrawerKick(pin: 2 | 5 = 2): Uint8Array {
  const builder = new EscPosBuilder();
  builder.init();
  builder.drawerKick(pin);
  return builder.build();
}
