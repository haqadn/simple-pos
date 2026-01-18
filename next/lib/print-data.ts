// Shared print data building logic for bill and KOT
// Used by: buttons.tsx, useGlobalShortcuts.ts, command-bar.tsx

import type { OrderSchema } from '@/api/orders';
import type { PrintJobData } from '@/stores/print';
import { DRAFT_ORDER_ID } from '@/stores/draft-order';
import { isValidFrontendId, generateFrontendId } from '@/lib/frontend-id';

interface BuildPrintDataOptions {
  order: OrderSchema;
  type: 'bill' | 'kot';
  urlOrderId?: string;
  shouldSkipForKot?: (productId: number, variationId: number) => boolean;
}

/**
 * Build print data from an order for bill or KOT printing.
 * This is the single source of truth for print data formatting.
 */
export function buildPrintData(options: BuildPrintDataOptions): PrintJobData {
  const { order, type, urlOrderId, shouldSkipForKot = () => false } = options;

  const shippingLine = order.shipping_lines?.find(s => s.method_title);
  const isTable = shippingLine?.method_id === 'pickup_location';

  // Get frontend ID: prefer URL param if valid, then check meta_data, then generate new one
  let frontendId: string | undefined;
  if (urlOrderId && isValidFrontendId(urlOrderId)) {
    frontendId = urlOrderId;
  } else {
    const frontendIdMeta = order.meta_data?.find(m => m.key === 'pos_frontend_id');
    frontendId = frontendIdMeta?.value as string | undefined;
  }
  if (!frontendId) {
    frontendId = generateFrontendId();
  }

  // Determine server ID - only set if order has been synced to server and has a real ID
  const serverId = order.id > 0 && order.id !== DRAFT_ORDER_ID ? order.id : undefined;

  const printData: PrintJobData = {
    orderId: order.id,
    frontendId,
    serverId,
    orderReference: frontendId,
    cartName: shippingLine?.method_title || 'Order',
    serviceType: shippingLine ? (isTable ? 'table' : 'delivery') : undefined,
    orderTime: order.date_created,
    customerNote: order.customer_note,
    customer: {
      name: `${order.billing.first_name} ${order.billing.last_name}`.trim(),
      phone: order.billing.phone,
      address: [order.billing.address_1, order.billing.address_2, order.billing.city]
        .filter(Boolean)
        .join(', ') || undefined,
    },
  };

  if (type === 'bill') {
    // Bill data - calculate unit price from subtotal or fall back to item.price
    printData.items = order.line_items.map(item => {
      const subtotal = parseFloat(item.subtotal || '0');
      const itemPrice = parseFloat(item.price?.toString() || '0');
      // Use subtotal/quantity if available, otherwise fall back to item.price
      const unitPrice = subtotal > 0 && item.quantity > 0
        ? subtotal / item.quantity
        : itemPrice;
      return {
        id: item.id || 0,
        name: item.name,
        quantity: item.quantity,
        price: unitPrice,
      };
    });
    printData.total = parseFloat(order.total);
    printData.discountTotal = parseFloat(order.discount_total || '0');
    printData.shippingTotal = order.shipping_lines?.reduce(
      (sum, line) => sum + parseFloat(line.total || '0'), 0
    ) || 0;
    const paymentMeta = order.meta_data.find(m => m.key === 'payment_received');
    printData.payment = paymentMeta ? parseFloat(paymentMeta.value?.toString() || '0') : 0;
  } else {
    // KOT items with change detection
    const lastKotMeta = order.meta_data.find(m => m.key === 'last_kot_items');
    const previousItems: Record<string, { quantity: number; name: string }> = {};
    if (lastKotMeta && typeof lastKotMeta.value === 'string') {
      try {
        const parsed = JSON.parse(lastKotMeta.value);
        // Handle both old format (number) and new format ({quantity, name})
        Object.entries(parsed).forEach(([key, val]) => {
          if (typeof val === 'number') {
            previousItems[key] = { quantity: val, name: 'Unknown Item' };
          } else if (val && typeof val === 'object' && 'quantity' in val) {
            previousItems[key] = val as { quantity: number; name: string };
          }
        });
      } catch { /* ignore parse errors */ }
    }

    // Track which previous items we've seen
    const seenKeys = new Set<string>();

    // Current items (filtered by category)
    const kotItems = order.line_items
      .filter(item => !shouldSkipForKot(item.product_id, item.variation_id))
      .map(item => {
        const itemKey = `${item.product_id}-${item.variation_id}`;
        seenKeys.add(itemKey);
        return {
          id: item.id || 0,
          name: item.name,
          quantity: item.quantity,
          previousQuantity: previousItems[itemKey]?.quantity,
        };
      });

    // Add removed items (were in previous KOT but not in current order)
    Object.entries(previousItems).forEach(([itemKey, prev]) => {
      if (!seenKeys.has(itemKey) && prev.quantity > 0) {
        const [productId, variationId] = itemKey.split('-').map(Number);
        if (!shouldSkipForKot(productId, variationId)) {
          kotItems.push({
            id: 0,
            name: prev.name,
            quantity: 0,
            previousQuantity: prev.quantity,
          });
        }
      }
    });

    printData.kotItems = kotItems;
  }

  return printData;
}
