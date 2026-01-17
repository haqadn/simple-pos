'use client'

import { useEffect, useCallback } from "react";
import { Button, Kbd } from "@heroui/react";
import Link from "next/link"
import { type OrderSchema } from "@/api/orders";
import { usePathname, useRouter } from "next/navigation";
import { useOrderQuery, useOrdersStore } from "@/stores/orders";
import { useDraftOrderStore } from "@/stores/draft-order";
import OfflineIndicator from "./OfflineIndicator";
import { createLocalOrder } from "@/stores/offline-orders";

export default function Sidebar() {
    const { ordersQuery: { data: orders, isLoading } } = useOrdersStore();
    const resetDraft = useDraftOrderStore((state) => state.resetDraft);
    const setCurrentFrontendId = useDraftOrderStore((state) => state.setCurrentFrontendId);
    const pathname = usePathname();
    const router = useRouter();

    // Keyboard shortcuts: Ctrl+1-9 to switch orders (works even in input fields)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Require Ctrl key modifier
            if (!e.ctrlKey) return;

            // Check for number keys 1-9
            const num = parseInt(e.key);
            if (num >= 1 && num <= 9 && orders && orders[num - 1]) {
                e.preventDefault();
                router.push(`/orders/${orders[num - 1].id}`);

                // Scroll the order link into view within the sidebar
                setTimeout(() => {
                    const orderLink = document.querySelector(`a[href="/orders/${orders[num - 1].id}"]`);
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
    }, [orders, router]);

    const newOrder = useCallback(async () => {
        // Reset draft state
        resetDraft();

        // Create a new local order in Dexie with a frontend ID
        const localOrder = await createLocalOrder();

        // Store the frontend ID in Zustand for quick access
        setCurrentFrontendId(localOrder.frontendId);

        // Navigate to the frontend ID URL
        router.push(`/orders/${localOrder.frontendId}`);
    }, [resetDraft, setCurrentFrontendId, router]);

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
                        {orders.map((order: OrderSchema, index: number) => (
                            <OrderLink key={`/orders/${order.id}`} order={order} index={index} pathname={pathname} />
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

const OrderLink = ({ order, index, pathname }: { order: OrderSchema, index: number, pathname: string }) => {
    const orderQuery = useOrderQuery(order.id);

    const getOrderDisplayId = (orderId: number): string => {
        return (orderId % 100).toString().padStart(2, '0');
    };

    const getShippingMethodTitle = (order: OrderSchema): string => {
        if (!order.shipping_lines || order.shipping_lines.length === 0) {
            return "";
        }
        
        const activeShipping = order.shipping_lines.find(line => 
            line.method_id && line.method_id !== ''
        );
        
        return activeShipping?.method_title || "";
    };

    const isActive = pathname === `/orders/${order.id}`;

    return (
        <Link
            href={`/orders/${order.id}`}
            className={`block p-3 rounded-lg transition-colors ${
                isActive
                    ? 'bg-primary-100 text-primary-700 border border-primary-200'
                    : 'hover:bg-default-100'
            }`}
        >
            <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-default-500 text-ellipsis overflow-hidden">
                        {getShippingMethodTitle(orderQuery.data || order)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        {index < 9 && <Kbd keys={["ctrl"]}>{index + 1}</Kbd>}
                        <span className="text-sm font-medium">Order {getOrderDisplayId(order.id)}</span>
                    </div>
                </div>
            </div>
        </Link>
    )
}