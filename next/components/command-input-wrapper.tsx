'use client';

import { useCallback } from 'react';
import { CommandInput } from './command-input';
import { useCurrentOrder, useLineItemQuery } from '@/stores/orders';
import { useGetProductById } from '@/stores/products';

interface CommandInputWrapperProps {
  onMessage?: (message: string, type: 'success' | 'error') => void;
}

export function CommandInputWrapper({ onMessage }: CommandInputWrapperProps) {
  const orderQuery = useCurrentOrder();
  const getProductById = useGetProductById();

  // Create a function to update line item quantities
  const updateLineItemQuantity = useCallback(async (productId: number, variationId: number, quantity: number) => {
    // Find the product
    const product = getProductById(productId, variationId);
    
    if (!product) {
      throw new Error(`Product not found: ${productId}/${variationId}`);
    }

    if (!orderQuery.data) {
      throw new Error('No active order');
    }

    // Use the existing line item query system
    const [, mutation] = useLineItemQuery(orderQuery, product);
    
    // Find current quantity in the order
    const existingLineItems = orderQuery.data.line_items.filter(
      li => li.product_id === productId && li.variation_id === variationId
    );
    const currentQuantity = existingLineItems.reduce((sum, li) => sum + li.quantity, 0);
    
    // Add to existing quantity (this is for the add command)
    const newQuantity = currentQuantity + quantity;
    
    // Execute the mutation
    await mutation.mutateAsync({ quantity: newQuantity });
    
  }, [orderQuery, getProductById]);

  return (
    <CommandInput 
      onMessage={onMessage}
      updateLineItemQuantity={updateLineItemQuantity}
    />
  );
}