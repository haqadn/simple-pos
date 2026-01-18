'use client';

import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentOrder } from '@/stores/orders';
import { useDraftOrderStore, DRAFT_ORDER_ID } from '@/stores/draft-order';
import { usePrintStore, PrintJobData } from '@/stores/print';
import { useProductsQuery } from '@/stores/products';
import { useSettingsStore } from '@/stores/settings';
import OrdersAPI, { OrderSchema } from '@/api/orders';
import { useQueryClient } from '@tanstack/react-query';
import { getMatchingShortcut } from '@/lib/shortcuts';
import { createLocalOrder } from '@/stores/offline-orders';

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
    const { data: products } = useProductsQuery();
    const skipKotCategories = useSettingsStore(state => state.skipKotCategories);

    // Track order ID for mutation checks
    const orderId = orderQuery.data?.id;

    // Helper to wait for mutations to settle and get fresh order data
    const waitForMutationsRef = useRef<() => Promise<OrderSchema | null>>(() => Promise.resolve(null));
    waitForMutationsRef.current = async () => {
        if (!orderId || orderId === DRAFT_ORDER_ID) return orderQuery.data;

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
    const shouldSkipForKot = useMemo(() => {
        if (!products || skipKotCategories.length === 0) return () => false;

        return (productId: number, variationId: number) => {
            const product = products.find(
                p => p.product_id === productId && p.variation_id === variationId
            );
            if (!product) return false;
            return product.categories.some(cat => skipKotCategories.includes(cat.id));
        };
    }, [products, skipKotCategories]);

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

    // Build print data from order (accepts optional order override for fresh data)
    const buildPrintData = useCallback((type: 'bill' | 'kot', orderOverride?: OrderSchema | null): PrintJobData | null => {
        const order = orderOverride ?? orderQuery.data;
        if (!order) return null;

        const shippingLine = order.shipping_lines?.find(s => s.method_title);
        const isTable = shippingLine?.method_id === 'pickup_location';

        const printData: PrintJobData = {
            orderId: order.id,
            orderReference: order.id.toString(),
            cartName: shippingLine?.method_title || 'Order',
            serviceType: shippingLine ? (isTable ? 'table' : 'delivery') : undefined,
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
            // Sum up shipping costs from all shipping lines
            printData.shippingTotal = order.shipping_lines?.reduce(
                (sum, line) => sum + parseFloat(line.total || '0'), 0
            ) || 0;
            const paymentMeta = order.meta_data.find(m => m.key === 'payment_received');
            printData.payment = paymentMeta ? parseFloat(paymentMeta.value?.toString() || '0') : 0;
        } else {
            // Get previous KOT items from meta_data for change detection
            const lastKotMeta = order.meta_data.find(m => m.key === 'last_kot_items');
            const previousItems: Record<string, { quantity: number; name: string }> = {};
            if (lastKotMeta && typeof lastKotMeta.value === 'string') {
                try {
                    const parsed = JSON.parse(lastKotMeta.value);
                    // Handle both old format (number) and new format ({quantity, name})
                    Object.entries(parsed).forEach(([key, val]) => {
                        if (typeof val === 'number') {
                            previousItems[key] = { quantity: val, name: 'Unknown Item' };
                        } else if (val && typeof val === 'object' && 'quantity' in val) {
                            previousItems[key] = val as { quantity: number; name: string };
                        }
                    });
                } catch { /* ignore parse errors */ }
            }

            // Track which previous items we've seen
            const seenKeys = new Set<string>();

            // Current items (filtered by category)
            const kotItems = order.line_items
                .filter(item => !shouldSkipForKot(item.product_id, item.variation_id))
                .map(item => {
                    const itemKey = `${item.product_id}-${item.variation_id}`;
                    seenKeys.add(itemKey);
                    return {
                        id: item.id || 0,
                        name: item.name,
                        quantity: item.quantity,
                        previousQuantity: previousItems[itemKey]?.quantity,
                    };
                });

            // Add removed items (were in previous KOT but not in current order)
            // Parse itemKey to get product/variation IDs for category filtering
            Object.entries(previousItems).forEach(([itemKey, prev]) => {
                if (!seenKeys.has(itemKey) && prev.quantity > 0) {
                    const [productId, variationId] = itemKey.split('-').map(Number);
                    if (!shouldSkipForKot(productId, variationId)) {
                        kotItems.push({
                            id: 0,
                            name: prev.name,
                            quantity: 0,
                            previousQuantity: prev.quantity,
                        });
                    }
                }
            });

            printData.kotItems = kotItems;
        }

        return printData;
    }, [orderQuery.data, shouldSkipForKot]);

    const handlePrintKot = useCallback(async () => {
        if (!orderQuery.data) return;

        // Wait for mutations and get fresh order data for accurate change detection
        const freshOrder = await waitForMutationsRef.current?.();
        if (!freshOrder) {
            console.error('Failed to get fresh order data for KOT');
            return;
        }

        const orderId = freshOrder.id;
        const printData = buildPrintData('kot', freshOrder);

        // Queue the print job
        if (printData) {
            await printStore.push('kot', printData);
        }

        // Store current items for next KOT change detection (with names for removed item display)
        const currentItems: Record<string, { quantity: number; name: string }> = {};
        freshOrder.line_items.forEach(item => {
            const itemKey = `${item.product_id}-${item.variation_id}`;
            currentItems[itemKey] = { quantity: item.quantity, name: item.name };
        });

        // Mark as printed in meta_data and store item quantities
        try {
            await OrdersAPI.updateOrder(orderId.toString(), {
                meta_data: [
                    ...freshOrder.meta_data.filter(m =>
                        m.key !== 'last_kot_print' && m.key !== 'last_kot_items'
                    ),
                    { key: 'last_kot_print', value: new Date().toISOString() },
                    { key: 'last_kot_items', value: JSON.stringify(currentItems) }
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

        try {
            // Wait for any pending mutations to complete and get fresh order data
            // This ensures the bill includes correct totals even if an item was just added
            const freshOrder = await waitForMutationsRef.current?.();
            if (!freshOrder) {
                console.error('Failed to get fresh order data for bill');
                return;
            }

            const printData = buildPrintData('bill', freshOrder);

            // Queue the print job
            if (printData) {
                await printStore.push('bill', printData);
            }

            // Mark as printed in meta_data
            await OrdersAPI.updateOrder(freshOrder.id.toString(), {
                meta_data: [
                    ...freshOrder.meta_data.filter(m => m.key !== 'last_bill_print'),
                    { key: 'last_bill_print', value: new Date().toISOString() }
                ]
            });
            await queryClient.invalidateQueries({ queryKey: ['orders', freshOrder.id] });
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
