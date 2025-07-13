'use client'

import { Tabs, Tab, Button, Kbd } from "@heroui/react";
import Link from "next/link"
import { type OrderSchema } from "@/api/orders";
import { usePathname, useRouter } from "next/navigation";
import { useOrdersStore } from "@/stores/orders";

type OrderLinkProps = { 
    color: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger',
    variant: 'solid' | 'bordered' | 'light' | 'flat' | 'faded' | 'shadow'
}

export default function Sidebar() {
    const { ordersQuery: { data: orders, isLoading }, createOrder } = useOrdersStore();
    const pathname = usePathname();
    const router = useRouter();

    // Convert order ID to hash (first 3 chars) with avalanche effect
    const getOrderDisplayId = (orderId: number): string => {
        // MD5-like hash with avalanche effect for dramatic changes
        let hash = orderId;
        
        // Multiple rounds of scrambling to create avalanche effect
        hash ^= hash >>> 16;
        hash = Math.imul(hash, 0x85ebca6b);
        hash ^= hash >>> 13;
        hash = Math.imul(hash, 0xc2b2ae35);
        hash ^= hash >>> 16;
        
        // Ensure positive and take 3 hex chars
        return (Math.abs(hash) & 0xfff).toString(16).padStart(3, '0').toUpperCase();
    };


    const orderStateProps : (status: string) => OrderLinkProps = (status: string) => {
        switch (status) {
            case 'pending':
                return { color: 'warning', variant: 'bordered' };
            default:
                return { color: 'default', variant: 'flat' };
        }
    }

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
            <Tabs
                variant="light"
                selectedKey={pathname} 
                aria-label="Navigation" 
                title="Navigation" 
                isVertical={true}
                fullWidth={true}
            >
                {orders.map((order: OrderSchema, index: number) => (
                    <Tab
                        key={`/orders/${order.id}`}
                        { ...orderStateProps( order.status ) }
                        href={`/orders/${order.id}`}
                        as={Link}
                        title={<>Order {getOrderDisplayId(order.id)} <Kbd>{index + 1}</Kbd></>}
                    />
                ))}
            </Tabs>
            <Button fullWidth variant="light" onPress={newOrder}>+ New Order</Button>
        </>
    );
}
