'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentOrder } from '@/stores/orders';
import { useDraftOrderStore } from '@/stores/draft-order';
import { usePrintStore, PrintJobData } from '@/stores/print';
import OrdersAPI from '@/api/orders';
import { useQueryClient } from '@tanstack/react-query';

interface ShortcutHandlers {
    onPrintKot?: () => void;
    onPrintBill?: () => void;
    onOpenDrawer?: () => void;
    onSelectService?: (index: number) => void;
    onDone?: () => void;
}

export function useGlobalShortcuts(handlers?: ShortcutHandlers) {
    const router = useRouter();
    const resetDraft = useDraftOrderStore((state) => state.resetDraft);
    const orderQuery = useCurrentOrder();
    const queryClient = useQueryClient();
    const printStore = usePrintStore();

    const handleNewOrder = useCallback(() => {
        // Reset draft and navigate to new order page (order only saved to DB when modified)
        resetDraft();
        router.push('/orders/new');
    }, [resetDraft, router]);

    // Build print data from order
    const buildPrintData = useCallback((type: 'bill' | 'kot'): PrintJobData | null => {
        const order = orderQuery.data;
        if (!order) return null;

        const printData: PrintJobData = {
            orderId: order.id,
            orderReference: order.id.toString(),
            cartName: order.meta_data.find(m => m.key === 'service_slug')?.value?.toString() || 'Order',
            orderTime: order.date_created,
            customerNote: order.customer_note,
            customer: {
                name: `${order.billing.first_name} ${order.billing.last_name}`.trim(),
                phone: order.billing.phone,
                address: [order.billing.address_1, order.billing.address_2, order.billing.city]
                    .filter(Boolean)
                    .join(', ') || undefined,
            },
        };

        if (type === 'bill') {
            printData.items = order.line_items.map(item => {
                const subtotal = parseFloat(item.subtotal || '0');
                const unitPrice = item.quantity > 0 ? subtotal / item.quantity : parseFloat(item.price?.toString() || '0');
                return {
                    id: item.id || 0,
                    name: item.name,
                    quantity: item.quantity,
                    price: unitPrice,
                };
            });
            printData.total = parseFloat(order.total);
            printData.discountTotal = parseFloat(order.discount_total || '0');
            const paymentMeta = order.meta_data.find(m => m.key === 'payment_received');
            printData.payment = paymentMeta ? parseFloat(paymentMeta.value?.toString() || '0') : 0;
        } else {
            printData.kotItems = order.line_items.map(item => ({
                id: item.id || 0,
                name: item.name,
                quantity: item.quantity,
                previousQuantity: undefined,
            }));
        }

        return printData;
    }, [orderQuery.data]);

    const handlePrintKot = useCallback(async () => {
        if (!orderQuery.data) return;

        const orderId = orderQuery.data.id;
        const printData = buildPrintData('kot');

        // Queue the print job
        if (printData) {
            await printStore.push('kot', printData);
        }

        // Mark as printed in meta_data
        try {
            await OrdersAPI.updateOrder(orderId.toString(), {
                meta_data: [
                    ...orderQuery.data.meta_data.filter(m => m.key !== 'last_kot_print'),
                    { key: 'last_kot_print', value: new Date().toISOString() }
                ]
            });
            await queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
        } catch (error) {
            console.error('Failed to print KOT:', error);
        }

        handlers?.onPrintKot?.();
    }, [orderQuery.data, queryClient, handlers, buildPrintData, printStore]);

    const handlePrintBill = useCallback(async () => {
        if (!orderQuery.data) return;

        const orderId = orderQuery.data.id;
        const printData = buildPrintData('bill');

        // Queue the print job
        if (printData) {
            await printStore.push('bill', printData);
        }

        // Mark as printed in meta_data
        try {
            await OrdersAPI.updateOrder(orderId.toString(), {
                meta_data: [
                    ...orderQuery.data.meta_data.filter(m => m.key !== 'last_bill_print'),
                    { key: 'last_bill_print', value: new Date().toISOString() }
                ]
            });
            await queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
        } catch (error) {
            console.error('Failed to print Bill:', error);
        }

        handlers?.onPrintBill?.();
    }, [orderQuery.data, queryClient, handlers, buildPrintData, printStore]);

    const handleFocusCommandBar = useCallback(() => {
        const commandInput = document.querySelector('input[aria-label="Command input field"]') as HTMLInputElement;
        if (commandInput) {
            commandInput.focus();
        }
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+N: New order
            if (e.ctrlKey && !e.shiftKey && e.key === 'n') {
                e.preventDefault();
                handleNewOrder();
                return;
            }

            // Alt+1-9: Select service option by index (use e.code for macOS compatibility)
            if (e.altKey && !e.ctrlKey && !e.shiftKey && /^Digit[1-9]$/.test(e.code)) {
                e.preventDefault();
                const index = parseInt(e.code.charAt(5), 10) - 1; // Extract digit from "Digit1" etc.
                handlers?.onSelectService?.(index);
                return;
            }

            // Ctrl+K: Print KOT
            if (e.ctrlKey && !e.shiftKey && e.key === 'k') {
                e.preventDefault();
                handlePrintKot();
                return;
            }

            // Ctrl+P: Print Bill
            if (e.ctrlKey && !e.shiftKey && e.key === 'p') {
                e.preventDefault();
                handlePrintBill();
                return;
            }

            // Ctrl+D: Open Drawer
            if (e.ctrlKey && !e.shiftKey && e.key === 'd') {
                e.preventDefault();
                handlers?.onOpenDrawer?.();
                return;
            }

            // Escape: Focus command bar (if not already focused)
            if (e.key === 'Escape') {
                const commandInput = document.querySelector('input[aria-label="Command input field"]') as HTMLInputElement;
                // Only focus if not already focused - let command bar handle its own escape
                if (commandInput && document.activeElement !== commandInput) {
                    e.preventDefault();
                    handleFocusCommandBar();
                }
                return;
            }

            // Ctrl+Enter: Complete order (done)
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                handlers?.onDone?.();
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNewOrder, handlePrintKot, handlePrintBill, handleFocusCommandBar, handlers]);

    return {
        handleNewOrder,
        handlePrintKot,
        handlePrintBill,
        handleFocusCommandBar
    };
}
