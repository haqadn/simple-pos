'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { POSCommandInput } from '@/components/pos-command-input';
import { useCurrentOrder } from '@/stores/orders';
import { useGetProductById } from '@/stores/products';
import { isValidFrontendId } from '@/lib/frontend-id';
import { updateLocalOrder, getLocalOrder } from '@/stores/offline-orders';
import { syncOrder } from '@/services/sync';
import OrdersAPI from '@/api/orders';
import type { LocalOrder } from '@/db';
import type { LineItemSchema } from '@/api/orders';
import Buttons from "./buttons";
import CustomerInfo from "./customer-info";
import LineItems from "./line-items";
import OrderNote from "./order-note";
import PaymentCard from "./payment-card";
import Service from "./service";

interface OrderPageClientProps {
  orderId: string;
}

export default function OrderPageClient({ orderId }: OrderPageClientProps) {
  const [messages, setMessages] = useState<Array<{id: number, text: string, type: 'success' | 'error'}>>([]);
  const params = useParams();
  const queryClient = useQueryClient();
  const orderQuery = useCurrentOrder();
  const getProductById = useGetProductById();

  const urlOrderId = params?.orderId as string | undefined;
  const isFrontendIdOrder = urlOrderId ? isValidFrontendId(urlOrderId) : false;

  // Handle adding products to the order with mode support
  const handleAddProduct = useCallback(async (
    productId: number,
    variationId: number,
    quantity: number,
    mode: 'set' | 'increment'
  ) => {
    const product = getProductById(productId, variationId);

    if (!product) {
      throw new Error(`Product not found: ${productId}/${variationId}`);
    }

    if (!orderQuery.data) {
      throw new Error('No active order');
    }

    // Calculate the final quantity based on mode
    let finalQuantity = quantity;

    if (mode === 'increment') {
      // Find existing line item for this product
      const existingLineItem = orderQuery.data.line_items.find(
        li => li.product_id === productId && li.variation_id === variationId
      );
      const currentQty = existingLineItem?.quantity || 0;
      finalQuantity = currentQty + quantity;
    }

    // Handle frontend ID orders - save to Dexie only (local-first)
    if (isFrontendIdOrder && urlOrderId) {
      // Get the current local order from Dexie to get the latest state
      const cachedLocalOrder = await getLocalOrder(urlOrderId);
      const baseOrder = cachedLocalOrder?.data || orderQuery.data;

      // Build the new line items array from the latest state
      const existingLineItems = [...baseOrder.line_items];
      const existingIdx = existingLineItems.findIndex(
        li => li.product_id === productId && li.variation_id === variationId
      );

      if (existingIdx >= 0) {
        if (finalQuantity > 0) {
          existingLineItems[existingIdx] = { ...existingLineItems[existingIdx], quantity: finalQuantity };
        } else {
          existingLineItems.splice(existingIdx, 1);
        }
      } else if (finalQuantity > 0) {
        existingLineItems.push({
          name: product.name + (product.variation_name ? ` - ${product.variation_name}` : ''),
          product_id: product.product_id,
          variation_id: product.variation_id,
          quantity: finalQuantity,
          price: product.price,
        });
      }

      // Save to Dexie
      const updatedLocalOrder = await updateLocalOrder(urlOrderId, {
        line_items: existingLineItems,
      });

      // Update the cache directly
      queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], updatedLocalOrder);

      // Queue sync operation (async - don't await)
      syncOrder(urlOrderId).catch(err => {
        console.error('Failed to queue sync for order:', urlOrderId, err);
      });

      return;
    }

    // For server orders, use the API
    const patchLineItems: LineItemSchema[] = [];
    const existingLineItems = orderQuery.data.line_items.filter(
      li => li.product_id === productId && li.variation_id === variationId
    );

    // Mark existing items for deletion
    existingLineItems.forEach(li => {
      if (li.id) {
        patchLineItems.push({ ...li, quantity: 0 });
      }
    });

    // Add new item if quantity > 0
    if (finalQuantity > 0) {
      patchLineItems.push({
        name: product.name + (product.variation_name ? ` - ${product.variation_name}` : ''),
        product_id: product.product_id,
        variation_id: product.variation_id,
        quantity: finalQuantity,
        price: product.price,
        id: undefined,
      });
    }

    const updatedOrder = await OrdersAPI.updateOrder(orderQuery.data.id.toString(), {
      line_items: patchLineItems,
    });

    queryClient.setQueryData(['orders', orderQuery.data.id, 'detail'], updatedOrder);

  }, [orderQuery.data, getProductById, isFrontendIdOrder, urlOrderId, queryClient]);

  const handleMessage = useCallback((text: string, type: 'success' | 'error') => {
    const id = Date.now();
    setMessages(prev => [...prev, { id, text, type }]);

    // Auto-remove messages after 3 seconds
    setTimeout(() => {
      setMessages(prev => prev.filter(msg => msg.id !== id));
    }, 3000);
  }, []);

  return (
    <div className="flex flex-col h-full w-2/5 min-w-[500]">
      <h2 className="text-xl font-bold mb-4 px-4">Order #{orderId}</h2>

      {/* Messages */}
      {messages.length > 0 && (
        <div className="px-4 space-y-1">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`text-sm px-2 py-1 rounded ${
                msg.type === 'success'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>
      )}

      {/* Command Input */}
      <div className="px-4 mb-4">
        <POSCommandInput
          onMessage={handleMessage}
          onAddProduct={handleAddProduct}
        />
      </div>
      
      <div className="flex-1 flex flex-row overflow-hidden">
        <div className="flex flex-col h-full w-1/2 p-4">
          <LineItems />
          <div className="flex-1"></div>
          <OrderNote />
          <PaymentCard />
        </div>
        <div className="w-1/2 overflow-y-auto h-full p-4">
          <Service />
          <CustomerInfo />
        </div>
      </div>
      <div className="mx-4">
        <Buttons />
      </div>
    </div>
  );
}