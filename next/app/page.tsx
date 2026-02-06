'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOrdersQuery } from '@/stores/orders';

export default function Page() {
  const router = useRouter();
  const { ordersQuery, isLoading } = useOrdersQuery();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    const redirectToOrder = async () => {
      // Prevent multiple redirects
      if (hasRedirectedRef.current) return;

      // Wait for orders to load
      if (isLoading) return;

      if (ordersQuery.data && ordersQuery.data.length > 0) {
        // Redirect to first existing order (prefer frontend ID URL)
        hasRedirectedRef.current = true;
        const firstOrder = ordersQuery.data[0];
        const url = firstOrder.frontendId
          ? `/orders/${firstOrder.frontendId}`
          : `/orders/${firstOrder.id}`;
        router.replace(url);
      } else if (!isLoading) {
        // No orders exist, create a new one
        hasRedirectedRef.current = true;
        router.replace('/orders/new');
      }
    };

    redirectToOrder();
  }, [isLoading, ordersQuery.data, router]);

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-gray-500">Loading...</p>
    </div>
  );
}
