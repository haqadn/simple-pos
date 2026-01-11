'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOrdersStore } from '@/stores/orders';
import { useDraftOrderStore } from '@/stores/draft-order';

export default function Page() {
  const router = useRouter();
  const { ordersQuery } = useOrdersStore();
  const resetDraft = useDraftOrderStore((state) => state.resetDraft);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    const redirectToOrder = async () => {
      // Prevent multiple redirects
      if (hasRedirectedRef.current) return;

      // Wait for orders to load
      if (ordersQuery.isLoading) return;

      if (ordersQuery.data && ordersQuery.data.length > 0) {
        // Redirect to first existing order
        hasRedirectedRef.current = true;
        router.replace(`/orders/${ordersQuery.data[0].id}`);
      } else if (!ordersQuery.isLoading) {
        // No orders exist, redirect to draft order (not saved to DB yet)
        hasRedirectedRef.current = true;
        resetDraft(); // Reset draft to clean state
        router.replace('/orders/new');
      }
    };

    redirectToOrder();
  }, [ordersQuery.isLoading, ordersQuery.data, router, resetDraft]);

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-gray-500">Loading...</p>
    </div>
  );
}
