'use client'

import { useState, useCallback, useMemo } from "react";
import { ButtonGroup, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Kbd } from "@heroui/react";
import { useCurrentOrder, useOrdersQuery } from "@/stores/orders";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import OrdersAPI, { OrderSchema } from "@/api/orders";
import { DRAFT_ORDER_ID } from "@/stores/draft-order";
import { usePrintStore } from "@/stores/print";
import { useProductsQuery } from "@/stores/products";
import { useSettingsStore } from "@/stores/settings";
import { createShouldSkipForKot } from "@/lib/kot";
import { isValidFrontendId } from "@/lib/frontend-id";
import { buildPrintData, buildPrintMetaUpdates } from "@/lib/print-data";
import { getLocalOrder, updateLocalOrder, updateLocalOrderStatus, updateLocalOrderSyncStatus, deleteLocalOrder, ensureServerOrder } from "@/stores/offline-orders";
import type { LocalOrder } from "@/db";

export default function Buttons() {
    const orderQuery = useCurrentOrder();
    const queryClient = useQueryClient();
    const router = useRouter();
    const params = useParams();
    const printStore = usePrintStore();
    const { data: products } = useProductsQuery();
    const skipKotCategories = useSettingsStore(state => state.skipKotCategories);
    const { ordersQuery: combinedOrdersQuery } = useOrdersQuery();
    const [isPrintingKot, setIsPrintingKot] = useState(false);
    const [isPrintingBill, setIsPrintingBill] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);

    // Get frontend ID from URL params (primary source for frontend ID URLs)
    const urlOrderId = params?.orderId as string | undefined;
    const isFrontendIdOrder = urlOrderId ? isValidFrontendId(urlOrderId) : false;

    // Track order ID for mutation checks
    const orderId = orderQuery.data?.id;

    // Helper to get fresh order data (from cache for local orders, from server for server orders)
    const getFreshOrderData = useCallback(async (): Promise<OrderSchema | null> => {
        // For frontend ID orders, use local cache
        if (isFrontendIdOrder && urlOrderId) {
            const cachedLocalOrder = queryClient.getQueryData<LocalOrder>(['localOrder', urlOrderId]);
            if (cachedLocalOrder) {
                return cachedLocalOrder.data;
            }
            // Fallback to fetching from Dexie
            const localOrder = await getLocalOrder(urlOrderId);
            return localOrder?.data || null;
        }

        // For server orders, use the order query data
        if (!orderId || orderId === DRAFT_ORDER_ID) return orderQuery.data ?? null;

        // For real server orders, fetch fresh data
        return await OrdersAPI.getOrder(orderId.toString());
    }, [isFrontendIdOrder, urlOrderId, orderId, orderQuery.data, queryClient]);

    // Helper to check if a line item should be skipped on KOT based on category
    const shouldSkipForKot = useMemo(
        () => createShouldSkipForKot(products, skipKotCategories),
        [products, skipKotCategories]
    );

    const handlePrintKot = useCallback(async () => {
        if (!orderQuery.data) return;

        setIsPrintingKot(true);
        try {
            // Get fresh order data
            const freshOrder = await getFreshOrderData();
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

            // Build meta_data updates (only updates last_kot_items when there are actual changes)
            const metaUpdates = buildPrintMetaUpdates({ order: freshOrder, type: 'kot', printData });

            // For frontend ID orders, save to Dexie
            if (isFrontendIdOrder && urlOrderId) {
                const updatedLocalOrder = await updateLocalOrder(urlOrderId, { meta_data: metaUpdates });
                queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], updatedLocalOrder);
            } else if (freshOrder.id > 0 && freshOrder.id !== DRAFT_ORDER_ID) {
                // For server orders, update via API
                await OrdersAPI.updateOrder(freshOrder.id.toString(), { meta_data: metaUpdates });
                await queryClient.invalidateQueries({ queryKey: ['orders', freshOrder.id] });
            }
        } catch (error) {
            console.error('Failed to print KOT:', error);
        } finally {
            setIsPrintingKot(false);
        }
    }, [orderQuery.data, queryClient, printStore, getFreshOrderData, isFrontendIdOrder, urlOrderId, shouldSkipForKot]);

    const handlePrintBill = useCallback(async () => {
        if (!orderQuery.data) return;

        setIsPrintingBill(true);
        try {
            // Get fresh order data
            const freshOrder = await getFreshOrderData();
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

            // Build meta_data updates
            const metaUpdates = buildPrintMetaUpdates({ order: freshOrder, type: 'bill', printData });

            // For frontend ID orders, save to Dexie
            if (isFrontendIdOrder && urlOrderId) {
                const updatedLocalOrder = await updateLocalOrder(urlOrderId, { meta_data: metaUpdates });
                queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], updatedLocalOrder);
            } else if (freshOrder.id > 0 && freshOrder.id !== DRAFT_ORDER_ID) {
                // For server orders, update via API
                await OrdersAPI.updateOrder(freshOrder.id.toString(), { meta_data: metaUpdates });
                await queryClient.invalidateQueries({ queryKey: ['orders', freshOrder.id] });
            }
        } catch (error) {
            console.error('Failed to print Bill:', error);
        } finally {
            setIsPrintingBill(false);
        }
    }, [orderQuery.data, queryClient, printStore, getFreshOrderData, isFrontendIdOrder, urlOrderId, shouldSkipForKot]);

    const handleCancelOrder = useCallback(async () => {
        if (!orderQuery.data) return;

        setIsCancelling(true);
        try {
            // For frontend ID orders, update local status
            if (isFrontendIdOrder && urlOrderId) {
                // Check if order has been synced to server
                const localOrder = await getLocalOrder(urlOrderId);
                if (localOrder?.serverId) {
                    // Cancel on server first
                    await OrdersAPI.cancelOrder(localOrder.serverId.toString());
                    // Update local status to cancelled
                    await updateLocalOrderStatus(urlOrderId, 'cancelled');
                } else {
                    // Order hasn't synced yet - just delete it from local DB
                    await deleteLocalOrder(urlOrderId);
                }
                queryClient.invalidateQueries({ queryKey: ['localOrder', urlOrderId] });
                queryClient.invalidateQueries({ queryKey: ['orders'] });
                queryClient.invalidateQueries({ queryKey: ['todaysOrders'] });
            } else if (orderQuery.data.id > 0 && orderQuery.data.id !== DRAFT_ORDER_ID) {
                // For server orders, cancel via API
                await OrdersAPI.cancelOrder(orderQuery.data.id.toString());
                await queryClient.invalidateQueries({ queryKey: ['orders'] });
            }

            // Navigate to next order or create new one (same logic as Done)
            // Filter out the current order from the list
            const otherOrders = combinedOrdersQuery.data?.filter(o => {
                // Exclude current order by frontend ID or server ID
                if (isFrontendIdOrder && o.frontendId === urlOrderId) return false;
                if (!isFrontendIdOrder && o.id === orderQuery.data?.id) return false;
                return true;
            }) || [];

            if (otherOrders.length > 0) {
                // Navigate to the first (top) order in the list
                const nextOrder = otherOrders[0];
                const nextUrl = nextOrder.frontendId
                    ? `/orders/${nextOrder.frontendId}`
                    : `/orders/${nextOrder.id}`;
                router.push(nextUrl);
            } else {
                // No other orders, create a new one
                router.push('/orders/new');
            }
        } catch (error) {
            console.error('Failed to cancel order:', error);
        } finally {
            setIsCancelling(false);
        }
    }, [orderQuery.data, queryClient, router, isFrontendIdOrder, urlOrderId, combinedOrdersQuery.data]);

    // Done button handler for local orders
    const handleDone = useCallback(async () => {
        if (!orderQuery.data) return;

        setIsCompleting(true);
        try {
            // For frontend ID orders, complete locally and sync to server
            if (isFrontendIdOrder && urlOrderId) {
                // Update local order status immediately
                await updateLocalOrderStatus(urlOrderId, 'completed');

                queryClient.invalidateQueries({ queryKey: ['localOrder', urlOrderId] });
                queryClient.invalidateQueries({ queryKey: ['orders'] });

                // Ensure server order exists and sync the completion status
                try {
                    const serverId = await ensureServerOrder(urlOrderId);

                    // Update server with completed status
                    await OrdersAPI.updateOrder(serverId.toString(), { status: 'completed' });

                    // Mark as synced
                    await updateLocalOrderSyncStatus(urlOrderId, 'synced', { serverId });
                } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : 'Unknown error during sync';
                    console.error('Failed to sync order completion:', errorMessage);

                    // Mark for retry on failure
                    await updateLocalOrderSyncStatus(urlOrderId, 'error', {
                        syncError: errorMessage,
                        lastSyncAttempt: new Date(),
                    });
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
                    const paymentMeta = orderQuery.data.meta_data?.find(m => m.key === 'payment_received');
                    cashPayment = paymentMeta ? parseFloat(String(paymentMeta.value)) : 0;
                }

                // Open drawer if there's cash payment or change
                const total = parseFloat(orderQuery.data.total || '0');
                const paymentMeta = orderQuery.data.meta_data?.find(m => m.key === 'payment_received');
                const received = paymentMeta ? parseFloat(String(paymentMeta.value)) : 0;
                const change = received - total;
                if (cashPayment > 0 || change > 0) {
                    await printStore.push('drawer', null);
                }
            } else if (orderQuery.data.id > 0 && orderQuery.data.id !== DRAFT_ORDER_ID) {
                // For server orders, update via API
                await OrdersAPI.updateOrder(orderQuery.data.id.toString(), { status: 'completed' });
                await queryClient.invalidateQueries({ queryKey: ['orders'] });

                // Check cash payment and open drawer
                const splitPaymentsMeta = orderQuery.data.meta_data?.find(m => m.key === 'split_payments');
                let cashPayment = 0;
                if (splitPaymentsMeta && typeof splitPaymentsMeta.value === 'string') {
                    try {
                        const payments = JSON.parse(splitPaymentsMeta.value);
                        cashPayment = payments.cash || 0;
                    } catch { /* ignore */ }
                } else {
                    const paymentMeta = orderQuery.data.meta_data?.find(m => m.key === 'payment_received');
                    cashPayment = paymentMeta ? parseFloat(String(paymentMeta.value)) : 0;
                }

                const total = parseFloat(orderQuery.data.total || '0');
                const paymentMeta = orderQuery.data.meta_data?.find(m => m.key === 'payment_received');
                const received = paymentMeta ? parseFloat(String(paymentMeta.value)) : 0;
                const change = received - total;
                if (cashPayment > 0 || change > 0) {
                    await printStore.push('drawer', null);
                }
            }

            // Navigate to next order or create new one
            // Filter out the current order from the list
            const otherOrders = combinedOrdersQuery.data?.filter(o => {
                // Exclude current order by frontend ID or server ID
                if (isFrontendIdOrder && o.frontendId === urlOrderId) return false;
                if (!isFrontendIdOrder && o.id === orderQuery.data?.id) return false;
                return true;
            }) || [];

            if (otherOrders.length > 0) {
                // Navigate to the first (top) order in the list
                const nextOrder = otherOrders[0];
                const nextUrl = nextOrder.frontendId
                    ? `/orders/${nextOrder.frontendId}`
                    : `/orders/${nextOrder.id}`;
                router.push(nextUrl);
            } else {
                // No other orders, create a new one
                router.push('/orders/new');
            }
        } catch (error) {
            console.error('Failed to complete order:', error);
        } finally {
            setIsCompleting(false);
        }
    }, [orderQuery.data, queryClient, router, printStore, isFrontendIdOrder, urlOrderId, combinedOrdersQuery.data]);

    // isDraft is true only for the legacy /orders/new route, not for frontend ID orders
    const isDraft = orderQuery.data?.id === DRAFT_ORDER_ID && !isFrontendIdOrder;
    const hasItems = (orderQuery.data?.line_items?.length ?? 0) > 0;
    const total = parseFloat(orderQuery.data?.total || '0');
    const paymentMeta = orderQuery.data?.meta_data?.find(m => m.key === 'payment_received');
    const received = paymentMeta ? parseFloat(String(paymentMeta.value)) : 0;
    const isPaid = received >= total && total > 0;

    return (
        <ButtonGroup fullWidth radius="lg" className="shadow-sm">
            <Button
                color="warning"
                variant="flat"
                onPress={handlePrintKot}
                isLoading={isPrintingKot}
                isDisabled={isDraft || !hasItems}
                className="font-semibold"
            >
                <span className="flex items-center gap-1">
                    KOT
                    <Kbd keys={["ctrl"]} className="bg-white/80 text-warning-700 text-[10px] shadow-none">K</Kbd>
                </span>
            </Button>
            <Button
                color="success"
                variant="flat"
                onPress={handlePrintBill}
                isLoading={isPrintingBill}
                isDisabled={isDraft || !hasItems}
                className="font-semibold"
            >
                <span className="flex items-center gap-1">
                    Bill
                    <Kbd keys={["ctrl"]} className="bg-white/80 text-success-700 text-[10px] shadow-none">P</Kbd>
                </span>
            </Button>
            <Button
                color="primary"
                variant={isPaid ? "solid" : "flat"}
                onPress={handleDone}
                isLoading={isCompleting}
                isDisabled={isDraft || !isPaid}
                className="font-semibold"
            >
                <span className="flex items-center gap-1">
                    Done
                    <Kbd keys={["ctrl"]} className="bg-white/80 text-primary-700 text-[10px] shadow-none">↵</Kbd>
                </span>
            </Button>
            <Dropdown placement="top-end" isDisabled={isDraft}>
                <DropdownTrigger>
                    <Button
                        color="danger"
                        variant="flat"
                        isLoading={isCancelling}
                        isDisabled={isDraft}
                        className="font-semibold"
                    >
                        Cancel
                    </Button>
                </DropdownTrigger>
                <DropdownMenu
                    aria-label="Cancel order options"
                    onAction={(key) => {
                        if (key === 'confirm') handleCancelOrder();
                    }}
                >
                    <DropdownItem
                        key="confirm"
                        color="danger"
                        className="text-danger"
                        description="This cannot be undone"
                    >
                        Cancel Order
                    </DropdownItem>
                </DropdownMenu>
            </Dropdown>
        </ButtonGroup>
    );
}