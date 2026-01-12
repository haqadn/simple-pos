'use client';

import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';
import { useCallback } from 'react';
import { useCurrentOrder, useOrdersStore, useServiceQuery } from '@/stores/orders';
import { useTablesQuery, useDeliveryZonesQuery } from '@/stores/service';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import OrdersAPI from '@/api/orders';

export function GlobalShortcutsProvider({ children }: { children: React.ReactNode }) {
    const orderQuery = useCurrentOrder();
    const queryClient = useQueryClient();
    const router = useRouter();
    const { ordersQuery } = useOrdersStore();
    const { data: tables } = useTablesQuery();
    const { data: deliveryZones } = useDeliveryZonesQuery();
    const [, serviceMutation] = useServiceQuery(orderQuery);

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

    // Print bill handler
    const handlePrintBill = useCallback(async () => {
        if (!orderQuery.data) return;

        const orderId = orderQuery.data.id;
        console.log(`Printing Bill for order ${orderId}`);

        try {
            await OrdersAPI.updateOrder(orderId.toString(), {
                meta_data: [
                    ...orderQuery.data.meta_data.filter(m => m.key !== 'last_bill_print'),
                    { key: 'last_bill_print', value: new Date().toISOString() }
                ]
            });
            await queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
        } catch (error) {
            console.error('Failed to print bill:', error);
        }
    }, [orderQuery.data, queryClient]);

    // Open drawer handler
    const handleOpenDrawer = useCallback(() => {
        console.log('Opening cash drawer');
        // TODO: Integrate with actual cash drawer hardware
    }, []);

    // Done handler - complete order
    const handleDone = useCallback(async () => {
        if (!orderQuery.data) return;

        const orderId = orderQuery.data.id;
        const total = parseFloat(orderQuery.data.total || '0');
        const paymentMeta = orderQuery.data.meta_data.find(m => m.key === 'payment_received');
        const received = paymentMeta ? parseFloat(String(paymentMeta.value)) : 0;

        if (received < total) {
            console.warn('Cannot complete order: payment not received');
            return;
        }

        try {
            await OrdersAPI.updateOrder(orderId.toString(), { status: 'completed' });
            await queryClient.invalidateQueries({ queryKey: ['orders'] });

            // Navigate to next pending order or home
            const orders = ordersQuery.data || [];
            const nextOrder = orders.find(o => o.id !== orderId && o.status === 'pending');
            if (nextOrder) {
                router.push(`/orders/${nextOrder.id}`);
            } else {
                router.push('/');
            }
        } catch (error) {
            console.error('Failed to complete order:', error);
        }
    }, [orderQuery.data, queryClient, ordersQuery.data, router]);

    useGlobalShortcuts({
        onSelectService: handleSelectService,
        onPrintBill: handlePrintBill,
        onOpenDrawer: handleOpenDrawer,
        onDone: handleDone
    });

    return <>{children}</>;
}
