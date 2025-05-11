import { useMutation, useQueryClient } from "@tanstack/react-query";

import OrdersAPI from "@/api/orders";

import { OrderSchema } from "@/api/orders";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ProductSchema } from "@/api/products";

export const useOrdersStore = () => {
    const ordersQuery = useQuery<OrderSchema[]>({
        queryKey: ['orders'],
        queryFn: () => OrdersAPI.listOrders({}),
        refetchInterval: 10 * 1000,
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

    return { ordersQuery, createOrder };
}

export const useCurrentOrderQuery = () => {
    const params = useParams();
    const orderId = params.orderId as string;

    const ordersQuery = useOrdersStore();
    const cachedOrder = ordersQuery.ordersQuery.data?.find(order => order.id === parseInt(orderId));

    return useQuery<OrderSchema | undefined>({
        queryKey: ['order', orderId],
        queryFn: async () => {
            if (!orderId) {
                return undefined;
            }
            const order = await OrdersAPI.getOrder(orderId);
            if (!order) {
                return undefined;
            }
            return order;
        },
        initialData: cachedOrder,
    });
}

const setLineItem = async (order: OrderSchema | undefined, product: ProductSchema, quantity: number) => {
    if ( !order ) {
        throw new Error('Order is required');
    }

    let name = `${product.name}`;
    if (product.variation_name) {
        name += ` - ${product.variation_name}`;
    }

    const { product_id, variation_id } = product;
    order?.line_items.push({ product_id, variation_id, quantity, name });
    await OrdersAPI.updateOrder(order.id.toString(), order);
}

export const useSetOrderLineItem = () => {
    const order = useCurrentOrderQuery();
    const orderData = order.data;
    const mutation = useMutation({
        mutationFn: (params: { product: ProductSchema, quantity: number }) => setLineItem(orderData, params.product, params.quantity),
    });

    return mutation;
}