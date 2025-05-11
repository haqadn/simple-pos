import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";

import OrdersAPI, { LineItemSchema } from "@/api/orders";

import { OrderSchema } from "@/api/orders";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ProductSchema } from "@/api/products";

export const useOrdersStore = () => {
    const ordersQuery = useQuery<OrderSchema[]>({
        queryKey: ['orders'],
        queryFn: () => OrdersAPI.listOrders({}),
        refetchInterval: 60 * 1000,
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

const updateOrderObjectLineItem = (order: OrderSchema, product: ProductSchema, quantity: number) => {
    const newOrder = structuredClone(order);
    let name = `${product.name}`;
    if (product.variation_name) {
        name += ` - ${product.variation_name}`;
    }
    
    let lineItem = newOrder.line_items.find(lineItem => lineItem.product_id === product.product_id && lineItem.variation_id === product.variation_id);
    const patchLineItems: LineItemSchema[] = [];

    if (lineItem) {
        lineItem.quantity = quantity;
        patchLineItems.push( { ...lineItem, quantity: 0 } );

        if (quantity !== 0) {
            patchLineItems.push( { ...lineItem, id: undefined } );
        }
    } else {
        lineItem = { product_id: product.product_id, variation_id: product.variation_id, quantity, name };
        newOrder.line_items.push(lineItem);

        patchLineItems.push( { ...lineItem  } );
    }
    return {order: newOrder, patchLineItems };
}

const setLineItem = async (order: OrderSchema | undefined, product: ProductSchema, quantity: number) => {
    if ( !order ) {
        throw new Error('Order is required');
    }

    const { patchLineItems } = updateOrderObjectLineItem(order, product, quantity);
    await OrdersAPI.updateOrder(order.id.toString(), {...order, line_items: patchLineItems});
}

export const useSetOrderLineItem = () => {
    const order = useCurrentOrderQuery();
    const orderData = order.data;
    const queryClient = useQueryClient();

    const debouncedMutate = useDebounce( (params: { product: ProductSchema, quantity: number }) => setLineItem(orderData, params.product, params.quantity), 1000);
    
    const mutation = useMutation({
        mutationFn: (params: { product: ProductSchema, quantity: number }) => setLineItem(orderData, params.product, params.quantity),
        mutationKey: ['updateOrderData', orderData?.id.toString()],
        onMutate: async (params) => {
            if (!orderData) return;
            
            await queryClient.cancelQueries({ queryKey: ['order', orderData.id.toString()] });
            const previousOrder = queryClient.getQueryData(['order', orderData.id.toString()]);
            const { order: optimisticOrder } = updateOrderObjectLineItem(orderData, params.product, params.quantity);
            
            queryClient.setQueryData(['order', orderData.id.toString()], optimisticOrder);
            
            return { previousOrder };
        },
        onError: (err, variables, context) => {
            if (context?.previousOrder) {
                queryClient.setQueryData(['order', orderData?.id.toString()], context.previousOrder);
            }
        },
        onSettled: () => {
            if (queryClient.isMutating({ mutationKey: ['updateOrderData', orderData?.id.toString()] }) === 1) {
                queryClient.invalidateQueries({ queryKey: ['order', orderData?.id.toString()] });
            }
        },
    });

    return { ...mutation, mutate: debouncedMutate };
}