'use client';

import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCurrentOrder } from '@/stores/orders';
import { useDraftOrderStore, DRAFT_ORDER_ID } from '@/stores/draft-order';
import { usePrintStore } from '@/stores/print';
import { useProductsQuery } from '@/stores/products';
import { useSettingsStore } from '@/stores/settings';
import OrdersAPI, { OrderSchema } from '@/api/orders';
import { useQueryClient } from '@tanstack/react-query';
import { getMatchingShortcut } from '@/lib/shortcuts';
import { createLocalOrder, updateLocalOrder, getLocalOrder } from '@/stores/offline-orders';
import { isValidFrontendId } from '@/lib/frontend-id';
import { buildPrintData } from '@/lib/print-data';
import { createShouldSkipForKot } from '@/lib/kot';
import type { LocalOrder } from '@/db';

interface ShortcutHandlers {
    onPrintKot?: () => void;
    onPrintBill?: () => void;
    onOpenDrawer?: () => void;
    onSelectService?: (index: number) => void;
    onDone?: () => void;
}

export function useGlobalShortcuts(handlers?: ShortcutHandlers) {
    const router = useRouter();
    const params = useParams();
    const resetDraft = useDraftOrderStore((state) => state.resetDraft);
    const orderQuery = useCurrentOrder();
    const queryClient = useQueryClient();
    const printStore = usePrintStore();
    const { data: products } = useProductsQuery();
    const skipKotCategories = useSettingsStore(state => state.skipKotCategories);

    // Check if we're on a frontend ID URL
    const urlOrderId = params?.orderId as string | undefined;
    const isFrontendIdOrder = urlOrderId ? isValidFrontendId(urlOrderId) : false;

    // Track order ID for mutation checks
    const orderId = orderQuery.data?.id;

    // Helper to wait for mutations to settle and get fresh order data
    const waitForMutationsRef = useRef<() => Promise<OrderSchema | null>>(() => Promise.resolve(null));
    waitForMutationsRef.current = async () => {
        // For frontend ID orders, get from Dexie/cache
        if (isFrontendIdOrder && urlOrderId) {
            const cachedLocalOrder = queryClient.getQueryData<LocalOrder>(['localOrder', urlOrderId]);
            if (cachedLocalOrder) {
                return cachedLocalOrder.data;
            }
            // Fallback to fetching from Dexie
            const localOrder = await getLocalOrder(urlOrderId);
            return localOrder?.data || null;
        }

        if (!orderId || orderId === DRAFT_ORDER_ID) return orderQuery.data ?? null;

        // Poll until no mutations are in progress
        const checkMutations = () => {
            const mutating = queryClient.isMutating({
                predicate: (mutation) => {
                    const key = mutation.options.mutationKey;
                    return Array.isArray(key) && key[0] === 'orders' && key[1] === orderId;
                }
            });
            return mutating > 0;
        };

        // Wait for mutations to complete (max 5 seconds)
        let attempts = 0;
        while (checkMutations() && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        // Fetch fresh order data from server
        const freshOrder = await OrdersAPI.getOrder(orderId.toString());
        return freshOrder;
    };

    // Helper to check if a line item should be skipped on KOT based on category
    const shouldSkipForKot = useMemo(
        () => createShouldSkipForKot(products, skipKotCategories),
        [products, skipKotCategories]
    );

    const setCurrentFrontendId = useDraftOrderStore((state) => state.setCurrentFrontendId);

    const handleNewOrder = useCallback(async () => {
        // Reset draft state
        resetDraft();

        // Create a new local order in Dexie with a frontend ID
        const localOrder = await createLocalOrder();

        // Store the frontend ID in Zustand for quick access
        setCurrentFrontendId(localOrder.frontendId);

        // Invalidate queries to make the new order appear in the sidebar
        await queryClient.invalidateQueries({ queryKey: ['localOrders'] });
        await queryClient.invalidateQueries({ queryKey: ['ordersWithFrontendIds'] });

        // Navigate to the frontend ID URL
        router.push(`/orders/${localOrder.frontendId}`);
    }, [resetDraft, setCurrentFrontendId, router, queryClient]);

    const handlePrintKot = useCallback(async () => {
        if (!orderQuery.data) return;

        // Wait for mutations and get fresh order data for accurate change detection
        const freshOrder = await waitForMutationsRef.current?.();
        if (!freshOrder) {
            console.error('Failed to get fresh order data for KOT');
            return;
        }

        // Build and queue print job using shared utility
        const printData = buildPrintData({
            order: freshOrder,
            type: 'kot',
            urlOrderId,
            shouldSkipForKot,
        });
        await printStore.push('kot', printData);

        // Store current items for next KOT change detection (with names for removed item display)
        const currentItems: Record<string, { quantity: number; name: string }> = {};
        freshOrder.line_items.forEach(item => {
            const itemKey = `${item.product_id}-${item.variation_id}`;
            currentItems[itemKey] = { quantity: item.quantity, name: item.name };
        });

        // Mark as printed in meta_data and store item quantities
        const metaUpdates = [
            ...freshOrder.meta_data.filter(m =>
                m.key !== 'last_kot_print' && m.key !== 'last_kot_items'
            ),
            { key: 'last_kot_print', value: new Date().toISOString() },
            { key: 'last_kot_items', value: JSON.stringify(currentItems) }
        ];

        try {
            // For frontend ID orders, save to Dexie
            if (isFrontendIdOrder && urlOrderId) {
                const updatedLocalOrder = await updateLocalOrder(urlOrderId, { meta_data: metaUpdates });
                queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], updatedLocalOrder);
            } else if (freshOrder.id > 0) {
                // For server orders, update via API
                await OrdersAPI.updateOrder(freshOrder.id.toString(), { meta_data: metaUpdates });
                await queryClient.invalidateQueries({ queryKey: ['orders', freshOrder.id] });
            }
        } catch (error) {
            console.error('Failed to print KOT:', error);
        }

        handlers?.onPrintKot?.();
    }, [orderQuery.data, queryClient, handlers, printStore, isFrontendIdOrder, urlOrderId, shouldSkipForKot]);

    const handlePrintBill = useCallback(async () => {
        if (!orderQuery.data) return;

        try {
            // Wait for any pending mutations to complete and get fresh order data
            // This ensures the bill includes correct totals even if an item was just added
            const freshOrder = await waitForMutationsRef.current?.();
            if (!freshOrder) {
                console.error('Failed to get fresh order data for bill');
                return;
            }

            // Build and queue print job using shared utility
            const printData = buildPrintData({
                order: freshOrder,
                type: 'bill',
                urlOrderId,
                shouldSkipForKot,
            });
            await printStore.push('bill', printData);

            // Mark as printed in meta_data
            const metaUpdates = [
                ...freshOrder.meta_data.filter(m => m.key !== 'last_bill_print'),
                { key: 'last_bill_print', value: new Date().toISOString() }
            ];

            // For frontend ID orders, save to Dexie
            if (isFrontendIdOrder && urlOrderId) {
                const updatedLocalOrder = await updateLocalOrder(urlOrderId, { meta_data: metaUpdates });
                queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], updatedLocalOrder);
            } else if (freshOrder.id > 0) {
                // For server orders, update via API
                await OrdersAPI.updateOrder(freshOrder.id.toString(), { meta_data: metaUpdates });
                await queryClient.invalidateQueries({ queryKey: ['orders', freshOrder.id] });
            }
        } catch (error) {
            console.error('Failed to print Bill:', error);
        }

        handlers?.onPrintBill?.();
    }, [orderQuery.data, queryClient, handlers, printStore, isFrontendIdOrder, urlOrderId, shouldSkipForKot]);

    const handleFocusCommandBar = useCallback(() => {
        const commandInput = document.querySelector('input[aria-label="Command input field"]') as HTMLInputElement;
        if (commandInput) {
            commandInput.focus();
        }
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const shortcutId = getMatchingShortcut(e);

            if (shortcutId) {
                e.preventDefault();

                switch (shortcutId) {
                    case 'newOrder':
                        handleNewOrder();
                        break;
                    case 'printKot':
                        handlePrintKot();
                        break;
                    case 'printBill':
                        handlePrintBill();
                        break;
                    case 'openDrawer':
                        handlers?.onOpenDrawer?.();
                        break;
                    case 'done':
                        handlers?.onDone?.();
                        break;
                    default:
                        // Handle selectService0-9
                        if (shortcutId.startsWith('selectService')) {
                            const index = parseInt(shortcutId.replace('selectService', ''), 10);
                            handlers?.onSelectService?.(index);
                        }
                        break;
                }
                return;
            }

            // Escape: Focus command bar (if not already focused) - not in registry as it's context-dependent
            if (e.key === 'Escape') {
                const commandInput = document.querySelector('input[aria-label="Command input field"]') as HTMLInputElement;
                // Only focus if not already focused - let command bar handle its own escape
                if (commandInput && document.activeElement !== commandInput) {
                    e.preventDefault();
                    handleFocusCommandBar();
                }
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
