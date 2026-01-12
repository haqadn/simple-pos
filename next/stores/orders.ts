import { QueryObserverResult, useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query";

import OrdersAPI, { LineItemSchema, ShippingLineSchema, BillingSchema, MetaDataSchema } from "@/api/orders";

import { OrderSchema } from "@/api/orders";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ProductSchema } from "./products";
import { ServiceMethodSchema, useTablesQuery } from "./service";
import { useAvoidParallel } from "@/hooks/useAvoidParallel";
import { useDebounce } from "@/hooks/useDebounce";
import { useDraftOrderStore, DRAFT_ORDER_ID } from "./draft-order";
import { useCallback } from "react";

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

	return useQuery<OrderSchema | null>({
		queryKey,
		queryFn: async () => {
			if (!orderId) {
				return null;
			}
			const order = await OrdersAPI.getOrder(orderId.toString());
			if (!order) {
				return null;
			}
			return order;
		},
		initialData: cachedOrder ?? null,
		staleTime: 60 * 1000,
	});

}

export const useCurrentOrder = () => {
	const params = useParams();
	const orderId = params?.orderId as string | undefined;
	const draftOrder = useDraftOrderStore((state) => state.draftOrder);

	// For draft orders (new), return draft data from store
	const isDraft = orderId === 'new';

	// Use DRAFT_ORDER_ID for new orders or undefined orderId
	const queryOrderId = isDraft || !orderId ? DRAFT_ORDER_ID : parseInt(orderId);
	const orderQuery = useOrderQuery(queryOrderId);

	// If it's a draft order, override the query data with draft store data
	if (isDraft || !orderId) {
		// Cast to match the expected QueryObserverResult type
		return {
			...orderQuery,
			data: draftOrder,
			isLoading: false,
			isPending: false,
			isSuccess: true,
			isError: false,
			status: 'success',
			error: null,
		} as typeof orderQuery;
	}

	return orderQuery;
}

export const useIsDraftOrder = () => {
	const params = useParams();
	const orderId = params.orderId as string;
	return orderId === 'new';
}

// Hook to save draft order to database and navigate to the real order
export const useSaveDraftOrder = () => {
	const router = useRouter();
	const queryClient = useQueryClient();
	const getDraftData = useDraftOrderStore((state) => state.getDraftData);
	const resetDraft = useDraftOrderStore((state) => state.resetDraft);

	const saveDraft = useCallback(async (additionalData?: Partial<OrderSchema>) => {
		const draftData = getDraftData();
		const orderData = { ...draftData, ...additionalData, status: 'pending' };

		try {
			const savedOrder = await OrdersAPI.saveOrder(orderData);
			if (savedOrder) {
				await queryClient.invalidateQueries({ queryKey: generateOrderQueryKey('list') });
				resetDraft();
				router.replace(`/orders/${savedOrder.id}`);
				return savedOrder;
			}
		} catch (error) {
			console.error('Failed to save draft order:', error);
			throw error;
		}
		return null;
	}, [getDraftData, resetDraft, queryClient, router]);

	return saveDraft;
}

export const useLineItemQuery = (orderQuery: QueryObserverResult<OrderSchema | null>, product?: ProductSchema) => {
	const queryClient = useQueryClient();
	const router = useRouter();
	const order = orderQuery.data ?? undefined;
	const orderRootKey = generateOrderQueryKey( 'order', order );
	const orderQueryKey = generateOrderQueryKey( 'detail', order );
	const lineItemKey = generateOrderQueryKey('lineItem', order, product);
	const lineItemIsMutating = useIsMutating({ mutationKey: lineItemKey });
	const lineItemsAreMutating = useIsMutating({ mutationKey: generateOrderQueryKey('lineItem', order) });

	// Draft order support
	const getDraftData = useDraftOrderStore((state) => state.getDraftData);
	const draftOrder = useDraftOrderStore((state) => state.draftOrder);
	const updateDraftLineItems = useDraftOrderStore((state) => state.updateDraftLineItems);
	const getSavePromise = useDraftOrderStore((state) => state.getSavePromise);
	const setSavePromise = useDraftOrderStore((state) => state.setSavePromise);
	const getSavedOrderId = useDraftOrderStore((state) => state.getSavedOrderId);
	const setSavedOrderId = useDraftOrderStore((state) => state.setSavedOrderId);
	const acquireSaveLock = useDraftOrderStore((state) => state.acquireSaveLock);
	const releaseSaveLock = useDraftOrderStore((state) => state.releaseSaveLock);

	const lineItemQuery = useQuery<LineItemSchema | null>({
		queryKey: lineItemKey,
		enabled: !!order && !!product,
		queryFn: () => findOrderLineItems(order, product)[0] ?? null,
		staleTime: 1000,
	});

	const updateLineItemQuantity = async (inputOrder?: OrderSchema, quantity?: number) => {
		if ( !inputOrder || !product || typeof quantity === 'undefined' ) {
			throw new Error('Order, product, quantity are required to update line item quantity');
		}

		// Handle draft order - save to database first
		if (inputOrder.id === DRAFT_ORDER_ID) {
			// Check if order was already saved
			const alreadySavedId = getSavedOrderId();
			if (alreadySavedId) {
				// Item was already included in the initial save via draftData.line_items
				// Just invalidate to refresh UI and return the order
				await queryClient.invalidateQueries({ queryKey: ['orders', alreadySavedId] });
				const order = await OrdersAPI.getOrder(alreadySavedId.toString());
				if (!order) throw new Error('Failed to get saved order');
				return order;
			}

			// Try to acquire the lock (synchronous check)
			const gotLock = acquireSaveLock();

			if (!gotLock) {
				// Another save is in progress, wait for it
				const existingPromise = getSavePromise();
				if (existingPromise) {
					const savedOrder = await existingPromise;
					if (savedOrder) {
						// Item was already included in the initial save via draftData.line_items
						await queryClient.invalidateQueries({ queryKey: ['orders', savedOrder.id] });
						return savedOrder;
					}
				}
				// Check again if saved while we were waiting
				const savedId = getSavedOrderId();
				if (savedId) {
					// Item was already included in the initial save
					await queryClient.invalidateQueries({ queryKey: ['orders', savedId] });
					const order = await OrdersAPI.getOrder(savedId.toString());
					if (!order) throw new Error('Failed to get saved order');
					return order;
				}
				throw new Error('Failed to get saved order');
			}

			// We have the lock - create the order
			// Set promise immediately to avoid race condition where other mutations
			// check getSavePromise() before it's set
			const savePromise = (async () => {
				const draftData = getDraftData();
				// Only include line_items - let other mutations handle their own data
				// This prevents double-setting shipping_lines, notes, etc.
				const savedOrder = await OrdersAPI.saveOrder({
					status: 'pending',
					line_items: draftData.line_items,
					customer_note: draftData.customer_note,
					billing: draftData.billing,
					meta_data: draftData.meta_data,
					// Don't include shipping_lines - service mutation will handle it
				});
				return savedOrder;
			})();
			setSavePromise(savePromise);

			try {
				const savedOrder = await savePromise;

				if (savedOrder) {
					setSavedOrderId(savedOrder.id);
					await queryClient.invalidateQueries({ queryKey: generateOrderQueryKey('list') });
					// Don't reset draft here - other mutations may still need savedOrderId
					// The draft will be reset when user navigates to a new order
					router.replace(`/orders/${savedOrder.id}`);
					return savedOrder;
				}
				throw new Error('Failed to save draft order');
			} finally {
				releaseSaveLock();
			}
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

			const newLineItem: LineItemSchema = {
				product_id: product.product_id,
				variation_id: product.variation_id,
				quantity: params.quantity,
				name: product.name + (product.variation_name ? ` - ${product.variation_name}` : ''),
			};

			// For draft orders, update the Zustand store for immediate UI feedback
			if (order.id === DRAFT_ORDER_ID) {
				const currentLineItems = [...draftOrder.line_items];
				const existingIdx = currentLineItems.findIndex(
					li => li.product_id === newLineItem.product_id && li.variation_id === newLineItem.variation_id
				);
				if (existingIdx >= 0) {
					if (params.quantity > 0) {
						currentLineItems[existingIdx] = { ...currentLineItems[existingIdx], quantity: params.quantity };
					} else {
						currentLineItems.splice(existingIdx, 1);
					}
				} else if (params.quantity > 0) {
					currentLineItems.push(newLineItem);
				}
				updateDraftLineItems(currentLineItems);
			}

			// Also update React Query cache
			const newOrderQueryData = { ...order };
			const existingLineItem = newOrderQueryData.line_items.find(lineItem => lineItem.product_id === newLineItem.product_id && lineItem.variation_id === newLineItem.variation_id);
			if ( existingLineItem ) {
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
			// Use the order ID from returned data to ensure we update the correct cache
			// (important when draft order was saved and ID changed from 0 to real ID)
			const actualOrderKey = generateOrderQueryKey('detail', data);

			// If order ID changed (draft was saved), always invalidate to ensure fresh data
			if (order && data.id !== order.id) {
				queryClient.invalidateQueries({ queryKey: ['orders', data.id] });
			} else if (lineItemsAreMutating <= 1) {
				queryClient.setQueryData(actualOrderKey, data);
			}
		},
	});

	return [ lineItemQuery, mutation, lineItemIsMutating ] as const;
}

export const useServiceQuery = (orderQuery: QueryObserverResult<OrderSchema | null>) => {
	const queryClient = useQueryClient();
	const router = useRouter();
	const order = orderQuery.data ?? undefined;
	const orderRootKey = generateOrderQueryKey('order', order);
	const orderQueryKey = generateOrderQueryKey('detail', order);
	const serviceKey = generateOrderQueryKey('service', order);
	const serviceIsMutating = useIsMutating({ mutationKey: serviceKey });

	// Draft order support
	const getDraftData = useDraftOrderStore((state) => state.getDraftData);
	const updateDraftShippingLines = useDraftOrderStore((state) => state.updateDraftShippingLines);
	const getSavePromise = useDraftOrderStore((state) => state.getSavePromise);
	const setSavePromise = useDraftOrderStore((state) => state.setSavePromise);
	const getSavedOrderId = useDraftOrderStore((state) => state.getSavedOrderId);
	const setSavedOrderId = useDraftOrderStore((state) => state.setSavedOrderId);
	const acquireSaveLock = useDraftOrderStore((state) => state.acquireSaveLock);
	const releaseSaveLock = useDraftOrderStore((state) => state.releaseSaveLock);

	// Get tables data for proper slug mapping
	const { data: tables } = useTablesQuery();

	const serviceQuery = useQuery<ServiceMethodSchema | null>({
		queryKey: serviceKey,
		enabled: !!order,
		queryFn: () => {
			if (!order?.shipping_lines?.length) return null;

			// Find the active shipping line (not empty/cleared ones)
			const activeShippingLine = order.shipping_lines.find(line =>
				line.method_id &&
				line.method_id !== '' &&
				(line.method_id === 'pickup_location' || line.method_id === 'flat_rate' || line.method_id === 'free_shipping')
			);

			if (!activeShippingLine) return null;
			
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

		const shippingLine: ShippingLineSchema = {
			method_id: service.type === 'table' ? 'pickup_location' : 'flat_rate',
			instance_id: service.type === 'table' ? '0' : service.slug,
			method_title: service.title,
			total: service.fee.toString(),
			total_tax: '0.00',
			taxes: []
		};

		// Handle draft order - save to database first
		if (inputOrder.id === DRAFT_ORDER_ID) {
			// Check if order was already saved
			const alreadySavedId = getSavedOrderId();
			if (alreadySavedId) {
				const updatedOrder = await OrdersAPI.updateOrder(alreadySavedId.toString(), { shipping_lines: [shippingLine] });
				// Set query data directly and invalidate to ensure UI updates
				const orderKey = generateOrderQueryKey('detail', updatedOrder);
				queryClient.setQueryData(orderKey, updatedOrder);
				await queryClient.invalidateQueries({ queryKey: ['orders', alreadySavedId] });
				return updatedOrder;
			}

			// Try to acquire the lock (synchronous check)
			const gotLock = acquireSaveLock();

			if (!gotLock) {
				// Another save is in progress, wait for it
				const existingPromise = getSavePromise();
				if (existingPromise) {
					const savedOrder = await existingPromise;
					if (savedOrder) {
						const updatedOrder = await OrdersAPI.updateOrder(savedOrder.id.toString(), { shipping_lines: [shippingLine] });
						// Set query data directly and invalidate to ensure UI updates
						const orderKey = generateOrderQueryKey('detail', updatedOrder);
						queryClient.setQueryData(orderKey, updatedOrder);
						await queryClient.invalidateQueries({ queryKey: ['orders', savedOrder.id] });
						return updatedOrder;
					}
				}
				// Check again if saved while we were waiting
				const savedId = getSavedOrderId();
				if (savedId) {
					const updatedOrder = await OrdersAPI.updateOrder(savedId.toString(), { shipping_lines: [shippingLine] });
					// Set query data directly and invalidate to ensure UI updates
					const orderKey = generateOrderQueryKey('detail', updatedOrder);
					queryClient.setQueryData(orderKey, updatedOrder);
					await queryClient.invalidateQueries({ queryKey: ['orders', savedId] });
					return updatedOrder;
				}
				throw new Error('Failed to get saved order');
			}

			// We have the lock - create the order
			// Set promise immediately to avoid race condition
			const savePromise = (async () => {
				const draftData = getDraftData();
				// Only include shipping_lines - let other mutations handle their own data
				const savedOrder = await OrdersAPI.saveOrder({
					status: 'pending',
					line_items: draftData.line_items,
					shipping_lines: [shippingLine],
					customer_note: draftData.customer_note,
					billing: draftData.billing,
					meta_data: draftData.meta_data,
				});
				return savedOrder;
			})();
			setSavePromise(savePromise);

			try {
				const savedOrder = await savePromise;

				if (savedOrder) {
					setSavedOrderId(savedOrder.id);
					await queryClient.invalidateQueries({ queryKey: generateOrderQueryKey('list') });
					router.replace(`/orders/${savedOrder.id}`);
					return savedOrder;
				}
				throw new Error('Failed to save draft order');
			} finally {
				releaseSaveLock();
			}
		}

		// Check if there's an existing shipping line we can update
		const existingShippingLine = inputOrder.shipping_lines.find(line =>
			line.id && line.method_id && line.method_id !== ''
		);

		shippingLine.id = existingShippingLine?.id;

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

			// For draft orders, update the Zustand store for immediate UI feedback
			if (order.id === DRAFT_ORDER_ID) {
				updateDraftShippingLines([newShippingLine]);
			}

			// Also update React Query cache
			const newOrderQueryData = { ...order };
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
			// Use the order ID from returned data to ensure we update the correct cache
			const actualOrderKey = generateOrderQueryKey('detail', data);

			// If order ID changed (draft was saved), invalidate to ensure fresh data
			if (order && data.id !== order.id) {
				queryClient.invalidateQueries({ queryKey: ['orders', data.id] });
			} else {
				queryClient.setQueryData(actualOrderKey, data);
			}
		},
	});

	return [serviceQuery, mutation, serviceIsMutating] as const;
}

export const useOrderNoteQuery = (orderQuery: QueryObserverResult<OrderSchema | null>) => {
	const queryClient = useQueryClient();
	const router = useRouter();
	const order = orderQuery.data ?? undefined;
	const orderRootKey = generateOrderQueryKey('order', order);
	const orderQueryKey = generateOrderQueryKey('detail', order);
	const noteKey = generateOrderQueryKey('note', order);
	const noteIsMutating = useIsMutating({ mutationKey: noteKey });

	// Draft order support
	const getDraftData = useDraftOrderStore((state) => state.getDraftData);
	const resetDraft = useDraftOrderStore((state) => state.resetDraft);

	const noteQuery = useQuery<string>({
		queryKey: noteKey,
		enabled: !!order,
		queryFn: () => order?.customer_note || '',
		staleTime: 1000,
	});

	const updateOrderNote = async (inputOrder?: OrderSchema, note?: string) => {
		if (!inputOrder || typeof note === 'undefined') {
			throw new Error('Order and note are required to update order note');
		}

		// Handle draft order - save to database first
		if (inputOrder.id === DRAFT_ORDER_ID) {
			const draftData = getDraftData();

			const savedOrder = await OrdersAPI.saveOrder({
				...draftData,
				status: 'pending',
				customer_note: note,
			});

			if (savedOrder) {
				await queryClient.invalidateQueries({ queryKey: generateOrderQueryKey('list') });
				resetDraft();
				router.replace(`/orders/${savedOrder.id}`);
				return savedOrder;
			}
			throw new Error('Failed to save draft order');
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

export const useCustomerInfoQuery = (orderQuery: QueryObserverResult<OrderSchema | null>) => {
	const queryClient = useQueryClient();
	const router = useRouter();
	const order = orderQuery.data ?? undefined;
	const orderRootKey = generateOrderQueryKey('order', order);
	const orderQueryKey = generateOrderQueryKey('detail', order);
	const customerInfoKey = generateOrderQueryKey('customerInfo', order);
	const customerInfoIsMutating = useIsMutating({ mutationKey: customerInfoKey });

	// Draft order support
	const getDraftData = useDraftOrderStore((state) => state.getDraftData);
	const resetDraft = useDraftOrderStore((state) => state.resetDraft);

	const customerInfoQuery = useQuery<BillingSchema>({
		queryKey: customerInfoKey,
		enabled: !!order,
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

		// Handle draft order - save to database first
		if (inputOrder.id === DRAFT_ORDER_ID) {
			const draftData = getDraftData();

			const savedOrder = await OrdersAPI.saveOrder({
				...draftData,
				status: 'pending',
				billing: mergedBilling,
			});

			if (savedOrder) {
				await queryClient.invalidateQueries({ queryKey: generateOrderQueryKey('list') });
				resetDraft();
				router.replace(`/orders/${savedOrder.id}`);
				return savedOrder;
			}
			throw new Error('Failed to save draft order');
		}

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

export const usePaymentQuery = (orderQuery: QueryObserverResult<OrderSchema | null>) => {
	const queryClient = useQueryClient();
	const router = useRouter();
	const order = orderQuery.data ?? undefined;
	const orderRootKey = generateOrderQueryKey('order', order);
	const orderQueryKey = generateOrderQueryKey('detail', order);
	const paymentKey = generateOrderQueryKey('payment', order);
	const paymentIsMutating = useIsMutating({ mutationKey: paymentKey });

	// Draft order support
	const getDraftData = useDraftOrderStore((state) => state.getDraftData);
	const resetDraft = useDraftOrderStore((state) => state.resetDraft);

	const paymentQuery = useQuery<number>({
		queryKey: paymentKey,
		enabled: !!order,
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

		// Handle draft order - save to database first
		if (inputOrder.id === DRAFT_ORDER_ID) {
			const draftData = getDraftData();

			const savedOrder = await OrdersAPI.saveOrder({
				...draftData,
				status: 'pending',
				meta_data: updatedMetaData,
			});

			if (savedOrder) {
				await queryClient.invalidateQueries({ queryKey: generateOrderQueryKey('list') });
				resetDraft();
				router.replace(`/orders/${savedOrder.id}`);
				return savedOrder;
			}
			throw new Error('Failed to save draft order');
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