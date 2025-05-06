import { useQueryClient } from "@tanstack/react-query";

import OrdersAPI from "@/api/orders";

import { OrderSchema } from "@/api/orders";
import { useQuery } from "@tanstack/react-query";

export const useOrdersStore = () => {
    const { data: orders = [], isLoading } = useQuery<OrderSchema[]>({
        queryKey: ['orders'],
        queryFn: () => OrdersAPI.listOrders({})
    });
    const queryClient = useQueryClient()


    const createOrder = async () => {
        try {
            const order = await OrdersAPI.saveOrder({ status: 'pending' });
            await queryClient.invalidateQueries({ queryKey: ['orders'] });
            return order;
        } catch (error) {
            console.error('Failed to create order:', error);
            throw error;
        }
    };

    const reorderOrders = (draggedId: string, droppedId: string) => {
        if (draggedId === droppedId) return;
        
        const draggedIndex = orders.findIndex(item => item.id === parseInt(draggedId));
        const droppedIndex = orders.findIndex(item => item.id === parseInt(droppedId));
        
        if (draggedIndex === -1 || droppedIndex === -1) return;
        
        const newList = [...orders];
        const [draggedItem] = newList.splice(draggedIndex, 1);
        newList.splice(droppedIndex, 0, draggedItem);
        
        // You might want to update the server here
        // updateOrders(newList);
    };

    return { orders, isLoading, createOrder, reorderOrders };
}