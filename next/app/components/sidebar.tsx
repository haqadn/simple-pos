'use client'

import { Chip, Tabs, Tab, Button } from "@heroui/react";
import Link from "next/link"
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createOrder as createOrderApi, getOrders } from "@/api/config";
import { usePathname, useRouter } from "next/navigation";

type OrderLinkProps = { 
    color: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger',
    variant: 'solid' | 'bordered' | 'light' | 'flat' | 'faded' | 'shadow'
}

export default function Sidebar() {
    const { orders, isLoading, createOrder, reorderOrders } = useOrderList();
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
        const order = await createOrder();
        router.push(`/orders/${ order.id }`);
    }

    if (isLoading) {
        return <div>Loading...</div>;
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
                {orders.map((order: Order, index: number) => (
                    <Tab
                        key={`/orders/${order.id}`}
                        { ...orderStateProps( order.status ) }
                        draggable={true}
                        onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', order.id);
                        }}
                        onDragOver={(e) => {
                            e.preventDefault();
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            const draggedId = e.dataTransfer.getData('text/plain');
                            const droppedId = order.id;
                            reorderOrders(draggedId, droppedId);
                        }}
                        href={`/orders/${order.id}`}
                        as={Link}
                        title={<>Order {order.id} <Chip size="sm">{index + 1}</Chip></>}
                    />
                ))}
            </Tabs>
            <Button fullWidth variant="light" onPress={newOrder}>+ New Order</Button>
        </>
    );
}

type Order = {
    id: string;
    name: string;
    status: string;
}

const useOrderList = () => {
    const { data: orders = [], isLoading } = useQuery<Order[]>({
        queryKey: ['orders'],
        queryFn: getOrders
    });
    const queryClient = useQueryClient()


    const createOrder = async () => {
        try {
            const order = await createOrderApi();
            // You might want to invalidate the query here
            await queryClient.invalidateQueries({ queryKey: ['orders'] });
            return order;
        } catch (error) {
            console.error('Failed to create order:', error);
        }
    };

    const reorderOrders = (draggedId: string, droppedId: string) => {
        if (draggedId === droppedId) return;
        
        const draggedIndex = orders.findIndex(item => item.id === draggedId);
        const droppedIndex = orders.findIndex(item => item.id === droppedId);
        
        if (draggedIndex === -1 || droppedIndex === -1) return;
        
        const newList = [...orders];
        const [draggedItem] = newList.splice(draggedIndex, 1);
        newList.splice(droppedIndex, 0, draggedItem);
        
        // You might want to update the server here
        // updateOrders(newList);
    };

    return { orders, isLoading, createOrder, reorderOrders };
}

