'use client'

import { Chip, Listbox, ListboxItem, ListboxSection } from "@nextui-org/react";
import { useState } from "react"
import Link from "next/link"

export default function Sidebar() {
    const [ orders, addOrder, reorderOrders ] = useOrderList();
  
    return (
        <aside>
            <Listbox>
                <ListboxSection title="Orders" showDivider={true}>
                    {orders.map((order, index) => (
                        <ListboxItem
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
                            key={order.id} 
                            endContent={<Chip size="sm">{index + 1}</Chip>}
                            as={Link}
                            href={`/orders/${order.id}`}
                        >
                            {order.name}
                        </ListboxItem>
                    ))}
                </ListboxSection>
                <ListboxSection showDivider={true}>
                    <ListboxItem onPress={() => addOrder()}>New Order</ListboxItem>
                </ListboxSection>
            </Listbox>
        </aside>
    );
}

type Order = {
    id: string;
    name: string;
}

const useOrderList = () => {
    const [ cartList, setCartList ] = useState<Order[]>([
        { id: '1', name: 'Table 1' },
        { id: '2', name: 'Table 2' },
        { id: '3', name: 'Table 3' },
        { id: '4', name: 'Table 4' },
        { id: '5', name: 'Table 5' },
        { id: '6', name: 'Table 6' },
    ]);

    const addOrder = () => {
        const randomId = Array(3).fill(null).map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
        setCartList([...cartList, { id: randomId, name: 'Takeaway ' + randomId }]);
    }

    const reorderOrders = (draggedId: string, droppedId: string) => {
        if (draggedId === droppedId) return;
        
        const draggedIndex = cartList.findIndex(item => item.id === draggedId);
        const droppedIndex = cartList.findIndex(item => item.id === droppedId);
        
        const newList = [...cartList];
        const [draggedItem] = newList.splice(draggedIndex, 1);
        newList.splice(droppedIndex, 0, draggedItem);
        
        setCartList(newList);
    }

    return [ cartList, addOrder, reorderOrders ] as const;
}