'use client'

import { useState, useCallback } from "react";
import { ButtonGroup, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Kbd } from "@heroui/react";
import { useCurrentOrder } from "@/stores/orders";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import OrdersAPI from "@/api/orders";
import { DRAFT_ORDER_ID } from "@/stores/draft-order";
import { usePrintStore, PrintJobData } from "@/stores/print";

export default function Buttons() {
    const orderQuery = useCurrentOrder();
    const queryClient = useQueryClient();
    const router = useRouter();
    const printStore = usePrintStore();
    const [isPrintingKot, setIsPrintingKot] = useState(false);
    const [isPrintingBill, setIsPrintingBill] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    // Build print data from order
    const buildPrintData = useCallback((type: 'bill' | 'kot'): PrintJobData | null => {
        const order = orderQuery.data;
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

            // Current items
            const kotItems = order.line_items.map(item => {
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
            Object.entries(previousItems).forEach(([itemKey, prev]) => {
                if (!seenKeys.has(itemKey) && prev.quantity > 0) {
                    kotItems.push({
                        id: 0,
                        name: prev.name,
                        quantity: 0,
                        previousQuantity: prev.quantity,
                    });
                }
            });

            printData.kotItems = kotItems;
        }

        return printData;
    }, [orderQuery.data]);

    const handlePrintKot = useCallback(async () => {
        if (!orderQuery.data) return;

        setIsPrintingKot(true);
        try {
            const orderId = orderQuery.data.id;
            const printData = buildPrintData('kot');

            if (printData) {
                await printStore.push('kot', printData);
            }

            // Store current items for next KOT change detection (with names for removed item display)
            const currentItems: Record<string, { quantity: number; name: string }> = {};
            orderQuery.data.line_items.forEach(item => {
                const itemKey = `${item.product_id}-${item.variation_id}`;
                currentItems[itemKey] = { quantity: item.quantity, name: item.name };
            });

            // Mark as printed in meta_data and store item quantities
            await OrdersAPI.updateOrder(orderId.toString(), {
                meta_data: [
                    ...orderQuery.data.meta_data.filter(m =>
                        m.key !== 'last_kot_print' && m.key !== 'last_kot_items'
                    ),
                    { key: 'last_kot_print', value: new Date().toISOString() },
                    { key: 'last_kot_items', value: JSON.stringify(currentItems) }
                ]
            });

            await queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
        } catch (error) {
            console.error('Failed to print KOT:', error);
        } finally {
            setIsPrintingKot(false);
        }
    }, [orderQuery.data, queryClient, buildPrintData, printStore]);

    const handlePrintBill = useCallback(async () => {
        if (!orderQuery.data) return;

        setIsPrintingBill(true);
        try {
            const orderId = orderQuery.data.id;
            const printData = buildPrintData('bill');

            if (printData) {
                await printStore.push('bill', printData);
            }

            // Mark as printed in meta_data
            await OrdersAPI.updateOrder(orderId.toString(), {
                meta_data: [
                    ...orderQuery.data.meta_data.filter(m => m.key !== 'last_bill_print'),
                    { key: 'last_bill_print', value: new Date().toISOString() }
                ]
            });

            await queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
        } catch (error) {
            console.error('Failed to print Bill:', error);
        } finally {
            setIsPrintingBill(false);
        }
    }, [orderQuery.data, queryClient, buildPrintData, printStore]);

    const handleCancelOrder = useCallback(async () => {
        if (!orderQuery.data) return;

        setIsCancelling(true);
        try {
            const orderId = orderQuery.data.id;
            await OrdersAPI.cancelOrder(orderId.toString());
            await queryClient.invalidateQueries({ queryKey: ['orders'] });

            // Navigate to home or next order
            router.push('/');
        } catch (error) {
            console.error('Failed to cancel order:', error);
        } finally {
            setIsCancelling(false);
        }
    }, [orderQuery.data, queryClient, router]);

    const isDraft = orderQuery.data?.id === DRAFT_ORDER_ID;
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
                onPress={async () => {
                    if (!isPaid || !orderQuery.data) return;
                    const orderId = orderQuery.data.id;
                    await OrdersAPI.updateOrder(orderId.toString(), { status: 'completed' });
                    await queryClient.invalidateQueries({ queryKey: ['orders'] });
                    router.push('/');
                }}
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