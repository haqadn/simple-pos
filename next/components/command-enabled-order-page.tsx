'use client';

import { useState, useCallback } from 'react';
import { POSCommandInput } from '@/components/pos-command-input';
import { useCurrentOrder } from '@/stores/orders';
import { useGetProductById } from '@/stores/products';
import Buttons from "@/app/orders/[orderId]/components/buttons";
import CustomerInfo from "@/app/orders/[orderId]/components/customer-info";
import LineItems from "@/app/orders/[orderId]/components/line-items";
import OrderNote from "@/app/orders/[orderId]/components/order-note";
import PaymentCard from "@/app/orders/[orderId]/components/payment-card";
import Service from "@/app/orders/[orderId]/components/service";

interface CommandEnabledOrderPageProps {
  orderId: string;
}

export default function CommandEnabledOrderPage({ orderId }: CommandEnabledOrderPageProps) {
  const [messages, setMessages] = useState<Array<{id: number, text: string, type: 'success' | 'error'}>>([]);
  
  // Data hooks
  const orderQuery = useCurrentOrder();
  const getProductById = useGetProductById();

  const handleMessage = useCallback((text: string, type: 'success' | 'error') => {
    const id = Date.now();
    setMessages(prev => [...prev, { id, text, type }]);
    
    // Auto-remove messages after 3 seconds
    setTimeout(() => {
      setMessages(prev => prev.filter(msg => msg.id !== id));
    }, 3000);
  }, []);

  // Handle adding products to the order
  const handleAddProduct = useCallback(async (productId: number, variationId: number, quantity: number) => {
    try {
      const product = getProductById(productId, variationId);
      
      if (!product) {
        throw new Error(`Product not found: ${productId}/${variationId}`);
      }

      if (!orderQuery.data) {
        throw new Error('No active order');
      }

      // Find existing line items for this product
      const existingLineItems = orderQuery.data.line_items.filter(
        li => li.product_id === productId && li.variation_id === variationId
      );
      
      // Calculate current quantity
      const currentQuantity = existingLineItems.reduce((sum, li) => sum + li.quantity, 0);
      const newQuantity = currentQuantity + quantity;

      // We need to trigger a re-render that will create the mutation
      // For now, let's manually call the API
      const OrdersAPI = (await import('@/api/orders')).default;
      
      // Prepare line items for the update
      const lineItems = [];
      
      // Remove existing items (set quantity to 0)
      existingLineItems.forEach(li => {
        if (li.id) {
          lineItems.push({ ...li, quantity: 0 });
        }
      });
      
      // Add new item with total quantity
      if (newQuantity > 0) {
        lineItems.push({
          name: product.name + (product.variation_name ? ` - ${product.variation_name}` : ''),
          product_id: productId,
          variation_id: variationId,
          quantity: newQuantity,
          id: undefined,
        });
      }
      
      // Update the order
      await OrdersAPI.updateOrder(orderQuery.data.id.toString(), {
        line_items: lineItems
      });
      
      // Refetch the order data
      await orderQuery.refetch();
      
      handleMessage(`Added ${quantity}x ${product.name} to order`, 'success');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      handleMessage(`Failed to add product: ${errorMessage}`, 'error');
      throw error;
    }
  }, [orderQuery, getProductById, handleMessage]);

  return (
    <div className="flex flex-col h-full w-2/5 min-w-[500]">
      <h2 className="text-xl font-bold mb-4 px-4">Order #{orderId}</h2>
      
      {/* Messages */}
      {messages.length > 0 && (
        <div className="px-4 space-y-1 mb-2">
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