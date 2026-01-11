'use client'

import { useState, useCallback } from "react";
import { ButtonGroup, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Kbd } from "@heroui/react";
import { useCurrentOrder } from "@/stores/orders";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import OrdersAPI from "@/api/orders";
import { DRAFT_ORDER_ID } from "@/stores/draft-order";

export default function Buttons() {
    const orderQuery = useCurrentOrder();
    const queryClient = useQueryClient();
    const router = useRouter();
    const [isPrintingKot, setIsPrintingKot] = useState(false);
    const [isPrintingBill, setIsPrintingBill] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    const handlePrintKot = useCallback(async () => {
        if (!orderQuery.data) return;

        setIsPrintingKot(true);
        try {
            const orderId = orderQuery.data.id;
            // TODO: Integrate with actual print system
            console.log(`Printing KOT for order ${orderId}`);

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
    }, [orderQuery.data, queryClient]);

    const handlePrintBill = useCallback(async () => {
        if (!orderQuery.data) return;

        setIsPrintingBill(true);
        try {
            const orderId = orderQuery.data.id;
            // TODO: Integrate with actual print system
            console.log(`Printing Bill for order ${orderId}`);

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
    }, [orderQuery.data, queryClient]);

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