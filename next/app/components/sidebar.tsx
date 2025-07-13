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
                classNames={{
                    tab: "h-16 w-full",
                    tabContent: "w-full overflow-hidden",
                }}
            >
                {orders.map((order: OrderSchema, index: number) => (
                    <Tab
                        key={`/orders/${order.id}`}
                        { ...orderStateProps( order.status ) }
                        href={`/orders/${order.id}`}
                        as={Link}
                        title={<>
                            <p className="text-xs text-default-500 text-ellipsis overflow-hidden">{getShippingMethodTitle(order)}</p>
                            <Kbd>{index + 1}</Kbd> Order {getOrderDisplayId(order.id)}
                        </>}
                    />
                ))}
            </Tabs>
            <Button fullWidth variant="light" onPress={newOrder}>+ New Order</Button>
        </>
    );
}
