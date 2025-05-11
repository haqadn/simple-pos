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
            router.push(`/orders/${ order.id }`);
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
                        draggable={true}
                        onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', order.id.toString());
                        }}
                        onDragOver={(e) => {
                            e.preventDefault();
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            const draggedId = e.dataTransfer.getData('text/plain');
                            const droppedId = order.id.toString();
                            console.log( 'dragged', draggedId, 'into', droppedId);
                        }}
                        href={`/orders/${order.id}`}
                        as={Link}
                        title={<>Order {order.id} <Kbd>{index + 1}</Kbd></>}
                    />
                ))}
            </Tabs>
            <Button fullWidth variant="light" onPress={newOrder}>+ New Order</Button>
        </>
    );
}
