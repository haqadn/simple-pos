'use client'

import { useEffect } from "react";
import { Button, Kbd } from "@heroui/react";
import Link from "next/link"
import { type OrderSchema } from "@/api/orders";
import { usePathname, useRouter } from "next/navigation";
import { useOrderQuery, useOrdersStore } from "@/stores/orders";

export default function Sidebar() {
    const { ordersQuery: { data: orders, isLoading }, createOrder } = useOrdersStore();
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

                // Scroll the order link into view
                setTimeout(() => {
                    const orderLink = document.querySelector(`a[href="/orders/${orders[num - 1].id}"]`);
                    orderLink?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 100);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [orders, router]);

    const newOrder = async () => {
        try {
            const order = await createOrder();
            if (order) {
                router.push(`/orders/${ order.id }`);
            }
        } catch (error) {
            alert(`Failed to create order: ${error}`);
        }
    }

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if ( ! orders || orders.length === 0 ) {
        return (
            <div className="my-4">
                <p>No orders found</p>
            </div>
        );
    }

    return (
        <>
            <Button fullWidth variant="light" onPress={newOrder}>+ New Order</Button>
            <div className="flex flex-col gap-2 mt-4">
                {orders.map((order: OrderSchema, index: number) => (
                    <OrderLink key={`/orders/${order.id}`} order={order} index={index} pathname={pathname} />
                ))}
            </div>
            {orders.length > 5 && (
                <Button fullWidth variant="light" onPress={newOrder} className="mt-4">+ New Order</Button>
            )}
        </>
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