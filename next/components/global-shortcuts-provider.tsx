'use client';

import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';
import { useCallback } from 'react';
import { useCurrentOrder, useOrdersStore, useServiceQuery } from '@/stores/orders';
import { useTablesQuery, useDeliveryZonesQuery } from '@/stores/service';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import OrdersAPI from '@/api/orders';
import { usePrintStore } from '@/stores/print';
import { isValidFrontendId } from '@/lib/frontend-id';
import { updateLocalOrderStatus } from '@/stores/offline-orders';
import { syncOrder } from '@/services/sync';

export function GlobalShortcutsProvider({ children }: { children: React.ReactNode }) {
    const orderQuery = useCurrentOrder();
    const queryClient = useQueryClient();
    const router = useRouter();
    const params = useParams();
    const { ordersQuery } = useOrdersStore();
    const { data: tables } = useTablesQuery();
    const { data: deliveryZones } = useDeliveryZonesQuery();
    const [, serviceMutation] = useServiceQuery(orderQuery);
    const printStore = usePrintStore();

    // Check if we're on a frontend ID URL
    const urlOrderId = params?.orderId as string | undefined;
    const isFrontendIdOrder = urlOrderId ? isValidFrontendId(urlOrderId) : false;

    // Select service by index (Alt+0-9)
    const handleSelectService = useCallback((index: number) => {
        // Combine tables and delivery zones in order
        const allServices = [
            ...(tables || []),
            ...(deliveryZones || [])
        ];

        if (index >= 0 && index < allServices.length && index < 10) {
            const service = allServices[index];
            serviceMutation.mutate({ service });
        }
    }, [tables, deliveryZones, serviceMutation]);

    // Open drawer handler
    const handleOpenDrawer = useCallback(async () => {
        await printStore.push('drawer', null);
    }, [printStore]);

    // Done handler - complete order
    const handleDone = useCallback(async () => {
        if (!orderQuery.data) return;

        const total = parseFloat(orderQuery.data.total || '0');
        const paymentMeta = orderQuery.data.meta_data.find(m => m.key === 'payment_received');
        const received = paymentMeta ? parseFloat(String(paymentMeta.value)) : 0;

        if (received < total) {
            console.warn('Cannot complete order: payment not received');
            return;
        }

        try {
            // For frontend ID orders, complete locally then sync
            if (isFrontendIdOrder && urlOrderId) {
                await updateLocalOrderStatus(urlOrderId, 'completed');
                queryClient.invalidateQueries({ queryKey: ['localOrder', urlOrderId] });
                queryClient.invalidateQueries({ queryKey: ['localOrders'] });
                queryClient.invalidateQueries({ queryKey: ['ordersWithFrontendIds'] });

                // Sync to server in background (non-blocking)
                syncOrder(urlOrderId).catch(err => console.error('Sync failed:', err));
            } else if (orderQuery.data.id > 0) {
                // For server orders, update via API
                await OrdersAPI.updateOrder(orderQuery.data.id.toString(), { status: 'completed' });
                await queryClient.invalidateQueries({ queryKey: ['orders'] });
            }

            // Check if there's cash payment (from split_payments meta)
            const splitPaymentsMeta = orderQuery.data.meta_data?.find(m => m.key === 'split_payments');
            let cashPayment = 0;
            if (splitPaymentsMeta && typeof splitPaymentsMeta.value === 'string') {
                try {
                    const payments = JSON.parse(splitPaymentsMeta.value);
                    cashPayment = payments.cash || 0;
                } catch { /* ignore */ }
            } else {
                // Legacy: if no split_payments, assume all payment is cash
                cashPayment = received;
            }

            // Open drawer if there's cash payment or change
            const change = received - total;
            if (cashPayment > 0 || change > 0) {
                await printStore.push('drawer', null);
            }

            // Navigate to next pending order or home
            const orders = ordersQuery.data || [];
            const orderId = orderQuery.data.id;
            const nextOrder = orders.find(o => o.id !== orderId && o.status === 'pending');
            if (nextOrder) {
                // Prefer using frontend ID if available
                const nextFrontendId = nextOrder.meta_data?.find(m => m.key === 'pos_frontend_id')?.value;
                if (nextFrontendId && typeof nextFrontendId === 'string') {
                    router.push(`/orders/${nextFrontendId}`);
                } else {
                    router.push(`/orders/${nextOrder.id}`);
                }
            } else {
                router.push('/');
            }
        } catch (error) {
            console.error('Failed to complete order:', error);
        }
    }, [orderQuery.data, queryClient, ordersQuery.data, router, printStore, isFrontendIdOrder, urlOrderId]);

    useGlobalShortcuts({
        onSelectService: handleSelectService,
        onOpenDrawer: handleOpenDrawer,
        onDone: handleDone
    });

    return <>{children}</>;
}
