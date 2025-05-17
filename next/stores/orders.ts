import { useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";

import OrdersAPI, { LineItemSchema } from "@/api/orders";

import { OrderSchema } from "@/api/orders";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ProductSchema } from "./products";

function generateOrderQueryKey(context: string, order?: OrderSchema, product?: ProductSchema) {
    switch (context) {
        case 'detail':
            return ['orders', order?.id, 'detail'];
        case 'lineItem':
            return ['orders', order?.id, 'lineItem', product?.product_id, product?.variation_id];
        default:
            return ['orders'];
    }
}

export const useOrdersStore = () => {
    const ordersQuery = useQuery<OrderSchema[]>({
        queryKey: generateOrderQueryKey('list'),
        queryFn: () => OrdersAPI.listOrders({}),
        refetchInterval: 60 * 1000,
    });
    const queryClient = useQueryClient()


    const createOrder = async () => {
        try {
            const order = await OrdersAPI.saveOrder({ status: 'pending' });
            await queryClient.invalidateQueries({ queryKey: generateOrderQueryKey('list') });
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
        queryKey: generateOrderQueryKey('detail', cachedOrder),
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

    const lineItem = order.line_items.find(lineItem => lineItem.product_id === product.product_id && lineItem.variation_id === product.variation_id);

    if ( !lineItem ) {
        return {
            product_id: product.product_id,
            variation_id: product.variation_id,
            quantity: 0,
            name: product.name + (product.variation_name ? ` - ${product.variation_name}` : ''),
        }
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

    const key = generateOrderQueryKey('lineItem', order, product);

    const isMutating = useIsMutating({ mutationKey: key });


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

            let newLineItem = {
                product_id: params.product.product_id,
                variation_id: params.product.variation_id,
                quantity: params.quantity,
                name: params.product.name + (params.product.variation_name ? ` - ${params.product.variation_name}` : ''),
            };

            if ( previousLineItem ) {
                newLineItem = { ...previousLineItem, quantity: params.quantity };
            }

            // Ensure the line item is present in the order, id, detail query
            const orderDetailKey = generateOrderQueryKey('detail', order);
            const orderQueryData = queryClient.getQueryData<OrderSchema>(orderDetailKey);
            const sameLineItem = orderQueryData?.line_items.find(lineItem => lineItem.product_id === newLineItem.product_id && lineItem.variation_id === newLineItem.variation_id);
            if ( ! sameLineItem && params.quantity > 0 ) {
                queryClient.setQueryData(orderDetailKey, { ...order, line_items: [...order.line_items, newLineItem] });
            }

            queryClient.setQueryData(key, newLineItem);
            
            return { previousLineItem };
        },
        onError: (err, variables, context) => {
            if (context?.previousLineItem && err.toString() !== 'debounce') {
                queryClient.invalidateQueries({ queryKey: key });
            }
        },
        onSettled: (data) => {
            queryClient.setQueryData(key, data);
        },
    });

    return [ query, mutation, isMutating ] as const;
}