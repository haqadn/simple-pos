import { QueryObserverResult, useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query";

import OrdersAPI, { LineItemSchema, ShippingLineSchema, BillingSchema, MetaDataSchema } from "@/api/orders";

import { OrderSchema } from "@/api/orders";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ProductSchema } from "./products";
import { ServiceMethodSchema, useTablesQuery } from "./service";
import { useAvoidParallel } from "@/hooks/useAvoidParallel";
import { useDebounce } from "@/hooks/useDebounce";

function generateOrderQueryKey(context: string, order?: OrderSchema, product?: ProductSchema) {
	switch (context) {
		case 'detail':
			return ['orders', order?.id, 'detail'];
		case 'lineItem':
			if ( !product ) {
				return ['orders', order?.id, 'lineItem'];
			}
			return ['orders', order?.id, 'lineItem', product?.product_id, product?.variation_id];
		case 'service':
			return ['orders', order?.id, 'service'];
		case 'note':
			return ['orders', order?.id, 'note'];
		case 'customerInfo':
			return ['orders', order?.id, 'customerInfo'];
		case 'payment':
			return ['orders', order?.id, 'payment'];
		case 'order':
			return ['orders', order?.id];
		case 'list':
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
		queryFn: () => OrdersAPI.listOrders({ 'per_page': '100', 'status': 'pending,processing,on-hold' }),
		refetchInterval: 60 * 1000,
		staleTime: 60 * 1000,
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

export const useOrderQuery = ( orderId: number ) => {
	const { ordersQuery } = useOrdersStore();

	const cachedOrder = ordersQuery.data?.find(order => order.id === orderId);

	const queryKey = generateOrderQueryKey('detail', cachedOrder);

	return useQuery<OrderSchema | undefined>({
		queryKey,
		queryFn: async () => {
			if (!orderId) {
				return undefined;
			}
			const order = await OrdersAPI.getOrder(orderId.toString());
			if (!order) {
				return undefined;
			}
			return order;
		},
		initialData: cachedOrder,
		staleTime: 60 * 1000,
	});

}

export const useCurrentOrder = () => {
	const params = useParams();
	const orderId = params.orderId as string;

	return useOrderQuery(parseInt(orderId));
}

export const useLineItemQuery = (orderQuery: QueryObserverResult<OrderSchema | undefined>, product?: ProductSchema) => {
	const queryClient = useQueryClient();
	const order = orderQuery.data;
	const orderRootKey = generateOrderQueryKey( 'order', order );
	const orderQueryKey = generateOrderQueryKey( 'detail', order );
	const lineItemKey = generateOrderQueryKey('lineItem', order, product);
	const lineItemIsMutating = useIsMutating({ mutationKey: lineItemKey });
	const lineItemsAreMutating = useIsMutating({ mutationKey: generateOrderQueryKey('lineItem', order) });

	const lineItemQuery = useQuery<LineItemSchema | undefined>({
		queryKey: lineItemKey,
		queryFn: () => findOrderLineItems(order, product)[0] ?? null,
		staleTime: 1000,
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

			const existingLineItem = newOrderQueryData.line_items.find(lineItem => lineItem.product_id === newLineItem.product_id && lineItem.variation_id === newLineItem.variation_id);
			if ( existingLineItem ) {
				// Updating newOrderQuery data by reference
				existingLineItem.quantity = params.quantity;
			} else if ( params.quantity > 0 ) {
				newOrderQueryData.line_items = [ ...newOrderQueryData.line_items, newLineItem ];
			}

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
			if (lineItemsAreMutating <= 1) {
				queryClient.setQueryData(orderQueryKey, data);
			}
		},
	});

	return [ lineItemQuery, mutation, lineItemIsMutating ] as const;
}

export const useServiceQuery = (orderQuery: QueryObserverResult<OrderSchema | undefined>) => {
	const queryClient = useQueryClient();
	const order = orderQuery.data;
	const orderRootKey = generateOrderQueryKey('order', order);
	const orderQueryKey = generateOrderQueryKey('detail', order);
	const serviceKey = generateOrderQueryKey('service', order);
	const serviceIsMutating = useIsMutating({ mutationKey: serviceKey });
	
	// Get tables data for proper slug mapping
	const { data: tables } = useTablesQuery();

	const serviceQuery = useQuery<ServiceMethodSchema | undefined>({
		queryKey: serviceKey,
		queryFn: () => {
			if (!order?.shipping_lines?.length) return undefined;
			
			// Find the active shipping line (not empty/cleared ones)
			const activeShippingLine = order.shipping_lines.find(line => 
				line.method_id && 
				line.method_id !== '' && 
				(line.method_id === 'pickup_location' || line.method_id === 'flat_rate' || line.method_id === 'free_shipping')
			);
			
			if (!activeShippingLine) return undefined;
			
			let slug: string;
			let title: string;
			
			if (activeShippingLine.method_id === 'pickup_location') {
				// For tables, extract table name from method_title (e.g., "Table (Table One)" -> "Table One")
				const titleMatch = activeShippingLine.method_title.match(/\(([^)]+)\)/);
				const extractedTableName = titleMatch ? titleMatch[1] : activeShippingLine.method_title;
				
				// Find the table that matches this name to get the correct slug
				const matchingTable = tables?.find(table => table.title === extractedTableName);
				
				if (matchingTable) {
					slug = matchingTable.slug; // Use the table's slug for proper matching
					title = matchingTable.title; // Use the table's title
				} else {
					// Fallback if table not found
					slug = extractedTableName;
					title = extractedTableName;
				}
			} else {
				// For delivery zones, use instance_id
				slug = activeShippingLine.instance_id;
				title = activeShippingLine.method_title;
			}
			
			return {
				slug,
				title,
				type: activeShippingLine.method_id === 'pickup_location' ? 'table' : 'takeaway',
				fee: parseFloat(activeShippingLine.total)
			} as ServiceMethodSchema;
		},
		staleTime: 1000,
	});

	const updateServiceMethod = async (inputOrder?: OrderSchema, service?: ServiceMethodSchema) => {
		if (!inputOrder || !service) {
			throw new Error('Order and service are required to update service method');
		}

		// Check if there's an existing shipping line we can update
		const existingShippingLine = inputOrder.shipping_lines.find(line => 
			line.id && line.method_id && line.method_id !== ''
		);

		const shippingLine: ShippingLineSchema = {
			id: existingShippingLine?.id, // Use existing ID if present
			method_id: service.type === 'table' ? 'pickup_location' : 'flat_rate',
			instance_id: service.type === 'table' ? '0' : service.slug,
			method_title: service.type === 'table' ? `Table (${service.title})` : service.title,
			total: service.fee.toString(),
			total_tax: '0.00',
			taxes: []
		};

		const updatedOrder = await OrdersAPI.updateOrder(inputOrder.id.toString(), { shipping_lines: [shippingLine] });
		return updatedOrder;
	};

	const tamedMutationFn = useDebounce(useAvoidParallel(updateServiceMethod), 1000);

	const mutation = useMutation({
		mutationFn: (params: { service: ServiceMethodSchema }) => {
			if (!order) throw new Error('Order is required');
			return tamedMutationFn(order, params.service);
		},
		mutationKey: serviceKey,
		onMutate: async (params) => {
			if (!order) return;

			const newOrderQueryData = { ...order };
			
			// Check if there's an existing shipping line we can update
			const existingShippingLine = order.shipping_lines.find(line => 
				line.id && line.method_id && line.method_id !== ''
			);
			
			const newShippingLine: ShippingLineSchema = {
				id: existingShippingLine?.id, // Use existing ID if present
				method_id: params.service.type === 'table' ? 'pickup_location' : 'flat_rate',
				instance_id: params.service.type === 'table' ? '0' : params.service.slug,
				method_title: params.service.type === 'table' ? `Table (${params.service.title})` : params.service.title,
				total: params.service.fee.toString(),
				total_tax: '0.00',
				taxes: []
			};

			newOrderQueryData.shipping_lines = [newShippingLine];

			queryClient.setQueryData(orderQueryKey, newOrderQueryData);
			queryClient.setQueryData(serviceKey, params.service);
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

	return [serviceQuery, mutation, serviceIsMutating] as const;
}

export const useOrderNoteQuery = (orderQuery: QueryObserverResult<OrderSchema | undefined>) => {
	const queryClient = useQueryClient();
	const order = orderQuery.data;
	const orderRootKey = generateOrderQueryKey('order', order);
	const orderQueryKey = generateOrderQueryKey('detail', order);
	const noteKey = generateOrderQueryKey('note', order);
	const noteIsMutating = useIsMutating({ mutationKey: noteKey });

	const noteQuery = useQuery<string>({
		queryKey: noteKey,
		queryFn: () => order?.customer_note || '',
		staleTime: 1000,
	});

	const updateOrderNote = async (inputOrder?: OrderSchema, note?: string) => {
		if (!inputOrder || typeof note === 'undefined') {
			throw new Error('Order and note are required to update order note');
		}

		const updatedOrder = await OrdersAPI.updateOrder(inputOrder.id.toString(), { customer_note: note });
		return updatedOrder;
	};

	const tamedMutationFn = useDebounce(useAvoidParallel(updateOrderNote), 1000);

	const mutation = useMutation({
		mutationFn: (params: { note: string }) => {
			if (!order) throw new Error('Order is required');
			return tamedMutationFn(order, params.note);
		},
		mutationKey: noteKey,
		onMutate: async (params) => {
			if (!order) return;

			const newOrderQueryData = { ...order, customer_note: params.note };
			
			queryClient.setQueryData(orderQueryKey, newOrderQueryData);
			queryClient.setQueryData(noteKey, params.note);
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

	return [noteQuery, mutation, noteIsMutating] as const;
}

export const useCustomerInfoQuery = (orderQuery: QueryObserverResult<OrderSchema | undefined>) => {
	const queryClient = useQueryClient();
	const order = orderQuery.data;
	const orderRootKey = generateOrderQueryKey('order', order);
	const orderQueryKey = generateOrderQueryKey('detail', order);
	const customerInfoKey = generateOrderQueryKey('customerInfo', order);
	const customerInfoIsMutating = useIsMutating({ mutationKey: customerInfoKey });

	const customerInfoQuery = useQuery<BillingSchema>({
		queryKey: customerInfoKey,
		queryFn: () => order?.billing || {
			first_name: "",
			last_name: "",
			phone: "",
			address_1: "",
			address_2: "",
			city: "",
			state: "",
			postcode: "",
			country: "",
		},
		staleTime: 1000,
	});

	const updateCustomerInfo = async (inputOrder?: OrderSchema, billing?: Partial<BillingSchema>) => {
		if (!inputOrder || !billing) {
			throw new Error('Order and billing info are required to update customer info');
		}

		// Merge with existing billing data to ensure all required fields are present
		const mergedBilling = { ...inputOrder.billing, ...billing };
		const updatedOrder = await OrdersAPI.updateOrder(inputOrder.id.toString(), { billing: mergedBilling });
		return updatedOrder;
	};

	const tamedMutationFn = useDebounce(useAvoidParallel(updateCustomerInfo), 1000);

	const mutation = useMutation({
		mutationFn: (params: { billing: Partial<BillingSchema> }) => {
			if (!order) throw new Error('Order is required');
			return tamedMutationFn(order, params.billing);
		},
		mutationKey: customerInfoKey,
		onMutate: async (params) => {
			if (!order) return;

			const newOrderQueryData = { 
				...order, 
				billing: { ...order.billing, ...params.billing }
			};
			
			queryClient.setQueryData(orderQueryKey, newOrderQueryData);
			queryClient.setQueryData(customerInfoKey, newOrderQueryData.billing);
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

	return [customerInfoQuery, mutation, customerInfoIsMutating] as const;
}

export const usePaymentQuery = (orderQuery: QueryObserverResult<OrderSchema | undefined>) => {
	const queryClient = useQueryClient();
	const order = orderQuery.data;
	const orderRootKey = generateOrderQueryKey('order', order);
	const orderQueryKey = generateOrderQueryKey('detail', order);
	const paymentKey = generateOrderQueryKey('payment', order);
	const paymentIsMutating = useIsMutating({ mutationKey: paymentKey });

	const paymentQuery = useQuery<number>({
		queryKey: paymentKey,
		queryFn: () => {
			// Find payment_received in meta_data
			const paymentMeta = order?.meta_data?.find(meta => meta.key === 'payment_received');
			return parseFloat(String(paymentMeta?.value || '0'));
		},
		staleTime: 1000,
	});

	const updatePaymentReceived = async (inputOrder?: OrderSchema, receivedAmount?: number) => {
		if (!inputOrder || typeof receivedAmount === 'undefined') {
			throw new Error('Order and received amount are required to update payment');
		}

		// Create or update the payment_received meta field
		const existingMetaData = inputOrder.meta_data || [];
		const existingPaymentMeta = existingMetaData.find(meta => meta.key === 'payment_received');
		
		let updatedMetaData: MetaDataSchema[];
		if (existingPaymentMeta) {
			// Update existing meta field
			updatedMetaData = existingMetaData.map(meta => 
				meta.key === 'payment_received' 
					? { ...meta, value: receivedAmount.toFixed(2) }
					: meta
			);
		} else {
			// Add new meta field
			updatedMetaData = [
				...existingMetaData,
				{ key: 'payment_received', value: receivedAmount.toFixed(2) }
			];
		}

		const updatedOrder = await OrdersAPI.updateOrder(inputOrder.id.toString(), { 
			meta_data: updatedMetaData
		});
		return updatedOrder;
	};

	const tamedMutationFn = useDebounce(useAvoidParallel(updatePaymentReceived), 1000);

	const mutation = useMutation({
		mutationFn: (params: { received: number }) => {
			if (!order) throw new Error('Order is required');
			return tamedMutationFn(order, params.received);
		},
		mutationKey: paymentKey,
		onMutate: async (params) => {
			if (!order) return;

			// Update meta_data optimistically
			const existingMetaData = order.meta_data || [];
			const existingPaymentMeta = existingMetaData.find(meta => meta.key === 'payment_received');
			
			let updatedMetaData: MetaDataSchema[];
			if (existingPaymentMeta) {
				updatedMetaData = existingMetaData.map(meta => 
					meta.key === 'payment_received' 
						? { ...meta, value: params.received.toFixed(2) }
						: meta
				);
			} else {
				updatedMetaData = [
					...existingMetaData,
					{ key: 'payment_received', value: params.received.toFixed(2) }
				];
			}

			const newOrderQueryData = { 
				...order, 
				meta_data: updatedMetaData
			};
			
			queryClient.setQueryData(orderQueryKey, newOrderQueryData);
			queryClient.setQueryData(paymentKey, params.received);
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

	return [paymentQuery, mutation, paymentIsMutating] as const;
}