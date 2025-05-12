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
        queryKey: ['order', orderId, 'detail'],
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

const findOrderLineItem = (order: OrderSchema, product: ProductSchema | undefined) => {
    if ( !product ) {
        return null;
    }

    let lineItem = order.line_items.find(lineItem => lineItem.product_id === product.product_id && lineItem.variation_id === product.variation_id);

    if ( !lineItem ) {
        lineItem = {
            product_id: product.product_id,
            variation_id: product.variation_id,
            quantity: 0,
            name: product.name,
        };
    }

    return lineItem;
}

export const useLineItemQuery = (order: OrderSchema, product: ProductSchema | undefined) => {
    const queryClient = useQueryClient();

    const getOrderLineItem = async (orderId: number, product: ProductSchema | undefined) => {
        if ( !product ) {
            return null;
        }

        const freshOrder = await OrdersAPI.getOrder(orderId.toString());
        if (!freshOrder) {
            return null;
        }

        return findOrderLineItem(freshOrder, product);
    }

    const updateLineItemQuantity = async (order: OrderSchema | undefined, product: ProductSchema, quantity: number) => {
        if ( !order ) {
            throw new Error('Order is required');
        }

        const lineItem = queryClient.getQueryData<LineItemSchema>(key);
        if (!lineItem) {
            return null;
        }

        const patchLineItems: LineItemSchema[] = [];
        
        if (lineItem.id) {
            patchLineItems.push( { ...lineItem, quantity: 0 } );
        }

        if (quantity !== 0) {
            patchLineItems.push( { ...lineItem, id: undefined } );
        }

        const updatedOrder = await OrdersAPI.updateOrder(order.id.toString(), {line_items: patchLineItems});
        return findOrderLineItem(updatedOrder, product);
    }

    const key = ['order', order.id, 'lineItem', product?.product_id, product?.variation_id];

    const query = useQuery<LineItemSchema | null>({
        queryKey: key,
        queryFn: () => getOrderLineItem(order.id, product),
        initialData: findOrderLineItem(order, product),
        staleTime: 1000,
    });

    const debouncedUpdateLineItemQuantity = useDebounce(updateLineItemQuantity, 1000);

    const mutation = useMutation({
        mutationFn: (params: { product: ProductSchema, quantity: number }) => debouncedUpdateLineItemQuantity(order, params.product, params.quantity),
        mutationKey: key,
        onMutate: async (params) => {
            if (!order) return;
            
            const previousLineItem = queryClient.getQueryData<LineItemSchema>(key);
            
            queryClient.setQueryData(key, { ...previousLineItem, quantity: params.quantity });
            
            return { previousLineItem };
        },
        onError: (err, variables, context) => {
            if (context?.previousLineItem) {
                queryClient.setQueryData(key, context.previousLineItem);
            }
        },
        onSettled: (data, _error, _variables, context) => {
            queryClient.setQueryData(key, data);
            if (typeof context?.previousLineItem?.id === 'undefined') {
                queryClient.invalidateQueries({ queryKey: ['order', order.id.toString(), 'detail'] });
            }
        },
    });

    return [ query, mutation ] as const;
}