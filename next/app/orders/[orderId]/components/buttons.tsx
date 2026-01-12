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

        setIsPrintingKot(true);
        try {
            const orderId = orderQuery.data.id;
            const printData = buildPrintData('kot');

            if (printData) {
                await printStore.push('kot', printData);
            }

            // Mark as printed in meta_data
            await OrdersAPI.updateOrder(orderId.toString(), {
                meta_data: [
                    ...orderQuery.data.meta_data.filter(m => m.key !== 'last_kot_print'),
                    { key: 'last_kot_print', value: new Date().toISOString() }
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