import { QueryObserverResult, useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import OrdersAPI, { OrderSchema, LineItemSchema, ShippingLineSchema, BillingSchema, MetaDataSchema } from "@/api/orders";
import { useParams, useRouter } from "next/navigation";
import { ProductSchema } from "./products";
import { ServiceMethodSchema, useTablesQuery } from "./service";
import { useAvoidParallel } from "@/hooks/useAvoidParallel";
import { DRAFT_ORDER_ID } from "./draft-order";
import { useDraftOrderState, useDraftOrderActions } from "@/hooks/useDraftOrderState";
import { isSkipError } from "./utils/mutation-helpers";
import { isValidFrontendId } from "@/lib/frontend-id";
import { getLocalOrder, updateLocalOrder, ensureServerOrder, updateLocalOrderSyncStatus } from "./offline-orders";
import type { LocalOrder } from "@/db";
import { calculateOrderTotal, calculateSubtotal } from "@/lib/order-utils";
import { updateLineItem as updateLineItemOp } from "@/lib/line-item-ops";
import { generateOrderQueryKey, type OrderWithFrontendId } from "./order-queries";

/**
 * Merge server-assigned line item IDs into the current React Query cache
 * without overwriting the entire cache. This preserves optimistic updates
 * from other concurrent mutations (e.g., items removed by onMutate that
 * the server hasn't processed yet).
 */
function mergeServerIdsIntoCache(
	queryClient: ReturnType<typeof useQueryClient>,
	urlOrderId: string,
	serverLineItems: LineItemSchema[],
) {
	queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], (current) => {
		if (!current) return current;
		const mergedLineItems = current.data.line_items.map(cacheItem => {
			const serverItem = serverLineItems.find(si =>
				si.product_id === cacheItem.product_id && si.variation_id === cacheItem.variation_id
			);
			// Update with server data (has correct IDs, prices, totals) but keep cache item if no match
			return serverItem ? { ...cacheItem, id: serverItem.id, subtotal: serverItem.subtotal, total: serverItem.total } : cacheItem;
		});
		return {
			...current,
			data: { ...current.data, line_items: mergedLineItems },
		};
	});
}

const findOrderLineItems = (order?: OrderSchema, product?: ProductSchema): LineItemSchema[] => {
	if ( !product || !order ) {
		return [];
	}

	const lineItems = order.line_items.filter(lineItem => lineItem.product_id === product.product_id && lineItem.variation_id === product.variation_id);

	return lineItems;
}

/**
 * Line item query and mutation hook.
 * Despite the "Query" suffix, this hook provides both read (useQuery) and
 * write (useMutation) operations for a single line item on the current order.
 * Returns [lineItemQuery, mutation, isMutating].
 */
export const useLineItemQuery = (orderQuery: QueryObserverResult<OrderSchema | null>, product?: ProductSchema) => {
	const queryClient = useQueryClient();
	const router = useRouter();
	const params = useParams();
	const urlOrderId = params?.orderId as string | undefined;
	const order = orderQuery.data ?? undefined;
	const orderRootKey = generateOrderQueryKey( 'order', order );
	const orderQueryKey = generateOrderQueryKey( 'detail', order );
	const lineItemKey = generateOrderQueryKey('lineItem', order, product);
	const lineItemIsMutating = useIsMutating({ mutationKey: lineItemKey });
	const lineItemsAreMutating = useIsMutating({ mutationKey: generateOrderQueryKey('lineItem', order) });

	// Check if we're working with a frontend ID (local-first order)
	const isFrontendIdOrder = urlOrderId ? isValidFrontendId(urlOrderId) : false;

	// Draft order support
	const {
		getDraftData,
		draftOrder,
		getSavePromise,
		setSavePromise,
		getSavedOrderId,
		setSavedOrderId,
		acquireSaveLock,
		releaseSaveLock,
	} = useDraftOrderState();
	const { updateDraftLineItems } = useDraftOrderActions();

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

		// Handle frontend ID orders - use shared line item operation
		if (isFrontendIdOrder && urlOrderId) {
			const result = await updateLineItemOp(urlOrderId, {
				product_id: product.product_id,
				variation_id: product.variation_id,
				name: product.name,
				variation_name: product.variation_name,
				price: product.price,
			}, quantity, 'set');

			// Merge server IDs into cache without clobbering other optimistic updates
			if (result.serverLineItems) {
				mergeServerIdsIntoCache(queryClient, urlOrderId, result.serverLineItems);
			}

			return result.localOrder.data;
		}

		// Handle legacy draft order - save to database first
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
				price: product.price,
				id: undefined,
			} );
		}

		const updatedOrder = await OrdersAPI.updateOrder(inputOrder.id.toString(), {line_items: patchLineItems});

		return updatedOrder;
	}

	const tamedMutationFn = useAvoidParallel(updateLineItemQuantity);

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
				price: product.price,
			};

			// For frontend ID orders (local-first), update the local order query cache
			if (isFrontendIdOrder && urlOrderId) {
				// Build optimistic order data
				const newOrderQueryData = { ...order };
				const existingLineItemIdx = newOrderQueryData.line_items.findIndex(
					lineItem => lineItem.product_id === newLineItem.product_id && lineItem.variation_id === newLineItem.variation_id
				);
				if (existingLineItemIdx >= 0) {
					if (params.quantity > 0) {
						newOrderQueryData.line_items[existingLineItemIdx] = {
							...newOrderQueryData.line_items[existingLineItemIdx],
							quantity: params.quantity,
							price: product.price, // Ensure price is always set
						};
					} else {
						newOrderQueryData.line_items = newOrderQueryData.line_items.filter((_, idx) => idx !== existingLineItemIdx);
					}
				} else if (params.quantity > 0) {
					newOrderQueryData.line_items = [...newOrderQueryData.line_items, newLineItem];
				}

				// Recalculate totals for optimistic update
				newOrderQueryData.subtotal = calculateSubtotal(newOrderQueryData.line_items);
				newOrderQueryData.total = calculateOrderTotal(newOrderQueryData);

				// Update the local order query cache optimistically
				queryClient.setQueryData(['localOrder', urlOrderId], (oldData: LocalOrder | undefined) => {
					if (!oldData) return oldData;
					return { ...oldData, data: newOrderQueryData };
				});
				queryClient.setQueryData(lineItemKey, params.quantity > 0 ? newLineItem : null);
				return;
			}

			// For legacy draft orders, update the Zustand store for immediate UI feedback
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
			const existingLineItemIdx = newOrderQueryData.line_items.findIndex(lineItem => lineItem.product_id === newLineItem.product_id && lineItem.variation_id === newLineItem.variation_id);
			if ( existingLineItemIdx >= 0 ) {
				if (params.quantity > 0) {
					newOrderQueryData.line_items[existingLineItemIdx].quantity = params.quantity;
				} else {
					// Remove the item from the array when quantity is 0
					newOrderQueryData.line_items = newOrderQueryData.line_items.filter((_, idx) => idx !== existingLineItemIdx);
				}
			} else if ( params.quantity > 0 ) {
				newOrderQueryData.line_items = [ ...newOrderQueryData.line_items, newLineItem ];
			}

			queryClient.setQueryData(orderQueryKey, newOrderQueryData);
			queryClient.setQueryData(lineItemKey, params.quantity > 0 ? newLineItem : null);
		},
		onError: (err) => {
			if (!isSkipError(err)) {
				// For frontend ID orders, invalidate local order query
				if (isFrontendIdOrder && urlOrderId) {
					queryClient.invalidateQueries({ queryKey: ['localOrder', urlOrderId] });
				} else {
					queryClient.invalidateQueries({ queryKey: orderRootKey });
				}
				mutation.reset();
			}
		},
		onSuccess: (data: OrderSchema) => {
			// For frontend ID orders, the cache is already updated by mutationFn
			// We use setQueryData there instead of invalidate to preserve optimistic updates
			if (isFrontendIdOrder && urlOrderId) {
				return;
			}

			// Use the order ID from returned data to ensure we update the correct cache
			// (important when draft order was saved and ID changed from 0 to real ID)
			const actualOrderKey = generateOrderQueryKey('detail', data);

			// If order ID changed (draft was saved), set cache data immediately
			// so the new order page has data before refetch completes
			if (order && data.id !== order.id) {
				// Set order data in cache for the new order ID
				queryClient.setQueryData(actualOrderKey, data);

				// Also set line item query data for each line item in the new order
				// This ensures currentQuantity is correct after URL change
				if (product) {
					const newLineItem = data.line_items.find(
						li => li.product_id === product.product_id && li.variation_id === product.variation_id
					);
					const newLineItemKey = generateOrderQueryKey('lineItem', data, product);
					queryClient.setQueryData(newLineItemKey, newLineItem ?? null);
				}

				// Invalidate to ensure we also get any other server-side changes
				queryClient.invalidateQueries({ queryKey: ['orders', data.id] });
			} else if (lineItemsAreMutating <= 1) {
				queryClient.setQueryData(actualOrderKey, data);
			}
		},
	});

	return [ lineItemQuery, mutation, lineItemIsMutating ] as const;
}

/**
 * Service method (table/delivery) query and mutation hook.
 * Despite the "Query" suffix, this hook provides both read (useQuery) and
 * write (useMutation) operations for the order's shipping/service method.
 * Returns [serviceQuery, mutation, isMutating].
 */
export const useServiceQuery = (orderQuery: QueryObserverResult<OrderSchema | null>) => {
	const queryClient = useQueryClient();
	const router = useRouter();
	const params = useParams();
	const urlOrderId = params?.orderId as string | undefined;
	const order = orderQuery.data ?? undefined;
	const orderRootKey = generateOrderQueryKey('order', order);
	const orderQueryKey = generateOrderQueryKey('detail', order);
	const serviceKey = generateOrderQueryKey('service', order);
	const serviceIsMutating = useIsMutating({ mutationKey: serviceKey });

	// Check if we're working with a frontend ID (local-first order)
	const isFrontendIdOrder = urlOrderId ? isValidFrontendId(urlOrderId) : false;

	// Draft order support
	const {
		getDraftData,
		getSavePromise,
		setSavePromise,
		getSavedOrderId,
		setSavedOrderId,
		acquireSaveLock,
		releaseSaveLock,
	} = useDraftOrderState();
	const { updateDraftShippingLines } = useDraftOrderActions();

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
				// For tables, extract table name from method_title
				// Support both old format "Table (Table One)" and new format "Table One"
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

		// Handle frontend ID orders - save to local and sync to server
		if (isFrontendIdOrder && urlOrderId) {
			// Get current local order and check if it has serverId
			const cachedLocalOrder = queryClient.getQueryData<LocalOrder>(['localOrder', urlOrderId]);
			const currentOrder = cachedLocalOrder || await getLocalOrder(urlOrderId);
			const hadServerId = !!currentOrder?.serverId;

			// Get existing shipping line ID if present for in-place update
			const existingShippingLine = currentOrder?.data.shipping_lines?.find(line =>
				line.id && line.method_id && line.method_id !== ''
			);

			// Reuse existing ID for in-place update
			if (existingShippingLine?.id) {
				shippingLine.id = existingShippingLine.id;
			}

			// Update local order immediately (optimistic update)
			const updatedLocalOrder = await updateLocalOrder(urlOrderId, {
				shipping_lines: [shippingLine],
			});
			queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], updatedLocalOrder);

			// Attempt server sync (wrapped in try/catch for offline support)
			try {
				// Ensure server order exists and get serverId
				const serverId = await ensureServerOrder(urlOrderId);

				// If this was a new order creation, ensureServerOrder already sent the shipping line
				if (!hadServerId) {
					const refreshedOrder = await getLocalOrder(urlOrderId);
					if (refreshedOrder) {
						queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], refreshedOrder);
						return refreshedOrder.data;
					}
					return updatedLocalOrder.data;
				}

				// For existing orders, sync the change to server
				// Update server with the shipping line (in-place update if ID exists)
				const serverOrder = await OrdersAPI.updateOrder(serverId.toString(), {
					shipping_lines: [shippingLine],
				});

				if (serverOrder) {
					// Update local with server's shipping_lines
					const finalLocalOrder = await updateLocalOrder(urlOrderId, {
						shipping_lines: serverOrder.shipping_lines,
					});
					queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], finalLocalOrder);

					// Mark as synced
					await updateLocalOrderSyncStatus(urlOrderId, 'synced', { serverId });

					return finalLocalOrder.data;
				}
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : 'Unknown error during sync';
				console.error('Failed to sync order shipping:', errorMessage);

				// Mark for retry on failure
				await updateLocalOrderSyncStatus(urlOrderId, 'error', {
					syncError: errorMessage,
					lastSyncAttempt: new Date(),
				});
			}

			// Return the local order data (whether sync succeeded or failed)
			return updatedLocalOrder.data;
		}

		// Handle legacy draft order - save to database first
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

		// Reuse existing ID if present (update in place)
		shippingLine.id = existingShippingLine?.id;

		const updatedOrder = await OrdersAPI.updateOrder(inputOrder.id.toString(), { shipping_lines: [shippingLine] });
		return updatedOrder;
	};

	const tamedMutationFn = useAvoidParallel(updateServiceMethod);

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
				method_title: params.service.title,
				total: params.service.fee.toString(),
				total_tax: '0.00',
				taxes: []
			};

			// For frontend ID orders (local-first), update the local order query cache
			if (isFrontendIdOrder && urlOrderId) {
				const newOrderQueryData = { ...order, shipping_lines: [newShippingLine] };
				queryClient.setQueryData(['localOrder', urlOrderId], (oldData: LocalOrder | undefined) => {
					if (!oldData) return oldData;
					return { ...oldData, data: newOrderQueryData };
				});
				queryClient.setQueryData(serviceKey, params.service);

				// Optimistically update the sidebar orders list
				queryClient.setQueryData(['orders'], (oldOrders: OrderWithFrontendId[] | undefined) => {
					if (!oldOrders) return oldOrders;
					return oldOrders.map(o =>
						o.frontendId === urlOrderId ? { ...o, shipping_lines: [newShippingLine] } : o
					);
				});

				return;
			}

			// For legacy draft orders, update the Zustand store for immediate UI feedback
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
			if (!isSkipError(err)) {
				// For frontend ID orders, invalidate local order query
				if (isFrontendIdOrder && urlOrderId) {
					queryClient.invalidateQueries({ queryKey: ['localOrder', urlOrderId] });
				} else {
					queryClient.invalidateQueries({ queryKey: orderRootKey });
				}
				mutation.reset();
			}
		},
		onSuccess: (data: OrderSchema) => {
			// For frontend ID orders, invalidate queries for fresh data
			if (isFrontendIdOrder && urlOrderId) {
				queryClient.invalidateQueries({ queryKey: ['localOrder', urlOrderId] });
				queryClient.invalidateQueries({ queryKey: ['orders'] });
				return;
			}

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

/**
 * Order note query and mutation hook.
 * Despite the "Query" suffix, this hook provides both read (useQuery) and
 * write (useMutation) operations for the order's customer note.
 * Returns [noteQuery, mutation, isMutating].
 */
export const useOrderNoteQuery = (orderQuery: QueryObserverResult<OrderSchema | null>) => {
	const queryClient = useQueryClient();
	const router = useRouter();
	const params = useParams();
	const urlOrderId = params?.orderId as string | undefined;
	const order = orderQuery.data ?? undefined;
	const orderRootKey = generateOrderQueryKey('order', order);
	const orderQueryKey = generateOrderQueryKey('detail', order);
	const noteKey = generateOrderQueryKey('note', order);
	const noteIsMutating = useIsMutating({ mutationKey: noteKey });

	// Check if we're working with a frontend ID (local-first order)
	const isFrontendIdOrder = urlOrderId ? isValidFrontendId(urlOrderId) : false;

	// Draft order support
	const { getDraftData } = useDraftOrderState();
	const { resetDraft } = useDraftOrderActions();

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

		// Handle frontend ID orders - save to local and sync to server
		if (isFrontendIdOrder && urlOrderId) {
			// Update local order immediately (optimistic update)
			const updatedLocalOrder = await updateLocalOrder(urlOrderId, {
				customer_note: note,
			});
			queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], updatedLocalOrder);

			// Attempt server sync (wrapped in try/catch for offline support)
			try {
				// Ensure server order exists and get serverId
				const serverId = await ensureServerOrder(urlOrderId);

				// Update server with note
				const serverOrder = await OrdersAPI.updateOrder(serverId.toString(), {
					customer_note: note,
				});

				if (serverOrder) {
					// Mark as synced
					await updateLocalOrderSyncStatus(urlOrderId, 'synced', { serverId });
				}
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : 'Unknown error during sync';
				console.error('Failed to sync order note:', errorMessage);

				// Mark for retry on failure
				await updateLocalOrderSyncStatus(urlOrderId, 'error', {
					syncError: errorMessage,
					lastSyncAttempt: new Date(),
				});
			}

			return updatedLocalOrder.data;
		}

		// Handle legacy draft order - save to database first
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

	const tamedMutationFn = useAvoidParallel(updateOrderNote);

	const mutation = useMutation({
		mutationFn: (params: { note: string }) => {
			if (!order) throw new Error('Order is required');
			return tamedMutationFn(order, params.note);
		},
		mutationKey: noteKey,
		onMutate: async (params) => {
			if (!order) return;

			const newOrderQueryData = { ...order, customer_note: params.note };

			// For frontend ID orders, update local order query cache
			if (isFrontendIdOrder && urlOrderId) {
				queryClient.setQueryData(['localOrder', urlOrderId], (oldData: LocalOrder | undefined) => {
					if (!oldData) return oldData;
					return { ...oldData, data: newOrderQueryData };
				});
				queryClient.setQueryData(noteKey, params.note);
				return;
			}

			queryClient.setQueryData(orderQueryKey, newOrderQueryData);
			queryClient.setQueryData(noteKey, params.note);
		},
		onError: (err) => {
			if (!isSkipError(err)) {
				if (isFrontendIdOrder && urlOrderId) {
					queryClient.invalidateQueries({ queryKey: ['localOrder', urlOrderId] });
				} else {
					queryClient.invalidateQueries({ queryKey: orderRootKey });
				}
				mutation.reset();
			}
		},
		onSuccess: (data: OrderSchema) => {
			if (isFrontendIdOrder && urlOrderId) {
				queryClient.invalidateQueries({ queryKey: ['localOrder', urlOrderId] });
				return;
			}
			queryClient.setQueryData(orderQueryKey, data);
		},
	});

	return [noteQuery, mutation, noteIsMutating] as const;
}

/**
 * Customer info (billing) query and mutation hook.
 * Despite the "Query" suffix, this hook provides both read (useQuery) and
 * write (useMutation) operations for the order's billing/customer information.
 * Returns [customerInfoQuery, mutation, isMutating].
 */
export const useCustomerInfoQuery = (orderQuery: QueryObserverResult<OrderSchema | null>) => {
	const queryClient = useQueryClient();
	const router = useRouter();
	const params = useParams();
	const urlOrderId = params?.orderId as string | undefined;
	const order = orderQuery.data ?? undefined;
	const orderRootKey = generateOrderQueryKey('order', order);
	const orderQueryKey = generateOrderQueryKey('detail', order);
	const customerInfoKey = generateOrderQueryKey('customerInfo', order);
	const customerInfoIsMutating = useIsMutating({ mutationKey: customerInfoKey });

	// Check if we're working with a frontend ID (local-first order)
	const isFrontendIdOrder = urlOrderId ? isValidFrontendId(urlOrderId) : false;

	// Draft order support
	const { getDraftData } = useDraftOrderState();
	const { resetDraft } = useDraftOrderActions();

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

		// Handle frontend ID orders - save to local and sync to server
		if (isFrontendIdOrder && urlOrderId) {
			// Update local order immediately (optimistic update)
			const updatedLocalOrder = await updateLocalOrder(urlOrderId, {
				billing: mergedBilling,
			});
			queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], updatedLocalOrder);

			// Attempt server sync (wrapped in try/catch for offline support)
			try {
				// Ensure server order exists and get serverId
				const serverId = await ensureServerOrder(urlOrderId);

				// Update server with billing info
				const serverOrder = await OrdersAPI.updateOrder(serverId.toString(), {
					billing: mergedBilling,
				});

				if (serverOrder) {
					// Mark as synced
					await updateLocalOrderSyncStatus(urlOrderId, 'synced', { serverId });
				}
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : 'Unknown error during sync';
				console.error('Failed to sync customer info:', errorMessage);

				// Mark for retry on failure
				await updateLocalOrderSyncStatus(urlOrderId, 'error', {
					syncError: errorMessage,
					lastSyncAttempt: new Date(),
				});
			}

			return updatedLocalOrder.data;
		}

		// Handle legacy draft order - save to database first
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

	const tamedMutationFn = useAvoidParallel(updateCustomerInfo);

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

			// For frontend ID orders, update local order query cache
			if (isFrontendIdOrder && urlOrderId) {
				queryClient.setQueryData(['localOrder', urlOrderId], (oldData: LocalOrder | undefined) => {
					if (!oldData) return oldData;
					return { ...oldData, data: newOrderQueryData };
				});
				queryClient.setQueryData(customerInfoKey, newOrderQueryData.billing);
				return;
			}

			queryClient.setQueryData(orderQueryKey, newOrderQueryData);
			queryClient.setQueryData(customerInfoKey, newOrderQueryData.billing);
		},
		onError: (err) => {
			if (!isSkipError(err)) {
				if (isFrontendIdOrder && urlOrderId) {
					queryClient.invalidateQueries({ queryKey: ['localOrder', urlOrderId] });
				} else {
					queryClient.invalidateQueries({ queryKey: orderRootKey });
				}
				mutation.reset();
			}
		},
		onSuccess: (data: OrderSchema) => {
			if (isFrontendIdOrder && urlOrderId) {
				queryClient.invalidateQueries({ queryKey: ['localOrder', urlOrderId] });
				return;
			}
			queryClient.setQueryData(orderQueryKey, data);
		},
	});

	return [customerInfoQuery, mutation, customerInfoIsMutating] as const;
}

/**
 * Payment received query and mutation hook.
 * Despite the "Query" suffix, this hook provides both read (useQuery) and
 * write (useMutation) operations for the order's payment_received meta field.
 * Returns [paymentQuery, mutation, isMutating].
 */
export const usePaymentQuery = (orderQuery: QueryObserverResult<OrderSchema | null>) => {
	const queryClient = useQueryClient();
	const router = useRouter();
	const params = useParams();
	const urlOrderId = params?.orderId as string | undefined;
	const order = orderQuery.data ?? undefined;
	const orderRootKey = generateOrderQueryKey('order', order);
	const orderQueryKey = generateOrderQueryKey('detail', order);
	const paymentKey = generateOrderQueryKey('payment', order);
	const paymentIsMutating = useIsMutating({ mutationKey: paymentKey });

	// Check if we're working with a frontend ID (local-first order)
	const isFrontendIdOrder = urlOrderId ? isValidFrontendId(urlOrderId) : false;

	// Draft order support
	const { getDraftData } = useDraftOrderState();
	const { resetDraft } = useDraftOrderActions();

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

		// Handle frontend ID orders - save to local and sync to server
		if (isFrontendIdOrder && urlOrderId) {
			// Update local order immediately (optimistic update)
			const updatedLocalOrder = await updateLocalOrder(urlOrderId, {
				meta_data: updatedMetaData,
			});
			queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], updatedLocalOrder);

			// Attempt server sync (wrapped in try/catch for offline support)
			try {
				// Ensure server order exists and get serverId
				const serverId = await ensureServerOrder(urlOrderId);

				// Update server with payment metadata
				const serverOrder = await OrdersAPI.updateOrder(serverId.toString(), {
					meta_data: updatedMetaData,
				});

				if (serverOrder) {
					// Mark as synced
					await updateLocalOrderSyncStatus(urlOrderId, 'synced', { serverId });
				}
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : 'Unknown error during sync';
				console.error('Failed to sync payment:', errorMessage);

				// Mark for retry on failure
				await updateLocalOrderSyncStatus(urlOrderId, 'error', {
					syncError: errorMessage,
					lastSyncAttempt: new Date(),
				});
			}

			return updatedLocalOrder.data;
		}

		// Handle legacy draft order - save to database first
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

	const tamedMutationFn = useAvoidParallel(updatePaymentReceived);

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

			// For frontend ID orders, update local order query cache
			if (isFrontendIdOrder && urlOrderId) {
				queryClient.setQueryData(['localOrder', urlOrderId], (oldData: LocalOrder | undefined) => {
					if (!oldData) return oldData;
					return { ...oldData, data: newOrderQueryData };
				});
				queryClient.setQueryData(paymentKey, params.received);
				return;
			}

			queryClient.setQueryData(orderQueryKey, newOrderQueryData);
			queryClient.setQueryData(paymentKey, params.received);
		},
		onError: (err) => {
			if (!isSkipError(err)) {
				if (isFrontendIdOrder && urlOrderId) {
					queryClient.invalidateQueries({ queryKey: ['localOrder', urlOrderId] });
				} else {
					queryClient.invalidateQueries({ queryKey: orderRootKey });
				}
				mutation.reset();
			}
		},
		onSuccess: (data: OrderSchema) => {
			if (isFrontendIdOrder && urlOrderId) {
				queryClient.invalidateQueries({ queryKey: ['localOrder', urlOrderId] });
				return;
			}
			queryClient.setQueryData(orderQueryKey, data);
		},
	});

	return [paymentQuery, mutation, paymentIsMutating] as const;
}
