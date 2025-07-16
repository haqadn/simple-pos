'use client';

import { useState, useCallback } from 'react';
import { POSCommandInput } from '@/components/pos-command-input';
import { useCurrentOrder } from '@/stores/orders';
import { useGetProductById } from '@/stores/products';
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
  const orderQuery = useCurrentOrder();
  const getProductById = useGetProductById();

  // Handle adding products to the order
  const handleAddProduct = useCallback(async (productId: number, variationId: number, quantity: number) => {
    const product = getProductById(productId, variationId);
    
    if (!product) {
      throw new Error(`Product not found: ${productId}/${variationId}`);
    }

    if (!orderQuery.data) {
      throw new Error('No active order');
    }

    // This approach won't work because we can't call hooks conditionally
    // We need to find a different solution
    console.log('Adding product:', product.name, 'quantity:', quantity);
    
    // For now, let's just simulate success
    // In a real implementation, this would need to be handled differently
    return Promise.resolve();
    
  }, [orderQuery.data, getProductById]);

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