'use client'

import { Listbox, ListboxItem, ListboxSection } from "@nextui-org/react";
import { useState } from "react"

export default function Sidebar() {
    const [ orders, addOrder ] = useOrderList();
  
    return (
        <aside>
            <Listbox>
                <ListboxSection title="Orders" showDivider={true}>
                    {orders.map((order, index) => (
                        <ListboxItem key={order.id} endContent={<span className="text-small">{index + 1}</span>}>
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

    return [ cartList, addOrder ] as const;
}