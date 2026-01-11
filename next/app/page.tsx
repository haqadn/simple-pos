'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOrdersStore } from '@/stores/orders';

export default function Page() {
  const router = useRouter();
  const { ordersQuery, createOrder } = useOrdersStore();
  const isCreatingRef = useRef(false);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    const redirectToOrder = async () => {
      // Prevent multiple redirects/creations
      if (hasRedirectedRef.current || isCreatingRef.current) return;

      // Wait for orders to load
      if (ordersQuery.isLoading) return;

      if (ordersQuery.data && ordersQuery.data.length > 0) {
        // Redirect to first order
        hasRedirectedRef.current = true;
        router.replace(`/orders/${ordersQuery.data[0].id}`);
      } else if (!ordersQuery.isLoading) {
        // No orders exist, create a new one
        isCreatingRef.current = true;
        try {
          const order = await createOrder();
          if (order) {
            hasRedirectedRef.current = true;
            router.replace(`/orders/${order.id}`);
          }
        } catch (error) {
          console.error('Failed to create order:', error);
        } finally {
          isCreatingRef.current = false;
        }
      }
    };

    redirectToOrder();
  }, [ordersQuery.isLoading, ordersQuery.data, router, createOrder]);

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-gray-500">Loading...</p>
    </div>
  );
}
