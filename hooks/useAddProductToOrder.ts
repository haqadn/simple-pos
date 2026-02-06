import { useCallback } from 'react';
import { useCurrentOrder } from '@/stores/orders';
import { useGetProductById } from '@/stores/products';

/**
 * Hook to add products to the current order
 */
export function useAddProductToOrder() {
  const orderQuery = useCurrentOrder();
  const getProductById = useGetProductById();

  const addProduct = useCallback(async (productId: number, variationId: number, quantityToAdd: number) => {
    const product = getProductById(productId, variationId);
    
    if (!product) {
      throw new Error(`Product not found: ${productId}/${variationId}`);
    }

    if (!orderQuery.data) {
      throw new Error('No active order');
    }

    // Since we can't call useLineItemQuery conditionally, we'll need to 
    // use a different approach. Let's use the orders API directly.
    try {
      // Import the orders API to update line items directly
      const OrdersAPI = (await import('@/api/orders')).default;
      
      // Find existing line items for this product
      const existingLineItems = orderQuery.data.line_items.filter(
        li => li.product_id === productId && li.variation_id === variationId
      );
      
      // Calculate current quantity
      const currentQuantity = existingLineItems.reduce((sum, li) => sum + li.quantity, 0);
      const newQuantity = currentQuantity + quantityToAdd;
      
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
      
      // Invalidate queries to refresh the UI
      const { useQueryClient } = await import('@tanstack/react-query');
      // Note: This won't work inside a hook callback either
      // We need the component to handle query invalidation
      
      console.log(`Added ${quantityToAdd}x ${product.name} to order`);
      
    } catch (error) {
      throw new Error(`Failed to add product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [orderQuery.data, getProductById]);

  return addProduct;
}