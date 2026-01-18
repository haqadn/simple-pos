'use client'

import { useEffect, useCallback } from "react";
import { Button, Kbd } from "@heroui/react";
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCombinedOrdersStore, type OrderWithFrontendId } from "@/stores/orders";
import { useDraftOrderStore } from "@/stores/draft-order";
import OfflineIndicator from "./OfflineIndicator";
import { createLocalOrder } from "@/stores/offline-orders";

export default function Sidebar() {
    const { ordersQuery: { data: orders }, isLoading } = useCombinedOrdersStore();
    const resetDraft = useDraftOrderStore((state) => state.resetDraft);
    const setCurrentFrontendId = useDraftOrderStore((state) => state.setCurrentFrontendId);
    const pathname = usePathname();
    const router = useRouter();
    const queryClient = useQueryClient();

    // Helper to get the best URL identifier for an order (frontend ID preferred)
    const getOrderUrl = useCallback((order: OrderWithFrontendId): string => {
        return order.frontendId || order.id.toString();
    }, []);

    // Keyboard shortcuts: Ctrl+1-9 to switch orders (works even in input fields)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Require Ctrl key modifier
            if (!e.ctrlKey) return;

            // Check for number keys 1-9
            const num = parseInt(e.key);
            if (num >= 1 && num <= 9 && orders && orders[num - 1]) {
                e.preventDefault();
                const orderUrl = getOrderUrl(orders[num - 1]);
                router.push(`/orders/${orderUrl}`);

                // Scroll the order link into view within the sidebar
                setTimeout(() => {
                    const orderLink = document.querySelector(`a[href="/orders/${orderUrl}"]`);
                    if (orderLink) {
                        // Find the scrollable aside container
                        const sidebar = orderLink.closest('aside');
                        if (sidebar) {
                            const linkRect = orderLink.getBoundingClientRect();
                            const sidebarRect = sidebar.getBoundingClientRect();

                            // Check if link is outside visible area
                            if (linkRect.top < sidebarRect.top || linkRect.bottom > sidebarRect.bottom) {
                                orderLink.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            }
                        }
                    }
                }, 100);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [orders, router, getOrderUrl]);

    const newOrder = useCallback(async () => {
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

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="flex flex-col h-full">
            <Button fullWidth variant="light" onPress={newOrder}>
                <span className="flex items-center gap-2">
                    + New Order
                    <Kbd keys={["ctrl"]}>N</Kbd>
                </span>
            </Button>
            <div className="flex-1 overflow-y-auto">
                {(!orders || orders.length === 0) ? (
                    <div className="my-4">
                        <p className="text-default-400 text-sm">No pending orders</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 mt-4">
                        {orders.map((order: OrderWithFrontendId, index: number) => (
                            <OrderLink key={order.frontendId || order.id} order={order} index={index} pathname={pathname} />
                        ))}
                    </div>
                )}
            </div>
            <div className="mt-auto pt-4">
                <OfflineIndicator />
            </div>
        </div>
    );
}

const OrderLink = ({ order, index, pathname }: { order: OrderWithFrontendId, index: number, pathname: string }) => {
    // Get the URL identifier (prefer frontend ID)
    const orderUrl = order.frontendId || order.id.toString();

    const getOrderDisplayId = (order: OrderWithFrontendId): string => {
        // Display frontend ID if available, otherwise use server ID
        if (order.frontendId) {
            return order.frontendId;
        }
        return (order.id % 100).toString().padStart(2, '0');
    };

    const getShippingMethodTitle = (order: OrderWithFrontendId): string => {
        if (!order.shipping_lines || order.shipping_lines.length === 0) {
            return "";
        }

        const activeShipping = order.shipping_lines.find(line =>
            line.method_id && line.method_id !== ''
        );

        return activeShipping?.method_title || "";
    };

    // Check if active by both frontend ID and server ID
    const isActive = pathname === `/orders/${orderUrl}` ||
                     (order.frontendId && pathname === `/orders/${order.frontendId}`) ||
                     pathname === `/orders/${order.id}`;

    return (
        <Link
            href={`/orders/${orderUrl}`}
            className={`block p-3 rounded-lg transition-colors ${
                isActive
                    ? 'bg-primary-100 text-primary-700 border border-primary-200'
                    : 'hover:bg-default-100'
            }`}
        >
            <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-default-500 text-ellipsis overflow-hidden">
                        {getShippingMethodTitle(order)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        {index < 9 && <Kbd keys={["ctrl"]}>{index + 1}</Kbd>}
                        <span className="text-sm font-medium">Order {getOrderDisplayId(order)}</span>
                    </div>
                </div>
            </div>
        </Link>
    )
}