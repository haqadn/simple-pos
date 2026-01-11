'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useOrdersStore, useCurrentOrder } from '@/stores/orders';
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
    const { createOrder } = useOrdersStore();
    const orderQuery = useCurrentOrder();
    const queryClient = useQueryClient();

    const handleNewOrder = useCallback(async () => {
        try {
            const order = await createOrder();
            if (order) {
                router.push(`/orders/${order.id}`);
            }
        } catch (error) {
            console.error('Failed to create order:', error);
        }
    }, [createOrder, router]);

    const handlePrintKot = useCallback(async () => {
        if (!orderQuery.data) return;

        const orderId = orderQuery.data.id;
        console.log(`Printing KOT for order ${orderId}`);

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
    }, [orderQuery.data, queryClient, handlers]);

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
                handlers?.onPrintBill?.();
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
    }, [handleNewOrder, handlePrintKot, handleFocusCommandBar, handlers]);

    return {
        handleNewOrder,
        handlePrintKot,
        handleFocusCommandBar
    };
}
