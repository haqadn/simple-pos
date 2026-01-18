'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { createLocalOrder } from '@/stores/offline-orders';
import { useDraftOrderStore } from '@/stores/draft-order';

/**
 * New Order Page - creates a local order and redirects to its frontend ID URL.
 * This ensures all orders start as local-first orders in Dexie.
 */
export default function NewOrderPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const setCurrentFrontendId = useDraftOrderStore((state) => state.setCurrentFrontendId);
    const hasCreatedRef = useRef(false);

    useEffect(() => {
        const createAndRedirect = async () => {
            // Prevent multiple creations
            if (hasCreatedRef.current) return;
            hasCreatedRef.current = true;

            // Create a new local order in Dexie with a frontend ID
            const localOrder = await createLocalOrder();

            // Store the frontend ID in Zustand for quick access
            setCurrentFrontendId(localOrder.frontendId);

            // Invalidate queries to make the new order appear in the sidebar
            await queryClient.invalidateQueries({ queryKey: ['localOrders'] });
            await queryClient.invalidateQueries({ queryKey: ['ordersWithFrontendIds'] });

            // Redirect to the frontend ID URL
            router.replace(`/orders/${localOrder.frontendId}`);
        };

        createAndRedirect();
    }, [router, queryClient, setCurrentFrontendId]);

    return (
        <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Creating new order...</p>
        </div>
    );
}
