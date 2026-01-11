'use client'

import { useState, useCallback } from "react";
import { ButtonGroup, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import { useCurrentOrder } from "@/stores/orders";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import OrdersAPI from "@/api/orders";

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

    const hasItems = (orderQuery.data?.line_items?.length ?? 0) > 0;

    return (
        <ButtonGroup fullWidth radius="lg" className="shadow-sm">
            <Button
                color="warning"
                variant="flat"
                onPress={handlePrintKot}
                isLoading={isPrintingKot}
                isDisabled={!hasItems}
                className="font-semibold"
            >
                KOT
            </Button>
            <Button
                color="success"
                variant="flat"
                onPress={handlePrintBill}
                isLoading={isPrintingBill}
                isDisabled={!hasItems}
                className="font-semibold"
            >
                Bill
            </Button>
            <Dropdown placement="top-end">
                <DropdownTrigger>
                    <Button
                        color="danger"
                        variant="flat"
                        isLoading={isCancelling}
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