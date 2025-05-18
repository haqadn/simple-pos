import { QueryObserverResult, useIsMutating, useMutation, useMutationState, useQueryClient } from "@tanstack/react-query";

import OrdersAPI, { LineItemSchema } from "@/api/orders";

import { OrderSchema } from "@/api/orders";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ProductSchema } from "./products";
import { useAvoidParallel } from "@/hooks/useAvoidParallel";
import { useDebounce } from "@/hooks/useDebounce";

function generateOrderQueryKey(context: string, order?: OrderSchema, product?: ProductSchema) {
	switch (context) {
		case 'detail':
			return ['orders', order?.id, 'detail'];
		case 'lineItem':
			return ['orders', order?.id, 'lineItem', product?.product_id, product?.variation_id];
		case 'order':
			return ['orders', order?.id];
		default:
			return ['orders'];
	}
}

const findOrderLineItems = (order?: OrderSchema, product?: ProductSchema): LineItemSchema[] => {
	if ( !product || !order ) {
		return [];
	}

	const lineItems = order.line_items.filter(lineItem => lineItem.product_id === product.product_id && lineItem.variation_id === product.variation_id);

	return lineItems;
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

export const useCurrentOrder = () => {
	const params = useParams();
	const orderId = params.orderId as string;

	const ordersQuery = useOrdersStore();
	const cachedOrder = ordersQuery.ordersQuery.data?.find(order => order.id === parseInt(orderId));

	const queryKey = generateOrderQueryKey('detail', cachedOrder);

	const query = useQuery<OrderSchema | undefined>({
		queryKey,
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

	return { query };
}

export const useLineItemQuery = (orderQuery: QueryObserverResult<OrderSchema | undefined>, product?: ProductSchema) => {
	const queryClient = useQueryClient();
	const order = orderQuery.data;
	const orderRootKey = generateOrderQueryKey( 'order', order );
	const orderQueryKey = generateOrderQueryKey( 'detail', order );
	const lineItemKey = generateOrderQueryKey('lineItem', order, product);
	const lineItemIsMutating = useIsMutating({ mutationKey: lineItemKey });

	const lineItemQuery = useQuery<LineItemSchema | undefined>({
		queryKey: lineItemKey,
		queryFn: () => findOrderLineItems(order, product)[0] ?? null,
		enabled: orderQuery.isFetched,
	});

	const updateLineItemQuantity = async (inputOrder?: OrderSchema, quantity?: number) => {
		if ( !inputOrder || !product || typeof quantity === 'undefined' ) {
			throw new Error('Order, product, quantity are required to update line item quantity');
		}
		
		const patchLineItems: LineItemSchema[] = [];
		const existingLineItems = findOrderLineItems(inputOrder, product);
		existingLineItems.forEach(li => {
			if ( li.id ) {
				patchLineItems.push( { ...li, quantity: 0 } );
			}

			li.id = undefined; // Remove the id so future mutations do not get this outdated data
		});

		if (quantity !== 0) {
			patchLineItems.push( {
				name: product.name + (product.variation_name ? ` - ${product.variation_name}` : ''),
				product_id: product.product_id,
				variation_id: product.variation_id,
				quantity: quantity,
				id: undefined,
			} );
		}

		const updatedOrder = await OrdersAPI.updateOrder(inputOrder.id.toString(), {line_items: patchLineItems});

		return updatedOrder;
	}

	const tamedMutationFn = useDebounce(useAvoidParallel(updateLineItemQuantity), 1000);

	const mutation = useMutation({
		mutationFn: (params: { quantity: number }) => {
			if (!order) throw new Error('Order is required');
			return tamedMutationFn(order, params.quantity);
		},
		mutationKey: lineItemKey,
		onMutate: async (params) => {
			if (!order || !product) {
				return;
			}

			const newOrderQueryData = { ...order };
			
			const newLineItem: LineItemSchema = {
				product_id: product.product_id,
				variation_id: product.variation_id,
				quantity: params.quantity,
				name: product.name + (product.variation_name ? ` - ${product.variation_name}` : ''),
			};

			const existingLineItem = order.line_items.find(lineItem => lineItem.product_id === newLineItem.product_id && lineItem.variation_id === newLineItem.variation_id);
			if ( existingLineItem ) {
				existingLineItem.quantity = params.quantity;
			} else if ( params.quantity > 0 ) {
				newOrderQueryData.line_items = [ ...newOrderQueryData.line_items, newLineItem ];
			}

			console.log( 'Setting new order data', newOrderQueryData );
			queryClient.setQueryData(orderQueryKey, newOrderQueryData);
			queryClient.setQueryData(lineItemKey, newLineItem);
		},
		onError: (err) => {
			if (err.toString() !== 'newer-call' && err.toString() !== 'debounce') {
				queryClient.invalidateQueries({ queryKey: orderRootKey });
				mutation.reset();
			}
		},
		onSuccess: (data: OrderSchema) => {
			queryClient.setQueryData(orderQueryKey, data);
		},
	});

	return [ lineItemQuery, mutation, lineItemIsMutating ] as const;
}