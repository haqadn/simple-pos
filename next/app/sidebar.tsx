'use client'

import { Chip, Tabs, Tab } from "@heroui/react";
import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query";
import { getOrders } from "@/api/config";
import { usePathname } from "next/navigation";

type OrderLinkProps = { 
    color: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger',
    variant: 'solid' | 'bordered' | 'light' | 'flat' | 'faded' | 'shadow'
}

export default function Sidebar() {
    const [ orders, addOrder, reorderOrders ] = useOrderList();
    const pathname = usePathname();

    const orderStateProps : (status: string) => OrderLinkProps = (status: string) => {
        switch (status) {
            case 'pending':
                return { color: 'warning', variant: 'bordered' };
            default:
                return { color: 'default', variant: 'flat' };
        }
    }

    
  
    return (
        <aside>
            <Tabs selectedKey={pathname} aria-label="Navigation" title="Navigation" isVertical={true}>
                {orders.data?.map((order: Order, index: number) => (
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
                    >
                    </Tab>
                )) ?? []}
            </Tabs>
        </aside>
    );
}

type Order = {
    id: string;
    name: string;
    status: string;
}

const useOrderList = () => {
    const ordersNew = useQuery<Order[]>({
        queryKey: ['orders'],
        queryFn: getOrders
    });
    // const addOrder = () => {};
    // const reorderOrders = () => {};


    const [ orders, setOrders ] = useState<Order[]>([
        { id: '1', name: 'Table 1', status: 'pending' },
        { id: '2', name: 'Table 2', status: 'pending' },
        { id: '3', name: 'Table 3', status: 'pending' },
        { id: '4', name: 'Table 4', status: 'pending' },
        { id: '5', name: 'Table 5', status: 'pending' },
        { id: '6', name: 'Table 6', status: 'pending' },
    ]);

    const addOrder = () => {
        const randomId = Array(3).fill(null).map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
        setOrders([...orders, { id: randomId, name: 'Takeaway ' + randomId, status: 'pending' }]);
    }

    const reorderOrders = (draggedId: string, droppedId: string) => {
        if (draggedId === droppedId) return;
        
        const draggedIndex = orders.findIndex(item => item.id === draggedId);
        const droppedIndex = orders.findIndex(item => item.id === droppedId);
        
        const newList = [...orders];
        const [draggedItem] = newList.splice(draggedIndex, 1);
        newList.splice(droppedIndex, 0, draggedItem);
        
        setOrders(newList);
    }

    return [ ordersNew, addOrder, reorderOrders ] as const;
}

